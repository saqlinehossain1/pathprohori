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
    vehicleType: 'CNG', numberPlate: 'QA-CASE8B',
    startCoords: { lat: 23.8103, lng: 90.4125 },
    destinationCoords: { lat: 23.7808, lng: 90.4152 },
    destination: 'QA Case 8b Destination',
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

  log('--- Firing the Dead-Battery Final Emergency Blast WHILE the check is pending ---');
  const batteryRes = await api(u.token, 'POST', `/trips/${tripId}/battery-emergency`, {
    batteryLevel: 2, lastKnownCoords: { lat: 23.795, lng: 90.418 },
  });
  log('battery-emergency status', batteryRes.status, JSON.stringify(batteryRes.data));

  await sleep(1500);
  trip = await Trip.findById(tripId).lean();
  const emergencies = await Emergency.find({ trip: tripId }).lean();
  log('AFTER battery blast: trip.status =', trip.status, 'batteryLevel =', trip.batteryLevel);
  log('AFTER battery blast: safetyCheck =', JSON.stringify(trip.safetyCheck));
  log('AFTER battery blast: safetyCheckHistory =', JSON.stringify(trip.safetyCheckHistory));
  log('Emergency records:', emergencies.length, JSON.stringify(emergencies.map((e) => e.alertType)));

  log('--- Waiting past when the auto-escalation WOULD have fired, to confirm no duplicate/orphaned escalation ---');
  await sleep(14000);
  trip = await Trip.findById(tripId).lean();
  const emergenciesAfterWait = await Emergency.find({ trip: tripId }).lean();
  log('Emergency records after waiting:', emergenciesAfterWait.length);
  log('safetyCheckHistory after waiting:', JSON.stringify(trip.safetyCheckHistory));
  log('trip.status after waiting (should still be EMERGENCY, not corrupted):', trip.status);

  const pass =
    trip.status === 'EMERGENCY' &&
    trip.safetyCheck?.active === false &&
    trip.safetyCheckHistory?.length === 1 &&
    trip.safetyCheckHistory[0].outcome === 'ESCALATED' &&
    trip.safetyCheckHistory[0].reason === 'ROUTE_DEVIATION' &&
    emergenciesAfterWait.length === 0; // reportDeadBattery does NOT create an Emergency doc (matches pre-existing behavior) - just confirming my feature didn't add one either

  console.log('CASE8B_RESULT', pass ? 'PASS' : 'FAIL');
  console.log('TRIP_ID=' + tripId);
  process.exit(0);
};

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
