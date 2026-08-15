import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

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

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
export const loginUser = async (req, res, next) => {
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
        gender: user.gender || 'female',
        emergencyPhrase: user.emergencyPhrase,
        duressPin: user.duressPin,
        guardians: user.guardians,
        avatarUrl: user.avatarUrl,
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
export const getProfile = async (req, res) => {
  res.json(req.user);
};

// @desc    Update user profile & voice settings
// @route   PUT /api/auth/profile
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.name = req.body.name || user.name;
      user.phone = req.body.phone || user.phone;
      if (req.body.gender) user.gender = req.body.gender;
      user.emergencyPhrase = req.body.emergencyPhrase || user.emergencyPhrase;
      user.duressPin = req.body.duressPin || user.duressPin;
      if (typeof req.body.avatarUrl === 'string') {
        user.avatarUrl = req.body.avatarUrl;
      }

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
        gender: updatedUser.gender,
        emergencyPhrase: updatedUser.emergencyPhrase,
        duressPin: updatedUser.duressPin,
        guardians: updatedUser.guardians,
        avatarUrl: updatedUser.avatarUrl,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    next(error);
  }
};
