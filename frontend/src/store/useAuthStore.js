import { create } from 'zustand';
import axios from 'axios';

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,

  fetchUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    set({ loading: true });
    try {
      const res = await axios.get('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Map _id to id so it matches login response structure
      const userData = {
        id: res.data._id,
        username: res.data.username,
        email: res.data.email,
        mobileNumber: res.data.mobileNumber,
        profilePicture: res.data.profilePicture
      };
      set({ user: userData, isAuthenticated: true, loading: false });
      return true;
    } catch (err) {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false, loading: false });
      return false;
    }
  },

  login: async (emailOrMobile, password) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { emailOrMobile, password });
      localStorage.setItem('token', res.data.token);
      set({ user: res.data.user, token: res.data.token, isAuthenticated: true, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Login failed', loading: false });
    }
  },

  register: async (username, emailOrMobile, password) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', { username, emailOrMobile, password });
      set({ loading: false });
      return res.data; // returns { message, requireOtp: true }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Registration failed', loading: false });
      return { error: true };
    }
  },

  verifyOtp: async (identifier, otp) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post('http://localhost:5000/api/auth/verify-otp', { identifier, otp });
      localStorage.setItem('token', res.data.token);
      set({ user: res.data.user, token: res.data.token, isAuthenticated: true, loading: false });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.message || 'OTP verification failed', loading: false });
      return false;
    }
  },

  forgotPassword: async (identifier) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post('http://localhost:5000/api/auth/forgot-password', { identifier });
      set({ loading: false });
      return res.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to send reset code', loading: false });
      return false;
    }
  },

  resetPassword: async (identifier, otp, newPassword) => {
    set({ loading: true, error: null });
    try {
      await axios.post('http://localhost:5000/api/auth/reset-password', { identifier, otp, newPassword });
      set({ loading: false });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to reset password', loading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  }
}));

export default useAuthStore;
