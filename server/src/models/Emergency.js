import mongoose from 'mongoose';

const emergencySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
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