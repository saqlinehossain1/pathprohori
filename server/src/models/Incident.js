import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: String,
    authorRole: String,
    text: {
      type: String,
      required: true,
    },
    imageUrl: String,
    likes: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const incidentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    locationName: {
      type: String,
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
    severity: {
      type: String,
      enum: ['High Alert', 'High Severity', 'Med Severity', 'Low Severity'],
      default: 'Med Severity',
    },
    distanceKm: {
      type: Number,
      default: 1.2,
    },
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    imageUrl: String,
    comments: [commentSchema],
  },
  { timestamps: true }
);

incidentSchema.index({ location: '2dsphere' });

export const Incident = mongoose.model('Incident', incidentSchema);
