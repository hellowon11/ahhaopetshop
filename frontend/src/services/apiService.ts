import axios from 'axios';
import { Pet, User, Appointment } from '../types';

const API_URL = 'http://localhost:4003/api';

// 创建 axios 实例
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 修改请求拦截器
api.interceptors.request.use((config) => {
  // 优先从 localStorage 获取 token
  let token = localStorage.getItem('token');
  
  // 如果 localStorage 中没有，尝试从 cookie 获取
  if (!token) {
    const cookieToken = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    if (cookieToken) {
      token = cookieToken;
      // 如果从 cookie 中获取到 token，也保存到 localStorage
      localStorage.setItem('token', token);
    }
  }
  
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 修改响应拦截器
api.interceptors.response.use(
  (response) => {
    // 如果是登录响应，确保 token 被正确保存
    if (response.config.url?.includes('/auth/login')) {
      const data = response.data as { token: string; user: User };
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 清除所有存储的 token 和用户信息
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      // 触发未授权事件
      window.dispatchEvent(new CustomEvent('unauthorized'));
    }
    return Promise.reject(error);
  }
);

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  name: string;
  phone: string;
}

// API 服务
export const apiService = {
  // 用户相关
  user: {
    login: async (credentials: LoginCredentials) => {
      try {
        const response = await api.post<{ token: string; user: User }>('/auth/login', credentials);
        if (response.data.token) {
          // 将 token 保存到 localStorage 和 cookie
          localStorage.setItem('token', response.data.token);
          // 同时保存用户信息
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          // 设置 cookie，确保跨页面访问
          const expiryDate = new Date();
          expiryDate.setTime(expiryDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
          document.cookie = `token=${response.data.token}; expires=${expiryDate.toUTCString()}; path=/; secure; samesite=lax`;
          document.cookie = `user=${JSON.stringify(response.data.user)}; expires=${expiryDate.toUTCString()}; path=/; secure; samesite=lax`;
          
          console.log('Token and user data saved successfully');
        }
        return response.data.user;
      } catch (error) {
        console.error('登录失败:', error);
        throw error;
      }
    },
    register: async (userData: RegisterData) => {
      try {
        const response = await api.post<{ token: string; user: User }>('/auth/register', userData);
        if (response.data.token) {
          // 将 token 保存到 localStorage 和 cookie
          localStorage.setItem('token', response.data.token);
          const expiryDate = new Date();
          expiryDate.setTime(expiryDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
          document.cookie = `token=${response.data.token}; expires=${expiryDate.toUTCString()}; path=/; secure; samesite=lax`;
        }
        return response.data.user;
      } catch (error) {
        console.error('注册失败:', error);
        throw error;
      }
    },
    get: async () => {
      try {
        const response = await api.get<User>('/auth/me');
        return response.data;
      } catch (error) {
        console.error('获取用户数据失败:', error);
        throw error;
      }
    },
    update: async (userData: Partial<User>) => {
      try {
        const response = await api.put<User>('/auth/me', userData);
        return response.data;
      } catch (error) {
        console.error('更新用户数据失败:', error);
        throw error;
      }
    },
    logout: async () => {
      try {
        await api.post('/auth/logout');
      } catch (error) {
        console.error('登出失败:', error);
      } finally {
        // 清除 cookie 中的 token
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
    }
  },

  // 宠物相关
  pets: {
    getAll: async () => {
      try {
        const response = await api.get<Pet[]>('/pets');
        return response.data;
      } catch (error) {
        console.error('获取宠物列表失败:', error);
        throw error;
      }
    },
    add: async (petData: Omit<Pet, '_id'>) => {
      try {
        const response = await api.post<Pet>('/pets', petData);
        return response.data;
      } catch (error) {
        console.error('添加宠物失败:', error);
        throw error;
      }
    },
    update: async (id: string, petData: Partial<Pet>) => {
      try {
        const response = await api.put<Pet>(`/pets/${id}`, petData);
        return response.data;
      } catch (error) {
        console.error('更新宠物失败:', error);
        throw error;
      }
    },
    delete: async (id: string) => {
      try {
        await api.delete(`/pets/${id}`);
      } catch (error) {
        console.error('删除宠物失败:', error);
        throw error;
      }
    }
  },

  // 预约相关
  appointments: {
    getAll: async () => {
      try {
        const response = await api.get<Appointment[]>('/appointments');
        return response.data;
      } catch (error) {
        console.error('获取预约列表失败:', error);
        throw error;
      }
    },
    add: async (appointmentData: Omit<Appointment, '_id'>) => {
      try {
        const response = await api.post<Appointment>('/appointments', appointmentData);
        return response.data;
      } catch (error) {
        console.error('添加预约失败:', error);
        throw error;
      }
    },
    update: async (id: string, appointmentData: Partial<Appointment>) => {
      try {
        const response = await api.put<Appointment>(`/appointments/${id}`, appointmentData);
        return response.data;
      } catch (error) {
        console.error('更新预约失败:', error);
        throw error;
      }
    },
    delete: async (id: string) => {
      try {
        await api.delete(`/appointments/${id}`);
      } catch (error) {
        console.error('删除预约失败:', error);
        throw error;
      }
    }
  }
}; 