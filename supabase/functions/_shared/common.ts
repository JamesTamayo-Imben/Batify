// Shared helpers for all Batify edge functions (Deno).
import { createClient } from "npm:@supabase/supabase-js@2";
import { containsBlockedLanguage } from "./contentFilter.js";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Returns a response for CORS preflight, otherwise null. */
export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  return null;
}

/** service_role client — bypasses RLS. NEVER expose to the browser. */
export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

export type DeviceInfo = {
  device: "Mobile" | "Tablet" | "Desktop" | "Unknown";
  browser: "Chrome" | "Firefox" | "Safari" | "Edge" | "Opera" | "Other" | "Unknown";
  os: "Android" | "iOS" | "Windows" | "macOS" | "Linux" | "Other" | "Unknown";
};

/** Coarse request metadata only; never used as a unique device identifier. */
export function parseDeviceInfo(req: Request): DeviceInfo {
  const ua = req.headers.get("user-agent") || "";
  if (!ua) return { device: "Unknown", browser: "Unknown", os: "Unknown" };

  const device: DeviceInfo["device"] = /ipad|tablet|kindle|silk/i.test(ua) ||
      (/android/i.test(ua) && !/mobile/i.test(ua))
    ? "Tablet"
    : /mobile|iphone|ipod|android/i.test(ua)
      ? "Mobile"
      : "Desktop";
  const browser: DeviceInfo["browser"] = /edg(e|a|ios)?\//i.test(ua)
    ? "Edge"
    : /opr\/|opera/i.test(ua)
      ? "Opera"
      : /firefox|fxios/i.test(ua)
        ? "Firefox"
        : /chrome|crios|chromium/i.test(ua)
          ? "Chrome"
          : /safari/i.test(ua)
            ? "Safari"
            : "Other";
  const os: DeviceInfo["os"] = /android/i.test(ua)
    ? "Android"
    : /iphone|ipad|ipod/i.test(ua)
      ? "iOS"
      : /windows/i.test(ua)
        ? "Windows"
        : /macintosh|mac os/i.test(ua)
          ? "macOS"
          : /linux/i.test(ua)
            ? "Linux"
            : "Other";
  return { device, browser, os };
}

export function hasBlockedLanguage(...values: unknown[]): boolean {
  return values.some((value) =>
    typeof value === "string" && containsBlockedLanguage(value)
  );
}

export const REQUEST_LIMITS = {
  pageCreate: { max: 5, windowMs: 60 * 60 * 1000 },
  wishSubmission: { max: 20, windowMs: 10 * 60 * 1000 },
  ownerRequest: { max: 120, windowMs: 60 * 1000 },
  ownerValidToken: { max: 60, windowMs: 60 * 1000 },
  ownerInvalidToken: { max: 20, windowMs: 10 * 60 * 1000 },
  openPerIp: { max: 60, windowMs: 60 * 60 * 1000 },
  openPerPage: { max: 2, windowMs: 60 * 60 * 1000 },
  adminRequest: { max: 60, windowMs: 60 * 1000 },
} as const;

