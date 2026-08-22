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

export const sendPushNotification = async (subscription, payload) => {
  if (!subscription || !subscription.endpoint) return false;

  // If VAPID keys were dynamically loaded, attempt setup
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
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    await webpush.sendNotification(subscription, payloadString);
    console.log('🔔 Web Push Notification sent to endpoint:', subscription.endpoint.slice(0, 30) + '...');
    return true;
  } catch (err) {
    console.error('❌ Failed to send Web Push Notification:', err.message);
    return false;
  }
};

export default { sendPushNotification };
