import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { apiService } from '../services/apiService';
import axios from 'axios';

const API_URL = 'http://localhost:4003/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 检查用户是否已登录
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 从 localStorage 或 cookie 中获取 token 和用户信息
        const token = localStorage.getItem('token') || 
                     document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
        
        const storedUser = localStorage.getItem('user') || 
                          document.cookie.split('; ').find(row => row.startsWith('user='))?.split('=')[1];
        
        if (token && storedUser) {
          try {
            // 先设置用户状态，避免闪烁
            setUser(JSON.parse(storedUser));
            
            // 验证 token 有效性
            const userData = await apiService.user.get();
            
            // 更新用户信息
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            
            // 更新登录状态
            await axios.post(`${API_URL}/user-login-status/login`, {}, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            
            console.log('Session valid, user authenticated:', userData.name);
          } catch (error) {
            console.error('Token validation failed:', error);
            clearTokensAndState();
          }
        } else {
          console.log('No valid token or user data found');
          clearTokensAndState();
        }
      } catch (error) {
        console.error('验证用户失败:', error);
        clearTokensAndState();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // 设置定时器检查登录状态
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await axios.get<{ isLoggedIn: boolean }>(`${API_URL}/user-login-status/check`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (!response.data.isLoggedIn) {
            console.log('Session expired, logging out');
            clearTokensAndState();
          } else {
            // 更新最后活动时间
            await axios.post(`${API_URL}/user-login-status/activity`, {}, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
          }
        }
      } catch (error) {
        console.error('定时检查登录状态失败:', error);
      }
    }, 5 * 60 * 1000); // 每5分钟检查一次

    return () => clearInterval(interval);
  }, []);

  const clearTokensAndState = () => {
    // 清除所有存储
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('justLoggedIn');
    sessionStorage.removeItem('returnToBooking');
    
    // 清除所有 cookies
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // 重置状态
    setUser(null);
    setError(null);
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const userData = await apiService.user.login({ email, password });
      setUser(userData);
      
      // 更新登录状态
      const token = localStorage.getItem('token');
      if (token) {
        await axios.post(`${API_URL}/user-login-status/login`, {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      setError('登录失败，请检查邮箱和密码');
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, phone: string) => {
    try {
      setError(null);
      const userData = await apiService.user.register({ email, password, name, phone });
      setUser(userData);
    } catch (error) {
      setError('注册失败，请稍后重试');
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await axios.post(`${API_URL}/user-login-status/logout`, {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }
      await apiService.user.logout();
      clearTokensAndState();
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      setError(null);
      const updatedUser = await apiService.user.update(userData);
      setUser(updatedUser);
    } catch (error) {
      setError('更新用户信息失败');
      throw error;
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 