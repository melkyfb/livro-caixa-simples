import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(async (config) => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error fetching auth session', error);
  }
  return config;
});

export const apiService = {
  // Accounts
  getAccounts: () => api.get('/accounts').then(res => res.data),
  createAccount: (data: any) => api.post('/accounts', data).then(res => res.data),
  
  // Categories
  getCategories: () => api.get('/categories').then(res => res.data),
  createCategory: (data: any) => api.post('/categories', data).then(res => res.data),
  
  // Transactions
  getTransactions: () => api.get('/accounts').then(() => api.get('/transactions').then(res => res.data)), # Pre-fetch accounts or just transactions
  createTransaction: (data: any) => api.post('/transactions', data).then(res => res.data),
  deleteTransaction: (id: number) => api.delete(`/transactions/${id}`).then(res => res.data),
  
  // Settings
  getSettings: () => api.get('/settings').then(res => res.data),
  updateSettings: (data: any) => api.post('/settings', data).then(res => res.data),
};
