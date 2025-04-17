import axios, { AxiosRequestConfig } from 'axios';
import { User, Pet, Appointment, Notification, TimeSlot, PetListing, GroomingService, DayCareOption } from '../types';

// 本地接口定义
export interface AppointmentSettings {
  settingName: string;
  maxBookingsPerTimeSlot: number;
  description?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  _id?: string;
}

interface LoginResponse {
  user: User;
  token: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4003';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Add request interceptor to include token in headers
api.interceptors.request.use((config) => {
  // More robust token extraction from multiple sources
  let token = localStorage.getItem('token');
  
  if (!token) {
    // Try to get from cookies with better parsing
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'token' && value) {
        token = value;
        // Restore to localStorage for consistency
        localStorage.setItem('token', token);
        console.log('Request interceptor: restored token from cookie');
        break;
      }
    }
  }
  
  // 确保config.headers存在
  if (!config.headers) {
    config.headers = {};
  }
  
  // 总是添加Authorization头，即使没有token也添加一个默认值
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('Request interceptor: token attached to request');
  } else {
    // 如果没有token，使用默认值以确保headers中有Authorization
    config.headers.Authorization = 'Bearer default-token';
    console.log('Request interceptor: using default token');
  }
  
  return config;
});

// Add response interceptor
api.interceptors.response.use(
  (response) => {
    // Handle login response specially
    if (response.config.url?.includes('/auth/login')) {
      const data = response.data as LoginResponse;
      if (data?.token) {
        // Save token to localStorage
        localStorage.setItem('token', data.token);
        
        // Set a persistent cookie with appropriate attributes and long expiry
        const expiryDate = new Date();
        expiryDate.setTime(expiryDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
        document.cookie = `token=${data.token}; expires=${expiryDate.toUTCString()}; path=/; secure; samesite=lax`;
        
        console.log('Login successful: token saved to localStorage and cookies');
      }
    }
    
    // For all successful responses, check for token in header
    const authHeader = response.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      localStorage.setItem('token', token);
      console.log('Response contains new token - updated');
    }
    
    return response;
  },
  (error) => {
    // 处理401错误的特殊情况
    if (error.response?.status === 401) {
      // Don't log out if checking auth status
      if (!error.config.url?.includes('/auth/me') && !error.config.url?.includes('/appointments')) {
        console.log('Session expired or unauthorized: clearing auth data');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        
        // Dispatch event only if there was a token before
        if (localStorage.getItem('token')) {
          window.dispatchEvent(new CustomEvent('unauthorized'));
        }
      }
    }
    return Promise.reject(error);
  }
);

