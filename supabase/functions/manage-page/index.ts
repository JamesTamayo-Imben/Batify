// manage-page — owner actions, authenticated ONLY by the 32-char edit token.
// Accepts JSON, or multipart/form-data for action "upload-qr".
// Every query is scoped to the page resolved from the token.
//
// Turnstile note: the edit token (a 128+ bit secret) is the credential here, so
// we do not CAPTCHA the owner's dashboard; we rate-limit per IP instead.
import {
  checkUpload, clean, clientIp, EXT, isValidDate, json, MEDIA_MAX, normalizeGcash,
  parseTimestamp, preflight, rateLimit, serviceClient, storagePathFromUrl, THEMES,
} from "../_shared/common.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const ip = clientIp(req);
    if (!rateLimit(`manage:${ip}`, 120, 60 * 1000)) {
      return json({ error: "Too many requests. Slow down." }, 429);
    }

    let body: Record<string, unknown> = {};
    let file: File | null = null;
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      for (const [k, v] of form.entries()) {
        if (v instanceof File) file = v; else body[k] = v;
      }
    } else {
      try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
    }

    const token = typeof body.editToken === "string" ? body.editToken : "";
    if (!/^[a-z0-9]{32}$/.test(token)) {
      // slow down guessing attempts harder
      rateLimit(`manage-bad:${ip}`, 1, 1);
      return json({ error: "Invalid edit link." }, 404);
    }
    if (!rateLimit(`manage-token:${ip}`, 60, 60 * 1000)) {
      return json({ error: "Too many requests. Slow down." }, 429);
    }

    const sb = serviceClient();
    const { data: page } = await sb.from("pages").select("*").eq("edit_token", token).maybeSingle();
    if (!page) return json({ error: "Invalid edit link." }, 404);

    const action = clean(body.action, 40);

    switch (action) {
      // ------------------------------------------------------------------ get
      case "get": {
        const [w, c] = await Promise.all([
          sb.from("wishes").select("*").eq("page_id", page.id).order("created_at", { ascending: false }),
          sb.from("contributions").select("*").eq("page_id", page.id).order("created_at", { ascending: false }),
        ]);
        const contributions = c.data || [];
        const paths = contributions.map((x) => x.proof_url).filter(Boolean) as string[];
        const signed: Record<string, string> = {};
        if (paths.length) {
          const { data } = await sb.storage.from("payment-proofs").createSignedUrls(paths, 3600);
          for (const s of data || []) if (s.path && s.signedUrl) signed[s.path] = s.signedUrl;
        }
        return json({
          page,
          wishes: w.data || [],
          contributions: contributions.map((x) => ({
            ...x, proof_signed_url: x.proof_url ? signed[x.proof_url] || null : null,
          })),
        });
      }

      // --------------------------------------------------------------- update
      case "update": {
        const p = (body.patch && typeof body.patch === "object" ? body.patch : body) as Record<string, unknown>;
        const patch: Record<string, unknown> = {};
        if ("owner_name" in p) {
          const v = clean(p.owner_name, 60);
          if (!v) return json({ error: "Name can't be empty." }, 400);
          patch.owner_name = v;
        }
        if ("title" in p) {
          const v = clean(p.title, 120);
          if (!v) return json({ error: "Title can't be empty." }, 400);
          patch.title = v;
        }
        if ("letter" in p) {
          const v = clean(p.letter, 8000);
          if (!v) return json({ error: "Letter can't be empty." }, 400);
          patch.letter = v;
        }
        if ("birthday_date" in p) {
          if (!isValidDate(p.birthday_date)) return json({ error: "Invalid birthday date." }, 400);
          patch.birthday_date = p.birthday_date;
        }
        if ("reveal_at" in p) {
          if (!p.reveal_at) patch.reveal_at = null;
          else {
            const v = parseTimestamp(p.reveal_at);
            if (!v) return json({ error: "Invalid reveal time." }, 400);
            patch.reveal_at = v;
          }
        }
        if ("auto_approve_wishes" in p) patch.auto_approve_wishes = p.auto_approve_wishes === true;
        if ("is_published" in p) patch.is_published = p.is_published === true;
        if ("theme" in p) {
          if (typeof p.theme !== "string" || !THEMES.includes(p.theme)) return json({ error: "Invalid theme." }, 400);
          patch.theme = p.theme;
        }
        if ("gcash_number" in p) {
          if (!p.gcash_number) patch.gcash_number = null;
          else {
            const v = normalizeGcash(p.gcash_number);
            if (!v) return json({ error: "GCash number must be a PH mobile number (e.g. 09171234567)." }, 400);
            patch.gcash_number = v;
          }
        }
        if ("gcash_qr_url" in p) {
          if (!p.gcash_qr_url) patch.gcash_qr_url = null;
          else {
            const prefix = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/wish-media/${page.id}/`;
            if (typeof p.gcash_qr_url !== "string" || !p.gcash_qr_url.startsWith(prefix)) {
              return json({ error: "Invalid QR image." }, 400);
            }
            patch.gcash_qr_url = p.gcash_qr_url;
          }
        }
        if (!Object.keys(patch).length) return json({ error: "Nothing to update." }, 400);
        const { data, error } = await sb.from("pages").update(patch).eq("id", page.id).select("*").single();
        if (error) { console.error(error); return json({ error: "Could not save changes." }, 500); }
        return json({ page: data });
      }

      // ------------------------------------------------------------- upload-qr
      case "upload-qr": {
        if (!file) return json({ error: "No file attached." }, 400);
        const chk = await checkUpload(file, ["image/jpeg", "image/png", "image/webp"], 5 * 1024 * 1024);
        if ("error" in chk) return json({ error: chk.error }, 400);
        const path = `${page.id}/qr-${crypto.randomUUID()}.${EXT[chk.mime]}`;
        const up = await sb.storage.from("wish-media").upload(path, chk.bytes, { contentType: chk.mime });
        if (up.error) { console.error(up.error); return json({ error: "Upload failed." }, 500); }
        const url = sb.storage.from("wish-media").getPublicUrl(path).data.publicUrl;
        const old = storagePathFromUrl(page.gcash_qr_url, "wish-media");
        const { data, error } = await sb.from("pages").update({ gcash_qr_url: url }).eq("id", page.id).select("*").single();
        if (error) return json({ error: "Could not save QR." }, 500);
        if (old) await sb.storage.from("wish-media").remove([old]);
        return json({ page: data });
      }

      // ---------------------------------------------------------- approve-wish
      case "approve-wish": {
        const { data } = await sb.from("wishes").update({ is_approved: true })
          .eq("id", clean(body.wishId, 64)).eq("page_id", page.id).select("id");
        if (!data?.length) return json({ error: "Wish not found." }, 404);
        return json({ ok: true });
      }

      // ----------------------------------------------------------- delete-wish
      case "delete-wish": {
        const { data } = await sb.from("wishes").delete()
          .eq("id", clean(body.wishId, 64)).eq("page_id", page.id).select("id, media_url");
        if (!data?.length) return json({ error: "Wish not found." }, 404);
        const path = storagePathFromUrl(data[0].media_url, "wish-media");
        if (path) await sb.storage.from("wish-media").remove([path]);
        return json({ ok: true });
      }

      // ------------------------------------------------------------- mark-paid
      case "mark-paid": {
        const { data } = await sb.from("contributions").update({ status: "paid" })
          .eq("id", clean(body.contributionId, 64)).eq("page_id", page.id).select("id");
        if (!data?.length) return json({ error: "Contribution not found." }, 404);
        return json({ ok: true });
      }

      // --------------------------------------------------- create-contribution
      case "create-contribution": {
        const amount = Math.round(Number(body.amount) * 100) / 100;
        if (!isFinite(amount) || amount < 1 || amount > 100000) {
          return json({ error: "Enter an amount between ₱1 and ₱100,000." }, 400);
        }
        const status = body.status === "paid" ? "paid" : "pending";
        const { data, error } = await sb.from("contributions").insert({
          page_id: page.id,
          sender_name: clean(body.senderName, 60) || null,
          amount,
          proof_url: clean(body.proofUrl, 500) || null,
          status,
        }).select("*").single();
        if (error) { console.error(error); return json({ error: "Could not add contribution." }, 500); }
        return json({ contribution: { ...data, proof_signed_url: null } });
      }

      default:
        return json({ error: "Unknown action." }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: "Unexpected server error." }, 500);
  }
});
