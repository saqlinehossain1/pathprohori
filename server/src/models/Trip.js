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
    safeTripPurged: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// TTL Index: Automatically purge safe completed trips after 48 hours (when expiresAt passes)
tripSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Trip = mongoose.model('Trip', tripSchema);
