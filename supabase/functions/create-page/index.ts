// create-page — creates a birthday page and returns { slug, editToken }.
import {
  clean, clientIp, isValidDate, json, normalizeGcash, parseTimestamp,
  isValidTheme, preflight, randomString, rateLimitDurable, serviceClient, slugify, verifyTurnstile,
} from "../_shared/common.ts";

function campaignIsActive(campaign: {
  is_enabled: boolean;
  start_month: number;
  start_day: number;
  end_month: number;
  end_day: number;
}): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const today = month * 100 + day;
  const start = campaign.start_month * 100 + campaign.start_day;
  const end = campaign.end_month * 100 + campaign.end_day;
  return campaign.is_enabled && (start <= end
    ? today >= start && today <= end
    : today >= start || today <= end);
}

function manilaTodayOrdinal(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return Date.UTC(year, month - 1, day) / (24 * 60 * 60 * 1000);
}

function eventDateOrdinal(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / (24 * 60 * 60 * 1000);
}

function upcomingCampaignDateOrdinal(
  campaign: { end_month: number; end_day: number },
  todayOrdinal: number,
): number {
  const year = new Date(todayOrdinal * 24 * 60 * 60 * 1000).getUTCFullYear();
  const thisYearEvent = Date.UTC(year, campaign.end_month - 1, campaign.end_day) / (24 * 60 * 60 * 1000);
  return thisYearEvent >= todayOrdinal
    ? thisYearEvent
    : Date.UTC(year + 1, campaign.end_month - 1, campaign.end_day) / (24 * 60 * 60 * 1000);
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const ip = clientIp(req);
    if (!(await rateLimitDurable(`create:${ip}`, 5, 60 * 60 * 1000))) {
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

    const theme = isValidTheme(body.theme) ? body.theme : "confetti";

    // 3-5. Slug + token, insert (retry on slug collision)
    const sb = serviceClient();
    const campaignType = clean(body.campaignType, 24);
    const christmasTreeColor = body.christmasTreeColor;
    const christmasGiftBoxColor = body.christmasGiftBoxColor;
    const isHexColor = (value: unknown): value is string =>
      typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
    if (campaignType === "christmas" &&
      ((christmasTreeColor !== undefined && !isHexColor(christmasTreeColor)) ||
        (christmasGiftBoxColor !== undefined && !isHexColor(christmasGiftBoxColor)))) {
      return json({ error: "Christmas colors must be valid six-digit hex colors." }, 400);
    }
    let campaign: {
      is_enabled: boolean;
      start_month: number;
      start_day: number;
      end_month: number;
      end_day: number;
    } | null = null;
    if (campaignType) {
      if (!["christmas", "halloween", "valentines", "new_year", "anniversary"].includes(campaignType)) {
        return json({ error: "Unknown seasonal campaign." }, 400);
      }
      const { data, error: campaignError } = await sb
        .from("campaign_events").select("*").eq("id", campaignType).maybeSingle();
      if (campaignError) {
        console.error("load campaign", campaignError);
        return json({ error: "Seasonal campaigns are not configured. Please contact support." }, 503);
      }
      if (!data || !campaignIsActive(data)) {
        return json({ error: "This seasonal campaign is not currently accepting new pages." }, 400);
      }
      campaign = data;

      const todayOrdinal = manilaTodayOrdinal();
      const eventOrdinal = eventDateOrdinal(body.birthdayDate);
      const daysUntilEvent = eventOrdinal - todayOrdinal;
      const matchesConfiguredEventDate = daysUntilEvent >= 0 &&
        eventOrdinal === upcomingCampaignDateOrdinal(campaign, todayOrdinal);
      if (daysUntilEvent < 0 || (campaignType !== "anniversary" && daysUntilEvent > 30 && !matchesConfiguredEventDate)) {
        return json({
          error: campaignType === "anniversary"
            ? "Choose an anniversary date that has not passed."
            : "Choose an event date within the next 30 days or the configured event date.",
        }, 400);
      }
    }

    const base = slugify(ownerName);
    const opensAt = campaignType
      ? new Date(`${body.birthdayDate}T00:00:00+08:00`).toISOString()
      : null;
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
        opens_at: opensAt,
        campaign_type: campaignType || null,
        christmas_tree_color: campaignType === "christmas" ? christmasTreeColor ?? null : null,
        christmas_gift_box_color: campaignType === "christmas" ? christmasGiftBoxColor ?? null : null,
        reveal_at: revealAt,
        gcash_number: gcash,
        theme,
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
