import { Emergency } from '../models/Emergency.js';
import { User } from '../models/User.js';
import { getIO } from '../socket.js';

const translateLocation = (str) => {
  if (!str) return '';
  let result = str
    .replace(/বসুন্ধরা আবাসিক এলাকা/g, 'Bashundhara Residential Area')
    .replace(/বসুন্ধরা/g, 'Bashundhara R/A')
    .replace(/আবাসিক এলাকা/g, 'Residential Area')
    .replace(/ব্লক/g, 'Block')
    .replace(/রোড/g, 'Road')
    .replace(/সেক্টর/g, 'Sector')
    .replace(/ঢাকা/g, 'Dhaka')
    .replace(/কুড়িল/g, 'Kuril')
    .replace(/উত্তরা/g, 'Uttara')
    .replace(/ধানমন্ডি/g, 'Dhanmondi')
    .replace(/গুলশান/g, 'Gulshan')
    .replace(/বনানী/g, 'Banani')
    .replace(/মিরপুর/g, 'Mirpur')
    .replace(/মোহাম্মদপুর/g, 'Mohammadpur')
    .replace(/তেজগাঁও/g, 'Tejgaon')
    .replace(/মহাখালী/g, 'Mohakhali');

  // Strip any lingering Bengali unicode characters to prevent mixed text
  return result.replace(/[\u0980-\u09FF]+/g, '').trim();
};

