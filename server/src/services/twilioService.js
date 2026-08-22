import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER || '+17372212163';

let twilioClient = null;

if (
  accountSid &&
  authToken &&
  accountSid.startsWith('AC') &&
  !accountSid.includes('YOUR_TWILIO') &&
  !authToken.includes('YOUR_TWILIO')
) {
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio client initialized with Account SID:', accountSid);
  } catch (err) {
    console.warn('⚠️ Twilio initialization warning:', err.message);
  }
}

export const sendEmergencySMS = async (toPhoneNumber, messageBody) => {
  if (!toPhoneNumber) return false;

  const targetNumber = toPhoneNumber.startsWith('+')
    ? toPhoneNumber
    : `+88${toPhoneNumber.replace(/^0/, '')}`;

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
      console.error(`❌ [TWILIO SMS ERROR] -> ${targetNumber}:`, err.message);
      // Fall through to fallback log
    }
  }

  // Fallback dev log when Twilio keys are inactive/unconfigured
  console.log(`📱 [SIMULATED TWILIO SMS] To: ${targetNumber} | From: ${fromPhone} | Message: "${messageBody}"`);
  return true;
};

export default { sendEmergencySMS };
