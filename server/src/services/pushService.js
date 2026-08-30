import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@pathprohori.com';

let isConfigured = false;

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    isConfigured = true;
    console.log('✅ Web Push VAPID details configured successfully.');
  } catch (err) {
    console.warn('⚠️ Web Push initialization warning:', err.message);
  }
}

/**
 * Sends a Web Push browser notification to a given subscription.
 *
 * @param {Object} subscription - Web push subscription object { endpoint, keys: { auth, p256dh } }
 * @param {Object} payload - Notification payload { title, body, icon, data }
 * @returns {Promise<boolean>}
 */
export const sendPushNotification = async (subscription, payload = {}) => {
  if (!subscription || !subscription.endpoint) {
    return false;
  }

  if (!isConfigured && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    try {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@pathprohori.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      isConfigured = true;
    } catch (e) {}
  }

  try {
    const targetUrl = payload.url || (payload.data && payload.data.url) || '/notifications';
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify({
      title: payload.title || '🚨 PATHPROHORI EMERGENCY ALERT',
      body: payload.body || 'A high-priority emergency alert requires your attention.',
      icon: payload.icon || '/logo.png',
      badge: payload.badge || '/logo.png',
      tag: payload.tag || `emergency-alert-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 300],
      url: targetUrl,
      data: { url: targetUrl, ...(payload.data || {}) },
    });

    await webpush.sendNotification(subscription, payloadString);
    console.log('🔔 Web Push Notification sent to endpoint:', subscription.endpoint.slice(0, 30) + '...');
    return true;
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.warn('⚠️ [Web Push] Expired or invalid push subscription.');
    } else {
      console.warn('⚠️ [Web Push Error]:', error.message);
    }
    return false;
  }
};

export default {
  sendPushNotification,
};
