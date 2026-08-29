import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;

/**
 * Creates or retrieves the cached Nodemailer SMTP transporter.
 * Configured dynamically from environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).
 */
const getTransporter = () => {
  dotenv.config();
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const from = process.env.SMTP_FROM || (user ? `"PATHPROHORI Emergency Dispatch" <${user}>` : 'admin@pathprohori.com');

  if (!transporter && user && pass) {
    try {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for 587/STARTTLS
        auth: {
          user,
          pass,
        },
      });
      console.log(`✅ [Nodemailer] SMTP Transporter ready (${host}:${port} as ${user})`);
    } catch (err) {
      console.warn('⚠️ [Nodemailer Initialization Warning]:', err.message);
    }
  }

  return { transporter, host, port, user, from };
};

/**
 * Sends a high-priority, professionally formatted HTML Emergency Distress Email
 * to guardian/emergency contact registered email addresses.
 *
 * @param {Object} params
 * @param {String|String[]} params.toEmail - Recipient guardian/contact email address(es)
 * @param {Object} [params.commuter={}] - Distressed commuter { name, phone, email }
 * @param {Object} [params.location={}] - Location data { latitude, longitude, address }
 * @param {Object} [params.trip=null] - Optional trip transit data { vehicleType, numberPlate, destination, trackingToken }
 * @param {String} [params.emergencyId=''] - Emergency document ID
 * @param {String} [params.trackingUrl=''] - 4-hour live emergency tracking stream link
 * @param {String} [params.alertType='PANIC'] - Type of emergency (PANIC, SILENT_DURESS, SOS, BATTERY_CRITICAL)
 * @param {String} [params.emergencyMessage=''] - Custom distress or automated emergency message
 * @param {Date|String} [params.activationTime=new Date()] - Panic activation timestamp
 * @returns {Promise<boolean>}
 */
