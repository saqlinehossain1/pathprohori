import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Validates whether an API key/token is non-empty, not a placeholder, and sufficiently long.
 */
const isValidKey = (key) =>
  typeof key === 'string' &&
  key.trim().length > 10 &&
  !key.includes('YOUR_TWILIO') &&
  !key.includes('your_twilio');

/**
 * Creates or retrieves the cached Twilio Client instance.
 * Configured dynamically from environment variables:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER
 */
const getTwilioClient = () => {
  dotenv.config();
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const apiKeySid = process.env.TWILIO_API_KEY_SID || process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER || '+17372212163';

  let client = null;

  try {
    if (isValidKey(accountSid) && isValidKey(authToken)) {
      client = twilio(accountSid, authToken);
    } else if (isValidKey(apiKeySid) && isValidKey(apiSecret) && isValidKey(accountSid)) {
      client = twilio(apiKeySid, apiSecret, { accountSid });
    }
  } catch (err) {
    console.warn('⚠️ [Twilio] Initialization Warning:', err.message);
  }

  return { client, fromPhone };
};

/**
 * Formats a phone number to standard international E.164 format.
 * (e.g. "01712345678" -> "+8801712345678")
 */
export const formatPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('880')) return `+${cleaned}`;
  if (cleaned.startsWith('01')) return `+88${cleaned}`;
  return cleaned.startsWith('+') ? cleaned : `+88${cleaned}`;
};

/**
 * Constructs a concise, high-priority emergency SMS suitable for urgent situations.
 */
