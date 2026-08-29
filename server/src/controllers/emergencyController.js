import mongoose from 'mongoose';
import { Emergency } from '../models/Emergency.js';
import { Trip } from '../models/Trip.js';
import { User } from '../models/User.js';
import Notification from '../models/Notification.js';
import { getIO } from '../socket.js';
import cloudinary from '../config/cloudinary.js';
import { dispatchMultiChannelEmergencyAlert } from '../services/emergencyBroadcaster.js';

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

export const getReverseGeocodedAddress = async (lat, lng) => {
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
    } catch (_) { }

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

            if (emergency.trip) {
                const trip = await Trip.findById(emergency.trip);
                if (trip && (trip.status === 'EMERGENCY' || trip.status === 'DURESS')) {
                    trip.status = 'ACTIVE';
                    trip.emergencySource = undefined;
                    await trip.save();
                }
            }

            // Also mark all related Notification records as resolved
            await Notification.updateMany(
                {
                    $or: [
                        ...(emergency.trip ? [{ tripId: emergency.trip }] : []),
                        { senderId: emergency.user },
                    ],
                    resolvedAt: { $exists: false },
                },
                { $set: { resolvedAt: new Date(), isRead: true } }
            );
        }

        const io = getIO();
        io.emit('EMERGENCY_RESOLVED', {
            emergencyIds: emergency ? [emergency._id] : [],
            emergencyId: emergency?._id || emergencyId,
            tripId: emergency?.trip,
            userId: req.user._id,
            resolvedAt: new Date().toISOString(),
            message: `${req.user.name} has resolved/canceled the emergency.`,
        });

        if (emergency?.trip) {
            io.emit('TRIP_STATUS_UPDATED', {
                tripId: emergency.trip,
                status: 'ACTIVE',
            });
        }

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

