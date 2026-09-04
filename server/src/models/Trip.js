import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vehicleType: {
      type: String,
      required: true, // e.g. CNG, Rickshaw, Bus, Taxi, Private Car
      default: 'Rickshaw',
    },
    numberPlate: {
      type: String,
      default: '',
    },
    vehicleColor: {
      type: String,
      default: '',
    },
    estimatedTimeMinutes: {
      type: Number,
      default: 30,
    },
    startingLocation: {
      type: String,
      default: 'Current GPS Location',
    },
    destination: {
      type: String,
      required: true,
    },
    driverDescription: {
      type: String,
      default: '',
    },
    journeyNotes: {
      type: String,
      default: '',
    },
    startCoords: {
      lat: { type: Number },
      lng: { type: Number },
    },
    destinationCoords: {
      lat: { type: Number },
      lng: { type: Number },
    },
    photoUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'SIGNAL_LOST', 'EMERGENCY', 'DURESS'],
      default: 'ACTIVE',
    },
    lastHeartbeatAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    // Dual-PIN Silent Duress Deactivation audit trail: set only when the secret
    // fake PIN is used to "deactivate" the alarm, silently escalating it instead.
    duressTriggeredAt: {
      type: Date,
    },
    duressLastLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
    // Which pathway escalated this trip to EMERGENCY (1-tap panic button vs. the
    // dead-battery final blast). Lets guardian notifications explain why the alert fired.
    emergencySource: {
      type: String,
      enum: ['PANIC', 'BATTERY_CRITICAL', 'ROUTE_DEVIATION', 'UNEXPECTED_STOP'],
    },
    batteryCriticalTriggeredAt: {
      type: Date,
    },
    batteryLevelAtTrigger: {
      type: Number,
    },
    batteryCriticalLastLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
    safeTripPurged: {
      type: Boolean,
      default: false,
    },
<<<<<<< Updated upstream
=======
    // Route Deviation & Unexpected Stop Detection: a one-time OSRM road-route snapshot
    // captured from startCoords/destinationCoords at trip creation (see createTrip) - not a
    // separate route-planning system, just a persisted copy of the same lookup the client
    // already does to draw the live map.
    plannedRoute: [
      {
        lat: { type: Number },
        lng: { type: Number },
        _id: false,
      },
    ],
    deviationTracking: {
      outOfBoundsSince: { type: Date, default: null },
    },
    stopTracking: {
      anchorLat: { type: Number },
      anchorLng: { type: Number },
      stationarySince: { type: Date },
    },
    safetyCheck: {
      active: { type: Boolean, default: false },
      reason: { type: String, enum: ['ROUTE_DEVIATION', 'UNEXPECTED_STOP'] },
      triggeredAt: { type: Date },
      expiresAt: { type: Date },
      location: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    safetyCheckHistory: [
      {
        reason: { type: String, enum: ['ROUTE_DEVIATION', 'UNEXPECTED_STOP'] },
        triggeredAt: { type: Date },
        resolvedAt: { type: Date },
        outcome: { type: String, enum: ['CONFIRMED_SAFE', 'ESCALATED', 'TRIP_COMPLETED'] },
        _id: false,
      },
    ],
    // Self-Destructing Tracking Link token & expiration for Guardians
    trackingToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    trackingExpiresAt: {
      type: Date,
    },
    trackingActive: {
      type: Boolean,
      default: true,
    },
    evidence: {
      photos: [
        {
          url: { type: String, required: true },
          public_id: { type: String },
          capturedAt: { type: Date, default: Date.now },
          sizeBytes: { type: Number, default: 0 },
          sequenceIndex: { type: Number, default: 0 },
        },
      ],
      audioClips: [
        {
          url: { type: String, required: true },
          public_id: { type: String },
          capturedAt: { type: Date, default: Date.now },
          durationSec: { type: Number, default: 0 },
          sizeBytes: { type: Number, default: 0 },
        },
      ],
      captureStatus: {
        type: String,
        enum: ['PENDING', 'CAPTURING', 'COMPLETED', 'PARTIAL', 'FAILED'],
        default: 'PENDING',
      },
      totalSizeBytes: {
        type: Number,
        default: 0,
      },
    },
>>>>>>> Stashed changes
  },
  { timestamps: true }
);

// TTL Index: Automatically purge safe completed trips after 48 hours (when expiresAt passes)
tripSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Trip = mongoose.model('Trip', tripSchema);
