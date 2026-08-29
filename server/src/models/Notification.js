import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: false },
    type: { type: String, enum: ['CRITICAL_EMERGENCY', 'WARNING'], default: 'CRITICAL_EMERGENCY' },
    title: { type: String, default: '🚨 CRITICAL EMERGENCY ALERT' },
    commuterName: { type: String, default: 'Commuter' },
    senderName: { type: String, default: 'Emergency Contact' },
    vehicleInfo: {
        vehicleType: { type: String, default: 'Transport' },
        licensePlate: { type: String, default: 'N/A' },
        driverDetails: { type: String, default: 'N/A' }
    },
    location: {
        latitude: { type: Number, default: 23.773315 },
        longitude: { type: Number, default: 90.424371 },
        address: { type: String, default: 'Live Coordinates Attached' }
    },
    startingLocation: { type: String, default: 'N/A' },
    destination: { type: String, default: 'N/A' },
    notificationType: { type: String, default: 'EMERGENCY' },
    message: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
    resolvedAt: { type: Date },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
