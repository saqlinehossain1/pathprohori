import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      req.user = await User.findById(decoded.id)
        .select('-password')
        .populate('guardians.user', 'name email phone avatarUrl role gender');
      if (!req.user) {
        return res.status(401).json({ message: 'User no longer exists' });
      }
      return next();
    } catch (error) {
      console.error('[Auth Middleware Error]', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

// navigator.sendBeacon() (used by the dead-battery emergency blast, since it must
// reliably deliver even as the page unloads) cannot set an Authorization header, so
// this variant also accepts the JWT smuggled into the request body. Only use it on
// routes that specifically need to support beacon delivery - everywhere else should
// keep using the header-only `protect` above.
export const protectFromHeaderOrBody = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.body && req.body.token) {
    token = req.body.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = await User.findById(decoded.id)
      .select('-password')
      .populate('guardians.user', 'name email phone avatarUrl role gender');
    if (!req.user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }
    return next();
  } catch (error) {
    console.error('[Auth Middleware Error]', error.message);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};
