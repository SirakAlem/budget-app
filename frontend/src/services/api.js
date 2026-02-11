import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Budget & Settings
export const getSettings = () => api.get('/budget/settings');
export const updateSettings = (data) => api.put('/budget/settings', data);
export const getDashboard = () => api.get('/budget/dashboard');
export const getMonthlyBudget = (month) => api.get(`/budget/monthly${month ? `?month=${month}` : ''}`);

// Bank
export const getBankStatus = () => api.get('/bank/status');
export const getBanks = () => api.get('/bank/banks');
export const connectBank = (bankId) => api.post('/bank/connect', { bankId });
export const completeConnection = () => api.post('/bank/callback');
export const disconnectBank = () => api.post('/bank/disconnect');
export const getBalance = () => api.get('/bank/balance');

// Transactions
export const getTransactions = (month) => api.get(`/transactions${month ? `?month=${month}` : ''}`);
export const syncTransactions = () => api.post('/transactions/sync');
export const addTransaction = (data) => api.post('/transactions', data);
export const updateTransaction = (id, data) => api.patch(`/transactions/${id}`, data);
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`);
export const importCSV = (data) => api.post('/transactions/import-csv', data);

export default api;
