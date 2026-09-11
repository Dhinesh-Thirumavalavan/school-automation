import webpush, { type PushSubscription } from 'web-push';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BENi1FJhFwyNOA0WxcLR1b7lkwNAgn4Lc95De_5VLv_UFC8zzaJBmrC49S0yYYtAuppVKDESi3xBwC4fhFAlzFc';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:support@kalvi.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// MVP subscription store — in-memory, single-process, same tradeoff as the
// OTP store. Move to a persisted Supabase table before this needs to
// survive server restarts reliably.
const subscriptionsByPhone = new Map<string, PushSubscription[]>();

const cleanPhone = (phone: string) => (phone || '').replace(/[^0-9]/g, '');

export function saveSubscription(phone: string, subscription: PushSubscription) {
  const key = cleanPhone(phone);
  const existing = subscriptionsByPhone.get(key) || [];
  const withoutDupe = existing.filter((s) => s.endpoint !== subscription.endpoint);
  subscriptionsByPhone.set(key, [...withoutDupe, subscription]);
}

export function removeSubscription(phone: string, endpoint: string) {
  const key = cleanPhone(phone);
  const existing = subscriptionsByPhone.get(key) || [];
  subscriptionsByPhone.set(key, existing.filter((s) => s.endpoint !== endpoint));
}

export async function sendPushToPhone(phone: string, payload: { title: string; body: string; url?: string }) {
  if (!VAPID_PRIVATE_KEY) return;
  const key = cleanPhone(phone);
  const subs = subscriptionsByPhone.get(key) || [];
  const json = JSON.stringify(payload);

  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, json, { urgency: 'high' });
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        removeSubscription(phone, sub.endpoint);
      } else {
        console.error(`Push send failed for ${key}:`, err.message || err);
      }
    }
  }
}

export async function sendPushToPhones(phones: string[], payload: { title: string; body: string; url?: string }) {
  await Promise.all(phones.map((phone) => sendPushToPhone(phone, payload)));
}
