import { login, api, connectDB, sleep, log } from './qa_harness.mjs';
import { Trip } from './src/models/Trip.js';

const onRoute = { lat: 23.8054, lng: 90.4156 };
const offRoute = { lat: 23.7950, lng: 90.4180 }; // ~345m off, confirmed earlier

const hb = async (token, tripId, p) =>
  api(token, 'POST', `/trips/${tripId}/heartbeat`, { latitude: p.lat, longitude: p.lng, batteryLevel: 80, trackingMode: 'NORMAL' });

const run = async () => {
  await connectDB();
  const u = await login('saqline.hossain@g.bracu.ac.bd', 'Saqline2026!');
  await Trip.deleteMany({ user: u._id, status: { $in: ['ACTIVE', 'EMERGENCY', 'DURESS', 'SIGNAL_LOST'] } });

  const res = await api(u.token, 'POST', '/trips', {
    vehicleType: 'CNG', numberPlate: 'QA-CASE5',
    startCoords: { lat: 23.8103, lng: 90.4125 },
    destinationCoords: { lat: 23.7808, lng: 90.4152 },
    destination: 'QA Case 5 Destination',
  });
  const tripId = res.data._id;
  log('Trip created', tripId, '(grace period is 9s test-mode)');

  await hb(u.token, tripId, onRoute);
  await sleep(3000);

  log('--- Brief off-route excursion: ~4s (well under the 9s grace period), then back on-route ---');
  await hb(u.token, tripId, offRoute);
  await sleep(1500);
  let mid = await Trip.findById(tripId).lean();
  log('mid-excursion deviationTracking (should show grace timer started):', JSON.stringify(mid.deviationTracking));
  await sleep(2500); // total off-route exposure ~4s < 9s grace period
  await hb(u.token, tripId, onRoute);

  log('--- Now watching for 12s to make sure NOTHING fires (no safety check should ever appear) ---');
  await sleep(12000);

  const trip = await Trip.findById(tripId).lean();
  log('FINAL safetyCheck:', JSON.stringify(trip.safetyCheck));
  log('FINAL safetyCheckHistory:', JSON.stringify(trip.safetyCheckHistory));
  log('FINAL deviationTracking:', JSON.stringify(trip.deviationTracking));
  log('FINAL status:', trip.status);

  const pass =
    trip.safetyCheck?.active === false &&
    (trip.safetyCheckHistory || []).length === 0 &&
    trip.status === 'ACTIVE';
  console.log('CASE5_RESULT', pass ? 'PASS' : 'FAIL');
  console.log('TRIP_ID=' + tripId);
  process.exit(0);
};

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
