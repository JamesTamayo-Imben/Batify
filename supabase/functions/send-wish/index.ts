// send-wish — one public write endpoint (multipart/form-data), three modes:
//   mode=wish (default)  : post a wish (+ optional photo/video gift)
//   mode=contribution    : record a GCash contribution with screenshot proof
//   mode=report          : report a wish for moderation
import {
  checkUpload, clean, clientIp, json, MEDIA_MAX, MEDIA_MIMES, PROOF_MAX, PROOF_MIMES,
  preflight, rateLimitDurable, serviceClient, stripUrls, verifyTurnstile,
} from "../_shared/common.ts";

const GIFTS = ["flower", "teddy", "chocolate", "media"];

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const ip = clientIp(req);
    if (!(await rateLimitDurable(`wish:${ip}`, 20, 10 * 60 * 1000))) {
      return json({ error: "You're sending too fast. Please wait a few minutes." }, 429);
    }

    let form: FormData;
    try { form = await req.formData(); } catch { return json({ error: "Invalid form data." }, 400); }

    if (!(await verifyTurnstile(form.get("turnstileToken"), ip))) {
      return json({ error: "CAPTCHA verification failed. Please try again." }, 403);
    }

    const sb = serviceClient();
    const mode = clean(form.get("mode"), 20) || "wish";

    // ---------------------------------------------------------------- report
    if (mode === "report") {
      const wishId = clean(form.get("wishId"), 64);
      const reason = clean(form.get("reason"), 300) || "unspecified";
      const { data: wish } = await sb
        .from("wishes").select("id, pages!inner(is_published)")
        .eq("id", wishId).eq("is_approved", true).maybeSingle();
      if (!wish) return json({ error: "Wish not found." }, 404);
      const { error } = await sb.from("reports").insert({ wish_id: wishId, reason });
      if (error) return json({ error: "Could not submit report." }, 500);
      return json({ ok: true });
    }

    // ------------------------------------------------- page lookup (wish/contribution)
    const slug = clean(form.get("slug"), 80);
    const { data: page } = await sb
      .from("pages")
      .select("id, owner_name, auto_approve_wishes, gcash_number, is_published")
      .eq("slug", slug).eq("is_published", true).maybeSingle();
    if (!page) return json({ error: "Page not found." }, 404);

    const senderName = clean(form.get("senderName"), 60) || "Anonymous";

    // --------------------------------------------------------- contribution
    if (mode === "contribution") {
      if (!page.gcash_number) return json({ error: "This page is not accepting GCash." }, 400);
      const amount = Math.round(Number(form.get("amount")) * 100) / 100;
      if (!isFinite(amount) || amount < 1 || amount > 100000) {
        return json({ error: "Enter an amount between ₱1 and ₱100,000." }, 400);
      }
      const proof = form.get("proof");
      if (!(proof instanceof File) || proof.size === 0) {
        return json({ error: "Please attach your GCash payment screenshot." }, 400);
      }
      const chk = await checkUpload(proof, PROOF_MIMES, PROOF_MAX);
      if ("error" in chk) return json({ error: chk.error }, 400);

      // PRIVATE bucket — only the page owner sees it via signed URL
      const path = `${page.id}/${crypto.randomUUID()}.${chk.ext}`;
      const up = await sb.storage.from("payment-proofs")
        .upload(path, chk.bytes, { contentType: chk.mime, upsert: false });
      if (up.error) { console.error(up.error); return json({ error: "Upload failed." }, 500); }

      const { data, error } = await sb.from("contributions").insert({
        page_id: page.id, sender_name: senderName, amount, proof_url: path,
      }).select("id").single();
      if (error) {
        await sb.storage.from("payment-proofs").remove([path]);
        return json({ error: "Could not record your contribution." }, 500);
      }
      return json({ contribution: { id: data.id } });
    }

    // ------------------------------------------------------------------ wish
    const giftType = clean(form.get("giftType"), 20) || "flower";
    if (!GIFTS.includes(giftType)) return json({ error: "Invalid gift." }, 400);

    const message = stripUrls(clean(form.get("message"), 1000));

    let mediaUrl: string | null = null;
    let mediaType: string | null = null;
    const file = form.get("file");

    if (giftType === "media") {
      if (!(file instanceof File) || file.size === 0) {
        return json({ error: "Please choose a photo or video to send." }, 400);
      }
      const chk = await checkUpload(file, MEDIA_MIMES, MEDIA_MAX);
      if ("error" in chk) return json({ error: chk.error }, 400);

      const path = `${page.id}/${crypto.randomUUID()}.${chk.ext}`;
      const up = await sb.storage.from("wish-media")
        .upload(path, chk.bytes, { contentType: chk.mime, upsert: false });
      if (up.error) { console.error(up.error); return json({ error: "Upload failed." }, 500); }
      mediaUrl = sb.storage.from("wish-media").getPublicUrl(path).data.publicUrl;
      mediaType = chk.mime.startsWith("video/") ? "video" : "image";
    }

    const { data, error } = await sb.from("wishes").insert({
      page_id: page.id,
      sender_name: senderName,
      message: message || null,
      gift_type: giftType,
      media_url: mediaUrl,
      media_type: mediaType,
      is_approved: page.auto_approve_wishes === true,
    }).select("id, is_approved").single();

    if (error) {
      console.error(error);
      return json({ error: "Could not save your wish." }, 500);
    }
    return json({ wish: { id: data.id, is_approved: data.is_approved } });
  } catch (e) {
    console.error(e);
    return json({ error: "Unexpected server error." }, 500);
  }
});
