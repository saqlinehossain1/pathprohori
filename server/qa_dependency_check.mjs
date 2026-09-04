import { login, api, connectDB, log } from './qa_harness.mjs';
import { Trip } from './src/models/Trip.js';

const startCoords = { lat: 23.8103, lng: 90.4125 };
const destinationCoords = { lat: 23.7808, lng: 90.4152 };

const run = async () => {
  await connectDB();
  const u = await login('saqline.hossain@g.bracu.ac.bd', 'Saqline2026!');

  // Clean up any stale ACTIVE/EMERGENCY trips from prior runs for this user first
  await Trip.deleteMany({ user: u._id, status: { $in: ['ACTIVE', 'EMERGENCY', 'DURESS', 'SIGNAL_LOST'] } });

  log('Creating trip via POST /trips (Street-Hailed Transport Logger flow)...');
  const res = await api(u.token, 'POST', '/trips', {
    vehicleType: 'CNG',
    numberPlate: 'QA-TEST-1',
    startingLocation: 'QA Start',
    destination: 'QA Destination',
    startCoords,
    destinationCoords,
  });
  log('createTrip response status:', res.status);
  if (!res.ok) {
    console.error('FAILED to create trip:', res.data);
    process.exit(1);
  }
  const tripId = res.data._id;
  log('Trip created:', tripId);
  log('API response plannedRoute length:', Array.isArray(res.data.plannedRoute) ? res.data.plannedRoute.length : 'MISSING/' + typeof res.data.plannedRoute);

  // Now check directly in MongoDB (not just the API response) since createTrip does an
  // extra trip.save() after the initial Trip.create() to attach plannedRoute.
  const dbTrip = await Trip.findById(tripId).lean();
  log('DB plannedRoute length:', Array.isArray(dbTrip.plannedRoute) ? dbTrip.plannedRoute.length : 'MISSING/' + typeof dbTrip.plannedRoute);
  if (Array.isArray(dbTrip.plannedRoute) && dbTrip.plannedRoute.length > 0) {
    log('First point:', JSON.stringify(dbTrip.plannedRoute[0]));
    log('Last point:', JSON.stringify(dbTrip.plannedRoute[dbTrip.plannedRoute.length - 1]));
  }

  console.log('TRIP_ID=' + tripId);
  console.log('TOKEN=' + u.token);
  console.log('USER_ID=' + u._id);
  process.exit(0);
};

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
