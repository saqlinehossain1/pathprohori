import { login, api, connectDB, sleep, log } from './qa_harness.mjs';
import { Trip } from './src/models/Trip.js';
import { Emergency } from './src/models/Emergency.js';

const offRoute = { lat: 23.7950, lng: 90.4180 };
const hb = async (token, tripId, p) =>
  api(token, 'POST', `/trips/${tripId}/heartbeat`, { latitude: p.lat, longitude: p.lng, batteryLevel: 80, trackingMode: 'NORMAL' });

const run = async () => {
  await connectDB();
  const u = await login('saqline.hossain@g.bracu.ac.bd', 'Saqline2026!');
  await Trip.deleteMany({ user: u._id, status: { $in: ['ACTIVE', 'EMERGENCY', 'DURESS', 'SIGNAL_LOST'] } });

  const res = await api(u.token, 'POST', '/trips', {
    vehicleType: 'CNG', numberPlate: 'QA-CASE8A',
    startCoords: { lat: 23.8103, lng: 90.4125 },
    destinationCoords: { lat: 23.7808, lng: 90.4152 },
    destination: 'QA Case 8a Destination',
  });
  const tripId = res.data._id;
  log('Trip created', tripId);

  log('--- Triggering a route deviation so a safety check starts counting down ---');
  for (let i = 0; i < 5; i++) {
    await hb(u.token, tripId, offRoute);
    await sleep(2000);
  }
  let trip = await Trip.findById(tripId).lean();
  log('safetyCheck pending:', JSON.stringify(trip.safetyCheck));
  if (!trip.safetyCheck?.active) { console.error('FAIL: setup did not produce a pending check'); process.exit(1); }

  log('--- Manually pressing the 1-Tap Panic Button WHILE the check is pending ---');
  const panicRes = await api(u.token, 'POST', `/trips/${tripId}/trigger-panic`, { isDuress: false, latitude: 23.795, longitude: 90.418 });
  log('trigger-panic status', panicRes.status, 'trip status in response:', panicRes.data?.trip?.status || panicRes.data?.status);

  await sleep(1500);
  trip = await Trip.findById(tripId).lean();
  const emergencies = await Emergency.find({ trip: tripId }).lean().sort({ createdAt: 1 });
  log('AFTER panic: trip.status =', trip.status);
  log('AFTER panic: safetyCheck =', JSON.stringify(trip.safetyCheck));
  log('AFTER panic: safetyCheckHistory =', JSON.stringify(trip.safetyCheckHistory));
  log('Emergency records:', emergencies.length, JSON.stringify(emergencies.map((e) => ({ alertType: e.alertType, status: e.status }))));

  log('--- Waiting past when the auto-escalation WOULD have fired, to confirm no duplicate/late escalation ---');
  await sleep(14000);
  trip = await Trip.findById(tripId).lean();
  const emergenciesAfterWait = await Emergency.find({ trip: tripId }).lean();
  log('Emergency records after waiting:', emergenciesAfterWait.length);
  log('safetyCheckHistory after waiting:', JSON.stringify(trip.safetyCheckHistory));

  const pass =
    trip.status === 'EMERGENCY' &&
    trip.safetyCheck?.active === false &&
    trip.safetyCheckHistory?.length === 1 &&
    trip.safetyCheckHistory[0].outcome === 'ESCALATED' &&
    emergenciesAfterWait.length === 1 && // exactly one - from the panic button, not a second duplicate from my feature
    emergenciesAfterWait[0].alertType === 'PANIC';

  console.log('CASE8A_RESULT', pass ? 'PASS' : 'FAIL');
  console.log('TRIP_ID=' + tripId);
  process.exit(0);
};

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
