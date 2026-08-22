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

  completeTrip: async (tripId) => {
    const { data } = await API.put(`/trips/${tripId}/complete`);
    return data;
  },

<<<<<<< Updated upstream
  triggerPanic: async (tripId) => {
    const { data } = await API.post(`/trips/${tripId}/trigger-panic`);
=======
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
>>>>>>> Stashed changes
    return data;
  },
};

export default tripApi;