export const sendEmergencyEmail = async ({
  toEmail,
  commuter = {},
  location = {},
  trip = null,
  emergencyId = '',
  trackingUrl = '',
  alertType = 'PANIC',
  emergencyMessage = '',
  activationTime = new Date(),
}) => {
  try {
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const rawEmails = Array.isArray(toEmail) ? toEmail : [toEmail];
    const validEmails = [
      ...new Set(
        rawEmails.filter((e) => typeof e === 'string' && EMAIL_REGEX.test(e.trim()))
      ),
    ];

    if (validEmails.length === 0) {
      console.warn('⚠️ [Nodemailer] No valid recipient emails found for emergency dispatch.');
      return false;
    }

    // 1. Commuter & Alert Metadata
    const commuterName = commuter.name || 'PATHPROHORI Commuter';
    const commuterPhone = commuter.phone || 'N/A';
    const commuterEmail = commuter.email || 'N/A';

    const timestamp = activationTime instanceof Date
      ? activationTime
      : new Date(activationTime || Date.now());
    const formattedActivationTime = timestamp.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });

    const isDuress = alertType === 'SILENT_DURESS';
    const isBattery = alertType === 'BATTERY_CRITICAL';

    const alertHeadline = isDuress
      ? '🚨 SILENT DURESS EMERGENCY ALERT'
      : isBattery
      ? '🪫 CRITICAL LOW-BATTERY DISTRESS BROADCAST'
      : '🚨 CRITICAL EMERGENCY PANIC ALERT';

    const alertStatusBadge = isDuress
      ? 'CRITICAL • SILENT DURESS ACTIVATED'
      : isBattery
      ? 'URGENT • LAST KNOWN BATTERY TELEMETRY'
      : 'HIGH PRIORITY • 1-TAP PANIC ACTIVATED';

    const defaultEmergencyMessage = isDuress
      ? `${commuterName} has discreetly triggered a Silent Duress alarm. Immediate guardian intervention may be required without alerting potential threats.`
      : isBattery
      ? `${commuterName}'s device battery has depleted to critical shutdown levels during transit. The last broadcast GPS coordinates have been locked.`
      : `${commuterName} has activated an Instant Emergency Panic alarm. Immediate assistance is requested.`;

    const finalEmergencyMessage = emergencyMessage || defaultEmergencyMessage;

    // 2. Location & Coordinate Processing
    const hasCoordinates =
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number' &&
      !isNaN(location.latitude) &&
      !isNaN(location.longitude);

    const lat = hasCoordinates ? location.latitude : null;
    const lng = hasCoordinates ? location.longitude : null;
    const addressStr = location.address || (hasCoordinates ? `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E` : 'Location telemetry unavailable');

    const googleMapsUrl = hasCoordinates ? `https://www.google.com/maps?q=${lat},${lng}` : null;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const liveTrackingUrl =
      trackingUrl ||
      (trip?.trackingToken
        ? `${clientUrl}/track/${trip.trackingToken}`
        : emergencyId
        ? `${clientUrl}/notifications`
        : clientUrl);

    const subject = `🚨 [EMERGENCY ALERT] ${commuterName} Activated Panic Alarm!`;

    // 3. Optional Transit / Vehicle Section
    const transitSection = trip
      ? `
        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0;">
              <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Transit / Vehicle</span>
              <p style="margin: 4px 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">
                🚗 ${trip.vehicleType || 'Vehicle'} ${trip.numberPlate ? `(${trip.numberPlate})` : ''}
              </p>
            </td>
            <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0;">
              <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Destination</span>
              <p style="margin: 4px 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">
                🏁 ${trip.destination || 'Unspecified'}
              </p>
            </td>
          </tr>
        </table>
      `
      : '';

    // 4. Coordinates & Map Link Section
    const coordinatesSection = hasCoordinates
      ? `
        <div style="margin-bottom: 20px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px 18px;">
          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #991b1b; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">Exact GPS Telemetry Coordinates</span>
          <p style="margin: 0 0 10px; font-size: 15px; font-weight: 800; font-family: monospace; color: #b91c1c;">
            📍 ${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E
          </p>
          <a href="${googleMapsUrl}" target="_blank" style="display: inline-block; font-size: 13px; font-weight: 800; color: #dc2626; text-decoration: underline;">
            👉 Open Location on Google Maps &raquo;
          </a>
        </div>
      `
      : '';

    // 5. Professional HTML Email Template
    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Emergency Distress Alert</title>
      </head>
      <body style="margin: 0; padding: 24px; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5;">
        <table role="presentation" style="max-width: 620px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4); border: 2px solid #e11d48; border-collapse: collapse;">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #be123c 0%, #e11d48 50%, #f43f5e 100%); padding: 30px 24px; text-align: center; color: #ffffff;">
              <div style="display: inline-block; background-color: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.3); border-radius: 20px; padding: 4px 14px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">
                ${alertStatusBadge}
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; color: #ffffff;">
                ${alertHeadline}
              </h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #ffe4e6; font-weight: 600;">
                PATHPROHORI Hyperlocal Transit Safety & Incident Response
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 28px 24px;">
              <!-- Emergency Alert Message Box -->
              <div style="background-color: #fff1f2; border-left: 5px solid #e11d48; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
                <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #9f1239; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Emergency Message</span>
                <p style="margin: 0; font-size: 14px; font-weight: 700; color: #881337;">
                  ${finalEmergencyMessage}
                </p>
              </div>

              <!-- Key Information Grid -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 40%; vertical-align: top;">
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">User / Commuter</span>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                    <strong style="font-size: 15px; color: #0f172a;">${commuterName}</strong>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Contact Info</span>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                    <span style="font-size: 14px; font-weight: 600; color: #0f172a;">📞 ${commuterPhone}</span>
                    ${commuterEmail !== 'N/A' ? `<br><span style="font-size: 12px; color: #64748b;">✉️ ${commuterEmail}</span>` : ''}
                  </td>
                </tr>

                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Activation Time</span>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                    <span style="font-size: 14px; font-weight: 700; color: #0f172a;">⏱️ ${formattedActivationTime}</span>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Current Location</span>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                    <span style="font-size: 14px; font-weight: 700; color: #e11d48;">📍 ${addressStr}</span>
                  </td>
                </tr>
              </table>

              ${transitSection}
              ${coordinatesSection}

              <!-- Interactive Call to Action Buttons -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px;">
                <tr>
                  <td style="text-align: center; padding: 10px 0;">
                    ${
                      googleMapsUrl
                        ? `<a href="${googleMapsUrl}" target="_blank" style="display: block; width: 85%; margin: 0 auto 12px; background: linear-gradient(135deg, #e11d48, #be123c); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 900; padding: 14px 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.4);">
                            🗺️ VIEW LOCATION ON GOOGLE MAPS
                          </a>`
                        : ''
                    }
                    <a href="${liveTrackingUrl}" target="_blank" style="display: block; width: 85%; margin: 0 auto; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 800; padding: 12px 20px; border-radius: 12px;">
                      📡 OPEN LIVE GUARDIAN TRACKING STREAM
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Safety Instructions -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-top: 10px;">
                <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.6;">
                  <strong>Recommended Guardian Protocol:</strong><br>
                  1. Immediately attempt to phone the commuter at <strong>${commuterPhone}</strong>.<br>
                  2. Open the Google Maps link above to pinpoint their exact real-time GPS position.<br>
                  3. If unresponsive or in danger, contact emergency services (999 / Local Police) with the attached coordinates.
                </p>
              </div>
            </td>
          </tr>

          <!-- Security Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
                PATHPROHORI Automated Safety Infrastructure
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                This critical alert was automatically dispatched to verified guardian accounts. • ${timestamp.toISOString()}
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // 6. Plain Text Fallback for High-Security / Low-Bandwidth Email Clients
    const plainTextContent = `
[PATHPROHORI CRITICAL EMERGENCY DISTRESS ALERT]
======================================================
Status: ${alertStatusBadge}
Commuter: ${commuterName}
Phone: ${commuterPhone}
Activation Time: ${formattedActivationTime}
Emergency Message: ${finalEmergencyMessage}

Location: ${addressStr}
${hasCoordinates ? `GPS Coordinates: ${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E` : ''}
${googleMapsUrl ? `Google Maps Link: ${googleMapsUrl}` : ''}
Live Tracking Stream: ${liveTrackingUrl}

======================================================
PATHPROHORI Hyperlocal Transit Safety Infrastructure
    `.trim();

    // 7. Dispatch Email via Transporter
    const { transporter: activeTransporter, from: fromAddress } = getTransporter();

    if (activeTransporter) {
      const info = await activeTransporter.sendMail({
        from: fromAddress,
        to: validEmails,
        subject,
        text: plainTextContent,
        html: htmlTemplate,
      });

      const acceptedStr = Array.isArray(info.accepted) ? info.accepted.join(', ') : validEmails.join(', ');
      console.log(`✉️ [EMERGENCY EMAIL SENT] MessageId: ${info.messageId} -> To: [${acceptedStr}]`);
      return true;
    }

    // Fallback console log if SMTP credentials not configured
    console.log(`✉️ [SIMULATED EMERGENCY EMAIL] To: [${validEmails.join(', ')}] | Subject: "${subject}" | Loc: ${addressStr}`);
    return true;
  } catch (error) {
    console.error('❌ [Nodemailer sendEmergencyEmail Error]:', error.message);
    return false;
  }
};

export default {
  sendEmergencyEmail,
};
