import { Trip } from '../models/Trip.js';

export const startHeartbeatMonitor = (io) => {
  const SIGNAL_LOSS_TIMEOUT_MS = 2 * 60 * 1000; // 2 Minutes (120,000ms)

  setInterval(async () => {
    try {
      const now = new Date();
      const cutoffTime = new Date(now.getTime() - SIGNAL_LOSS_TIMEOUT_MS);

      // Find all active trips where last heartbeat ping was before the 2-minute cutoff
      const timedOutTrips = await Trip.find({
        status: 'ACTIVE',
        lastHeartbeatAt: { $lt: cutoffTime },
      }).populate('user', 'name email phone guardians');

      for (const trip of timedOutTrips) {
        trip.status = 'SIGNAL_LOST';
        await trip.save();

        console.warn(
          `[SIGNAL LOSS ALERT] User ${trip.user?.name} (Trip ID: ${trip._id}) dropped signal for > 2 minutes!`
        );

        // Broadcast Socket.io emergency alert to Guardians and Safety Operators
        io.emit('SIGNAL_LOSS_ALERT', {
          tripId: trip._id,
          userId: trip.user?._id,
          userName: trip.user?.name,
          userPhone: trip.user?.phone,
          guardians: trip.user?.guardians,
          lastHeartbeatAt: trip.lastHeartbeatAt,
          destination: trip.destination,
          vehicleType: trip.vehicleType,
          numberPlate: trip.numberPlate,
          alertTime: new Date(),
        });
      }
    } catch (error) {
      console.error('[Heartbeat Monitor Error]', error.message);
    }
  }, 15000); // Check every 15 seconds
};
