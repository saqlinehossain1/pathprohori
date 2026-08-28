import mongoose from 'mongoose';

const safetyZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    center: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    radiusMeters: { type: Number, required: true, min: 25, max: 50000 },
    zoneType: { type: String, enum: ['HIGH_RISK', 'TRANSIT_BLACKSPOT', 'TEMPORARY_THREAT'], required: true },
    severity: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
    source: { type: String, default: 'OPERATOR' },
    verificationStatus: { type: String, enum: ['PENDING', 'VERIFIED'], default: 'PENDING' },
    activeFrom: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

safetyZoneSchema.index({ center: '2dsphere' });
safetyZoneSchema.index({ enabled: 1, verificationStatus: 1, activeFrom: 1, expiresAt: 1 });

export const SafetyZone = mongoose.model('SafetyZone', safetyZoneSchema);
