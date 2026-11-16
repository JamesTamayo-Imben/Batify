// manage-page — owner actions, authenticated ONLY by the 32-char edit token.
// Accepts JSON, or multipart/form-data for action "upload-qr".
// Every query is scoped to the page resolved from the token.
//
// Turnstile note: the edit token (a 128+ bit secret) is the credential here, so
// we do not CAPTCHA the owner's dashboard; we rate-limit per IP instead.
import {
  checkUpload, clean, clientIp, EXT, hasBlockedLanguage, isValidDate, json, MEDIA_MAX, normalizeGcash,
  isValidTheme, parseDeviceInfo, parseTimestamp, pendingWishMediaPath, preflight, publishPendingWishMedia,
  rateLimitDurable, REQUEST_LIMITS, serviceClient, signPendingWishMedia, storagePathFromUrl,
} from "../_shared/common.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const ip = clientIp(req);
    if (!(await rateLimitDurable(`manage:${ip}`, REQUEST_LIMITS.ownerRequest.max, REQUEST_LIMITS.ownerRequest.windowMs))) {
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
      // Malformed tokens are guessing attempts: allow a few per IP, then block for the window.
      if (!(await rateLimitDurable(`manage-bad:${ip}`, REQUEST_LIMITS.ownerInvalidToken.max, REQUEST_LIMITS.ownerInvalidToken.windowMs))) {
        return json({ error: "Too many requests. Slow down." }, 429);
      }
      return json({ error: "Invalid edit link." }, 404);
    }
    if (!(await rateLimitDurable(`manage-token:${ip}`, REQUEST_LIMITS.ownerValidToken.max, REQUEST_LIMITS.ownerValidToken.windowMs))) {
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
        if (w.error || c.error) {
          console.error("Could not load page dashboard data:", w.error || c.error);
          return json({ error: "Could not load page data." }, 500);
        }
        let wishes: typeof w.data = [];
        try {
          wishes = await Promise.all((w.data || []).map(async (wish) => {
            if (typeof wish.media_url !== "string" || !wish.media_url.startsWith("pending-wish-media:")) return wish;
            const path = pendingWishMediaPath(wish.media_url, page.id);
            if (!path) throw new Error("Invalid pending wish-media path.");
            return { ...wish, media_url: await signPendingWishMedia(sb, path) };
          }));
        } catch (error) {
          console.error("Could not sign pending wish media:", error);
          return json({ error: "Could not load pending wish media." }, 500);
        }
        const contributions = c.data || [];
        const paths = contributions.map((x) => x.proof_url).filter(Boolean) as string[];
        const signed: Record<string, string> = {};
        if (paths.length) {
          const { data } = await sb.storage.from("payment-proofs").createSignedUrls(paths, 3600);
          for (const s of data || []) if (s.path && s.signedUrl) signed[s.path] = s.signedUrl;
        }
        return json({
          page,
          wishes,
          contributions: contributions.map((x) => ({
            ...x, proof_signed_url: x.proof_url ? signed[x.proof_url] || null : null,
          })),
        });
      }

      // ----------------------------------------------------- push notifications
      case "push-status": {
        const endpoint = clean(body.endpoint, 2048);
        if (!endpoint) return json({ enabled: false });
        const { data, error } = await sb.from("push_subscriptions").select("id")
          .eq("page_id", page.id).eq("endpoint", endpoint).maybeSingle();
        if (error) {
          console.error("Could not check push subscription:", error);
          return json({ error: "Could not check notification settings." }, 500);
        }
        return json({ enabled: !!data });
      }

      case "push-subscribe": {
        const subscription = body.subscription as Record<string, unknown> | undefined;
        const endpoint = typeof subscription?.endpoint === "string" ? subscription.endpoint : "";
        const keys = subscription?.keys as Record<string, unknown> | undefined;
        const p256dh = typeof keys?.p256dh === "string" ? keys.p256dh : "";
        const auth = typeof keys?.auth === "string" ? keys.auth : "";
        let validEndpoint = false;
        try {
          const parsed = new URL(endpoint);
          const host = parsed.hostname.toLowerCase();
          const trustedPushHost = host === "fcm.googleapis.com" ||
            host === "updates.push.services.mozilla.com" ||
            host.endsWith(".push.services.mozilla.com") ||
            host === "web.push.apple.com" ||
            host.endsWith(".push.apple.com") ||
            host.endsWith(".notify.windows.com");
          validEndpoint = parsed.protocol === "https:" && !parsed.port &&
            !parsed.username && !parsed.password && trustedPushHost;
        } catch { /* Invalid push endpoints are rejected below. */ }
        if (!validEndpoint || endpoint.length > 2048 ||
          !/^[A-Za-z0-9_-]{80,100}$/.test(p256dh) ||
          !/^[A-Za-z0-9_-]{16,32}$/.test(auth)) {
          return json({ error: "Invalid push subscription." }, 400);
        }
        const { error } = await sb.from("push_subscriptions").upsert({
          page_id: page.id, endpoint, p256dh, auth,
        }, { onConflict: "page_id,endpoint" });
        if (error) {
          console.error("Could not save push subscription:", error);
          return json({ error: "Could not enable notifications." }, 500);
        }
        return json({ ok: true });
      }

      case "push-unsubscribe": {
        const endpoint = clean(body.endpoint, 2048);
        if (!endpoint || !endpoint.startsWith("https://")) {
          return json({ error: "Invalid push endpoint." }, 400);
        }
        const { error } = await sb.from("push_subscriptions").delete()
          .eq("page_id", page.id).eq("endpoint", endpoint);
        if (error) {
          console.error("Could not remove push subscription:", error);
          return json({ error: "Could not turn off notifications." }, 500);
        }
        return json({ ok: true });
      }

      // --------------------------------------------------------------- update
      case "update": {
        const p = (body.patch && typeof body.patch === "object" ? body.patch : body) as Record<string, unknown>;
        const patch: Record<string, unknown> = {};
        if ("owner_name" in p) {
          const v = clean(p.owner_name, 60);
          if (!v) return json({ error: "Name can't be empty." }, 400);
          if (hasBlockedLanguage(v)) return json({ error: "Please revise this text to remove language that is not suitable for Batify." }, 400);
          patch.owner_name = v;
        }
        if ("title" in p) {
          const v = clean(p.title, 120);
          if (!v) return json({ error: "Title can't be empty." }, 400);
          if (hasBlockedLanguage(v)) return json({ error: "Please revise this text to remove language that is not suitable for Batify." }, 400);
          patch.title = v;
        }
        if ("letter" in p) {
          const v = clean(p.letter, 8000);
          if (!v) return json({ error: "Letter can't be empty." }, 400);
          if (hasBlockedLanguage(v)) return json({ error: "Please revise this text to remove language that is not suitable for Batify." }, 400);
          patch.letter = v;
        }
        if ("birthday_date" in p) {
          if (!isValidDate(p.birthday_date)) return json({ error: "Invalid birthday date." }, 400);
          if (page.campaign_type && p.birthday_date !== page.birthday_date) {
            const { data: campaign, error: campaignError } = await sb.from("campaign_events")
              .select("is_priority").eq("id", page.campaign_type).maybeSingle();
            if (campaignError || !campaign) {
              console.error("Could not verify campaign date settings:", campaignError || "Campaign not found.");
              return json({ error: "Could not verify the event date. Please try again." }, 503);
            }
            if (campaign.is_priority) {
              return json({ error: "The date is fixed for this priority event." }, 400);
            }
          }
          patch.birthday_date = p.birthday_date;
          if (page.campaign_type && page.opens_at) {
            patch.opens_at = new Date(`${p.birthday_date}T00:00:00+08:00`).toISOString();
          }
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
          if (!isValidTheme(p.theme)) return json({ error: "Invalid theme." }, 400);
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
        const { data: wish, error: wishError } = await sb.from("wishes").select("id, media_url, is_approved")
          .eq("id", clean(body.wishId, 64)).eq("page_id", page.id).maybeSingle();
        if (wishError) {
          console.error("Could not load wish for approval:", wishError);
          return json({ error: "Could not approve this wish." }, 500);
        }
        if (!wish) return json({ error: "Wish not found." }, 404);
        if (wish.is_approved) return json({ ok: true });

        const patch: Record<string, unknown> = { is_approved: true };
        let pendingPath: string | null = null;
        let publicPath: string | null = null;
        if (typeof wish.media_url === "string" && wish.media_url.startsWith("pending-wish-media:")) {
          pendingPath = pendingWishMediaPath(wish.media_url, page.id);
          if (!pendingPath) return json({ error: "Invalid pending wish media." }, 500);
          try {
            const published = await publishPendingWishMedia(sb, page.id, pendingPath);
            patch.media_url = published.publicUrl;
            publicPath = published.publicPath;
          } catch (error) {
            console.error("Could not publish approved wish media:", error);
            return json({ error: "Could not publish this wish's media." }, 500);
          }
        }
        const { data, error } = await sb.from("wishes").update(patch)
          .eq("id", wish.id).eq("page_id", page.id).eq("is_approved", false).select("id");
        if (error || !data?.length) {
          if (publicPath) {
            const { error: cleanupError } = await sb.storage.from("wish-media").remove([publicPath]);
            if (cleanupError) console.error("Could not clean up published media after approval failed:", cleanupError);
          }
          if (error) console.error("Could not approve wish:", error);
          return json({ error: "Could not approve this wish." }, error ? 500 : 409);
        }
        if (pendingPath) {
          const { error: cleanupError } = await sb.storage.from("wish-media-pending").remove([pendingPath]);
          if (cleanupError) console.error("Could not remove private media after approval:", cleanupError);
        }
        return json({ ok: true });
      }

      // ----------------------------------------------------------- delete-wish
      case "delete-wish": {
        const { data } = await sb.from("wishes").delete()
          .eq("id", clean(body.wishId, 64)).eq("page_id", page.id).select("id, media_url");
        if (!data?.length) return json({ error: "Wish not found." }, 404);
        const pendingPath = pendingWishMediaPath(data[0].media_url, page.id);
        const path = pendingPath || storagePathFromUrl(data[0].media_url, "wish-media");
        if (path) {
          const bucket = pendingPath ? "wish-media-pending" : "wish-media";
          const { error } = await sb.storage.from(bucket).remove([path]);
          if (error) {
            console.error("Could not remove wish media after deletion:", error);
            return json({ error: "Wish was deleted, but its media could not be removed." }, 500);
          }
        }
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
        const senderName = clean(body.senderName, 60);
        if (hasBlockedLanguage(senderName)) {
          return json({ error: "Please revise this text to remove language that is not suitable for Batify." }, 400);
        }
        const { data, error } = await sb.from("contributions").insert({
          page_id: page.id,
          sender_name: senderName || null,
          amount,
          proof_url: clean(body.proofUrl, 500) || null,
          status,
          device_info: parseDeviceInfo(req),
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
