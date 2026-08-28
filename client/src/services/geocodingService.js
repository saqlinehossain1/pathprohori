import API from '../api/axiosConfig';

const locationNameMap = {
  ধানমন্ডি: 'Dhanmondi',
  গুলশান: 'Gulshan',
  বনানী: 'Banani',
  মিরপুর: 'Mirpur',
  মোহাম্মদপুর: 'Mohammadpur',
  উত্তরা: 'Uttara',
  তেজগাঁও: 'Tejgaon',
  মহাখালী: 'Mohakhali',
  মতিঝিল: 'Motijheel',
  বাড্ডা: 'Badda',
  ফার্মগেট: 'Farmgate',
  শাহবাগ: 'Shahbag',
  যাত্রাবাড়ী: 'Jatrabari',
  খিলগাঁও: 'Khilgaon',
  বসুন্ধরা: 'Bashundhara',
  রামপুরা: 'Rampura',
  কাকরাইল: 'Kakrail',
  মগবাজার: 'Moghbazar',
  লালবাগ: 'Lalbagh',
  মিরপুর১০: 'Mirpur 10',
  মিরপুর১: 'Mirpur 1',
  মিরপুর১২: 'Mirpur 12',
  মিরপুর২: 'Mirpur 2',
  ওয়ারী: 'Wari',
  পল্টন: 'Paltan',
  চকবাজার: 'Chawkbazar',
  গাজীপুর: 'Gazipur',
  নারায়ণগঞ্জ: 'Narayanganj',
  টঙ্গী: 'Tongi',
  সাভার: 'Savar',
  কেরানীগঞ্জ: 'Keraniganj',
};

export const translateLocation = (text) => {
  if (!text) return '';
  let result = String(text);
  for (const [bn, en] of Object.entries(locationNameMap)) {
    result = result.split(bn).join(en);
  }
  return result.replace(/[\u0980-\u09FF]+/g, '').trim();
};

/**
 * Reverse geocodes lat/lng into a clean, human-readable place name.
 * Safe from CORS issues by using the backend proxy endpoint with public fallback.
 */
export const reverseGeocode = async (lat, lng) => {
  if (!lat || !lng) return 'Selected Location';

  const numLat = Number(lat);
  const numLng = Number(lng);

  // 1. Primary: Use our backend proxy API (avoids browser CORS issues & adds caching)
  try {
    const res = await API.get(`/geocode/reverse?lat=${numLat}&lng=${numLng}`);
    if (res.data?.success && res.data?.data?.displayName) {
      return res.data.data.displayName;
    }
  } catch (backendErr) {
    // If backend proxy fails, seamlessly fall back to CORS-friendly public APIs below
  }

  // 2. Backup: BigDataCloud (CORS-friendly public reverse geocoding)
  try {
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${numLat}&longitude=${numLng}&localityLanguage=en`
    );
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const locality = bdcData.locality || bdcData.city || '';
      const country = bdcData.countryName || 'Bangladesh';
      const informative = (bdcData.localityInfo?.informative || [])
        .map((i) => i.name)
        .filter((n) => n && n !== 'Asia' && n !== 'Indian subcontinent' && !n.includes('/') && n !== country);

      const specificArea = informative.length > 0 ? informative.slice(0, 2).join(', ') : locality;
      const formatted = [specificArea, bdcData.city || country].filter(Boolean).join(', ');
      if (formatted && formatted.length > 3) {
        return formatted;
      }
    }
  } catch (_) {}

  // 3. Fallback: Photon Komoot (CORS-friendly OpenStreetMap mirror)
  try {
    const photonRes = await fetch(`https://photon.komoot.io/reverse?lat=${numLat}&lon=${numLng}`);
    if (photonRes.ok) {
      const pData = await photonRes.json();
      const prop = pData?.features?.[0]?.properties;
      if (prop) {
        const place = prop.name || '';
        const street = prop.street ? (prop.housenumber ? `House ${prop.housenumber}, ${prop.street}` : prop.street) : '';
        const locality = translateLocation(prop.locality || prop.district);
        const city = translateLocation(prop.city) || 'Dhaka';

        const parts = [place, street, locality, city].filter(Boolean);
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
    }
  } catch (_) {}

  return `Location near ${numLat.toFixed(4)}° N, ${numLng.toFixed(4)}° E`;
};

/**
 * Searches for places matching a text query in Bangladesh.
 */
export const searchPlaces = async (query, limit = 5) => {
  if (!query || !query.trim()) return [];

  // 1. Backend proxy search
  try {
    const res = await API.get(`/geocode/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`);
    if (res.data?.success && Array.isArray(res.data?.data)) {
      return res.data.data;
    }
  } catch (backendErr) {
    // Fallback to Photon
  }

  // 2. Backup: Photon OpenStreetMap search API
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query.trim())}&limit=${limit}&bbox=88.0,20.5,92.7,26.7`
    );
    if (res.ok) {
      const data = await res.json();
      return (data?.features || []).map((f) => {
        const p = f.properties || {};
        const coords = f.geometry?.coordinates || [90.4125, 23.8103];
        const nameParts = [p.name, p.street, p.city || p.county].filter(Boolean);
        return {
          displayName: nameParts.join(', ') || p.name || 'Location',
          fullDisplayName: nameParts.join(', '),
          lat: coords[1],
          lng: coords[0],
        };
      });
    }
  } catch (_) {}

  return [];
};

export default {
  reverseGeocode,
  searchPlaces,
  translateLocation,
};
