import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const API = axios.create({
  baseURL: API_BASE_URL,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

export const authAPI = {
  login: (email, password) => API.post('/auth/login/', { email, password }),
  signup: (data) => API.post('/auth/signup/', data),
  verifyEmailOTP: (data) => API.post('/auth/verify-email-otp/', data),
  resendOTP: (data) => API.post('/auth/resend-otp/', data),
  forgotPasswordRequest: (data) => API.post('/auth/forgot-password/request/', data),
  forgotPasswordVerify: (data) => API.post('/auth/forgot-password/verify/', data),
  forgotPasswordReset: (data) => API.post('/auth/forgot-password/reset/', data),
  getProfile: () => API.get('/auth/profile/'),
  updateProfile: (data) => API.patch('/auth/profile/', data),
  changePassword: (old_password, new_password) => API.post('/auth/change-password/', { old_password, new_password }),
  getUsers: (params) => API.get('/users/', { params }),
  createUser: (data) => API.post('/users/', data),
  getBatches: () => API.get('/batches/'),
  createBatch: (data) => API.post('/batches/', data),
};

export const tasksAPI = {
  getCategories: () => API.get('/categories/'),
  getTasks: (params) => API.get('/tasks/', { params }),
  createTask: (data) => API.post('/tasks/', data),
  deleteTask: (taskId) => API.delete(`/tasks/${taskId}/`),
  getAssignments: (params) => API.get('/assignments/', { params }),
  assignUsers: (taskId, userIds) => API.post(`/tasks/${taskId}/assign_users/`, { user_ids: userIds }),
};

export const submissionsAPI = {
  getS3UploadURL: (data) => API.post('/submissions/upload-url/', data),
  confirmS3Upload: (data) => API.post('/submissions/confirm/', data),
  getDownloadURL: (submissionId) => API.get(`/submissions/${submissionId}/download-url/`),
  deleteEvidence: (submissionId) => API.delete(`/submissions/${submissionId}/delete/`),
  submitEvidence: (formData) => API.post('/submissions/submit/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getSubmissions: (params) => API.get('/submissions/', { params }),
  bulkDownloadSingleFolder: (taskId, batchId) => {
    const token = localStorage.getItem('access_token');
    const params = [];
    if (token) params.push(`token=${token}`);
    if (taskId) params.push(`task_id=${taskId}`);
    if (batchId) params.push(`batch_id=${batchId}`);
    const url = `/submissions/bulk-download/?${params.join('&')}`;
    window.open(`/api${url}`, '_blank');
  }
};

export const approvalsAPI = {
  reviewSubmission: (submissionId, status, comments) => API.post('/approvals/review/', {
    submission_id: submissionId,
    status,
    comments
  }),
};

export const wheelAPI = {
  spin: (data) => API.post('/wheel/spin/', data),
  getHistory: () => API.get('/wheel/history/'),
};

export const codeReviewAPI = {
  getDashboard: () => API.get('/rotation/dashboard/'),
  markCompleted: (data) => API.post('/rotation/explanations/', data),
  bulkSeed: (data) => API.post('/rotation/bulk-seed/', data),
  undoCompletion: (id) => API.delete(`/rotation/explanations/${id}/`),
  getMembersStatus: () => API.get('/rotation/members/'),
  getCycleHistory: () => API.get('/rotation/cycles/'),
  getCycleDetail: (id) => API.get(`/rotation/cycles/${id}/`),
  getMemberHistory: (memberId) => API.get(`/rotation/member-history/${memberId}/`),
};

export const rotationAPI = codeReviewAPI;

export const defaultersReportsAPI = {
  getDefaulters: () => API.get('/defaulters/'),
  exportExcel: (type = 'defaulters') => {
    const token = localStorage.getItem('access_token');
    const url = `/reports/export-excel/?type=${type}&token=${token}`;
    window.open(`/api${url}`, '_blank');
  }
};

export const storageAPI = {
  getAnalytics: () => API.get('/storage/analytics/'),
};

export const notificationsAPI = {
  getNotifications: () => API.get('/notifications/'),
  markRead: () => API.post('/notifications/mark-read/'),
};

export const logsAPI = {
  getLogs: () => API.get('/logs/'),
};

export const leaderboardAPI = {
  getLeaderboard: () => API.get('/leaderboard/'),
  getAnnouncements: () => API.get('/announcements/'),
  createAnnouncement: (data) => API.post('/announcements/', data),
};

export default API;
