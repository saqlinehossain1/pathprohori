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
};

export default tripApi;
