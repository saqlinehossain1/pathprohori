import cron from 'node-cron';
import { LocationLog } from '../models/LocationLog.js';
import { Trip } from '../models/Trip.js';
import { Incident } from '../models/Incident.js';
import { deleteCloudinaryImage } from '../config/cloudinary.js';

// Auto-Purge Expired Incidents & Delete Associated Cloudinary Images
export const purgeExpiredIncidents = async () => {
  try {
    const now = new Date();
    // Find incidents where expiresAt date is in the past
    const expiredIncidents = await Incident.find({
      expiresAt: { $lte: now },
    });

    if (expiredIncidents.length > 0) {
      console.log(`[Incident Expiration Purge] Found ${expiredIncidents.length} expired report(s) to auto-delete...`);

      for (const incident of expiredIncidents) {
        // Delete main Cloudinary report photo if present
        if (incident.imageUrl) {
          await deleteCloudinaryImage(incident.imageUrl);
        }

        // Delete any comment photos if present
        if (Array.isArray(incident.comments)) {
          for (const comment of incident.comments) {
            if (comment.imageUrl) {
              await deleteCloudinaryImage(comment.imageUrl);
            }
          }
        }

        // Permanently delete incident from MongoDB database
        await Incident.findByIdAndDelete(incident._id);
        console.log(`[Incident Expiration Purge] Purged incident '${incident.title}' (ID: ${incident._id}) and associated Cloudinary assets.`);
      }
    }
  } catch (error) {
    console.error('[Incident Expiration Purge Error]', error.message);
  }
};

export const startPrivacyCron = () => {
  // 1. Run Expired Incident & Cloudinary Purge once immediately on startup
  purgeExpiredIncidents();

  // 2. Schedule Expired Incident Purge every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await purgeExpiredIncidents();
  });

  // 3. Scheduled 48-Hour Historical Trip Coordinate Purge (Runs daily at Midnight 00:00)
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('[Privacy Data Eraser] Running 48-Hour Historical Coordinate Purge Routine...');
      
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

      // Find completed safe trips older than 48 hours
      const oldCompletedTrips = await Trip.find({
        status: 'COMPLETED',
        completedAt: { $lt: fortyEightHoursAgo },
        safeTripPurged: false,
      });

      const tripIds = oldCompletedTrips.map((t) => t._id);

      if (tripIds.length > 0) {
        // Permanently purge precise coordinate logs
        const result = await LocationLog.deleteMany({
          trip: { $in: tripIds },
        });

        // Mark trips as purged
        await Trip.updateMany(
          { _id: { $in: tripIds } },
          { safeTripPurged: true }
        );

        console.log(
          `[Privacy Data Eraser] Purged ${result.deletedCount} precise coordinate logs for ${tripIds.length} safe trips older than 48 hours.`
        );
      } else {
        console.log('[Privacy Data Eraser] No completed safe trip logs older than 48 hours found.');
      }
    } catch (error) {
      console.error('[Privacy Data Eraser Error]', error.message);
    }
  });

  console.log('[Cron Job] Privacy Data Eraser & Incident Cloudinary Purge initialized.');
};