export const buildEmergencySMSBody = ({
  userName = 'Commuter',
  alertType = 'PANIC',
  activationTime = new Date(),
  location = {},
  customMessage = '',
} = {}) => {
  const isDuress = alertType === 'SILENT_DURESS';
  const alertTitle = isDuress ? 'SILENT DURESS' : 'CRITICAL PANIC';

  const timestamp =
    activationTime instanceof Date
      ? activationTime
      : new Date(activationTime || Date.now());
  const timeStr = timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const hasCoords =
    typeof location.latitude === 'number' &&
    typeof location.longitude === 'number' &&
    !isNaN(location.latitude) &&
    !isNaN(location.longitude);

  const lat = hasCoords ? location.latitude : null;
  const lng = hasCoords ? location.longitude : null;
  const addressStr =
    location.address ||
    (hasCoords ? `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E` : 'Location Attached');
  const googleMapsUrl = hasCoords
    ? `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`
    : '';

  const lines = [
    `🚨 [PATHPROHORI] ${alertTitle}!`,
    `User: ${userName}`,
    `Time: ${timeStr}`,
    `Location: ${addressStr}`,
  ];

  if (hasCoords) {
    lines.push(`GPS: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
    lines.push(`Map: ${googleMapsUrl}`);
  }

  if (customMessage) {
    lines.push(`Info: ${customMessage}`);
  }

  lines.push(`ACTION: Call commuter immediately or alert emergency services (999).`);

  return lines.join('\n');
};

/**
 * Reusable Emergency SMS Dispatch Service.
 */
export const sendEmergencySMS = async (targetOrOptions, legacyMessageBody = '') => {
  let toPhoneNumber = '';
  let messageBody = '';

  if (typeof targetOrOptions === 'object' && targetOrOptions !== null) {
    toPhoneNumber = targetOrOptions.toPhoneNumber || targetOrOptions.phone || '';
    if (targetOrOptions.messageBody) {
      messageBody = targetOrOptions.messageBody;
    } else {
      messageBody = buildEmergencySMSBody({
        userName: targetOrOptions.userName || targetOrOptions.commuter?.name || 'Commuter',
        alertType: targetOrOptions.alertType || 'PANIC',
        activationTime: targetOrOptions.activationTime || new Date(),
        location: targetOrOptions.location || {},
        customMessage: targetOrOptions.customMessage || targetOrOptions.transitInfo || '',
      });
    }
  } else {
    toPhoneNumber = String(targetOrOptions || '');
    messageBody = legacyMessageBody;
  }

  if (!toPhoneNumber || !messageBody) {
    console.warn('⚠️ [Twilio SMS] Recipient phone number or message body missing.');
    return false;
  }

  const targetNumber = formatPhoneNumber(toPhoneNumber);
  const { client, fromPhone } = getTwilioClient();

  // Concurrently attempt WhatsApp notification if available
  sendEmergencyWhatsApp(toPhoneNumber, messageBody).catch(() => {});

  if (client) {
    try {
      const message = await client.messages.create({
        body: messageBody,
        from: fromPhone,
        to: targetNumber,
      });
      console.log(`📱 [TWILIO SMS DISPATCHED] SID: ${message.sid} -> ${targetNumber}`);
      return true;
    } catch (err) {
      console.warn(`⚠️ [TWILIO SMS NOTICE] Failed for ${targetNumber}:`, err.message);
    }
  }

  // Developer simulation / fallback log with direct 1-click WhatsApp link
  const cleanDigits = targetNumber.replace(/\D/g, '');
  console.log(`📱 [SIMULATED SMS] To: ${targetNumber} | From: ${fromPhone} | Message:\n"${messageBody}"`);
  console.log(`💬 [DIRECT WHATSAPP LINK] https://wa.me/${cleanDigits}?text=${encodeURIComponent(messageBody)}`);
  return true;
};

/**
 * Sends a WhatsApp distress alert via Twilio WhatsApp API or 1-Click WhatsApp link.
 */
export const sendEmergencyWhatsApp = async (toPhoneNumber, messageBody) => {
  if (!toPhoneNumber) return false;

  const targetNumber = formatPhoneNumber(toPhoneNumber);
  const cleanDigits = targetNumber.replace(/\D/g, '');
  const waClickToChatUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(messageBody)}`;
  const whatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';

  const { client } = getTwilioClient();

  if (client) {
    try {
      const message = await client.messages.create({
        body: messageBody,
        from: `whatsapp:${whatsappFrom}`,
        to: `whatsapp:${targetNumber}`,
      });
      console.log(`💬 [TWILIO WHATSAPP DISPATCHED] SID: ${message.sid} -> whatsapp:${targetNumber}`);
      return true;
    } catch (err) {
      console.warn(`⚠️ [TWILIO WHATSAPP NOTICE] -> whatsapp:${targetNumber}:`, err.message);
    }
  }

  return true;
};

/**
 * Constructs clean TwiML voice XML with clear, spoken emergency alert message.
 */
export const buildEmergencyVoiceTwiML = ({
  userName = 'Commuter',
  location = {},
  customMessage = '',
} = {}) => {
  const sanitizedUser = String(userName || 'A commuter').replace(/[<>&'"]/g, '');

  let spokenMessage = `This is an emergency alert. ${sanitizedUser} has activated a panic alert. Please check on them immediately.`;

  const hasCoords =
    typeof location.latitude === 'number' &&
    typeof location.longitude === 'number' &&
    !isNaN(location.latitude) &&
    !isNaN(location.longitude);

  if (hasCoords) {
    const latFormatted = location.latitude.toFixed(4);
    const lngFormatted = location.longitude.toFixed(4);
    spokenMessage += ` The reported location is latitude ${latFormatted}, longitude ${lngFormatted}.`;
  }

  if (location.address && typeof location.address === 'string' && location.address.trim().length > 0) {
    const sanitizedAddress = location.address.replace(/[<>&'"]/g, '');
    spokenMessage += ` Near ${sanitizedAddress}.`;
  }

  if (customMessage && typeof customMessage === 'string' && customMessage.trim().length > 0) {
    const sanitizedMsg = customMessage.replace(/[<>&'"]/g, '');
    spokenMessage += ` ${sanitizedMsg}`;
  }

  return `<Response><Pause length="1"/><Say voice="alice" language="en-US">${spokenMessage}</Say><Pause length="2"/><Say voice="alice" language="en-US">Repeating: ${spokenMessage}</Say></Response>`;
};

/**
 * Reusable Emergency Voice Call Service.
 */
export const makeEmergencyCall = async (
  targetOrOptions,
  legacyUserName = 'Commuter',
  legacyEmergencyMessage = '',
  legacyLocation = 'Unknown location'
) => {
  let toPhoneNumber = '';
  let userName = 'Commuter';
  let emergencyMessage = '';
  let locationObj = {};

  if (typeof targetOrOptions === 'object' && targetOrOptions !== null) {
    toPhoneNumber =
      targetOrOptions.guardianPhone ||
      targetOrOptions.toPhoneNumber ||
      targetOrOptions.phone ||
      '';
    userName =
      targetOrOptions.userName ||
      targetOrOptions.commuterName ||
      targetOrOptions.commuter?.name ||
      'Commuter';
    emergencyMessage =
      targetOrOptions.emergencyMessage ||
      targetOrOptions.message ||
      '';

    if (typeof targetOrOptions.location === 'object' && targetOrOptions.location !== null) {
      locationObj = targetOrOptions.location;
    } else if (typeof targetOrOptions.location === 'string') {
      locationObj = { address: targetOrOptions.location };
    } else if (typeof targetOrOptions.address === 'string') {
      locationObj = { address: targetOrOptions.address };
    }
  } else {
    toPhoneNumber = String(targetOrOptions || '');
    userName = legacyUserName || 'Commuter';
    emergencyMessage = legacyEmergencyMessage || '';
    if (typeof legacyLocation === 'object' && legacyLocation !== null) {
      locationObj = legacyLocation;
    } else {
      locationObj = { address: String(legacyLocation || 'Unknown location') };
    }
  }

  if (!toPhoneNumber) {
    console.warn('⚠️ [Twilio Voice] Recipient guardian phone number missing.');
    return false;
  }

  const targetNumber = formatPhoneNumber(toPhoneNumber);
  const twimlVoiceMessage = buildEmergencyVoiceTwiML({
    userName,
    location: locationObj,
    customMessage: emergencyMessage,
  });

  const { client, fromPhone } = getTwilioClient();

  if (client) {
    try {
      const call = await client.calls.create({
        twiml: twimlVoiceMessage,
        to: targetNumber,
        from: fromPhone,
      });
      console.log(`📞 [TWILIO VOICE CALL INITIATED] SID: ${call.sid} -> ${targetNumber}`);
      return true;
    } catch (err) {
      console.warn(`⚠️ [TWILIO VOICE CALL NOTICE] Failed for ${targetNumber}:`, err.message);
    }
  }

  // Developer simulation / fallback log
  console.log(`📞 [SIMULATED VOICE CALL] To: ${targetNumber} | From: ${fromPhone} | User: "${userName}"`);
  console.log(`🔊 [SPOKEN TWIML XML]:\n${twimlVoiceMessage}`);
  return true;
};

// Backwards compatibility alias
export const initiateEmergencyVoiceCall = makeEmergencyCall;

export default {
  makeEmergencyCall,
  initiateEmergencyVoiceCall,
  buildEmergencyVoiceTwiML,
  sendEmergencySMS,
  buildEmergencySMSBody,
  sendEmergencyWhatsApp,
  formatPhoneNumber,
};
