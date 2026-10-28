// admin — super-admin API (the "manage all" role). No accounts: guarded by a
// single secret set with `supabase secrets set ADMIN_SECRET=<long random string>`.
// Can: stats, list/search pages (incl. edit tokens, for owner support),
// unpublish/delete pages, moderate wishes + reports, verify payments.
import {
  clean, clientIp, json, preflight, rateLimitDurable, serviceClient, storagePathFromUrl,
} from "../_shared/common.ts";

function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const ip = clientIp(req);
    if (!(await rateLimitDurable(`admin:${ip}`, 60, 60 * 1000))) return json({ error: "Too many requests." }, 429);

    const secret = Deno.env.get("ADMIN_SECRET");
    if (!secret || secret.length < 16) return json({ error: "Admin is not configured." }, 503);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }

    const given = typeof body.adminSecret === "string" ? body.adminSecret : "";
    if (!safeEqual(given, secret)) {
      if (!(await rateLimitDurable(`admin-fail:${ip}`, 8, 15 * 60 * 1000))) return json({ error: "Too many attempts." }, 429);
      return json({ error: "Invalid admin secret." }, 401);
    }

    const sb = serviceClient();
    const id = (k: string) => clean(body[k], 64);
    const action = clean(body.action, 40);

    switch (action) {
      case "stats": {
        // deno-lint-ignore no-explicit-any
        const count = async (t: string, f?: (q: any) => any) => {
          let q = sb.from(t).select("id", { count: "exact", head: true });
          if (f) q = f(q);
          return (await q).count ?? 0;
        };
        const [pages, wishes, pendingWishes, contributions, pendingPay, reports] = await Promise.all([
          count("pages"), count("wishes"), count("wishes", (q) => q.eq("is_approved", false)),
          count("contributions"), count("contributions", (q) => q.eq("status", "pending")), count("reports"),
        ]);
        return json({ stats: { pages, wishes, pendingWishes, contributions, pendingPay, reports } });
      }

      case "list-campaigns": {
        const { data, error } = await sb.from("campaign_events").select("*").order("id");
        if (error) return json({ error: error.message }, 500);
        return json({ campaigns: data });
      }

      case "update-campaign": {
        const campaignId = clean(body.campaignId, 24);
        if (!["christmas", "valentines", "anniversary"].includes(campaignId)) {
          return json({ error: "Unknown seasonal campaign." }, 400);
        }

        const monthDay = (month: unknown, day: unknown) => {
          const m = Number(month), d = Number(day);
          if (!Number.isInteger(m) || !Number.isInteger(d) || m < 1 || m > 12) return false;
          return d >= 1 && d <= new Date(Date.UTC(2000, m, 0)).getUTCDate();
        };
        if (!monthDay(body.startMonth, body.startDay) || !monthDay(body.endMonth, body.endDay)) {
          return json({ error: "Enter valid campaign start and end dates (month and day)." }, 400);
        }

        const title = clean(body.title, 80);
        const description = clean(body.description, 240);
        if (!title || !description) return json({ error: "Campaign title and description are required." }, 400);

        const allowedGifts = ["flower", "teddy", "chocolate", "media"];
        const giftOptions = body.giftOptions;
        if (!giftOptions || typeof giftOptions !== "object" || Array.isArray(giftOptions)) {
          return json({ error: "Choose at least one gift option." }, 400);
        }
        const validOptions: Record<string, string> = {};
        for (const [giftId, value] of Object.entries(giftOptions)) {
          if (!allowedGifts.includes(giftId) || typeof value !== "string") {
            return json({ error: "Invalid campaign gift option." }, 400);
          }
          const label = clean(value, 40);
          if (label) validOptions[giftId] = label;
        }
        if (Object.keys(validOptions).length === 0) {
          return json({ error: "Choose at least one gift option and give it a name." }, 400);
        }

        const { data, error } = await sb.from("campaign_events").update({
          title,
          description,
          is_enabled: body.isEnabled === true,
          start_month: Number(body.startMonth),
          start_day: Number(body.startDay),
          end_month: Number(body.endMonth),
          end_day: Number(body.endDay),
          gift_options: validOptions,
          updated_at: new Date().toISOString(),
        }).eq("id", campaignId).select("*").single();
        if (error) return json({ error: error.message }, 500);
        return json({ campaign: data });
      }

      case "list-pages": {
        const q = clean(body.q, 60).replace(/[%,()]/g, "");
        let query = sb.from("pages")
          .select("id, slug, edit_token, owner_name, title, birthday_date, reveal_at, is_published, created_at, wishes(count)")
          .order("created_at", { ascending: false }).limit(100);
        if (q) query = query.or(`slug.ilike.%${q}%,owner_name.ilike.%${q}%,title.ilike.%${q}%`);
        const { data, error } = await query;
        if (error) return json({ error: error.message }, 500);
        return json({ pages: data });
      }

      case "set-published": {
        const { error } = await sb.from("pages").update({ is_published: body.value === true }).eq("id", id("pageId"));
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "delete-page": {
        const pageId = id("pageId");
        for (const bucket of ["wish-media", "payment-proofs"]) {
          const { data } = await sb.storage.from(bucket).list(pageId, { limit: 1000 });
          if (data?.length) await sb.storage.from(bucket).remove(data.map((f) => `${pageId}/${f.name}`));
        }
        const { error } = await sb.from("pages").delete().eq("id", pageId);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "list-wishes": {
        let query = sb.from("wishes")
          .select("*, pages(slug, title)").order("created_at", { ascending: false }).limit(100);
        if (body.pending === true) query = query.eq("is_approved", false);
        if (id("pageId")) query = query.eq("page_id", id("pageId"));
        const { data, error } = await query;
        if (error) return json({ error: error.message }, 500);
        return json({ wishes: data });
      }

      case "approve-wish": {
        const { error } = await sb.from("wishes").update({ is_approved: true }).eq("id", id("wishId"));
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "delete-wish": {
        const { data } = await sb.from("wishes").delete().eq("id", id("wishId")).select("media_url");
        const path = storagePathFromUrl(data?.[0]?.media_url ?? null, "wish-media");
        if (path) await sb.storage.from("wish-media").remove([path]);
        return json({ ok: true });
      }

      case "list-reports": {
        const { data, error } = await sb.from("reports")
          .select("id, reason, created_at, wishes(id, sender_name, message, media_url, media_type, is_approved, pages(slug, title))")
          .order("created_at", { ascending: false }).limit(100);
        if (error) return json({ error: error.message }, 500);
        return json({ reports: data });
      }

      case "dismiss-report": {
        const { error } = await sb.from("reports").delete().eq("id", id("reportId"));
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "list-contributions": {
        const { data, error } = await sb.from("contributions")
          .select("*, pages(slug, title)").order("created_at", { ascending: false }).limit(100);
        if (error) return json({ error: error.message }, 500);
        const paths = (data || []).map((c) => c.proof_url).filter(Boolean) as string[];
        const signed: Record<string, string> = {};
        if (paths.length) {
          const r = await sb.storage.from("payment-proofs").createSignedUrls(paths, 3600);
          for (const s of r.data || []) if (s.path && s.signedUrl) signed[s.path] = s.signedUrl;
        }
        return json({
          contributions: (data || []).map((c) => ({ ...c, proof_signed_url: c.proof_url ? signed[c.proof_url] || null : null })),
        });
      }

      case "mark-paid": {
        const { error } = await sb.from("contributions").update({ status: "paid" }).eq("id", id("contributionId"));
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      default:
        return json({ error: "Unknown action." }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: "Unexpected server error." }, 500);
  }
});
