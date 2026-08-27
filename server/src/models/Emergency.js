import mongoose from 'mongoose';

const emergencySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        trip: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Trip',
        },

        trackingToken: {
            type: String,
        },

        location: {
            latitude: {
                type: Number,
                required: true,
            },
            longitude: {
                type: Number,
                required: true,
            },
            address: {
                type: String,
                default: '',
            },
        },

        status: {
            type: String,
            enum: ['ACTIVE', 'RESOLVED'],
            default: 'ACTIVE',
        },

        alertType: {
            type: String,
            enum: ['PANIC', 'FALSE_ALARM', 'SILENT_DURESS'],
            default: 'PANIC',
        },

        severity: {
            type: String,
            enum: ['HIGH', 'CRITICAL'],
            default: 'HIGH',
        },

        triggeredAt: {
            type: Date,
            default: Date.now,
        },

        resolvedAt: {
            type: Date,
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
    },
    {
        timestamps: true,
    }
);

export const Emergency = mongoose.model('Emergency', emergencySchema);