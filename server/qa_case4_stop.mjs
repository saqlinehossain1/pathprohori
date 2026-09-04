import { login, api, connectDB, sleep, log } from './qa_harness.mjs';
import { Trip } from './src/models/Trip.js';
import { Emergency } from './src/models/Emergency.js';

// A point ON the route (confirmed ~1m distToRoute earlier) so this test isolates the stop
// condition without also crossing the deviation threshold.
const stopPoint = { lat: 23.8054, lng: 90.4156 };
const stopPointJitter = { lat: 23.80541, lng: 90.41562 }; // ~1-2m away, well inside the 20m radius

const hb = async (token, tripId, p) =>
  api(token, 'POST', `/trips/${tripId}/heartbeat`, { latitude: p.lat, longitude: p.lng, batteryLevel: 80, trackingMode: 'NORMAL' });

const run = async () => {
  await connectDB();
  const u = await login('saqline.hossain@g.bracu.ac.bd', 'Saqline2026!');
  await Trip.deleteMany({ user: u._id, status: { $in: ['ACTIVE', 'EMERGENCY', 'DURESS', 'SIGNAL_LOST'] } });

  const res = await api(u.token, 'POST', '/trips', {
    vehicleType: 'CNG', numberPlate: 'QA-CASE4',
    startCoords: { lat: 23.8103, lng: 90.4125 },
    destinationCoords: { lat: 23.7808, lng: 90.4152 },
    destination: 'QA Case 4 Destination',
  });
  const tripId = res.data._id;
  log('Trip created', tripId);

  log('--- PART A: hold position (within 20m) past the 15s test-mode stop threshold ---');
  for (let i = 0; i < 9; i++) {
    const p = i % 2 === 0 ? stopPoint : stopPointJitter;
    const r = await hb(u.token, tripId, p);
    log('stationary heartbeat', i, 'status', r.status);
    await sleep(2000);
  }

  let trip = await Trip.findById(tripId).lean();
  log('safetyCheck after stop threshold:', JSON.stringify(trip.safetyCheck));
  const partA_triggered = trip.safetyCheck?.active === true && trip.safetyCheck.reason === 'UNEXPECTED_STOP';
  log(partA_triggered ? 'PASS: unexpected stop safety check fired' : 'FAIL: no safety check / wrong reason');

  log('--- Responding "I\'m Safe" ---');
  const respondRes = await api(u.token, 'POST', `/trips/${tripId}/safety-check/respond`);
  log('respond status', respondRes.status);
  trip = await Trip.findById(tripId).lean();
  const emergenciesA = await Emergency.find({ trip: tripId }).lean();
  const partA_resolved =
    trip.safetyCheck?.active === false &&
    trip.status === 'ACTIVE' &&
    emergenciesA.length === 0 &&
    trip.safetyCheckHistory?.some((h) => h.reason === 'UNEXPECTED_STOP' && h.outcome === 'CONFIRMED_SAFE');
  log('AFTER respond: safetyCheckHistory =', JSON.stringify(trip.safetyCheckHistory));
  log(partA_resolved ? 'PASS: resolved cleanly, no Emergency created' : 'FAIL: resolution state wrong');

  log('--- PART B: move away (resets stop anchor), then stop again and let it ESCALATE ---');
  await hb(u.token, tripId, { lat: 23.7990, lng: 90.4130 }); // clearly >20m away, resets anchor
  await sleep(3000);

  for (let i = 0; i < 9; i++) {
    const p = i % 2 === 0 ? stopPoint : stopPointJitter;
    await hb(u.token, tripId, p);
    await sleep(2000);
  }
  log('Waiting out the full safety-check window WITHOUT responding...');
  await sleep(16000);

  trip = await Trip.findById(tripId).lean();
  const emergenciesB = await Emergency.find({ trip: tripId }).lean();
  log('AFTER timeout: status =', trip.status, 'emergencySource =', trip.emergencySource);
  log('AFTER timeout: safetyCheckHistory =', JSON.stringify(trip.safetyCheckHistory));
  log('Emergency records now:', emergenciesB.length, JSON.stringify(emergenciesB.map(e => e.alertType)));

  const partB_escalated =
    trip.status === 'EMERGENCY' &&
    trip.emergencySource === 'UNEXPECTED_STOP' &&
    emergenciesB.length === 1 &&
    emergenciesB[0].alertType === 'UNEXPECTED_STOP' &&
    trip.safetyCheckHistory.filter((h) => h.reason === 'UNEXPECTED_STOP' && h.outcome === 'ESCALATED').length === 1;
  log(partB_escalated ? 'PASS: unexpected stop correctly escalated' : 'FAIL: escalation path broken');

  console.log('CASE4_RESULT', partA_triggered && partA_resolved && partB_escalated ? 'PASS' : 'FAIL');
  process.exit(0);
};

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
