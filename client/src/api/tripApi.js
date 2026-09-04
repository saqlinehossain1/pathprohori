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

<<<<<<< Updated upstream
=======
  updateSafetyStatus: async (tripId, payload) => {
    const { data } = await API.patch(`/trips/${tripId}/safety-status`, payload);
    return data;
  },

  // Route Deviation & Unexpected Stop Detection: commuter confirms "I'm Safe" in response
  // to an automatic safety check before it escalates to guardians.
  respondToSafetyCheck: async (tripId) => {
    const { data } = await API.post(`/trips/${tripId}/safety-check/respond`);
    return data;
  },

>>>>>>> Stashed changes
  completeTrip: async (tripId) => {
    const { data } = await API.put(`/trips/${tripId}/complete`);
    return data;
  },

  triggerPanic: async (tripId) => {
    const { data } = await API.post(`/trips/${tripId}/trigger-panic`);
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

<<<<<<< Updated upstream
  // Offline Memory Storage Queue: flush the whole IndexedDB queue in one batch
  // request rather than one call per point.
  sendCoordinateBatch: async (tripId, points) => {
    const { data } = await API.post(`/trips/${tripId}/coordinates/batch`, { points });
    return data;
  },

  // Dead-Battery Final Emergency Blast: navigator.sendBeacon() (not axios/fetch) so the
  // request reliably completes even as the page unloads. sendBeacon cannot set custom
  // headers, so the JWT rides along in the JSON body instead of an Authorization header.
=======
  // Dead-Battery Final Emergency Blast: navigator.sendBeacon()
>>>>>>> Stashed changes
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
};

export default tripApi;
