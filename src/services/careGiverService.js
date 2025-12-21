import api from './api';

export const careGiverService = {
  // Get all care givers with optional filters
  getAll: async (params = {}) => {
    const response = await api.get('/caregivers', { params });
    return response.data;
  },

  // Get single care giver by ID
  getById: async (id) => {
    const response = await api.get(`/caregivers/${id}`);
    return response.data;
  },

  // Create new care giver
  create: async (data) => {
    const response = await api.post('/caregivers', data);
    return response.data;
  },

  // Update care giver
  update: async (id, data) => {
    const response = await api.put(`/caregivers/${id}`, data);
    return response.data;
  },

  // Delete care giver
  delete: async (id) => {
    const response = await api.delete(`/caregivers/${id}`);
    return response.data;
  },

  // Get care giver's schedule
  getSchedule: async (id, params = {}) => {
    const response = await api.get(`/caregivers/${id}/schedule`, { params });
    return response.data;
  },

  // Get care giver statistics
  getStats: async (id) => {
    const response = await api.get(`/caregivers/${id}/stats`);
    return response.data;
  },
};
