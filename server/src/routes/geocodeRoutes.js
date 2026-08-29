import express from 'express';

const router = express.Router();

// Memory cache to prevent hammering Nominatim & speed up responses
const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

const getCached = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.time > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return item.data;
};

const setCached = (key, data) => {
  if (cache.size > 2000) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, { time: Date.now(), data });
};

// GET /api/geocode/reverse?lat=23.8103&lng=90.4125
router.get('/reverse', async (req, res) => {
  try {
    const lat = req.query.lat || req.query.latitude;
    const lng = req.query.lng || req.query.lon || req.query.longitude;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required.' });
    }

    const roundedLat = Number(lat).toFixed(5);
    const roundedLng = Number(lng).toFixed(5);
    const cacheKey = `rev_${roundedLat}_${roundedLng}`;

    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    // 1. Primary provider: OpenStreetMap Nominatim with proper User-Agent
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${roundedLat}&lon=${roundedLng}&zoom=18&addressdetails=1&accept-language=en`;
      const response = await fetch(nomUrl, {
        headers: {
          'User-Agent': 'PathProhori-Safety-Platform/2.0 (contact@pathprohori.com)',
          'Accept-Language': 'en',
        },
        signal: AbortSignal.timeout(4000),
      });

      if (response.ok) {
        const data = await response.json();
        const addr = data.address || {};

        const road = addr.road || addr.street || addr.pedestrian || data.name || '';
        const houseNumber = addr.house_number || '';
        const streetFull = [houseNumber ? `House ${houseNumber}` : null, road].filter(Boolean).join(', ');

        const quarter = addr.quarter || addr.suburb || addr.neighbourhood || '';
        const area = addr.suburb || addr.residential || addr.district || addr.city_district || '';
        const city = addr.city || addr.town || addr.county || 'Dhaka';

        const rawParts = [streetFull, quarter !== road ? quarter : null, area !== quarter ? area : null, city].filter(Boolean);
        const uniqueParts = [];
        const seen = new Set();
        for (const p of rawParts) {
          const norm = p.toLowerCase().trim();
          if (!seen.has(norm)) {
            seen.add(norm);
            uniqueParts.push(p);
          }
        }

        const formattedAddress = uniqueParts.join(', ') || data.display_name?.split(',').slice(0, 3).join(', ') || `${roundedLat}, ${roundedLng}`;

        const result = {
          displayName: formattedAddress,
          rawAddress: addr,
          fullDisplayName: data.display_name,
          lat: Number(roundedLat),
          lng: Number(roundedLng),
        };

        setCached(cacheKey, result);
        return res.json({ success: true, data: result });
      }
    } catch (nomErr) {
      console.warn('[Geocode Proxy] Nominatim reverse lookup failed, trying backup provider:', nomErr.message);
    }

    // 2. Backup provider: BigDataCloud
    try {
      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${roundedLat}&longitude=${roundedLng}&localityLanguage=en`;
      const bdcRes = await fetch(bdcUrl, { signal: AbortSignal.timeout(3000) });
      if (bdcRes.ok) {
        const bdcData = await bdcRes.json();
        const locality = bdcData.locality || bdcData.city || '';
        const country = bdcData.countryName || 'Bangladesh';
        const informative = (bdcData.localityInfo?.informative || [])
          .map((i) => i.name)
          .filter((n) => n && n !== 'Asia' && n !== 'Indian subcontinent' && !n.includes('/') && n !== country);

        const specificArea = informative.length > 0 ? informative.slice(0, 2).join(', ') : locality;
        const formattedAddress = [specificArea, bdcData.city || country].filter(Boolean).join(', ');

        const result = {
          displayName: formattedAddress || `${roundedLat}, ${roundedLng}`,
          rawAddress: bdcData,
          fullDisplayName: formattedAddress,
          lat: Number(roundedLat),
          lng: Number(roundedLng),
        };

        setCached(cacheKey, result);
        return res.json({ success: true, data: result });
      }
    } catch (bdcErr) {
      console.warn('[Geocode Proxy] BigDataCloud reverse lookup failed:', bdcErr.message);
    }

    // Default fallback
    return res.json({
      success: true,
      data: {
        displayName: `Location near ${Number(roundedLat).toFixed(4)}° N, ${Number(roundedLng).toFixed(4)}° E`,
        lat: Number(roundedLat),
        lng: Number(roundedLng),
      },
    });
  } catch (error) {
    console.error('[Geocode Proxy Error]:', error);
    res.status(500).json({ success: false, message: 'Geocoding failed.' });
  }
});

// GET /api/geocode/search?q=Banani&limit=5
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || req.query.query;
    const limit = parseInt(req.query.limit || '5', 10);

    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, message: 'Search query is required.' });
    }

    const cacheKey = `search_${query.trim().toLowerCase()}_${limit}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query.trim()
    )}&countrycodes=bd&limit=${limit}&accept-language=en&addressdetails=1`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'PathProhori-Safety-Platform/2.0 (contact@pathprohori.com)',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      return res.status(502).json({ success: false, message: 'Upstream search provider returned error' });
    }

    const data = await response.json();
    const results = (data || []).map((item) => {
      const parts = (item.display_name || '').split(',').map((s) => s.trim());
      const shortName = parts.slice(0, 3).join(', ');
      return {
        placeId: item.place_id,
        displayName: shortName || item.display_name,
        fullDisplayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        raw: item,
      };
    });

    setCached(cacheKey, results);
    return res.json({ success: true, data: results });
  } catch (error) {
    console.error('[Geocode Search Error]:', error);
    res.status(500).json({ success: false, message: 'Location search failed.' });
  }
});

export default router;
