import { SafetyZone } from '../models/SafetyZone.js';

const validCoordinate = (value, min, max) => typeof value === 'number' && value >= min && value <= max;

export const createSafetyZone = async (req, res, next) => {
  try {
    const { name, description, latitude, longitude, radiusMeters, zoneType, severity, source, verificationStatus, activeFrom, expiresAt } = req.body || {};
    if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) {
      return res.status(400).json({ message: 'Valid latitude and longitude are required.' });
    }
    const zone = await SafetyZone.create({
      name, description, radiusMeters, zoneType, severity, source, verificationStatus,
      activeFrom, expiresAt, createdBy: req.user._id,
      center: { type: 'Point', coordinates: [longitude, latitude] },
    });
    res.status(201).json(zone);
  } catch (error) {
    next(error);
  }
};

export const getSafetyZones = async (req, res, next) => {
  try {
    const now = new Date();
    const zones = await SafetyZone.find({
      enabled: true,
      verificationStatus: 'VERIFIED',
      activeFrom: { $lte: now },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    }).sort({ severity: 1, createdAt: -1 });
    res.json(zones);
  } catch (error) {
    next(error);
  }
};

export const updateSafetyZone = async (req, res, next) => {
  try {
    const zone = await SafetyZone.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!zone) return res.status(404).json({ message: 'Safety zone not found.' });
    res.json(zone);
  } catch (error) {
    next(error);
  }
};