// @desc Resolve a monitored emergency or warning from the guardian notification panel
// @route PUT /api/emergency/:id/resolve
export const resolveMonitoredEmergency = async (req, res, next) => {
    try {
        const { id } = req.params;
        let emergency = mongoose.isValidObjectId(id) ? await Emergency.findById(id) : null;

        // If not found in Emergency collection, check if it is a Notification record
        if (!emergency && mongoose.isValidObjectId(id)) {
            const notif = await Notification.findById(id);
            if (notif) {
                notif.resolvedAt = new Date();
                notif.isRead = true;
                await notif.save();

                const io = getIO();
                io.emit('EMERGENCY_RESOLVED', {
                    emergencyIds: [notif._id],
                    emergencyId: notif._id,
                    tripId: notif.tripId,
                    userId: notif.senderId,
                    resolvedBy: req.user._id,
                    resolvedAt: notif.resolvedAt,
                    message: 'Alert marked resolved.',
                });

                return res.json({ success: true, notificationId: notif._id, status: 'RESOLVED' });
            }
        }

        if (!emergency) return res.status(404).json({ message: 'Emergency alert not found.' });

        const isResponseRole = ['guardian', 'operator', 'admin'].includes(req.user.role);
        const isAssignedGuardian = req.user.guardians?.some(
            (guardian) => String(guardian.user?._id || guardian.user) === String(emergency.user)
        );
        const assignedByAlertUser = await User.exists({
            _id: emergency.user,
            'guardians.email': req.user.email,
        });

        if (!isResponseRole && !isAssignedGuardian && !assignedByAlertUser) {
            return res.status(403).json({ message: 'You are not authorized to resolve this emergency alert.' });
        }

        emergency.status = 'RESOLVED';
        emergency.resolvedAt = new Date();
        await emergency.save();

        if (emergency.trip) {
            const trip = await Trip.findById(emergency.trip);
            if (trip && (trip.status === 'EMERGENCY' || trip.status === 'DURESS')) {
                trip.status = 'ACTIVE';
                trip.emergencySource = undefined;
                await trip.save();
            }
        }

        // Also mark all related Notification records as resolved
        await Notification.updateMany(
            {
                $or: [
                    ...(emergency.trip ? [{ tripId: emergency.trip }] : []),
                    { senderId: emergency.user },
                ],
                resolvedAt: { $exists: false },
            },
            { $set: { resolvedAt: new Date(), isRead: true } }
        );

        const io = getIO();
        io.emit('EMERGENCY_RESOLVED', {
            emergencyIds: [emergency._id],
            emergencyId: emergency._id,
            tripId: emergency.trip,
            userId: emergency.user,
            resolvedBy: req.user._id,
            resolvedAt: emergency.resolvedAt,
            message: 'Emergency response user marked this alert resolved.',
        });

        if (emergency.trip) {
            io.emit('TRIP_STATUS_UPDATED', {
                tripId: emergency.trip,
                status: 'ACTIVE',
            });
        }

        return res.json({ success: true, emergencyId: emergency._id, status: emergency.status });
    } catch (error) {
        console.error('[Resolve Monitored Emergency Error]', error);
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
            trackingToken: e.trackingToken,
            tripId: e.trip,
            type: e.alertType,
            severity: e.severity,
            title: e.alertType === 'SILENT_DURESS' ? '🚨 SILENT DURESS ALERT' : '🚨 Emergency Alert',
            message: e.status === 'RESOLVED'
                ? e.alertType === 'SILENT_DURESS'
                    ? `Duress response for ${e.user?.name || 'Commuter'} was marked resolved by a response user.`
                    : `${e.user?.name || 'Commuter'} confirmed safe. False alarm resolved and journey resumed.`
                : e.alertType === 'SILENT_DURESS'
                    ? `${e.user?.name || 'Commuter'} entered a silent duress PIN. Contact police immediately. Last seen coordinates are attached.`
                    : `${e.user?.name || 'Commuter'} has an active emergency alert.`,
            user: {
                id: e.user?._id,
                name: e.user?.name || 'Commuter',
                email: e.user?.email,
                phone: e.user?.phone,
                avatarUrl: e.user?.avatarUrl,
            },
            location: e.location,
            timestamp: e.triggeredAt || e.createdAt,
            status: e.status,
            resolvedAt: e.resolvedAt,
            read: e.status === 'RESOLVED',
        }));

        return res.json(formatted);
    } catch (error) {
        console.error('[Get Emergencies Error]', error);
        next(error);
    }
};

// Helper to resolve either an Emergency record or a Trip session by ID
const resolveEmergencyOrTrip = async (id) => {
    if (!id || !mongoose.isValidObjectId(id)) return { emergency: null, trip: null };
    let emergency = await Emergency.findOne({
        $or: [{ _id: id }, { trip: id }],
    }).populate('user', 'name email phone avatarUrl').sort({ createdAt: -1 });

    let trip = null;
    if (emergency?.trip) {
        trip = await Trip.findById(emergency.trip);
    } else {
        trip = await Trip.findById(id).populate('user', 'name email phone avatarUrl');
    }
    return { emergency, trip };
};

