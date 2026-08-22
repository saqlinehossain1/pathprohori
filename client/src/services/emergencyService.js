import API from '../api/axiosConfig';

export const triggerEmergency = async (latitude, longitude) => {
    const response = await API.post('/emergency/trigger', {
        latitude,
        longitude,
    });

    return response.data;
};

export const resolveEmergency = async (emergencyId) => {
    const response = await API.put('/emergency/resolve', {
        emergencyId,
    });

    return response.data;
};