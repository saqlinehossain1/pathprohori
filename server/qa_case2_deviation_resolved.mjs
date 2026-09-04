import { login, api, connectDB, sleep, log } from './qa_harness.mjs';
import { Trip } from './src/models/Trip.js';

const onRoute1 = { lat: 23.8054, lng: 90.4156 };
const offRoute = { lat: 23.7950, lng: 90.4180 }; // ~330m east of the route corridor, verified below
const onRoute2 = { lat: 23.7862, lng: 90.4161 };
const offRouteAgain = { lat: 23.7900, lng: 90.4200 }; // a second, different off-route excursion

const hb = async (token, tripId, p, extra = {}) =>
  api(token, 'POST', `/trips/${tripId}/heartbeat`, { latitude: p.lat, longitude: p.lng, batteryLevel: 80, trackingMode: 'NORMAL', ...extra });

const run = async () => {
  await connectDB();
  const u = await login('saqline.hossain@g.bracu.ac.bd', 'Saqline2026!');
  await Trip.deleteMany({ user: u._id, status: { $in: ['ACTIVE', 'EMERGENCY', 'DURESS', 'SIGNAL_LOST'] } });

  const res = await api(u.token, 'POST', '/trips', {
    vehicleType: 'CNG', numberPlate: 'QA-CASE2',
    startCoords: { lat: 23.8103, lng: 90.4125 },
    destinationCoords: { lat: 23.7808, lng: 90.4152 },
    destination: 'QA Case 2 Destination',
  });
  const tripId = res.data._id;
  log('Trip created', tripId, 'plannedRoute pts:', res.data.plannedRoute.length);

  log('--- Sending on-route heartbeat first ---');
  await hb(u.token, tripId, onRoute1);
  await sleep(3500);

  log('--- Now going OFF-ROUTE and holding it (past the 9s test-mode grace period) ---');
  for (let i = 0; i < 6; i++) {
    const r = await hb(u.token, tripId, offRoute);
    log('off-route heartbeat', i, 'status', r.status);
    await sleep(2000);
  }

  let trip = await Trip.findById(tripId).lean();
  log('AFTER off-route hold: safetyCheck =', JSON.stringify(trip.safetyCheck));
  if (!trip.safetyCheck?.active || trip.safetyCheck.reason !== 'ROUTE_DEVIATION') {
    console.error('FAIL: expected an active ROUTE_DEVIATION safety check, got:', JSON.stringify(trip.safetyCheck));
    process.exit(1);
  }
  log('PASS: safety check triggered with reason ROUTE_DEVIATION');

  log('--- Responding "I\'m Safe" within the window ---');
  const respondRes = await api(u.token, 'POST', `/trips/${tripId}/safety-check/respond`);
  log('respond status', respondRes.status, JSON.stringify(respondRes.data?.message));

  trip = await Trip.findById(tripId).lean();
  log('AFTER respond: safetyCheck =', JSON.stringify(trip.safetyCheck));
  log('AFTER respond: safetyCheckHistory =', JSON.stringify(trip.safetyCheckHistory));
  log('AFTER respond: status =', trip.status);
  log('AFTER respond: deviationTracking =', JSON.stringify(trip.deviationTracking));

  const { Emergency } = await import('./src/models/Emergency.js');
  const emergencies = await Emergency.find({ trip: tripId }).lean();
  log('Emergency records for this trip:', emergencies.length);

  const pass1 =
    trip.safetyCheck?.active === false &&
    trip.status === 'ACTIVE' &&
    emergencies.length === 0 &&
    trip.safetyCheckHistory?.length === 1 &&
    trip.safetyCheckHistory[0].outcome === 'CONFIRMED_SAFE' &&
    trip.safetyCheckHistory[0].reason === 'ROUTE_DEVIATION';
  log(pass1 ? 'PASS: resolved correctly, no Emergency created, history logged as CONFIRMED_SAFE' : 'FAIL: resolution state incorrect');

  log('--- Resuming on-route heartbeats to confirm normal monitoring resumes ---');
  await hb(u.token, tripId, onRoute2);
  await sleep(4000);
  trip = await Trip.findById(tripId).lean();
  log('mid-trip deviationTracking after resuming on-route:', JSON.stringify(trip.deviationTracking));

  log('--- Triggering a SECOND, later deviation to confirm state actually reset ---');
  for (let i = 0; i < 6; i++) {
    const r = await hb(u.token, tripId, offRouteAgain);
    log('2nd off-route heartbeat', i, 'status', r.status);
    await sleep(2000);
  }

  trip = await Trip.findById(tripId).lean();
  log('AFTER 2nd off-route hold: safetyCheck =', JSON.stringify(trip.safetyCheck));
  const pass2 = trip.safetyCheck?.active === true && trip.safetyCheck.reason === 'ROUTE_DEVIATION';
  log(pass2 ? 'PASS: second, independent deviation correctly detected - state was NOT stuck from the first incident' : 'FAIL: second deviation did not fire - state did not reset');

  // Clean up: respond safe to the second check too so it doesn't escalate after this script exits
  await api(u.token, 'POST', `/trips/${tripId}/safety-check/respond`);
  trip = await Trip.findById(tripId).lean();
  log('FINAL safetyCheckHistory (expect 2 entries):', JSON.stringify(trip.safetyCheckHistory));

  console.log('CASE2_RESULT', pass1 && pass2 ? 'PASS' : 'FAIL');
  process.exit(0);
};

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
