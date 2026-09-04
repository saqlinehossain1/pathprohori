import { login, api, connectDB, sleep, log } from './qa_harness.mjs';
import { Trip } from './src/models/Trip.js';

const point = { lat: 23.8054, lng: 90.4156 };
const hb = async (token, tripId, p) =>
  api(token, 'POST', `/trips/${tripId}/heartbeat`, { latitude: p.lat, longitude: p.lng, batteryLevel: 80, trackingMode: 'NORMAL' });

const run = async () => {
  await connectDB();
  const u = await login('saqline.hossain@g.bracu.ac.bd', 'Saqline2026!');
  await Trip.deleteMany({ user: u._id, status: { $in: ['ACTIVE', 'EMERGENCY', 'DURESS', 'SIGNAL_LOST'] } });

  const res = await api(u.token, 'POST', '/trips', {
    vehicleType: 'CNG', numberPlate: 'QA-CASE6',
    startCoords: { lat: 23.8103, lng: 90.4125 },
    destinationCoords: { lat: 23.7808, lng: 90.4152 },
    destination: 'QA Case 6 Destination',
  });
  const tripId = res.data._id;
  log('Trip created', tripId, '(STALE_GPS_THRESHOLD=10s test-mode, SIGNAL_LOSS_TIMEOUT=20s test-mode)');

  log('--- Establishing a stationary position (a few heartbeats) - this alone would eventually');
  log('    become a stop if heartbeats kept flowing, which is exactly why staleness must pre-empt it ---');
  await hb(u.token, tripId, point);
  await sleep(2000);
  await hb(u.token, tripId, point);

  log('--- Now going COMPLETELY SILENT (genuine GPS/connectivity loss - no more heartbeats at all) ---');
  const silenceStart = Date.now();

  // Watch for 26s total: past STALE_GPS_THRESHOLD (10s), past SIGNAL_LOSS_TIMEOUT (20s)
  for (let elapsed = 0; elapsed <= 26000; elapsed += 4000) {
    await sleep(4000);
    const t = await Trip.findById(tripId).lean();
    log(`t+${Math.round((Date.now() - silenceStart) / 1000)}s: status=${t.status} stopTracking.stationarySince=${t.stopTracking?.stationarySince} safetyCheck.active=${t.safetyCheck?.active}`);
  }

  const trip = await Trip.findById(tripId).lean();
  console.log('---');
  log('FINAL status:', trip.status);
  log('FINAL safetyCheck:', JSON.stringify(trip.safetyCheck));
  log('FINAL safetyCheckHistory:', JSON.stringify(trip.safetyCheckHistory));

  const pass =
    trip.status === 'SIGNAL_LOST' &&
    trip.safetyCheck?.active === false &&
    (trip.safetyCheckHistory || []).length === 0; // never should have fired UNEXPECTED_STOP
  console.log('CASE6_RESULT', pass ? 'PASS' : 'FAIL');
  console.log('TRIP_ID=' + tripId);
  process.exit(0);
};

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
