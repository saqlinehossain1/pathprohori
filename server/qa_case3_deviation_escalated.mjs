import { login, api, connectDB, sleep, log } from './qa_harness.mjs';
import { Trip } from './src/models/Trip.js';
import { Emergency } from './src/models/Emergency.js';

const offRoute = { lat: 23.7950, lng: 90.4180 };

const hb = async (token, tripId, p) =>
  api(token, 'POST', `/trips/${tripId}/heartbeat`, { latitude: p.lat, longitude: p.lng, batteryLevel: 80, trackingMode: 'NORMAL' });

const run = async () => {
  await connectDB();
  const commuter = await login('saqline.hossain@g.bracu.ac.bd', 'Saqline2026!');
  const operator = await login('mehedi.hasan.shovon@g.bracu.ac.bd', 'Shovon2026!');
  await Trip.deleteMany({ user: commuter._id, status: { $in: ['ACTIVE', 'EMERGENCY', 'DURESS', 'SIGNAL_LOST'] } });

  const before = await api(operator.token, 'GET', '/emergency');
  const beforeCount = Array.isArray(before.data) ? before.data.length : -1;
  log('Operator dashboard emergency count BEFORE:', beforeCount);

  const res = await api(commuter.token, 'POST', '/trips', {
    vehicleType: 'CNG', numberPlate: 'QA-CASE3',
    startCoords: { lat: 23.8103, lng: 90.4125 },
    destinationCoords: { lat: 23.7808, lng: 90.4152 },
    destination: 'QA Case 3 Destination',
  });
  const tripId = res.data._id;
  log('Trip created', tripId);

  log('--- Going off-route and holding it, then NOT responding to the safety check ---');
  for (let i = 0; i < 10; i++) {
    const r = await hb(commuter.token, tripId, offRoute);
    log('off-route heartbeat', i, 'status', r.status);
    await sleep(2000);
  }

  let trip = await Trip.findById(tripId).lean();
  log('safetyCheck after grace period:', JSON.stringify(trip.safetyCheck));

  log('--- Waiting out the full safety-check window WITHOUT responding ---');
  await sleep(16000); // window is 12s in test mode + one monitor tick margin

  trip = await Trip.findById(tripId).lean();
  log('AFTER timeout: status =', trip.status);
  log('AFTER timeout: emergencySource =', trip.emergencySource);
  log('AFTER timeout: safetyCheck =', JSON.stringify(trip.safetyCheck));
  log('AFTER timeout: safetyCheckHistory =', JSON.stringify(trip.safetyCheckHistory));

  const emergencies = await Emergency.find({ trip: tripId }).lean();
  log('Emergency records for this trip:', emergencies.length, JSON.stringify(emergencies.map(e => ({ alertType: e.alertType, severity: e.severity, status: e.status }))));

  await sleep(1000);
  const after = await api(operator.token, 'GET', '/emergency');
  const afterCount = Array.isArray(after.data) ? after.data.length : -1;
  log('Operator dashboard emergency count AFTER:', afterCount);
  const found = (after.data || []).find((e) => String(e.tripId) === String(tripId));
  log('Operator dashboard entry for this trip:', JSON.stringify(found));

  const pass =
    trip.status === 'EMERGENCY' &&
    trip.emergencySource === 'ROUTE_DEVIATION' &&
    trip.safetyCheck?.active === false &&
    trip.safetyCheckHistory?.length === 1 &&
    trip.safetyCheckHistory[0].outcome === 'ESCALATED' &&
    emergencies.length === 1 &&
    emergencies[0].alertType === 'ROUTE_DEVIATION' &&
    afterCount === beforeCount + 1 &&
    !!found;

  console.log('CASE3_RESULT', pass ? 'PASS' : 'FAIL');
  console.log('TRIP_ID=' + tripId);
  process.exit(0);
};

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
