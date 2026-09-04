import { login, api, connectDB, openSocket, sleep, log } from './qa_harness.mjs';
import { Trip } from './src/models/Trip.js';

const offRoute = { lat: 23.7950, lng: 90.4180 };
const hb = async (token, tripId, p) =>
  api(token, 'POST', `/trips/${tripId}/heartbeat`, { latitude: p.lat, longitude: p.lng, batteryLevel: 80, trackingMode: 'NORMAL' });

const run = async () => {
  await connectDB();
  const commuter = await login('saqline.hossain@g.bracu.ac.bd', 'Saqline2026!');
  const operator = await login('mehedi.hasan.shovon@g.bracu.ac.bd', 'Shovon2026!');
  await Trip.deleteMany({ user: commuter._id, status: { $in: ['ACTIVE', 'EMERGENCY', 'DURESS', 'SIGNAL_LOST'] } });

  log('Connecting a live Socket.io client as the operator (simulating the dashboard tab)...');
  const opSocket = await openSocket(operator._id);
  let receivedBroadcast = null;
  let receivedTripStatus = null;
  opSocket.on('EMERGENCY_ALERT_BROADCAST', (payload) => { receivedBroadcast = payload; log('SOCKET EVENT RECEIVED: EMERGENCY_ALERT_BROADCAST', JSON.stringify(payload).slice(0, 200)); });
  opSocket.on('TRIP_STATUS_UPDATED', (payload) => { if (String(payload.status) === 'EMERGENCY') { receivedTripStatus = payload; log('SOCKET EVENT RECEIVED: TRIP_STATUS_UPDATED', JSON.stringify(payload)); } });

  const res = await api(commuter.token, 'POST', '/trips', {
    vehicleType: 'CNG', numberPlate: 'QA-CASE3B',
    startCoords: { lat: 23.8103, lng: 90.4125 },
    destinationCoords: { lat: 23.7808, lng: 90.4152 },
    destination: 'QA Case 3b Destination',
  });
  const tripId = res.data._id;
  log('Trip created', tripId);

  for (let i = 0; i < 10; i++) {
    await hb(commuter.token, tripId, offRoute);
    await sleep(2000);
  }
  log('Waiting for the safety-check window to expire (unanswered)...');
  await sleep(16000);

  log('receivedBroadcast for this trip:', receivedBroadcast && String(receivedBroadcast.tripId) === String(tripId) ? 'YES, matched tripId, reason=' + receivedBroadcast.reason : 'NO / MISMATCH');
  log('receivedTripStatus for this trip:', receivedTripStatus && String(receivedTripStatus.tripId) === String(tripId) ? 'YES, matched tripId, source=' + receivedTripStatus.source : 'NO / MISMATCH');

  const pass = receivedBroadcast && String(receivedBroadcast.tripId) === String(tripId) && receivedBroadcast.reason === 'ROUTE_DEVIATION'
    && receivedTripStatus && String(receivedTripStatus.tripId) === String(tripId);
  console.log('CASE3B_RESULT', pass ? 'PASS' : 'FAIL');
  process.exit(0);
};

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
