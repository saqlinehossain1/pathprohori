import mongoose from 'mongoose';

const locationLogSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    speed: {
      type: Number,
      default: 0,
    },
    batteryLevel: {
      type: Number,
      default: 100,
    },
    isSafeTripCompleted: {
      type: Boolean,
      default: false,
    },
    purged: {
      type: Boolean,
      default: false,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

locationLogSchema.index({ location: '2dsphere' });
locationLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const LocationLog = mongoose.model('LocationLog', locationLogSchema);
