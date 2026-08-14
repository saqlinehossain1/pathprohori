import API from './axiosConfig';

export const authApi = {
  login: async (credentials) => {
    const { data } = await API.post('/auth/login', credentials);
    return data;
  },

  register: async (userData) => {
    const { data } = await API.post('/auth/register', userData);
    return data;
  },

  getCurrentUser: async () => {
    const { data } = await API.get('/auth/me');
    return data;
  },

  updateProfile: async (profileData) => {
    const { data } = await API.put('/auth/profile', profileData);
    return data;
  },
};

export default authApi;
