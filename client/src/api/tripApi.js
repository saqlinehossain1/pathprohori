import API from './axiosConfig';

export const tripApi = {
  createTrip: async (tripData) => {
    const { data } = await API.post('/trips', tripData);
    return data;
  },

  getActiveTrip: async () => {
    const { data } = await API.get('/trips/active');
    return data;
  },

  sendHeartbeat: async (tripId, locationData) => {
    const { data } = await API.post(`/trips/${tripId}/heartbeat`, locationData);
    return data;
  },

  updateSafetyStatus: async (tripId, payload) => {
    const { data } = await API.patch(`/trips/${tripId}/safety-status`, payload);
    return data;
  },

  completeTrip: async (tripId) => {
    const { data } = await API.put(`/trips/${tripId}/complete`);
    return data;
  },

  triggerPanic: async (tripId, isDuress = false, coords = {}) => {
    const { data } = await API.post(`/trips/${tripId}/trigger-panic`, { isDuress, ...coords });
    return data;
  },

  cancelPanic: async (tripId, pinCode = '') => {
    const { data } = await API.put(`/trips/${tripId}/cancel-panic`, { pinCode });
    return data;
  },

  deactivateAlarm: async (tripId, payload) => {
    const { data } = await API.post(`/trips/${tripId}/deactivate-alarm`, payload);
    return data;
  },

  getTripHistory: async () => {
    const { data } = await API.get('/trips/history');
    return data;
  },

  // Offline Memory Storage Queue: flush the whole IndexedDB queue in one batch
  sendCoordinateBatch: async (tripId, points) => {
    const { data } = await API.post(`/trips/${tripId}/coordinates/batch`, { points });
    return data;
  },

  // Dead-Battery Final Emergency Blast: navigator.sendBeacon()
  sendBatteryEmergencyBeacon: (tripId, payload) => {
    try {
      const token = localStorage.getItem('pathprohori_token');
      const body = JSON.stringify({ ...payload, token });
      const blob = new Blob([body], { type: 'application/json' });
      return navigator.sendBeacon(`/api/trips/${tripId}/battery-emergency`, blob);
    } catch (err) {
      console.error('[Battery Emergency] sendBeacon threw an error:', err);
      return false;
    }
  },

  // Self-Destructing Public Tracking Link (No JWT needed)
  getPublicTracking: async (trackingToken) => {
    const { data } = await API.get(`/trips/track/${trackingToken}`);
    return data;
  },
};

export default tripApi;
