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
    safeTripPurged: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Trip = mongoose.model('Trip', tripSchema);