const getReverseGeocodedAddress = async (lat, lng) => {
  try {
    // 1. Primary: Nominatim with accept-language=en for pure English translations
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=en`,
      {
        headers: {
          'User-Agent': 'PathProhori/1.0 (contact@pathprohori.com)',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      const road = translateLocation(addr.road || data.name || '');
      const quarter = translateLocation(addr.quarter || addr.suburb || addr.neighbourhood || '');
      const area = translateLocation(addr.suburb || addr.residential || addr.district || '');
      const city = translateLocation(addr.city || addr.town || addr.county || '') || 'Dhaka';

      const rawParts = [road, quarter, area, city].filter(Boolean);

      const allTokens = rawParts
        .flatMap((part) => part.split(','))
        .map((t) => t.trim())
        .filter(Boolean);

      const uniqueTokens = [];
      const seen = new Set();

      for (const token of allTokens) {
        const normalized = token.toLowerCase();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          uniqueTokens.push(token);
        }
      }

      const formattedAddress = uniqueTokens.join(', ');
      if (formattedAddress && formattedAddress.length > 3) {
        return formattedAddress;
      }
    }
  } catch (err) {
    console.warn('[Server Geocoding Warning]', err.message);
  }

  // Backup: BigDataCloud Reverse Geocode (100% English)
  try {
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const locality = bdcData.locality || bdcData.city || '';
      const country = bdcData.countryName || 'Bangladesh';
      const informative = (bdcData.localityInfo?.informative || [])
        .map((i) => i.name)
        .filter((n) => n && n !== 'Asia' && n !== 'Indian subcontinent' && !n.includes('/') && n !== country);

      const specificArea = informative.length > 0 ? informative.slice(0, 2).join(', ') : locality;
      const fullName = [specificArea, bdcData.city || country].filter(Boolean).join(', ');
      if (fullName) {
        return fullName;
      }
    }
  } catch (_) {}

  return `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
};

export const triggerEmergency = async (req, res, next) => {
    try {
        const { latitude, longitude } = req.body;

        // Validate location
        if (
            typeof latitude !== 'number' ||
            typeof longitude !== 'number'
        ) {
            return res.status(400).json({
                message: 'Valid latitude and longitude are required.',
            });
        }

        // Get current user
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found.',
            });
        }

        // Perform server-side reverse geocoding
        const address = await getReverseGeocodedAddress(latitude, longitude);

        // Create emergency
        const emergency = await Emergency.create({
            user: user._id,
            location: {
                latitude,
                longitude,
                address,
            },
            status: 'ACTIVE',
        });

        /*
         * Find all target recipients when an emergency is triggered:
         * 1. Users listed in this user's guardians[] array (whether commuter or guardian role).
         * 2. Users who listed this user in their guardians[] array.
         * 3. Users with role 'guardian', 'operator', or 'admin'.
         */
        const myGuardianEmails = (user.guardians || [])
            .map((g) => g.email)
            .filter(Boolean);

        const usersWhoAssignedMe = await User.find({
            'guardians.email': { $regex: new RegExp(`^${user.email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
        }).select('_id email');

        const assignedUserIds = usersWhoAssignedMe.map((u) => u._id);
        const emailRegexes = myGuardianEmails.map((e) => new RegExp(`^${e.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i'));

        let recipientQuery = {
            $or: [
                { role: { $in: ['guardian', 'operator', 'admin'] } },
                ...(emailRegexes.length > 0 ? [{ email: { $in: emailRegexes } }] : []),
                ...(assignedUserIds.length > 0 ? [{ _id: { $in: assignedUserIds } }] : []),
            ],
        };

        let recipients = await User.find(recipientQuery);

        // Exclude the sender (the user who triggered the emergency) from receiving guardian alerts
        recipients = recipients.filter((r) => r._id.toString() !== user._id.toString());

        console.log(`[Emergency] Emitting real-time alert to ${recipients.length} user account(s).`);

        const io = getIO();

        // Send real-time notification
        recipients.forEach((recipient) => {
            io.to(`user_${recipient._id}`).emit('EMERGENCY_ALERT', {
                emergencyId: emergency._id,
                type: 'EMERGENCY',
                title: '🚨 Emergency Alert',
                message: `${user.name} has triggered an emergency.`,

                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                },

                location: {
                    latitude,
                    longitude,
                    address: emergency.location?.address || address,
                },

                timestamp: emergency.triggeredAt || emergency.createdAt,
            });
        });

        return res.status(201).json({
            success: true,
            message: 'Emergency activated successfully.',
            emergency: {
                id: emergency._id,
                status: emergency.status,
                location: emergency.location,
                triggeredAt: emergency.triggeredAt,
            },
        });
    } catch (error) {
        console.error('[Emergency Trigger Error]', error);
        next(error);
    }
};

// @desc    Resolve/Stop an active emergency
// @route   PUT /api/emergency/resolve
export const resolveEmergency = async (req, res, next) => {
    try {
        const { emergencyId } = req.body;

        let emergency;
        if (emergencyId) {
            emergency = await Emergency.findOne({ _id: emergencyId, user: req.user._id, status: 'ACTIVE' });
        }
        if (!emergency) {
            emergency = await Emergency.findOne({ user: req.user._id, status: 'ACTIVE' }).sort({ createdAt: -1 });
        }

        if (emergency) {
            emergency.status = 'RESOLVED';
            emergency.resolvedAt = new Date();
            await emergency.save();
        }

        const io = getIO();
        io.emit('EMERGENCY_RESOLVED', {
            emergencyId: emergency?._id || emergencyId,
            userId: req.user._id,
            message: `${req.user.name} has resolved/canceled the emergency.`,
        });

        return res.json({
            success: true,
            message: 'Emergency resolved successfully.',
            emergencyId: emergency?._id || emergencyId,
        });
    } catch (error) {
        console.error('[Resolve Emergency Error]', error);
        next(error);
    }
};

// @desc    Get recent emergency alerts for guardians & response monitor
// @route   GET /api/emergency
export const getEmergencies = async (req, res, next) => {
    try {
        const currentUser = req.user;

        // 1. Emails of guardians assigned by currentUser
        const myGuardianEmails = (currentUser?.guardians || [])
            .map((g) => g.email)
            .filter(Boolean);

        // 2. User IDs of users who assigned currentUser as their guardian
        const usersWhoAssignedMe = await User.find({
            'guardians.email': { $regex: new RegExp(`^${currentUser.email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
        }).select('_id');

        const usersWhoAssignedMeIds = usersWhoAssignedMe.map((u) => u._id);

        // 3. User IDs of currentUser's assigned guardians
        let myGuardianUserIds = [];
        if (myGuardianEmails.length > 0) {
            const emailRegexes = myGuardianEmails.map((e) => new RegExp(`^${e.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i'));
            const guardianUsers = await User.find({ email: { $in: emailRegexes } }).select('_id');
            myGuardianUserIds = guardianUsers.map((u) => u._id);
        }

        const relatedUserIds = Array.from(new Set([...usersWhoAssignedMeIds.map(id => id.toString()), ...myGuardianUserIds.map(id => id.toString())]));

        let query = {};

        if (currentUser?.role === 'commuter') {
            // Commuters see emergencies triggered by:
            // - Users who assigned currentUser as their guardian
            // - Assigned guardians of currentUser
            if (relatedUserIds.length === 0) {
                return res.json([]);
            }
            query = { user: { $in: relatedUserIds } };
        } else if (currentUser?.role === 'guardian') {
            if (relatedUserIds.length > 0) {
                query = { user: { $in: relatedUserIds } };
            }
        }
        // Operators and Admins see all emergency alerts (query = {})

        const emergencies = await Emergency.find(query)
            .populate('user', 'name email phone avatarUrl')
            .sort({ createdAt: -1 })
            .limit(30);

        // Filter out self-triggered emergencies
        const filtered = emergencies.filter(
            (e) => e.user && e.user._id.toString() !== currentUser._id.toString()
        );

        const formatted = filtered.map((e) => ({
            id: e._id,
            emergencyId: e._id,
            type: 'EMERGENCY',
            title: '🚨 Emergency Alert',
            message: `${e.user?.name || 'Commuter'} has triggered an emergency.`,
            user: {
                id: e.user?._id,
                name: e.user?.name || 'Commuter',
                email: e.user?.email,
                phone: e.user?.phone,
            },
            location: e.location,
            timestamp: e.triggeredAt || e.createdAt,
            read: e.status === 'RESOLVED',
        }));

        return res.json(formatted);
    } catch (error) {
        console.error('[Get Emergencies Error]', error);
        next(error);
    }
};