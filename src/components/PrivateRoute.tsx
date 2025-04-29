import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // 检查本地存储中是否有 token
  const hasToken = localStorage.getItem('token') !== null;
  
  // 当页面加载完毕后，如果既没有用户也没有 token，则重定向到登录页面
  useEffect(() => {
    if (!isLoading && !user && !hasToken) {
      navigate('/login', { replace: true });
    }
  }, [user, isLoading, navigate, hasToken]);
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500"></div>
    </div>;
  }
  
  // 如果用户已登录或有 token，则允许访问
  return (user || hasToken) ? <>{children}</> : <Navigate to="/login" />;
}; 