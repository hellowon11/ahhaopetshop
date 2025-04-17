import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4003',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 添加请求拦截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    // Ensure headers object exists
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 添加响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 用户相关API
export const auth = {
  register: (data: { email: string; password: string; name?: string; phone?: string }) =>
    api.post('/users/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/users/login', data),
  getMe: () => api.get('/users/me')
};

// 宠物相关API
export const pets = {
  getAll: () => api.get('/pets'),
  create: (data: FormData) => api.post('/pets', data),
  update: (id: string, data: FormData) => api.put(`/pets/${id}`, data),
  delete: (id: string) => api.delete(`/pets/${id}`)
};

// 商店宠物API
export const shopPets = {
  getAll: (query = {}) => {
    // Convert query object to query string
    const queryStr = new URLSearchParams(query as Record<string, string>).toString();
    return api.get(`/shop-pets${queryStr ? `?${queryStr}` : ''}`);
  },
  getById: (id: string) => api.get(`/shop-pets/${id}`),
  create: (data: any) => api.post('/shop-pets', data),
  update: (id: string, data: any) => api.put(`/shop-pets/${id}`, data),
  delete: (id: string) => api.delete(`/shop-pets/${id}`),
  changeImageBackground: (id: string, options: any) => api.post(`/shop-pets/${id}/change-bg`, options),
  switchSaleStatus: (id: string, isForSale: boolean) => api.patch(`/shop-pets/${id}/sale-status`, { isForSale }),
};

// 通知相关API
export const notifications = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all')
}; 