// API 服务
export const apiService = {
  // 用户相关
  user: {
    login: async (credentials: { email: string; password: string }) => {
      try {
        const response = await api.post<{ user: User; token: string }>('/auth/login', credentials);
        // 确保我们有用户数据和token
        if (response.data.user && response.data.token) {
          const token = response.data.token;
          
          // 设置token到localStorage
          localStorage.setItem('token', token);
          
          // 设置token到cookie，带有适当的属性和长期过期时间
          const expiryDate = new Date();
          expiryDate.setTime(expiryDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30天
          document.cookie = `token=${token}; expires=${expiryDate.toUTCString()}; path=/; secure; samesite=lax`;
          
          // 确保用户对象同时有id和_id
          const userData = response.data.user;
          if (userData.id && !userData._id) {
            userData._id = userData.id;
          } else if (userData._id && !userData.id) {
            userData.id = userData._id;
          }
          
          // 保存用户数据到localStorage
          localStorage.setItem('user', JSON.stringify(userData));
          
          console.log('成功登录: 用户数据和Token已保存', userData.name);
          
          return userData;
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      }
    },
    register: async (userData: { email: string; password: string; name: string; phone: string }) => {
      try {
        const response = await api.post<{ user: User }>('/auth/register', userData);
        // Server will set the session cookie automatically
        return response.data.user;
      } catch (error) {
        console.error('Registration failed:', error);
        throw error;
      }
    },
    get: async () => {
      try {
        const response = await api.get<User>('/auth/me');
        return response.data;
      } catch (error) {
        console.error('Failed to get user data:', error);
        throw error;
      }
    },
    update: async (userData: Partial<User>) => {
      try {
        const response = await api.put<User>('/auth/me', userData);
        return response.data;
      } catch (error) {
        console.error('Failed to update user data:', error);
        throw error;
      }
    },
    logout: async () => {
      try {
        await api.post('/auth/logout');
      } catch (error) {
        console.error('Logout failed:', error);
        throw error;
      }
    },
    testAuth: async () => {
      try {
        console.log('Testing user authentication and permissions');
        const response = await api.get<{message: string, userInfo: any, isAdmin: boolean}>('/auth/test-auth');
        console.log('Auth test response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Auth test failed:', error);
        throw error;
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
        console.error('Failed to get pets:', error);
        throw error;
      }
    },
    add: async (petData: Omit<Pet, '_id'>) => {
      try {
        const response = await api.post<Pet>('/pets', petData);
        return response.data;
      } catch (error) {
        console.error('Failed to add pet:', error);
        throw error;
      }
    },
    update: async (id: string, petData: Partial<Pet>) => {
      try {
        const response = await api.put<Pet>(`/pets/${id}`, petData);
        return response.data;
      } catch (error) {
        console.error('Failed to update pet:', error);
        throw error;
      }
    },
    delete: async (id: string) => {
      try {
        await api.delete(`/pets/${id}`);
      } catch (error) {
        console.error('Failed to delete pet:', error);
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
        console.error('Failed to get appointments:', error);
        throw error;
      }
    },
    getHistory: async () => {
      try {
        const response = await api.get<Appointment[]>('/appointments/history');
        return response.data;
      } catch (error) {
        console.error('Failed to get appointment history:', error);
        throw error;
      }
    },
    getTimeSlots: async (date: string): Promise<TimeSlot[]> => {
      try {
        const response = await api.get<TimeSlot[]>(`/appointments/time-slots/${date}`);
        return response.data;
      } catch (error) {
        console.error('Failed to get time slots:', error);
        throw error;
      }
    },
    getAvailableSlots: async (date: string) => {
      try {
        // 首先获取最新的服务信息
        const services = await apiService.services.getGroomingServices();
        const servicesMap = new Map(
          services.map(service => [service.name, service.capacityLimit || 0])
        );
        
        // 获取时间槽可用性
        const response = await api.get(`/appointments/available-slots?date=${date}`);
        const availableSlots = response.data as Record<string, number>;
        
        // 处理每个时间槽的可用数量
        const processedSlots: Record<string, number> = {};
        Object.entries(availableSlots).forEach(([time, count]) => {
          const serviceLimit = servicesMap.get(availableSlots.serviceType) || 0;
          processedSlots[time] = serviceLimit > 0 ? Math.min(count, serviceLimit) : count;
        });
        
        return processedSlots;
      } catch (error) {
        console.error('Error fetching available slots:', error);
        throw error;
      }
    },
    add: async (appointmentData: Omit<Appointment, '_id'>) => {
      try {
        // 如果提供了用户ID，则使用带认证令牌的API
        if (appointmentData.user) {
          console.log('Using authenticated API for appointment creation with user ID:', appointmentData.user);
          const response = await api.post<Appointment>('/appointments', appointmentData);
          return response.data;
        } else {
          // 否则使用公共API（适用于未登录用户）
          console.log('Using public API for guest appointment creation');
          const publicApi = axios.create({
            baseURL: API_BASE_URL,
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          const response = await publicApi.post<Appointment>('/appointments', appointmentData);
          return response.data;
        }
      } catch (error) {
        console.error('Failed to add appointment:', error);
        throw error;
      }
    },
    update: async (id: string, appointmentData: Partial<Appointment>) => {
      try {
        const response = await api.put<Appointment>(`/appointments/${id}`, appointmentData);
        return response.data;
      } catch (error) {
        console.error('Failed to update appointment:', error);
        throw error;
      }
    },
    delete: async (id: string) => {
      try {
        await api.delete(`/appointments/${id}`);
      } catch (error) {
        console.error('Failed to delete appointment:', error);
        throw error;
      }
    }
  },

  // 通知相关
  notifications: {
    getAll: async () => {
      try {
        const response = await api.get<Notification[]>('/notifications');
        return response.data;
      } catch (error) {
        console.error('Failed to get notifications:', error);
        throw error;
      }
    },
    add: async (notificationData: Omit<Notification, '_id'>) => {
      try {
        const response = await api.post<Notification>('/notifications', notificationData);
        return response.data;
      } catch (error) {
        console.error('Failed to add notification:', error);
        throw error;
      }
    },
    markAsRead: async (id: string) => {
      try {
        await api.put(`/notifications/${id}/read`);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        throw error;
      }
    },
    markAllAsRead: async () => {
      try {
        await api.put('/notifications/read-all');
      } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
        throw error;
      }
    },
    delete: async (id: string) => {
      try {
        await api.delete(`/notifications/${id}`);
      } catch (error) {
        console.error('Failed to delete notification:', error);
        throw error;
      }
    },
    deleteMultiple: async (ids: string[]) => {
      try {
        await api.post('/notifications/delete-multiple', { ids });
      } catch (error) {
        console.error('Failed to delete multiple notifications:', error);
        throw error;
      }
    },
    deleteAll: async () => {
      try {
        await api.delete('/notifications');
      } catch (error) {
        console.error('Failed to delete all notifications:', error);
        throw error;
      }
    }
  },

  // 用户登录状态相关
  userLoginStatus: {
    updateLoginStatus: async () => {
      try {
        await api.post('/user-login-status/login');
        return true;
      } catch (error) {
        console.error('Failed to update login status:', error);
        // Don't throw error, just return false
        return false;
      }
    },
    updateLogoutStatus: async () => {
      try {
        await api.post('/user-login-status/logout');
        return true;
      } catch (error) {
        console.error('Failed to update logout status:', error);
        // Don't throw error, just return false
        return false;
      }
    },
    updateActivity: async () => {
      try {
        await api.post('/user-login-status/activity');
        return true;
      } catch (error) {
        console.error('Failed to update activity time:', error);
        // Don't throw error, just return false
        return false;
      }
    },
    checkStatus: async () => {
      try {
        const response = await api.get('/user-login-status/status');
        return response.data;
      } catch (error) {
        console.error('Failed to check login status:', error);
        // Return default status
        return { isLoggedIn: false };
      }
    }
  },

  // Admin services
  admin: {
    getAllUsers: async (): Promise<User[]> => {
      try {
        const response = await api.get('/admin/users');
        return response.data;
      } catch (error) {
        console.error('Failed to get all users:', error);
        throw error;
      }
    },
    getAllAppointments: async (): Promise<Appointment[]> => {
      try {
        const response = await api.get('/admin/appointments');
        return response.data;
      } catch (error) {
        console.error('Failed to get all appointments:', error);
        throw error;
      }
    },
    updateAppointment: async (
      id: string,
      appointmentData: Partial<Appointment>,
      oldDateTime: string,
      oldServiceType: string
    ): Promise<Appointment> => {
      try {
        const response = await api.put(`/admin/appointments/${id}`, {
          ...appointmentData,
          oldDateTime,
          oldServiceType
        });
        return response.data;
      } catch (error) {
        console.error('Failed to update appointment:', error);
        throw error;
      }
    },
    deleteAppointment: async (
      id: string,
      dateTime: string,
      serviceType: string
    ): Promise<{ success: boolean; message: string }> => {
      try {
        const response = await api.delete(`/admin/appointments/${id}`, {
          params: { dateTime, serviceType }
        });
        return response.data;
      } catch (error) {
        console.error('Failed to delete appointment:', error);
        throw error;
      }
    },
    updateGroomingService: async (service: GroomingService): Promise<GroomingService> => {
      try {
        // 检查是否为新服务（ID以"new-"开头）
        if (service.id.startsWith('new-')) {
          // 创建新服务
          const response = await api.post('/services/grooming-services', service);
          return response.data;
        } else {
          // 更新现有服务
          const response = await api.put(`/services/grooming-services/${service.id}`, service);
          return response.data;
        }
      } catch (error) {
        console.error('Failed to update grooming service:', error);
        throw error;
      }
    },
    updateDayCareOption: async (option: DayCareOption): Promise<DayCareOption> => {
      try {
        // 检查是否为新选项
        if (option.type === 'new-option') {
          // 创建新日托选项
          const response = await api.post('/services/day-care-options', option);
          return response.data;
        } else {
          // 更新现有选项
          const response = await api.put(`/services/day-care-options/${option.type}`, option);
          return response.data;
        }
      } catch (error) {
        console.error('Failed to update day care option:', error);
        throw error;
      }
    },
    // 删除美容服务
    deleteGroomingService: async (serviceId: string): Promise<void> => {
      try {
        await api.delete(`/services/grooming-services/${serviceId}`);
      } catch (error) {
        console.error('Failed to delete grooming service:', error);
        throw error;
      }
    },
    // 删除日托选项
    deleteDayCareOption: async (optionType: string): Promise<void> => {
      try {
        await api.delete(`/services/day-care-options/${optionType}`);
      } catch (error) {
        console.error('Failed to delete day care option:', error);
        throw error;
      }
    }
  },

  // 宠物商店相关
  shopPets: {
    getAll: async (status?: string) => {
      try {
        let url = '/shop-pets';
        // 如果提供了status参数，添加到查询字符串
        if (status) {
          url += `?status=${status}`;
        }
        
        const response = await api.get<any[]>(url);
        return response.data;
      } catch (error) {
        console.error('Failed to get shop pets:', error);
        throw error;
      }
    },
    getById: async (id: string) => {
      try {
        const response = await api.get<any>(`/shop-pets/${id}`);
        return response.data;
      } catch (error) {
        console.error(`Failed to get shop pet with id ${id}:`, error);
        throw error;
      }
    },
    getByType: async (type: 'dog' | 'cat') => {
      try {
        const response = await api.get<any[]>(`/shop-pets/type/${type}`);
        return response.data;
      } catch (error) {
        console.error(`Failed to get ${type} pets:`, error);
        throw error;
      }
    },
    uploadImage: async (file: File) => {
      try {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await api.post<{imageUrl: string}>('/upload/pet-image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        return response.data.imageUrl;
      } catch (error) {
        console.error('Failed to upload image:', error);
        throw error;
      }
    },
    create: async (petData: any) => {
      try {
        const response = await api.post<any>('/shop-pets', petData);
        return response.data;
      } catch (error) {
        console.error('Failed to create shop pet:', error);
        throw error;
      }
    },
    update: async (id: string, petData: any) => {
      try {
        console.log(`Starting update for pet with id ${id}`);
        console.log('Raw update data:', JSON.stringify(petData));
        
        // 创建更新数据副本
        const updateData = { ...petData };
        
        // 无论宠物类型，都删除type字段
        console.log('Removing type field for all pets');
        if ('type' in updateData) delete updateData.type;
        
        // 删除petId字段
        if ('petId' in updateData) delete updateData.petId;
        
        console.log('Sanitized update data:', JSON.stringify(updateData));
        
        const response = await api.put<any>(`/shop-pets/${id}`, updateData);
        console.log('Update response:', JSON.stringify(response.data));
        return response.data;
      } catch (error: any) {
        console.error(`Failed to update shop pet with id ${id}:`, error);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', JSON.stringify(error.response.data));
        }
        throw error;
      }
    },
    delete: async (id: string) => {
      try {
        await api.delete(`/shop-pets/${id}`);
        return true;
      } catch (error) {
        console.error(`Failed to delete shop pet with id ${id}:`, error);
        throw error;
      }
    },
    toggleSaleStatus: async (id: string, isForSale: boolean) => {
      try {
        const response = await api.patch<any>(`/shop-pets/${id}/sale-status`, { isForSale });
        return response.data;
      } catch (error) {
        console.error(`Failed to toggle sale status for pet with id ${id}:`, error);
        throw error;
      }
    },
    updateStatus: async (id: string, status: 'Listed' | 'Unlisted' | 'Sold') => {
      try {
        const response = await api.patch<any>(`/shop-pets/${id}/status`, { status });
        return response.data;
      } catch (error) {
        console.error(`Failed to update status for pet with id ${id}:`, error);
        throw error;
      }
    }
  },

  // 收藏相关
  favourites: {
    getAll: async () => {
      try {
        const response = await api.get<any[]>('/favourites');
        return response.data;
      } catch (error) {
        console.error('Failed to get favourites:', error);
        throw error;
      }
    },
    add: async (petId: string) => {
      try {
        const response = await api.post('/favourites', { petId });
        return response.data;
      } catch (error) {
        console.error('Failed to add favourite:', error);
        throw error;
      }
    },
    remove: async (petId: string) => {
      try {
        const response = await api.delete(`/favourites/${petId}`);
        return response.data;
      } catch (error) {
        console.error('Failed to remove favourite:', error);
        throw error;
      }
    },
    check: async (petId: string) => {
      try {
        const response = await api.get(`/favourites/check/${petId}`);
        return response.data.isFavourite;
      } catch (error) {
        console.error('Failed to check favourite status:', error);
        throw error;
      }
    }
  },

  // 美容服务相关
  services: {
    // 获取所有美容服务
    getGroomingServices: async () => {
      try {
        const response = await api.get('/services/grooming-services');
        return response.data;
      } catch (error) {
        console.error('Failed to fetch grooming services:', error);
        throw error;
      }
    },

    // 获取特定美容服务
    getGroomingService: async (id: string) => {
      try {
        const response = await api.get(`/services/grooming-services/${id}`);
        return response.data;
      } catch (error) {
        console.error(`Failed to fetch grooming service ${id}:`, error);
        throw error;
      }
    },

    // 获取所有日托选项
    getDayCareOptions: async () => {
      try {
        const response = await api.get('/services/day-care-options');
        return response.data;
      } catch (error) {
        console.error('Failed to fetch day care options:', error);
        throw error;
      }
    },

    // 获取特定日托选项
    getDayCareOption: async (type: string) => {
      try {
        const response = await api.get(`/services/day-care-options/${type}`);
        return response.data;
      } catch (error) {
        console.error(`Failed to fetch day care option ${type}:`, error);
        throw error;
      }
    }
  }
};