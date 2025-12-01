import axios from 'axios';

const API_BASE_URL =  'http://192.168.1.57:5003/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');

    if (token) config.headers.Authorization = `Bearer ${token}`;

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
      const currentPath = window.location.pathname;
      
      if (!publicRoutes.some(route => currentPath.includes(route))) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  verify: () => api.get('/auth/verify'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data)
};

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (profileData) => api.put('/users/profile', profileData),
  changePassword: (passwordData) => api.put('/users/change-password', passwordData),
  requestEmailChange: (newEmail) => api.post('/users/request-email-change', { newEmail }),
  verifyEmailChange: (code) => api.post('/users/verify-email-change', { code }),
  updateProfileImage: (formData) => api.post('/users/profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteProfileImage: () => api.delete('/users/profile-image'),
  deleteAccount: (password) => api.delete('/users/account', { data: { password } }),
  getStats: () => api.get('/users/stats')
};

export const exercisesAPI = {
  getExercises: (params = {}) => api.get('/exercises', { params }),
  getExercise: (id) => api.get(`/exercises/${id}`),
  getMuscleGroups: () => api.get('/exercises/categories/muscle-groups'),
  getProgress: (id) => api.get(`/exercises/${id}/progress`),
  updateProgress: (id, progressData) => api.put(`/exercises/${id}/progress`, progressData)
};

export const skillsAPI = {
  getSkills: (params = {}) => api.get('/skills', { params }),
  getSkill: (id) => api.get(`/skills/${id}`),
  getProgress: (id) => api.get(`/skills/${id}/progress`),
  updateProgress: (id, progressData) => api.put(`/skills/${id}/progress`, progressData),
  getUserProgress: () => api.get('/skills/user/progress')
};

export const workoutsAPI = {
  getWorkouts: (params = {}) => api.get('/workouts', { params }),
  getWorkout: (id) => api.get(`/workouts/${id}`)
};

export const progressAPI = {
  getSummary: () => api.get('/progress/summary'),
  getItemProgress: (type, id) => api.get(`/progress/item/${type}/${id}`),
  getHistory: (params = {}) => api.get('/progress/history', { params }),
  addAchievement: (achievementData) => api.post('/progress/achievement', achievementData),
  getAchievements: (params = {}) => api.get('/progress/achievements', { params })
};

export const historyAPI = {
  getWorkoutHistory: (params = {}) => api.get('/history/workouts', { params }),
  getWorkoutHistoryEntry: (id) => api.get(`/history/workouts/${id}`),
  addWorkoutHistory: (historyData) => api.post('/history/workouts', historyData),
  updateWorkoutHistory: (id, historyData) => api.put(`/history/workouts/${id}`, historyData),
  deleteWorkoutHistory: (id) => api.delete(`/history/workouts/${id}`),
  getStats: (params = {}) => api.get('/history/stats', { params })
};

export const healthAPI = {
  check: () => api.get('/health')
};

export const onboardingAPI = {
  getStatus: () => api.get('/onboarding/status'),
  complete: (data) => api.post('/onboarding/complete', data)
};

export default api;
