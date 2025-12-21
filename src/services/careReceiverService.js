// frontend/src/services/careReceiverService.js
// Complete care receiver service with all endpoints

import api from "./api";

export const careReceiverService = {
  // Get all care receivers with optional filters
  getAll: async (params = {}) => {
    const response = await api.get("/carereceivers", { params });
    return response.data;
  },

  // Get single care receiver by ID
  getById: async (id) => {
    const response = await api.get(`/carereceivers/${id}`);
    return response.data;
  },

  // Create new care receiver
  create: async (data) => {
    const response = await api.post("/carereceivers", data);
    return response.data;
  },

  // Update care receiver
  update: async (id, data) => {
    const response = await api.put(`/carereceivers/${id}`, data);
    return response.data;
  },

  // Delete care receiver
  delete: async (id) => {
    const response = await api.delete(`/carereceivers/${id}`);
    return response.data;
  },

  // Get care receiver's schedule/appointments
  getSchedule: async (id, params = {}) => {
    const response = await api.get(`/carereceivers/${id}/schedule`, { params });
    return response.data;
  },

  // Get care receiver statistics
  getStats: async (id) => {
    const response = await api.get(`/carereceivers/${id}/stats`);
    return response.data;
  },

  // Find suitable care givers for care receiver
  // NEW - matches backend implementation
  getSuitableCareGivers: async (id, params = {}) => {
    const response = await api.get(`/carereceivers/${id}/suitable-caregivers`, {
      params,
    });
    return response.data;
  },
};
