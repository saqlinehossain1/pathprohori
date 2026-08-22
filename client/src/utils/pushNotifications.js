import authApi from '../api/authApi';

// Helper to convert base64 VAPID public key to Uint8Array required by pushManager.subscribe
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const subscribeToWebPushNotifications = async (vapidPublicKey) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Web Push Notifications are not supported by this browser.');
    return { success: false, reason: 'unsupported' };
  }

  try {
    // 1. Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission was denied by user.');
      return { success: false, reason: 'permission_denied' };
    }

    // 2. Register Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // 3. Obtain Push Subscription using VAPID Key
    const keyToUse =
      vapidPublicKey ||
      'BKENHtGxGnZDHrOj2sd7ISf1xs_FkRqw7rBz7r0Y23SjUzFgotSCglNNkLcV3jUv2iOHWprPVzydRaUtYcqU-tY';

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(keyToUse);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
    }

    // 4. Save pushSubscription object to backend user profile via authenticated authApi
    await authApi.subscribePush(subscription);

    console.log('✅ Web Push Notification subscription successfully registered!');
    return { success: true, subscription };
  } catch (err) {
    console.error('Failed to subscribe to Web Push Notifications:', err);
    return { success: false, error: err.message };
  }
};

export default { subscribeToWebPushNotifications };
