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

  triggerPanic: async (tripId, isDuress = false) => {
    const { data } = await API.post(`/trips/${tripId}/trigger-panic`, { isDuress });
    return data;
  },

  cancelPanic: async (tripId, pinCode = '') => {
    const { data } = await API.put(`/trips/${tripId}/cancel-panic`, { pinCode });
    return data;
  },

  getTripHistory: async () => {
    const { data } = await API.get('/trips/history');
    return data;
  },
};

export default tripApi;
