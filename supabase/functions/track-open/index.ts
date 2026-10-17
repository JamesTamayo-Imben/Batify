// track-open: counts a letter opening. Best effort and deliberately quiet: it always answers 200
// for well-formed requests, so rate-limited or unknown slugs reveal nothing and never break the page.
import { clean, clientIp, json, preflight, rateLimitDurable, serviceClient } from "../_shared/common.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }

    const slug = clean(body.slug, 80).toLowerCase();
    if (!/^[a-z0-9-]{3,80}$/.test(slug)) return json({ error: "Invalid slug." }, 400);

    const ip = clientIp(req);
    // One IP cannot inflate the counter: 60 opens/hour overall, 2 per page per hour.
    if (!(await rateLimitDurable(`open:${ip}`, 60, 60 * 60 * 1000))) return json({ ok: true, counted: false });
    if (!(await rateLimitDurable(`open:${ip}:${slug}`, 2, 60 * 60 * 1000))) return json({ ok: true, counted: false });

    const { error } = await serviceClient().rpc("increment_open", { p_slug: slug });
    if (error) {
      console.warn("increment_open failed (is schema.sql v2 applied?)", error.message);
      return json({ ok: true, counted: false });
    }
    return json({ ok: true, counted: true });
  } catch (e) {
    console.error(e);
    return json({ ok: true, counted: false });
  }
});
