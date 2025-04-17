import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500"></div>
      </div>
    );
  }
  
  // Check if user exists and has admin role
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // If user is not an admin, redirect to member dashboard
  if (user.role !== 'admin') {
    return <Navigate to="/member-dashboard" />;
  }
  
  return <>{children}</>;
}; 