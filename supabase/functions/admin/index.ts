// admin — super-admin API guarded by Supabase Auth email OTP sessions.
import {
  clean, clientIp, json, pendingWishMediaPath, preflight, privatizeLegacyWishMedia,
  publishPendingWishMedia, rateLimitDurable, REQUEST_LIMITS, serviceClient, signPendingWishMedia, storagePathFromUrl,
} from "../_shared/common.ts";

const RATE_LIMITS = [
  { action: "Create pages", limit: REQUEST_LIMITS.pageCreate.max, window: "1 hour per IP" },
  { action: "Wishes, reports, contributions", limit: REQUEST_LIMITS.wishSubmission.max, window: "10 minutes per IP, shared endpoint" },
  { action: "Owner dashboard actions", limit: REQUEST_LIMITS.ownerRequest.max, window: "1 minute per IP" },
  { action: "Owner actions with a valid edit link", limit: REQUEST_LIMITS.ownerValidToken.max, window: "1 minute per IP" },
  { action: "Invalid edit-link attempts", limit: REQUEST_LIMITS.ownerInvalidToken.max, window: "10 minutes per IP" },
  { action: "Open tracking", limit: REQUEST_LIMITS.openPerIp.max, window: "1 hour per IP; 2 per page" },
  { action: "Admin requests", limit: REQUEST_LIMITS.adminRequest.max, window: "1 minute per IP" },
];

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const ip = clientIp(req);
    if (!(await rateLimitDurable(`admin:${ip}`, REQUEST_LIMITS.adminRequest.max, REQUEST_LIMITS.adminRequest.windowMs))) return json({ error: "Too many requests." }, 429);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }

    const sb = serviceClient();
    const id = (k: string) => clean(body[k], 64);
    const action = clean(body.action, 40);

    const bearer = req.headers.get("authorization") || "";
    const token = bearer.match(/^Bearer\s+(.+)$/i)?.[1] || "";
    if (!token || token.length > 4096) return json({ error: "Admin session expired. Sign in again." }, 401);
    const { data: { user }, error: authError } = await sb.auth.getUser(token);
    if (authError || !user) return json({ error: "Admin session expired. Sign in again." }, 401);
    const adminEmail = Deno.env.get("ADMIN_EMAIL")?.trim().toLowerCase();
    if (!adminEmail) {
      console.error("ADMIN_EMAIL is not configured for the admin function.");
      return json({ error: "Admin access is not configured." }, 503);
    }
    if (!user.email_confirmed_at || !user.email || user.email.toLowerCase() !== adminEmail) {
      return json({ error: "This account is not authorized to use the admin console." }, 403);
    }

    async function addSignedWishMedia(wish: Record<string, unknown> | null) {
      if (!wish || typeof wish.media_url !== "string" || !wish.media_url.startsWith("pending-wish-media:")) return wish;
      const pageId = typeof wish.page_id === "string" ? wish.page_id : "";
      const path = pendingWishMediaPath(wish.media_url, pageId);
      if (!path) throw new Error("Invalid pending wish-media path.");
      return { ...wish, media_url: await signPendingWishMedia(sb, path) };
    }

    switch (action) {
      case "stats": {
        // deno-lint-ignore no-explicit-any
        const count = async (t: string, f?: (q: any) => any) => {
          let q = sb.from(t).select("id", { count: "exact", head: true });
          if (f) q = f(q);
          const result = await q;
          return { count: result.count ?? 0, error: result.error };
        };
        const counts = await Promise.all([
          count("pages"), count("wishes"), count("wishes", (q) => q.eq("is_approved", false)),
          count("contributions"), count("contributions", (q) => q.eq("status", "pending")), count("reports"),
        ]);
        const failed = counts.find((result) => result.error);
        if (failed?.error) return json({ error: `Could not load admin counts: ${failed.error.message}` }, 500);
        const [pages, wishes, pendingWishes, contributions, pendingPay, reports] = counts.map((result) => result.count);
        return json({ stats: { pages, wishes, pendingWishes, contributions, pendingPay, reports, rateLimits: RATE_LIMITS } });
      }

      case "list-campaigns": {
        const { data, error } = await sb.from("campaign_events").select("*").order("id");
        if (error) return json({ error: error.message }, 500);
        return json({ campaigns: data });
      }

      case "update-campaign": {
        const campaignId = clean(body.campaignId, 24);
        if (!["christmas", "halloween", "valentines", "new_year", "anniversary"].includes(campaignId)) {
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

        const allowedGifts = ["flower", "teddy", "chocolate", "cake", "coffee", "book", "balloon", "media"];
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
          is_priority: campaignId !== "anniversary" && body.isPriority === true,
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
          .select("id, slug, edit_token, owner_name, title, birthday_date, expires_at, reveal_at, is_published, created_at, device_info, wishes(count)")
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
        for (const bucket of ["wish-media", "wish-media-pending", "payment-proofs"]) {
          const { data } = await sb.storage.from(bucket).list(pageId, { limit: 1000 });
          if (data?.length) await sb.storage.from(bucket).remove(data.map((f) => `${pageId}/${f.name}`));
        }
        const { error } = await sb.from("pages").delete().eq("id", pageId);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "list-wishes": {
        let query = sb.from("wishes")
          .select("*, pages(slug, title, reveal_at, is_published, opens_at, expires_at)").order("created_at", { ascending: false }).limit(100);
        if (body.pending === true) query = query.eq("is_approved", false);
        if (id("pageId")) query = query.eq("page_id", id("pageId"));
        const { data, error } = await query;
        if (error) return json({ error: error.message }, 500);
        try {
          return json({ wishes: await Promise.all((data || []).map(addSignedWishMedia)) });
        } catch (error) {
          console.error("Could not sign pending admin wish media:", error);
          return json({ error: "Could not load wish media." }, 500);
        }
      }

      case "secure-pending-media": {
        const { data: pending, error } = await sb.from("wishes")
          .select("id, page_id, media_url")
          .eq("is_approved", false)
          .like("media_url", "%/storage/v1/object/public/wish-media/%")
          .limit(20);
        if (error) return json({ error: "Could not load legacy pending media." }, 500);

        let migrated = 0;
        let failed = 0;
        for (const wish of pending || []) {
          let moved: Awaited<ReturnType<typeof privatizeLegacyWishMedia>> | null = null;
          try {
            moved = await privatizeLegacyWishMedia(sb, wish.page_id, wish.media_url);
            const { data, error: updateError } = await sb.from("wishes")
              .update({ media_url: moved.pendingUrl })
              .eq("id", wish.id)
              .eq("is_approved", false)
              .eq("media_url", wish.media_url)
              .select("id");
            if (updateError || !data?.length) {
              const { error: cleanupError } = await sb.storage.from("wish-media-pending").remove([moved.pendingPath]);
              if (cleanupError) console.error("Could not clean up migrated media after database update failed:", cleanupError);
              if (updateError) {
                console.error("Could not secure legacy pending media:", updateError);
                failed++;
              }
              continue;
            }
            migrated++;
            const { error: removeError } = await sb.storage.from("wish-media").remove([moved.publicPath]);
            if (removeError) {
              console.error("Could not remove legacy public wish media:", removeError);
              failed++;
            }
          } catch (error) {
            console.error("Could not migrate legacy pending wish media:", error);
            if (moved) {
              const { error: cleanupError } = await sb.storage.from("wish-media-pending").remove([moved.pendingPath]);
              if (cleanupError) console.error("Could not clean up failed legacy media migration:", cleanupError);
            }
            failed++;
          }
        }
        return json({ migrated, failed, hasMore: (pending || []).length === 20 });
      }

      case "approve-wish": {
        const { data: wish, error: wishError } = await sb.from("wishes")
          .select("id, page_id, media_url, is_approved").eq("id", id("wishId")).maybeSingle();
        if (wishError) return json({ error: wishError.message }, 500);
        if (!wish) return json({ error: "Wish not found." }, 404);
        if (wish.is_approved) return json({ ok: true });

        const patch: Record<string, unknown> = { is_approved: true };
        let pendingPath: string | null = null;
        let publicPath: string | null = null;
        if (typeof wish.media_url === "string" && wish.media_url.startsWith("pending-wish-media:")) {
          pendingPath = pendingWishMediaPath(wish.media_url, wish.page_id);
          if (!pendingPath) return json({ error: "Invalid pending wish media." }, 500);
          try {
            const published = await publishPendingWishMedia(sb, wish.page_id, pendingPath);
            patch.media_url = published.publicUrl;
            publicPath = published.publicPath;
          } catch (error) {
            console.error("Could not publish approved admin wish media:", error);
            return json({ error: "Could not publish this wish's media." }, 500);
          }
        }
        const { data, error } = await sb.from("wishes").update(patch)
          .eq("id", wish.id).eq("is_approved", false).select("id");
        if (error || !data?.length) {
          if (publicPath) {
            const { error: cleanupError } = await sb.storage.from("wish-media").remove([publicPath]);
            if (cleanupError) console.error("Could not clean up published media after admin approval failed:", cleanupError);
          }
          if (error) console.error("Could not approve wish from admin:", error);
          return json({ error: "Could not approve this wish." }, error ? 500 : 409);
        }
        if (pendingPath) {
          const { error: cleanupError } = await sb.storage.from("wish-media-pending").remove([pendingPath]);
          if (cleanupError) console.error("Could not remove private media after admin approval:", cleanupError);
        }
        return json({ ok: true });
      }

      case "delete-wish": {
        const { data } = await sb.from("wishes").delete().eq("id", id("wishId")).select("media_url, page_id");
        const mediaUrl = data?.[0]?.media_url ?? null;
        const pendingPath = data?.[0]?.page_id
          ? pendingWishMediaPath(mediaUrl, data[0].page_id)
          : null;
        const path = pendingPath || storagePathFromUrl(mediaUrl, "wish-media");
        if (path) {
          const bucket = pendingPath ? "wish-media-pending" : "wish-media";
          const { error } = await sb.storage.from(bucket).remove([path]);
          if (error) {
            console.error("Could not remove wish media after admin deletion:", error);
            return json({ error: "Wish was deleted, but its media could not be removed." }, 500);
          }
        }
        return json({ ok: true });
      }

      case "list-reports": {
        const { data, error } = await sb.from("reports")
          .select("id, reason, created_at, device_info, wishes(id, sender_name, message, media_url, media_type, is_approved, pages(slug, title))")
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
        let query = sb.from("contributions")
          .select("*, pages(slug, title)").order("created_at", { ascending: false }).limit(100);
        if (body.pending === true) query = query.eq("status", "pending");
        const { data, error } = await query;
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
