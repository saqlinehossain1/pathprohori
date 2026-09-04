// CASE 1 - Normal trip, no incidents. Feed real heartbeats along the actual stored
// plannedRoute points (so distance-to-route ~= 0) at a normal moving cadence, watch several
// monitor cycles (test-mode MONITOR_INTERVAL_MS=3s), and confirm nothing ever flags.
import { login, api, connectDB, sleep, log } from './qa_harness.mjs';
import { Trip } from './src/models/Trip.js';

const run = async () => {
  await connectDB();
  const u = await login('saqline.hossain@g.bracu.ac.bd', 'Saqline2026!');
  await Trip.deleteMany({ user: u._id, status: { $in: ['ACTIVE', 'EMERGENCY', 'DURESS', 'SIGNAL_LOST'] } });

  const res = await api(u.token, 'POST', '/trips', {
    vehicleType: 'CNG', numberPlate: 'QA-CASE1',
    startCoords: { lat: 23.8103, lng: 90.4125 },
    destinationCoords: { lat: 23.7808, lng: 90.4152 },
    destination: 'QA Case 1 Destination',
  });
  if (!res.ok) throw new Error('trip create failed: ' + JSON.stringify(res.data));
  const trip = await Trip.findById(res.data._id);
  log('Using freshly-created trip', trip._id.toString(), 'plannedRoute points:', trip.plannedRoute.length);

  // Walk along ~12 evenly-spaced points of the real planned route over ~20s (4+ monitor ticks
  // at the 3s test-mode interval), one heartbeat every ~1.7s.
  const step = Math.max(1, Math.floor(trip.plannedRoute.length / 12));
  const points = [];
  for (let i = 0; i < trip.plannedRoute.length; i += step) points.push(trip.plannedRoute[i]);

  for (const p of points) {
    const res = await api(u.token, 'POST', `/trips/${trip._id}/heartbeat`, {
      latitude: p.lat, longitude: p.lng, batteryLevel: 80, trackingMode: 'NORMAL',
    });
    log('heartbeat ->', p.lat.toFixed(5), p.lng.toFixed(5), 'status', res.status);
    await sleep(1700);
  }

  // Let a couple more monitor ticks run with the last position held (still "moving" in the
  // sense that it's a fresh point, just no new heartbeat in between)
  await sleep(6000);

  const finalTrip = await Trip.findById(trip._id).lean();
  log('FINAL STATE deviationTracking:', JSON.stringify(finalTrip.deviationTracking));
  log('FINAL STATE stopTracking:', JSON.stringify(finalTrip.stopTracking));
  log('FINAL STATE safetyCheck:', JSON.stringify(finalTrip.safetyCheck));
  log('FINAL STATE safetyCheckHistory:', JSON.stringify(finalTrip.safetyCheckHistory));
  log('FINAL STATE status:', finalTrip.status);
  process.exit(0);
};

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
