import { getIO } from '../socket.js';
import { sendEmergencySMS, makeEmergencyCall, initiateEmergencyVoiceCall, buildEmergencySMSBody } from './twilioService.js';
import { sendEmergencyEmail } from './emailService.js';
import { sendPushNotification } from './pushService.js';

/**
 * Master Broadcaster for Multi-Channel Emergency Signals.
 * Dispatches parallel alerts across 5 simultaneous channels:
 * 1. Socket.io In-App Real-Time Push
 * 2. Twilio Emergency SMS Text Messages
 * 3. Twilio Automated Emergency Voice Calls (TwiML IVR)
 * 4. Nodemailer Fallback HTML Emergency Email
 * 5. Web Push API Browser Push Notifications
 *
 * @param {Object} params
 * @param {Object} params.user - Commuter user document
 * @param {Object} params.emergency - Created emergency document
 * @param {Array} params.recipients - Target recipient user documents
 * @param {Object} params.location - Location object { latitude, longitude, address }
 */
export const dispatchMultiChannelEmergencyAlert = async ({ user = {}, emergency = {}, recipients = [], location = {} }) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const token = emergency?.trackingToken || (emergency?.trip && emergency.trip.trackingToken);
  const relativeTrackingPath = token ? `/track/${token}` : (emergency?._id ? `/notifications` : '/');
  const trackingUrl = `${clientUrl}${relativeTrackingPath}`;
  const addressStr = location.address || emergency?.location?.address || 'GPS Location Attached';

  const smsBody = buildEmergencySMSBody({
    userName: user.name || 'Commuter',
    alertType: emergency.alertType || 'PANIC',
    activationTime: emergency.triggeredAt || emergency.createdAt || new Date(),
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      address: addressStr,
    },
  });

  console.log(`📡 [MULTI-CHANNEL BROADCASTER] Launching 5-channel parallel emergency broadcast to ${recipients.length} recipient(s)...`);

  // Channel 1: Socket.io In-App Push
  const broadcastSocketAlerts = async () => {
    try {
      const io = getIO();
      if (!io) return;
      recipients.forEach((recipient) => {
        io.to(`user_${recipient._id}`).emit('EMERGENCY_ALERT', {
          emergencyId: emergency._id,
          type: 'EMERGENCY',
          title: '🚨 Emergency Alert',
          message: `${user.name || 'Commuter'} has triggered an emergency.`,

          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
          },

          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            address: addressStr,
          },

          timestamp: emergency.triggeredAt || emergency.createdAt || new Date(),
        });
      });
      console.log(`⚡ [CHANNEL 1: SOCKET.IO] Dispatched in-app event to ${recipients.length} user socket room(s).`);
    } catch (err) {
      console.warn('⚠️ [CHANNEL 1: SOCKET.IO NOTICE]:', err.message);
    }
  };

  // Channel 5: Web Push Browser Notifications
  const broadcastWebPush = async () => {
    const pushTasks = recipients.flatMap((recipient) => {
      const subs = recipient.pushSubscriptions || (recipient.pushSubscription ? [recipient.pushSubscription] : []);
      return subs.map((sub) =>
        sendPushNotification(sub, {
          title: '🚨 SOS Emergency Alert',
          body: `${user.name || 'Commuter'} launched panic near ${addressStr}`,
          icon: '/logo.png',
          url: relativeTrackingPath,
          data: { url: relativeTrackingPath },
          tag: `emergency-alert-${Date.now()}`,
          renotify: true,
        })
      );
    });

    if (pushTasks.length > 0) {
      await Promise.allSettled(pushTasks);
      console.log(`🔔 [CHANNEL 5: WEB PUSH] Dispatched ${pushTasks.length} web push notifications.`);
    }
  };

  // Build concurrent multi-channel task matrix
  const tasks = [
    // 1. Socket.io Real-Time In-App Push
    broadcastSocketAlerts(),

    // 2. Twilio Automated Emergency SMS Text Messages
    ...recipients.map((r) => r.phone && sendEmergencySMS(r.phone, smsBody)),

    // 3. Twilio Automated Emergency Voice Calls (IVR)
    ...recipients.map(
      (r) =>
        r.phone &&
        makeEmergencyCall({
          guardianPhone: r.phone,
          userName: user.name || 'Commuter',
          location,
          emergencyMessage: `Emergency alert! ${user.name || 'Commuter'} has triggered an SOS panic alarm near ${addressStr}. Please take immediate action.`,
        })
    ),

    // 4. Nodemailer HTML Email Dispatch (Batch send to all registered guardians, operators & admins)
    sendEmergencyEmail({
      toEmail: recipients.map((r) => r.email).filter(Boolean),
      commuter: user,
      location,
      emergencyId: emergency._id,
      emergencyMessage: `${user.name || 'Commuter'} has launched an emergency SOS alert near ${addressStr}.`,
      activationTime: emergency.triggeredAt || emergency.createdAt || new Date(),
    }),

    // 5. Web Push API Browser Push Notifications
    broadcastWebPush(),
  ];

  const results = await Promise.allSettled(tasks.filter(Boolean));
  const fulfilledCount = results.filter((r) => r.status === 'fulfilled').length;
  console.log(`✅ [MULTI-CHANNEL BROADCAST COMPLETE] Executed ${results.length} total channel tasks (${fulfilledCount} succeeded).`);

  return results;
};

export default {
  dispatchMultiChannelEmergencyAlert,
};
