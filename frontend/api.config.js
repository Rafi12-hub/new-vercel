// Frontend API Configuration
// Usage: import { API_ENDPOINTS } from './api.config.js'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
  (import.meta.env.MODE === 'production' 
    ? 'https://api.rgmcse-compiler.com'  // Update with your production backend URL
    : 'http://localhost:5000');

export const API_ENDPOINTS = {
  // Auth Endpoints
  AUTH: {
    LOGIN: `${BACKEND_URL}/api/auth/login`,
    REGISTER: `${BACKEND_URL}/api/auth/register`,
    CHECK_LAB: `${BACKEND_URL}/api/auth/check-lab`,
    LOGOUT: `${BACKEND_URL}/api/auth/logout`,
  },
  
  // Dashboard Endpoints
  DASHBOARD: {
    GET: `${BACKEND_URL}/api/dashboard`,
    STUDENT: `${BACKEND_URL}/api/dashboard/student`,
    FACULTY: `${BACKEND_URL}/api/dashboard/faculty`,
    HOD: `${BACKEND_URL}/api/dashboard/hod`,
    ADMIN: `${BACKEND_URL}/api/dashboard/admin`,
  },
  
  // Questions Endpoints
  QUESTIONS: {
    GET_ALL: `${BACKEND_URL}/api/questions`,
    GET_BY_ID: (id) => `${BACKEND_URL}/api/questions/${id}`,
    CREATE: `${BACKEND_URL}/api/questions`,
    UPDATE: (id) => `${BACKEND_URL}/api/questions/${id}`,
    DELETE: (id) => `${BACKEND_URL}/api/questions/${id}`,
  },
  
  // Submissions Endpoints
  SUBMISSIONS: {
    CREATE: `${BACKEND_URL}/api/submissions`,
    GET_ALL: `${BACKEND_URL}/api/submissions`,
    GET_BY_ID: (id) => `${BACKEND_URL}/api/submissions/${id}`,
    UPDATE: (id) => `${BACKEND_URL}/api/submissions/${id}`,
  },
  
  // Code Execution Endpoints
  EXECUTE: {
    RUN: `${BACKEND_URL}/api/execute/run`,
    CHECK: `${BACKEND_URL}/api/execute/check`,
  },
  
  // Analytics Endpoints
  ANALYTICS: {
    GET: `${BACKEND_URL}/api/analytics`,
    STUDENT: `${BACKEND_URL}/api/analytics/student`,
    FACULTY: `${BACKEND_URL}/api/analytics/faculty`,
  },
  
  // PDF Endpoints
  PDF: {
    GENERATE: `${BACKEND_URL}/api/pdf/generate`,
  },
  
  // Notifications Endpoints
  NOTIFICATIONS: {
    GET: `${BACKEND_URL}/api/notifications`,
    MARK_READ: `${BACKEND_URL}/api/notifications/mark-read`,
  },
  
  // Admin Endpoints
  ADMIN: {
    GET_USERS: `${BACKEND_URL}/api/admin/users`,
    GET_USER: (id) => `${BACKEND_URL}/api/admin/users/${id}`,
    UPDATE_USER: (id) => `${BACKEND_URL}/api/admin/users/${id}`,
    DELETE_USER: (id) => `${BACKEND_URL}/api/admin/users/${id}`,
  },
};

export const API_CONFIG = {
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
};

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (import.meta.env.MODE === 'production'
    ? 'https://api.rgmcse-compiler.com'  // Same as backend
    : 'http://localhost:5000');

export default API_ENDPOINTS;