// @desc    Upload captured silent photo burst frame to emergency evidence locker
// @route   POST /api/emergency/:id/evidence/photo
export const uploadEmergencyPhoto = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { image, sequenceIndex, sizeBytes } = req.body;

        if (!image) {
            return res.status(400).json({ message: 'No photo data provided.' });
        }

        const { emergency, trip } = await resolveEmergencyOrTrip(id);
        if (!emergency && !trip) {
            return res.status(404).json({ message: 'Emergency session or trip not found.' });
        }

        // Upload compressed photo to dedicated secure evidence locker folder
        const uploadResponse = await cloudinary.uploader.upload(image, {
            folder: 'pathprohori_evidence/photos',
            resource_type: 'image',
        });

        const photoObj = {
            url: uploadResponse.secure_url,
            public_id: uploadResponse.public_id,
            capturedAt: new Date(),
            sizeBytes: sizeBytes || uploadResponse.bytes || 0,
            sequenceIndex: Number(sequenceIndex) || 0,
        };

        if (emergency) {
            if (!emergency.evidence) {
                emergency.evidence = { photos: [], audioClips: [], captureStatus: 'CAPTURING', totalSizeBytes: 0 };
            }
            emergency.evidence.photos.push(photoObj);
            emergency.evidence.totalSizeBytes = (emergency.evidence.totalSizeBytes || 0) + (photoObj.sizeBytes || 0);
            emergency.evidence.captureStatus = 'CAPTURING';
            await emergency.save();
        }

        if (trip) {
            if (!trip.evidence) {
                trip.evidence = { photos: [], audioClips: [], captureStatus: 'CAPTURING', totalSizeBytes: 0 };
            }
            trip.evidence.photos.push(photoObj);
            trip.evidence.totalSizeBytes = (trip.evidence.totalSizeBytes || 0) + (photoObj.sizeBytes || 0);
            trip.evidence.captureStatus = 'CAPTURING';
            await trip.save();
        }

        // Broadcast real-time evidence update to guardians & operators
        try {
            const io = getIO();
            const payload = {
                emergencyId: emergency?._id || trip?._id,
                tripId: trip?._id || emergency?.trip,
                userId: emergency?.user || trip?.user,
                type: 'PHOTO',
                photo: photoObj,
                evidence: emergency?.evidence || trip?.evidence,
            };
            io.emit('EVIDENCE_CAPTURED', payload);
            if (trip?._id) {
                io.to(`trip_${trip._id}`).emit('EVIDENCE_CAPTURED', payload);
            }
        } catch (socketErr) {
            console.warn('[Socket Evidence Broadcast Warning]', socketErr.message);
        }

        const activeEvidence = emergency?.evidence || trip?.evidence;
        return res.status(201).json({
            success: true,
            message: 'Evidence photo saved to secure locker.',
            photo: photoObj,
            totalPhotos: activeEvidence.photos.length,
            totalSizeBytes: activeEvidence.totalSizeBytes,
        });
    } catch (error) {
        console.error('[Upload Emergency Photo Error]', error);
        next(error);
    }
};

// @desc    Upload captured silent ambient audio clip to emergency evidence locker
// @route   POST /api/emergency/:id/evidence/audio
export const uploadEmergencyAudio = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { audio, durationSec, sizeBytes } = req.body;

        if (!audio) {
            return res.status(400).json({ message: 'No audio data provided.' });
        }

        const { emergency, trip } = await resolveEmergencyOrTrip(id);
        if (!emergency && !trip) {
            return res.status(404).json({ message: 'Emergency session or trip not found.' });
        }

        let formattedAudio = audio;
        if (typeof formattedAudio === 'string' && formattedAudio.startsWith('data:')) {
            formattedAudio = formattedAudio.replace(
                /^data:audio\/[a-zA-Z0-9.-]+(;codecs=[^;]+)?;base64,/i,
                'data:video/webm;base64,'
            );
        }

        const uploadResponse = await cloudinary.uploader.upload(formattedAudio, {
            folder: 'pathprohori_evidence/audio',
            resource_type: 'video',
        });

        const audioObj = {
            url: uploadResponse.secure_url,
            public_id: uploadResponse.public_id,
            capturedAt: new Date(),
            durationSec: Number(durationSec) || 5,
            sizeBytes: sizeBytes || uploadResponse.bytes || 0,
        };

        if (emergency) {
            if (!emergency.evidence) {
                emergency.evidence = { photos: [], audioClips: [], captureStatus: 'CAPTURING', totalSizeBytes: 0 };
            }
            emergency.evidence.audioClips.push(audioObj);
            emergency.evidence.totalSizeBytes = (emergency.evidence.totalSizeBytes || 0) + (audioObj.sizeBytes || 0);
            emergency.evidence.captureStatus = 'COMPLETED';
            await emergency.save();
        }

        if (trip) {
            if (!trip.evidence) {
                trip.evidence = { photos: [], audioClips: [], captureStatus: 'CAPTURING', totalSizeBytes: 0 };
            }
            trip.evidence.audioClips.push(audioObj);
            trip.evidence.totalSizeBytes = (trip.evidence.totalSizeBytes || 0) + (audioObj.sizeBytes || 0);
            trip.evidence.captureStatus = 'COMPLETED';
            await trip.save();
        }

        try {
            const io = getIO();
            const payload = {
                emergencyId: emergency?._id || trip?._id,
                tripId: trip?._id || emergency?.trip,
                userId: emergency?.user || trip?.user,
                type: 'AUDIO',
                audioClip: audioObj,
                evidence: emergency?.evidence || trip?.evidence,
            };
            io.emit('EVIDENCE_CAPTURED', payload);
            if (trip?._id) {
                io.to(`trip_${trip._id}`).emit('EVIDENCE_CAPTURED', payload);
            }
        } catch (socketErr) {
            console.warn('[Socket Evidence Broadcast Warning]', socketErr.message);
        }

        const activeEvidence = emergency?.evidence || trip?.evidence;
        return res.status(201).json({
            success: true,
            message: 'Evidence audio clip saved to secure locker.',
            audioClip: audioObj,
            totalAudioClips: activeEvidence.audioClips.length,
            totalSizeBytes: activeEvidence.totalSizeBytes,
        });
    } catch (error) {
        console.error('[Upload Emergency Audio Error]', error);
        next(error);
    }
};

