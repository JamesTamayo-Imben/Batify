import webpush from "npm:web-push@3.6.7";
import type { serviceClient } from "./common.ts";

type PushNotice = {
  title: string;
  body: string;
};

export async function notifyPageOwner(
  sb: ReturnType<typeof serviceClient>,
  pageId: string,
  notice: PushNotice,
): Promise<void> {
  let subscriptions;
  try {
    const result = await sb.from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("page_id", pageId);
    if (result.error) {
      console.error("Could not load push subscriptions:", result.error);
      return;
    }
    subscriptions = result.data;
  } catch (error) {
    console.error("Could not load push subscriptions:", error);
    return;
  }
  if (!subscriptions?.length) return;

  const subject = Deno.env.get("VAPID_SUBJECT");
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!subject || !publicKey || !privateKey) {
    console.error("Web Push is not configured; cannot notify page owner.");
    return;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch (error) {
    console.error("Could not configure Web Push:", error);
    return;
  }
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, JSON.stringify({ ...notice, url: "/" }), { TTL: 3600 });
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        try {
          const { error: deleteError } = await sb.from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
          if (deleteError) console.error("Could not remove expired push subscription:", deleteError);
        } catch (deleteError) {
          console.error("Could not remove expired push subscription:", deleteError);
        }
      } else {
        console.error("Could not deliver push notification:", error);
      }
    }
  }));
}