// ---------------------------------------------------------------------------
// Cloudflare Turnstile — server-side verification (the real gate)
// ---------------------------------------------------------------------------
export async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY is not set — failing closed");
    return false;
  }
  if (typeof token !== "string" || token.length < 10 || token.length > 4096) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const data = await res.json();
    return data?.success === true;
  } catch (e) {
    console.error("Turnstile verify failed", e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Rate limiting — simple per-IP sliding window, IN MEMORY.
// Each edge isolate has its own Map, so limits are best-effort only.
// For production, swap this for Upstash Redis (INCR + EXPIRE) or a
// rate_limits table with a Postgres function.
// ---------------------------------------------------------------------------
const hits = new Map<string, number[]>();

/** Returns true if the request is ALLOWED. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (!v.length || now - v[v.length - 1] > 3_600_000) hits.delete(k);
    }
  }
  return true;
}

/**
 * Durable rate limit backed by Postgres (public.rate_limit_hit), shared across all
 * function instances. Falls back to the in-memory limiter if the database call fails
 * (for example before schema.sql v2 has been applied), so a limiter outage never takes
 * the product down. Returns true if the request is ALLOWED.
 */
export async function rateLimitDurable(key: string, max: number, windowMs: number): Promise<boolean> {
  try {
    const { data, error } = await serviceClient().rpc("rate_limit_hit", {
      p_key: key, p_max: max, p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
    });
    if (error || typeof data !== "boolean") throw error ?? new Error("bad rate_limit_hit result");
    return data;
  } catch (e) {
    console.warn("rate_limit_hit unavailable, using in-memory fallback:", (e as Error)?.message ?? e);
    return rateLimit(key, max, windowMs);
  }
}

// ---------------------------------------------------------------------------
// Random strings / slugs
// ---------------------------------------------------------------------------
export const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // 31 chars, no look-alikes

export function randomString(len: number): string {
  const limit = 256 - (256 % ALPHABET.length); // rejection sampling: no modulo bias
  let out = "";
  while (out.length < len) {
    const buf = new Uint8Array(len * 2);
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b < limit && out.length < len) out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}

export function slugify(input: string): string {
  const s = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
  return s || "friend";
}

// ---------------------------------------------------------------------------
// Sanitising
// ---------------------------------------------------------------------------
// deno-lint-ignore no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Trim, drop control chars, truncate. */
export function clean(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(CONTROL, "").trim().slice(0, max);
}

export function stripUrls(s: string): string {
  return s.replace(/https?:\/\/\S+/g, "").replace(/[ \t]{2,}/g, " ").trim();
}

export function isValidDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Accepts ISO strings; returns normalised ISO or null. */
export function parseTimestamp(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** PH mobile: 09XXXXXXXXX, +639XXXXXXXXX, 639XXXXXXXXX. Returns normalised or null. */
export function normalizeGcash(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\s-]/g, "");
  return /^(09|\+639|639)\d{9}$/.test(s) ? s : null;
}

export const THEMES = ["confetti", "lavender", "sky", "rosas", "hapon", "dahon", "alon"];

export function isValidTheme(value: unknown): value is string {
  return typeof value === "string" &&
    (THEMES.includes(value) || /^#[0-9a-f]{6}$/i.test(value));
}

// ---------------------------------------------------------------------------
// Uploads — verify real file type from magic bytes (never trust file.type)
// ---------------------------------------------------------------------------
export const MEDIA_MAX = 25 * 1024 * 1024;
export const PROOF_MAX = 10 * 1024 * 1024;

export const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export function sniffMime(b: Uint8Array): string | null {
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...b.slice(from, to));
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (ascii(0, 4) === "GIF8") return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp") return "video/mp4";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";
  return null;
}

/**
 * Validates an uploaded File. Returns { mime, ext, bytes } or { error }.
 * SVG and anything not whitelisted is rejected.
 */
export async function checkUpload(
  file: File,
  allowed: string[],
  maxBytes: number,
): Promise<{ mime: string; ext: string; bytes: Uint8Array } | { error: string }> {
  if (file.size > maxBytes) {
    return { error: `File is too large (max ${Math.round(maxBytes / 1048576)} MB).` };
  }
  if (!allowed.includes(file.type)) return { error: "Unsupported file type." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > maxBytes) {
    return { error: `File is too large (max ${Math.round(maxBytes / 1048576)} MB).` };
  }
  const real = sniffMime(bytes);
  if (!real || !allowed.includes(real)) return { error: "Unsupported or corrupt file." };
  return { mime: real, ext: EXT[real], bytes };
}

export const MEDIA_MIMES = Object.keys(EXT);
export const PROOF_MIMES = ["image/jpeg", "image/png", "image/webp"];

/** Extracts the object path from a public storage URL for a given bucket. */
export function storagePathFromUrl(url: string | null, bucket: string): string | null {
  if (!url) return null;
  const marker = `/${bucket}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length).split("?")[0];
}

export const PENDING_WISH_MEDIA_PREFIX = "pending-wish-media:";

export function pendingWishMediaPath(mediaUrl: unknown, pageId: string): string | null {
  if (typeof mediaUrl !== "string" || !mediaUrl.startsWith(PENDING_WISH_MEDIA_PREFIX)) return null;
  const path = mediaUrl.slice(PENDING_WISH_MEDIA_PREFIX.length);
  if (!path.startsWith(`${pageId}/`)) return null;
  const filename = path.slice(pageId.length + 1);
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|gif|mp4|webm)$/.test(filename)) return null;
  return path;
}

export async function signPendingWishMedia(
  sb: ReturnType<typeof serviceClient>,
  path: string,
): Promise<string> {
  const { data, error } = await sb.storage.from("wish-media-pending").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw new Error(error?.message || "Could not create a signed wish-media URL.");
  return data.signedUrl;
}

export async function privatizeLegacyWishMedia(
  sb: ReturnType<typeof serviceClient>,
  pageId: string,
  mediaUrl: string,
): Promise<{ pendingUrl: string; pendingPath: string; publicPath: string }> {
  const publicPath = storagePathFromUrl(mediaUrl, "wish-media");
  if (!publicPath || !publicPath.startsWith(`${pageId}/`)) {
    throw new Error("Invalid legacy wish-media URL.");
  }
  const filename = publicPath.slice(pageId.length + 1);
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|gif|mp4|webm)$/.test(filename)) {
    throw new Error("Invalid legacy wish-media path.");
  }
  const extension = filename.split(".").pop()!;
  const mime = Object.entries(EXT).find(([, ext]) => ext === extension)?.[0];
  if (!mime) throw new Error("Unsupported legacy wish-media type.");
  const { data: file, error: downloadError } = await sb.storage.from("wish-media").download(publicPath);
  if (downloadError || !file) throw new Error(downloadError?.message || "Could not read legacy wish media.");

  const pendingPath = `${pageId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await sb.storage.from("wish-media-pending")
    .upload(pendingPath, new Uint8Array(await file.arrayBuffer()), { contentType: mime, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  return {
    pendingPath,
    pendingUrl: `${PENDING_WISH_MEDIA_PREFIX}${pendingPath}`,
    publicPath,
  };
}

export async function publishPendingWishMedia(
  sb: ReturnType<typeof serviceClient>,
  pageId: string,
  pendingPath: string,
): Promise<{ publicUrl: string; publicPath: string }> {
  const filename = pendingPath.slice(pageId.length + 1);
  if (!pendingWishMediaPath(`${PENDING_WISH_MEDIA_PREFIX}${pendingPath}`, pageId)) {
    throw new Error("Invalid pending wish-media path.");
  }
  const { data: file, error: downloadError } = await sb.storage.from("wish-media-pending").download(pendingPath);
  if (downloadError || !file) throw new Error(downloadError?.message || "Could not read pending wish media.");

  const extension = filename.split(".").pop()!;
  const mime = Object.entries(EXT).find(([, ext]) => ext === extension)?.[0];
  if (!mime) throw new Error("Unsupported pending wish-media type.");
  const publicPath = `${pageId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await sb.storage.from("wish-media")
    .upload(publicPath, new Uint8Array(await file.arrayBuffer()), {
      contentType: mime,
      upsert: false,
    });
  if (uploadError) throw new Error(uploadError.message);

  return {
    publicPath,
    publicUrl: sb.storage.from("wish-media").getPublicUrl(publicPath).data.publicUrl,
  };
}
