// Shared helpers for all Batify edge functions (Deno).
import { createClient } from "npm:@supabase/supabase-js@2";

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

export const THEMES = ["confetti", "lavender", "sky"];

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
