import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@pathprohori.com';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    console.log('✅ Web Push VAPID details configured successfully.');
  } catch (err) {
    console.warn('⚠️ [Web Push VAPID Warning]:', err.message);
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

  try {
    const payloadString = JSON.stringify({
      title: payload.title || '🚨 PATHPROHORI EMERGENCY ALERT',
      body: payload.body || 'A high-priority emergency alert requires your attention.',
      icon: payload.icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'emergency-alert',
      vibrate: [300, 100, 300, 100, 300],
      data: payload.data || { url: payload.url || '/notifications' },
    });

    await webpush.sendNotification(subscription, payloadString);
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
