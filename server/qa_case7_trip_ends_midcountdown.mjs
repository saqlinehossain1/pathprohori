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
    vehicleType: 'CNG', numberPlate: 'QA-CASE7',
    startCoords: { lat: 23.8103, lng: 90.4125 },
    destinationCoords: { lat: 23.7808, lng: 90.4152 },
    destination: 'QA Case 7 Destination',
  });
  const tripId = res.data._id;
  log('Trip created', tripId);

  log('--- Triggering a deviation so a safety check starts counting down ---');
  for (let i = 0; i < 5; i++) {
    await hb(u.token, tripId, offRoute);
    await sleep(2000);
  }
  const midTrip = await Trip.findById(tripId).lean();
  log('safetyCheck now:', JSON.stringify(midTrip.safetyCheck));
  if (!midTrip.safetyCheck?.active) {
    console.error('FAIL: safety check never started - test setup problem, aborting');
    process.exit(1);
  }

  log('--- Completing the trip normally WHILE the countdown is still running ---');
  const completeRes = await api(u.token, 'PUT', `/trips/${tripId}/complete`);
  log('complete status', completeRes.status);

  const rightAfter = await Trip.findById(tripId).lean();
  log('RIGHT AFTER complete: status =', rightAfter.status, 'safetyCheck =', JSON.stringify(rightAfter.safetyCheck));
  log('RIGHT AFTER complete: safetyCheckHistory =', JSON.stringify(rightAfter.safetyCheckHistory));

  log('--- Waiting past when the escalation WOULD have fired (16s), watching for orphaned escalation ---');
  await sleep(16000);

  const finalTrip = await Trip.findById(tripId).lean();
  const emergencies = await Emergency.find({ trip: tripId }).lean();
  log('FINAL status:', finalTrip.status);
  log('FINAL safetyCheck:', JSON.stringify(finalTrip.safetyCheck));
  log('FINAL safetyCheckHistory:', JSON.stringify(finalTrip.safetyCheckHistory));
  log('Emergency records created after completion:', emergencies.length);

  const pass =
    rightAfter.safetyCheck?.active === false &&
    rightAfter.safetyCheckHistory?.some((h) => h.outcome === 'TRIP_COMPLETED') &&
    finalTrip.status === 'COMPLETED' &&
    finalTrip.safetyCheck?.active === false &&
    emergencies.length === 0 &&
    finalTrip.safetyCheckHistory.filter((h) => h.outcome === 'ESCALATED').length === 0;

  console.log('CASE7_RESULT', pass ? 'PASS' : 'FAIL');
  console.log('TRIP_ID=' + tripId);
  process.exit(0);
};

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
