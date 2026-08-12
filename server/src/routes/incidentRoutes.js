import express from 'express';
import { Incident } from '../models/Incident.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Seed initial incidents if database is empty
const seedInitialIncidents = async () => {
  const count = await Incident.countDocuments();
  if (count === 0) {
    await Incident.create([
      {
        title: 'Street Light Outage & Suspicious Activity',
        description: 'Reported near Green Valley Park east entrance. Entire block lighting is offline. Multiple users have reported a group of individuals lingering in the shadows near bike racks. Please avoid this path until patrol arrives.',
        locationName: 'Green Valley Park East Entrance',
        location: { type: 'Point', coordinates: [90.4125, 23.8103] },
        severity: 'High Alert',
        distanceKm: 0.8,
        isVerified: true,
        comments: [
          {
            authorName: 'Sarah Mitchell',
            authorRole: 'Verified Resident',
            text: 'I just drove past. The street lights are indeed all off from the park entrance down to the 4th street intersection. I saw two police cruisers just arriving at the scene now. Stay safe everyone!',
            likes: 12,
          },
          {
            authorName: 'David Chen',
            authorRole: 'Commuter',
            text: 'Be careful with the potholes near the dark stretch too, very hard to see them without the overhead lights.',
            imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
            likes: 6,
          },
          {
            authorName: 'Elena Rodriguez',
            authorRole: 'Local Guardian',
            text: 'Has anyone heard if the utility company has been notified about the lights?',
            likes: 3,
          },
        ],
      },
      {
        title: 'Large Crowd Gathering & Traffic Obstacle',
        description: 'Unplanned demonstration near Central Park entrance. Heavy pedestrian traffic and noise reported. Might delay CNGs and Rickshaws.',
        locationName: 'Central Park West Ave',
        location: { type: 'Point', coordinates: [90.4150, 23.8150] },
        severity: 'Med Severity',
        distanceKm: 2.4,
        isVerified: true,
        comments: [],
      },
      {
        title: 'Sidewalk Construction & Poor Lighting',
        description: 'Emergency pipe repairs. Sidewalk is narrow, forcing pedestrians closer to the street. Good lighting overhead.',
        locationName: '72nd St & 3rd Ave',
        location: { type: 'Point', coordinates: [90.4200, 23.8200] },
        severity: 'Low Severity',
        distanceKm: 3.1,
        isVerified: false,
        comments: [],
      },
    ]);
    console.log('[Incident Seed] Created initial demo incidents matching Figma designs');
  }
};

// @route   GET /api/incidents
// @desc    Get all danger feed incidents
router.get('/', async (req, res) => {
  try {
    await seedInitialIncidents();
    const incidents = await Incident.find().sort({ createdAt: -1 });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/incidents/:id
// @desc    Get single incident details & discussion thread
router.get('/:id', async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    res.json(incident);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/incidents
// @desc    Report new incident
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, locationName, longitude, latitude, severity, imageUrl } = req.body;

    const incident = await Incident.create({
      title,
      description,
      locationName: locationName || 'Current Location',
      location: {
        type: 'Point',
        coordinates: [longitude || 90.4125, latitude || 23.8103],
      },
      severity: severity || 'Med Severity',
      reportedBy: req.user._id,
      imageUrl,
    });

    res.status(201).json(incident);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/incidents/:id/upvote
// @desc    Upvote an incident report (Module 1 Community Verification)
router.post('/:id/upvote', protect, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const userIdStr = req.user._id.toString();
    const existingIndex = incident.upvotes.findIndex(
      (id) => id.toString() === userIdStr
    );

    if (existingIndex > -1) {
      incident.upvotes.splice(existingIndex, 1);
    } else {
      incident.upvotes.push(req.user._id);
    }

    // Auto-mark Community Verified if upvotes >= 10
    if (incident.upvotes.length >= 10) {
      incident.isVerified = true;
    }

    await incident.save();
    res.json({
      upvotesCount: incident.upvotes.length,
      isVerified: incident.isVerified,
      upvotedByUser: existingIndex === -1,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/incidents/:id/comments
// @desc    Add comment to discussion thread
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { text, imageUrl } = req.body;
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const newComment = {
      author: req.user._id,
      authorName: req.user.name,
      authorRole: req.user.role === 'guardian' ? 'Verified Guardian' : 'Commuter',
      text,
      imageUrl: imageUrl || '',
      likes: 0,
      createdAt: new Date(),
    };

    incident.comments.push(newComment);
    await incident.save();

    res.status(201).json(incident.comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