// @desc    Retrieve Evidence Locker for an emergency or trip
// @route   GET /api/emergency/:id/evidence
export const getEmergencyEvidence = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { emergency, trip } = await resolveEmergencyOrTrip(id);

        if (!emergency && !trip) {
            return res.status(404).json({ message: 'Emergency session or trip not found.' });
        }

        const evidence = (emergency?.evidence?.photos?.length || emergency?.evidence?.audioClips?.length)
            ? emergency.evidence
            : (trip?.evidence?.photos?.length || trip?.evidence?.audioClips?.length)
            ? trip.evidence
            : emergency?.evidence || trip?.evidence || {
                photos: [],
                audioClips: [],
                captureStatus: 'PENDING',
                totalSizeBytes: 0,
            };

        return res.json({
            success: true,
            emergencyId: emergency?._id || trip?._id,
            tripId: trip?._id || emergency?.trip,
            user: emergency?.user || trip?.user,
            status: emergency?.status || trip?.status,
            evidence,
        });
    } catch (error) {
        console.error('[Get Emergency Evidence Error]', error);
        next(error);
    }
};

// @desc    Update evidence capture status
// @route   PUT /api/emergency/:id/evidence/status
export const updateEvidenceStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const { emergency, trip } = await resolveEmergencyOrTrip(id);
        if (!emergency && !trip) {
            return res.status(404).json({ message: 'Emergency session or trip not found.' });
        }

        if (emergency) {
            if (!emergency.evidence) {
                emergency.evidence = { photos: [], audioClips: [], captureStatus: status || 'PARTIAL', totalSizeBytes: 0 };
            } else {
                emergency.evidence.captureStatus = status || emergency.evidence.captureStatus;
            }
            await emergency.save();
        }

        if (trip) {
            if (!trip.evidence) {
                trip.evidence = { photos: [], audioClips: [], captureStatus: status || 'PARTIAL', totalSizeBytes: 0 };
            } else {
                trip.evidence.captureStatus = status || trip.evidence.captureStatus;
            }
            await trip.save();
        }

        const activeEvidence = emergency?.evidence || trip?.evidence;
        return res.json({ success: true, evidence: activeEvidence });
    } catch (error) {
        console.error('[Update Evidence Status Error]', error);
        next(error);
    }
};

