import { useState, useEffect, useCallback, useContext } from 'react';
import incidentApi from '../api/incidentApi';
import { AuthContext } from '../context/AuthContext';

// Haversine distance formula calculation in kilometers
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0.8;
  const R = 6371; // Radius of earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

export const useIncidents = () => {
  const auth = useContext(AuthContext);
  const currentUser = auth?.user;
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [userLocation, setUserLocation] = useState({ lat: null, lng: null });
  const [isLocationLoading, setIsLocationLoading] = useState(true);

  // Fetch live phone GPS coordinates
  const requestLocation = useCallback((onSuccess) => {
    if ('geolocation' in navigator) {
      setIsLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ lat, lng });
          setIsLocationLoading(false);
          if (onSuccess) onSuccess(lat, lng);
        },
        (err) => {
          console.warn('[GPS Geolocation] Defaulting to Dhaka center:', err.message);
          const fallbackLat = 23.8103;
          const fallbackLng = 90.4125;
          setUserLocation({ lat: fallbackLat, lng: fallbackLng });
          setIsLocationLoading(false);
          if (onSuccess) onSuccess(fallbackLat, fallbackLng);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      const fallbackLat = 23.8103;
      const fallbackLng = 90.4125;
      setUserLocation({ lat: fallbackLat, lng: fallbackLng });
      setIsLocationLoading(false);
      if (onSuccess) onSuccess(fallbackLat, fallbackLng);
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await incidentApi.getAllIncidents();
      setIncidents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load incidents:', err);
      setError(err.response?.data?.message || 'Failed to load danger feed incidents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleVote = async (id, voteType) => {
    try {
      const updatedIncident = await incidentApi.voteIncident(id, voteType);
      setIncidents((prev) =>
        prev.map((inc) => (inc._id === id ? updatedIncident : inc))
      );
    } catch (err) {
      console.error('Vote failed:', err);
    }
  };

  const handleUpvote = (id) => handleVote(id, 'up');

  const createIncident = async (incidentData) => {
    const activeLat = userLocation.lat || 23.8103;
    const activeLng = userLocation.lng || 90.4125;
    const payload = {
      ...incidentData,
      latitude: typeof incidentData.latitude === 'number' ? incidentData.latitude : activeLat,
      longitude: typeof incidentData.longitude === 'number' ? incidentData.longitude : activeLng,
    };
    const newIncident = await incidentApi.createIncident(payload);
    setIncidents((prev) => [newIncident, ...prev]);
    return newIncident;
  };

  const updateIncident = async (id, updateData) => {
    try {
      const updatedIncident = await incidentApi.updateIncident(id, updateData);
      setIncidents((prev) =>
        prev.map((inc) => (inc._id === id ? updatedIncident : inc))
      );
      return updatedIncident;
    } catch (err) {
      console.error('Update incident failed:', err);
      throw err;
    }
  };

  const deleteIncident = async (id) => {
    try {
      await incidentApi.deleteIncident(id);
      setIncidents((prev) => prev.filter((inc) => inc._id !== id));
    } catch (err) {
      console.error('Delete incident failed:', err);
      throw err;
    }
  };

  // Map incidents with calculated live distance from user real GPS
  const activeUserLat = userLocation.lat || 23.8103;
  const activeUserLng = userLocation.lng || 90.4125;

  const processedIncidents = incidents.map((item) => {
    const coords = item.location?.coordinates;
    const incLng = coords?.[0] || 90.4125;
    const incLat = coords?.[1] || 23.8103;
    const distKm = calculateDistanceKm(activeUserLat, activeUserLng, incLat, incLng);
    const distText = distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`;
    return {
      ...item,
      distanceKm: distKm,
      distanceText: distText,
    };
  });

  const filteredIncidents = processedIncidents.filter((item) => {
    if (!item) return false;
    const title = (item.title || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    const locationName = (item.locationName || '').toLowerCase();
    const query = (searchQuery || '').toLowerCase();

    const matchesSearch =
      title.includes(query) ||
      description.includes(query) ||
      locationName.includes(query);

    if (activeFilter === 'My Reports' || activeFilter === 'My Posts') {
      const currentUserId = currentUser?._id;
      const reportedById = typeof item.reportedBy === 'object' ? item.reportedBy?._id : item.reportedBy;
      return matchesSearch && Boolean(currentUserId && reportedById && String(reportedById) === String(currentUserId));
    }
    if (activeFilter === 'Verified') return matchesSearch && Boolean(item.isVerified);
    if (activeFilter === 'High Alert') return matchesSearch && item.severity === 'High Alert';
    if (activeFilter === '5km Radius') return matchesSearch && item.distanceKm <= 5;
    if (activeFilter === '20km Radius') return matchesSearch && item.distanceKm <= 20;
    return matchesSearch;
  });

  // Sort incidents serially by distance (nearest hazards first)
  const sortedIncidents = [...filteredIncidents].sort(
    (a, b) => (a.distanceKm || 0) - (b.distanceKm || 0)
  );

  return {
    incidents: sortedIncidents,
    rawIncidents: incidents,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    userLocation,
    isLocationLoading,
    requestLocation,
    refreshIncidents: fetchIncidents,
    handleVote,
    handleUpvote,
    createIncident,
    updateIncident,
    deleteIncident,
  };
};

export default useIncidents;
