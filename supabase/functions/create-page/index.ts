// create-page — creates a birthday page and returns { slug, editToken }.
import {
  clean, clientIp, isValidDate, json, normalizeGcash, parseTimestamp,
  preflight, randomString, rateLimit, serviceClient, slugify, verifyTurnstile,
} from "../_shared/common.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const ip = clientIp(req);
    if (!rateLimit(`create:${ip}`, 5, 60 * 60 * 1000)) {
      return json({ error: "Too many pages created. Please try again later." }, 429);
    }

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }

    // 1. Turnstile — the real gate
    if (!(await verifyTurnstile(body.turnstileToken, ip))) {
      return json({ error: "CAPTCHA verification failed. Please try again." }, 403);
    }

    // 2. Validate + truncate
    const ownerName = clean(body.ownerName, 60);
    const title = clean(body.title, 120);
    const letter = clean(body.letter, 8000);
    if (!ownerName || !title || !letter || !body.birthdayDate) {
      return json({ error: "Name, title, letter and birthday date are required." }, 400);
    }
    if (!isValidDate(body.birthdayDate)) return json({ error: "Invalid birthday date." }, 400);

    let revealAt: string | null = null;
    if (body.revealAt) {
      revealAt = parseTimestamp(body.revealAt);
      if (!revealAt) return json({ error: "Invalid reveal time." }, 400);
    }

    let gcash: string | null = null;
    if (body.gcashNumber) {
      gcash = normalizeGcash(body.gcashNumber);
      if (!gcash) return json({ error: "GCash number must be a PH mobile number (e.g. 09171234567)." }, 400);
    }

    // 3-5. Slug + token, insert (retry on slug collision)
    const sb = serviceClient();
    const base = slugify(ownerName);
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = `${base}-${randomString(4)}`;
      const editToken = randomString(32);
      const { error } = await sb.from("pages").insert({
        slug,
        edit_token: editToken,
        owner_name: ownerName,
        title,
        letter,
        birthday_date: body.birthdayDate,
        reveal_at: revealAt,
        gcash_number: gcash,
      });
      if (!error) return json({ slug, editToken });
      if (error.code !== "23505") {
        console.error("insert page", error);
        return json({ error: "Could not create the page." }, 500);
      }
    }
    return json({ error: "Could not generate a unique link. Please retry." }, 500);
  } catch (e) {
    console.error(e);
    return json({ error: "Unexpected server error." }, 500);
  }
});
