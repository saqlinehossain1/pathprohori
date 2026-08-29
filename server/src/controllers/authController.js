import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Trip } from '../models/Trip.js';
import Notification from '../models/Notification.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user (Commuter, Guardian, Operator, Admin)
// @route   POST /api/auth/register
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, gender, emergencyPhrase, avatarUrl } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'commuter',
      phone: phone || '',
      gender: gender || 'female',
      emergencyPhrase: emergencyPhrase || 'Lavender Moonlight',
      avatarUrl: avatarUrl || '',
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      gender: user.gender,
      emergencyPhrase: user.emergencyPhrase,
      avatarUrl: user.avatarUrl,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// Helper to populate user and dynamically merge live guardian user profile data (latest name, phone, email, avatar)
export const getUserWithLiveGuardians = async (userId) => {
  const user = await User.findById(userId)
    .select('-password +normalPin +fakePin')
    .populate('guardians.user', 'name email phone avatarUrl role gender');

  if (!user) return null;

  const userObj = user.toObject();

  // Expose only whether each PIN is configured - never the PIN or its hash.
  userObj.hasNormalPin = !!userObj.normalPin;
  userObj.hasFakePin = !!userObj.fakePin;
  delete userObj.normalPin;
  delete userObj.fakePin;

  if (Array.isArray(userObj.guardians)) {
    userObj.guardians = userObj.guardians.map((g) => {
      if (g.user && typeof g.user === 'object') {
        return {
          _id: g._id,
          user: g.user._id,
          name: g.user.name || g.name,
          email: g.user.email || g.email,
          phone: g.user.phone !== undefined && g.user.phone !== '' ? g.user.phone : g.phone,
          avatarUrl: g.user.avatarUrl !== undefined && g.user.avatarUrl !== '' ? g.user.avatarUrl : g.avatarUrl,
          relationship: g.relationship || 'Guardian',
        };
      }
      return g;
    });
  }

  return userObj;
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: 'Database unavailable. Start MongoDB or update server/.env with a reachable MONGO_URI.',
      });
    }

    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      const fullProfile = await getUserWithLiveGuardians(user._id);
      res.json({
        ...fullProfile,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getProfile = async (req, res, next) => {
  try {
    const fullProfile = await getUserWithLiveGuardians(req.user._id);
    res.json(fullProfile || req.user);
  } catch (error) {
    next(error);
  }
};

// @desc    Search registered platform users by name, email, or phone
// @route   GET /api/auth/search-users?q=query
export const searchUsers = async (req, res, next) => {
  try {
    const query = req.query.q || '';
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    const searchRegex = new RegExp(query.trim(), 'i');

    const users = await User.find({
      _id: { $ne: req.user._id },
      role: { $in: ['commuter', 'guardian'] },
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ],
    })
      .select('_id name email phone role avatarUrl gender')
      .limit(10);

    res.json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile & voice settings
// @route   PUT /api/auth/profile
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.name = req.body.name || user.name;
      user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
      if (req.body.gender) user.gender = req.body.gender;
      user.emergencyPhrase = req.body.emergencyPhrase || user.emergencyPhrase;
      user.duressPin = req.body.duressPin || user.duressPin;

      // Dual-PIN Silent Duress Deactivation: genuine + secret alarm PINs.
      // Only touched when explicitly provided (non-empty) so unrelated profile
      // updates (avatar, guardians, etc.) never accidentally clear a saved PIN.
      if (req.body.normalPin) {
        if (!/^\d{4}$/.test(req.body.normalPin)) {
          return res.status(400).json({ message: 'Deactivation PIN must be exactly 4 digits.' });
        }
        user.normalPin = req.body.normalPin;
      }
      if (req.body.fakePin) {
        if (!/^\d{4}$/.test(req.body.fakePin)) {
          return res.status(400).json({ message: 'Silent Alarm PIN must be exactly 4 digits.' });
        }
        user.fakePin = req.body.fakePin;
      }
      if (req.body.normalPin && req.body.fakePin && req.body.normalPin === req.body.fakePin) {
        return res.status(400).json({ message: 'Deactivation PIN and Silent Alarm PIN must be different.' });
      }

      if (typeof req.body.avatarUrl === 'string') {
        user.avatarUrl = req.body.avatarUrl;
      }

      if (Array.isArray(req.body.guardians)) {
        if (req.body.guardians.length > 3) {
          return res.status(400).json({ message: 'You can link a maximum of 3 emergency guardians.' });
        }
        user.guardians = req.body.guardians.map((g) => {
          const targetUserId = g.user && typeof g.user === 'object' ? g.user._id : (g.user || g._id);
          return {
            user: targetUserId,
            name: g.name || '',
            phone: g.phone || '',
            email: g.email || '',
            avatarUrl: g.avatarUrl || '',
            relationship: g.relationship || 'Guardian',
          };
        });
      }

      await user.save();
      const fullProfile = await getUserWithLiveGuardians(user._id);
      res.json(fullProfile);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc Save Web Push subscription endpoint for user
// @route POST /api/auth/subscribe-push
export const subscribePush = async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ message: 'Invalid push subscription object' });
    }

    const user = await User.findById(req.user._id);
    if (user) {
      user.pushSubscription = subscription;
      await user.save();
      return res.json({ success: true, message: 'Web Push notification subscription saved' });
    }
    res.status(404).json({ message: 'User not found' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update commuter's standalone safe/unsafe status & alert guardians
// @route   POST /api/auth/safety-status
export const updateUserSafetyStatus = async (req, res, next) => {
  try {
    const { safetyStatus, latitude, longitude, address } = req.body || {};
    if (!['SAFE', 'UNSAFE'].includes(safetyStatus)) {
      return res.status(400).json({ message: 'Safety status must be SAFE or UNSAFE.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();
    user.safetyStatus = safetyStatus;
    user.safetyStatusChangedAt = now;
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      user.safetyStatusLocation = {
        latitude,
        longitude,
        address: address || '',
      };
    }
    await user.save();

    // Also sync with active trip if running
    const activeTrip = await Trip.findOne({
      user: user._id,
      status: { $in: ['ACTIVE', 'SIGNAL_LOST', 'EMERGENCY', 'DURESS'] },
    }).sort({ createdAt: -1 });

    if (activeTrip) {
      activeTrip.safetyStatus = safetyStatus;
      activeTrip.safetyStatusChangedAt = now;
      activeTrip.safetyStatusChangedBy = user._id;
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        activeTrip.safetyStatusLocation = { lat: latitude, lng: longitude };
      }
      await activeTrip.save();
    }

    // Guardian and Operator notification dispatch
    const guardianRecipients = (user.guardians || [])
      .map((g) => g.user?._id || g.user)
      .filter(Boolean);

    const operatorRecipients = await User.find({
      role: { $in: ['operator', 'admin'] },
      _id: { $ne: user._id },
    }).select('_id');

    const recipients = [
      ...new Map(
        [...guardianRecipients, ...operatorRecipients.map((op) => op._id)].map((rId) => [
          String(rId),
          rId,
        ])
      ).values(),
    ];

    const io = req.app.get('io');

    if (safetyStatus === 'UNSAFE') {
      const title = `⚠️ Commuter Feeling Unsafe: ${user.name}`;
      const message = `${user.name} reported feeling unsafe. Please check out on them immediately with their location.`;

      // Save notification to DB for all guardians
      const createdNotifications = await Promise.all(
        recipients.map((recipientId) =>
          Notification.create({
            recipientId,
            senderId: user._id,
            tripId: activeTrip?._id,
            type: 'WARNING',
            notificationType: 'FEELING_UNSAFE',
            title,
            message,
            commuterName: user.name,
            senderName: user.name,
            destination: activeTrip?.destination || 'N/A',
            location: {
              latitude: latitude || user.safetyStatusLocation?.latitude || 23.7808,
              longitude: longitude || user.safetyStatusLocation?.longitude || 90.4068,
              address: address || user.safetyStatusLocation?.address || 'Commuter current location',
            },
          })
        )
      );

      if (io) {
        createdNotifications.forEach((notif) => {
          const payload = {
            id: notif._id,
            notificationId: notif._id,
            type: 'WARNING',
            notificationType: 'FEELING_UNSAFE',
            title,
            message,
            commuterName: user.name,
            senderName: user.name,
            senderId: user._id,
            tripId: activeTrip?._id,
            safetyStatus: 'UNSAFE',
            location: notif.location,
            timestamp: notif.createdAt || now,
          };

          // Emit exactly one notification event to the recipient's room
          io.to(`user_${notif.recipientId}`).emit('COMMUTER_FEELING_UNSAFE', payload);
          io.to(`user:${notif.recipientId}`).emit('COMMUTER_FEELING_UNSAFE', payload);
        });
      }
    } else {
      // Marked SAFE - Resolve all unresolved warning/emergency notifications for this commuter
      await Notification.updateMany(
        { senderId: user._id, resolvedAt: { $exists: false } },
        { $set: { resolvedAt: now, isRead: true } }
      );

      const safePayload = {
        commuterName: user.name,
        userId: user._id,
        safetyStatus: 'SAFE',
        timestamp: now,
        message: `${user.name} marked themselves safe.`,
      };

      if (io) {
        recipients.forEach((recipientId) => {
          io.to(`user_${recipientId}`).emit('COMMUTER_MARKED_SAFE', safePayload);
          io.to(`user_${recipientId}`).emit('EMERGENCY_RESOLVED', {
            userId: user._id,
            resolvedAt: now.toISOString(),
            message: `${user.name} marked themselves safe.`,
          });
        });
      }
    }

    res.json({
      success: true,
      safetyStatus: user.safetyStatus,
      safetyStatusLocation: user.safetyStatusLocation,
      safetyStatusChangedAt: user.safetyStatusChangedAt,
      activeTrip: activeTrip || null,
    });
  } catch (error) {
    next(error);
  }
};


