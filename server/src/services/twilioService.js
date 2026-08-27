import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER || '+17372212163';

const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiSecret = process.env.TWILIO_API_SECRET;

let twilioClient = null;

const isValidKey = (key) => key && !key.includes('YOUR_TWILIO') && key.trim().length > 10;

try {
  if (isValidKey(apiKeySid) && isValidKey(apiSecret)) {
    // Initialized with API Key & Secret
    twilioClient = twilio(apiKeySid, apiSecret, { accountSid: accountSid && accountSid.startsWith('AC') ? accountSid : undefined });
    console.log('✅ Twilio client initialized with API Key SID:', apiKeySid);
  } else if (isValidKey(accountSid) && isValidKey(authToken)) {
    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio client initialized with Account SID:', accountSid);
  }
} catch (err) {
  console.warn('⚠️ Twilio initialization warning:', err.message);
}

const whatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'; // Twilio Sandbox WhatsApp number default

export const sendEmergencyWhatsApp = async (toPhoneNumber, messageBody) => {
  if (!toPhoneNumber) return false;

  const targetNumber = toPhoneNumber.startsWith('+')
    ? toPhoneNumber
    : `+88${toPhoneNumber.replace(/^0/, '')}`;

  const cleanDigits = targetNumber.replace(/\D/g, '');
  const waClickToChatUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(messageBody)}`;

  if (twilioClient) {
    try {
      const message = await twilioClient.messages.create({
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

  console.log(`💬 [WHATSAPP DISPATCH LINK] To: ${targetNumber} | 1-Click WhatsApp URL: ${waClickToChatUrl}`);
  return true;
};

export const sendEmergencySMS = async (toPhoneNumber, messageBody) => {
  if (!toPhoneNumber) return false;

  const targetNumber = toPhoneNumber.startsWith('+')
    ? toPhoneNumber
    : `+88${toPhoneNumber.replace(/^0/, '')}`;

  // Try WhatsApp dispatch concurrently
  sendEmergencyWhatsApp(toPhoneNumber, messageBody).catch(() => {});

  if (twilioClient) {
    try {
      const message = await twilioClient.messages.create({
        body: messageBody,
        from: fromPhone,
        to: targetNumber,
      });
      console.log(`📱 [TWILIO SMS DISPATCHED] SID: ${message.sid} -> ${targetNumber}`);
      return true;
    } catch (err) {
      console.warn(`⚠️ [TWILIO SMS NOTICE] -> ${targetNumber}:`, err.message);
    }
  }

  // Fallback dev log with direct WhatsApp one-click URL
  const cleanDigits = targetNumber.replace(/\D/g, '');
  console.log(`📱 [SIMULATED SMS] To: ${targetNumber} | Message: "${messageBody}"`);
  console.log(`💬 [DIRECT WHATSAPP LINK] https://wa.me/${cleanDigits}?text=${encodeURIComponent(messageBody)}`);
  return true;
};

export default { sendEmergencySMS, sendEmergencyWhatsApp };
