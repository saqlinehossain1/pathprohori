import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

// Seed / sync actual team members and demo user accounts
const seedDemoUsers = async () => {
  try {
    const userSeedList = [
      {
        name: 'Md Saqline Hossain',
        email: 'saqline.hossain@g.bracu.ac.bd',
        password: 'Saqline2026!',
        role: 'commuter',
        phone: '+880 1711-123456',
        emergencyPhrase: 'Lavender Moonlight',
        duressPin: '9999',
      },
      {
        name: 'Badrunnaher Pantho',
        email: 'badrunnaher.pantho@g.bracu.ac.bd',
        password: 'Pantho2026!',
        role: 'guardian',
        phone: '+880 1811-234567',
        emergencyPhrase: 'Silent Crimson',
        duressPin: '8888',
      },
      {
        name: 'Mehedi Hasan Shovon',
        email: 'mehedi.hasan.shovon@g.bracu.ac.bd',
        password: 'Shovon2026!',
        role: 'operator',
        phone: '+880 1911-345678',
        emergencyPhrase: 'Blue Sentinel',
        duressPin: '7777',
      },
      {
        name: 'Jamshedul Alam Khan Hridoy',
        email: 'jamshedul.alam@g.bracu.ac.bd',
        password: 'Hridoy2026!',
        role: 'admin',
        phone: '+880 1611-456789',
        emergencyPhrase: 'Apex Guardian',
        duressPin: '6666',
      },
      {
        name: 'Demo Commuter',
        email: 'commuter@pathprohori.com',
        password: 'pass1234',
        role: 'commuter',
        phone: '+880 1700-111222',
        emergencyPhrase: 'Lavender Moonlight',
      },
      {
        name: 'Demo Guardian',
        email: 'guardian@pathprohori.com',
        password: 'pass1234',
        role: 'guardian',
        phone: '+880 1800-333444',
        emergencyPhrase: 'Safe Passage',
      },
    ];

    for (const uData of userSeedList) {
      let existingUser = await User.findOne({ email: uData.email });
      if (!existingUser) {
        await User.create(uData);
        console.log(`[Database Seed] Created account: ${uData.email}`);
      } else {
        existingUser.password = uData.password;
        await existingUser.save();
        console.log(`[Database Seed] Synced password for: ${uData.email}`);
      }
    }
  } catch (err) {
    console.error('[Auth Seed Error]', err.message);
  }
};

setTimeout(seedDemoUsers, 1500);

// @route   POST /api/auth/register
// @desc    Register a new user (Commuter, Guardian, Operator, Admin)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, emergencyPhrase } = req.body;

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
      emergencyPhrase: emergencyPhrase || 'Lavender Moonlight',
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      emergencyPhrase: user.emergencyPhrase,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        emergencyPhrase: user.emergencyPhrase,
        guardians: user.guardians,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

// @route   PUT /api/auth/profile
// @desc    Update user profile & voice settings
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.name = req.body.name || user.name;
      user.phone = req.body.phone || user.phone;
      user.emergencyPhrase = req.body.emergencyPhrase || user.emergencyPhrase;
      user.duressPin = req.body.duressPin || user.duressPin;

      if (req.body.guardians) {
        user.guardians = req.body.guardians;
      }

      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        emergencyPhrase: updatedUser.emergencyPhrase,
        guardians: updatedUser.guardians,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
