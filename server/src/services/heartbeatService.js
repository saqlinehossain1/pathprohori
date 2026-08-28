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
      }).populate({
        path: 'user',
        select: 'name email phone guardians',
        populate: {
          path: 'guardians.user',
          select: 'name email phone avatarUrl',
        },
      });

      for (const trip of timedOutTrips) {
        trip.status = 'SIGNAL_LOST';
        await trip.save();

        console.warn(
          `[SIGNAL LOSS ALERT] User ${trip.user?.name} (Trip ID: ${trip._id}) dropped signal for > 2 minutes!`
        );

        // Dynamically resolve live updated phone numbers for guardians
        const liveGuardians = Array.isArray(trip.user?.guardians)
          ? trip.user.guardians.map((g) => ({
              _id: g._id,
              name: g.user?.name || g.name,
              phone: g.user?.phone !== undefined && g.user?.phone !== '' ? g.user.phone : g.phone,
              email: g.user?.email || g.email,
              relationship: g.relationship || 'Guardian',
            }))
          : [];

        // Broadcast Socket.io emergency alert to Guardians and Safety Operators
        io.emit('SIGNAL_LOSS_ALERT', {
          tripId: trip._id,
          userId: trip.user?._id,
          userName: trip.user?.name,
          userPhone: trip.user?.phone,
          guardians: liveGuardians,
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
