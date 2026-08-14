import API from './axiosConfig';

export const incidentApi = {
  getAllIncidents: async () => {
    const { data } = await API.get('/incidents');
    return data;
  },

  getIncidentById: async (id) => {
    const { data } = await API.get(`/incidents/${id}`);
    return data;
  },

  createIncident: async (incidentData) => {
    const { data } = await API.post('/incidents', incidentData);
    return data;
  },

  updateIncident: async (id, incidentData) => {
    const { data } = await API.put(`/incidents/${id}`, incidentData);
    return data;
  },

  deleteIncident: async (id) => {
    const { data } = await API.delete(`/incidents/${id}`);
    return data;
  },

  voteIncident: async (id, voteType) => {
    const { data } = await API.post(`/incidents/${id}/vote`, { voteType });
    return data;
  },

  upvoteIncident: async (id) => {
    const { data } = await API.post(`/incidents/${id}/vote`, { voteType: 'up' });
    return data;
  },

  addComment: async (id, commentData) => {
    const { data } = await API.post(`/incidents/${id}/comments`, commentData);
    return data;
  },

  updateComment: async (incidentId, commentId, commentData) => {
    const payload = typeof commentData === 'string' ? { text: commentData } : commentData;
    const { data } = await API.put(`/incidents/${incidentId}/comments/${commentId}`, payload);
    return data;
  },

  deleteComment: async (incidentId, commentId) => {
    const { data } = await API.delete(`/incidents/${incidentId}/comments/${commentId}`);
    return data;
  },

  voteComment: async (incidentId, commentId, voteType) => {
    const { data } = await API.post(`/incidents/${incidentId}/comments/${commentId}/vote`, { voteType });
    return data;
  },

  addCommentReply: async (incidentId, commentId, text) => {
    const { data } = await API.post(`/incidents/${incidentId}/comments/${commentId}/reply`, { text });
    return data;
  },

  updateCommentReply: async (incidentId, commentId, replyId, text) => {
    const { data } = await API.put(`/incidents/${incidentId}/comments/${commentId}/replies/${replyId}`, { text });
    return data;
  },

  deleteCommentReply: async (incidentId, commentId, replyId) => {
    const { data } = await API.delete(`/incidents/${incidentId}/comments/${commentId}/replies/${replyId}`);
    return data;
  },
};

export default incidentApi;
