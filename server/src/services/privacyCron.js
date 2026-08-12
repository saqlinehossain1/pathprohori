import cron from 'node-cron';
import { LocationLog } from '../models/LocationLog.js';
import { Trip } from '../models/Trip.js';

export const startPrivacyCron = () => {
  // Scheduled job runs daily at Midnight (00:00)
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

  console.log('[Cron Job] 48-Hour Privacy Data Eraser initialized (runs daily at 00:00)');
};
