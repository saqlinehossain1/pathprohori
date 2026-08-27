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
    },
    {
        timestamps: true,
    }
);

export const Emergency = mongoose.model('Emergency', emergencySchema);