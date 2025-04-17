import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import axios from 'axios';

interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  role?: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isIntentionalLogin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIntentionalLogin, setIsIntentionalLogin] = useState(false);

  const clearTokensAndState = () => {
    // Clear all storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('justLoggedIn');
    sessionStorage.removeItem('returnToBooking');
    
    // Clear all cookies
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Reset state
    setUser(null);
    setIsIntentionalLogin(false);
  };

  // Initialize auth state from stored token
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('Initializing authentication state');
      setIsLoading(true);
      
      // Check for token in both localStorage and cookies - more robust parsing
      let token = localStorage.getItem('token');
      
      if (!token) {
        // Try to extract token from cookies with better parsing
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'token' && value) {
            token = value;
            // If found in cookie but not in localStorage, restore it to localStorage
            localStorage.setItem('token', token);
            console.log('Restored token from cookie to localStorage');
            break;
          }
        }
      }
      
      if (!token) {
        console.log('No token found, user is not authenticated');
        clearTokensAndState();
        setIsLoading(false);
        return;
      }

      try {
        console.log('Token found, attempting to validate session');
        // First update the HTTP header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Try to get user data from API
        let userData;
        try {
          userData = await apiService.user.get();
          console.log('Successfully retrieved user data from API');
          
          // If API call succeeds, update localStorage with fresh data
          localStorage.setItem('user', JSON.stringify(userData));
          // Ensure token is saved again
          localStorage.setItem('token', token);
          // Ensure token is in cookie with long expiration
          const expiryDate = new Date();
          expiryDate.setTime(expiryDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
          document.cookie = `token=${token}; expires=${expiryDate.toUTCString()}; path=/; secure; samesite=lax`;

          // Set intentional login to true if we were able to restore a session
          // This fixes UI state inconsistency where user is logged in but UI shows incorrect state
          setIsIntentionalLogin(true);
        } catch (apiError) {
          console.error('Error fetching user from API:', apiError);
          // If API call fails, try to get user from localStorage as fallback
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            console.log('Using stored user data as fallback');
            userData = JSON.parse(storedUser);
            // Since we're using stored user data, set intentional login to true as well
            setIsIntentionalLogin(true);
          } else {
            throw new Error('No user data available');
          }
        }
        
        if (userData) {
          console.log('Session valid, user authenticated:', userData.name);
          setUser(userData);
          
          // Try to update login status but continue even if it fails
          try {
            const result = await apiService.userLoginStatus.updateLoginStatus();
            if (result) {
              console.log('Login status updated successfully');
            } else {
              console.warn('Failed to update login status, but continuing session');
            }
          } catch (statusError) {
            console.warn('Error updating login status, but continuing session:', statusError);
          }
        } else {
          console.log('No user data returned, clearing auth state');
          clearTokensAndState();
        }
      } catch (error) {
        console.error('Session validation failed:', error);
        clearTokensAndState();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Add session verification on route changes
  useEffect(() => {
    // Function to verify authentication state when route changes
    const verifyAuthOnRouteChange = () => {
      // If we have a user but isIntentionalLogin is false, try to synchronize state
      if (user && !isIntentionalLogin) {
        console.log('Detected auth state inconsistency, fixing...');
        setIsIntentionalLogin(true);
      }
      
      // If we have a token but don't have a user, attempt to re-initialize auth
      const token = localStorage.getItem('token') || 
                   document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      
      if (token && !user) {
        console.log('Detected token but no user state, reinitializing auth...');
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            setIsIntentionalLogin(true);
          } catch (e) {
            console.error('Failed to parse stored user:', e);
          }
        }
      }
    };

    // Listen for route changes (via popstate event)
    window.addEventListener('popstate', verifyAuthOnRouteChange);
    
    // Check on component mount and when user or isIntentionalLogin changes
    verifyAuthOnRouteChange();
    
    return () => {
      window.removeEventListener('popstate', verifyAuthOnRouteChange);
    };
  }, [user, isIntentionalLogin]);

  // Add activity listener
  useEffect(() => {
    const updateActivity = async () => {
      if (user) {
        try {
          const result = await apiService.userLoginStatus.updateActivity();
          if (!result) {
            console.warn('Activity update failed, but continuing session');
          }
        } catch (error) {
          console.error('Failed to update activity:', error);
          // Continue with session even if activity update fails
        }
      }
    };

    // Update activity every 5 minutes
    const activityInterval = setInterval(updateActivity, 5 * 60 * 1000);

    // Add user activity event listener with debouncing
    let activityTimeout: NodeJS.Timeout | null = null;
    const handleUserActivity = () => {
      if (user && !activityTimeout) {
        activityTimeout = setTimeout(() => {
          updateActivity();
          activityTimeout = null;
        }, 10000); // Debounce activity updates to prevent too many requests
      }
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    return () => {
      clearInterval(activityInterval);
      if (activityTimeout) clearTimeout(activityTimeout);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
    };
  }, [user]);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      console.log('Login attempt for:', email);
      setIsIntentionalLogin(true);
      
      const userData = await apiService.user.login({ email, password });
      if (userData) {
        console.log('Login successful, user data received:', userData.name);
        
        // Store user data in local storage as well for redundancy
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Set the user in state
        setUser(userData);
        
        // Verify token was saved
        const token = localStorage.getItem('token') || 
                     document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
        
        if (!token) {
          throw new Error('No token received after login');
        }
        
        // Don't try to update login status immediately after login
        // It will be handled in the initialization useEffect
        sessionStorage.setItem('justLoggedIn', 'true');
      } else {
        throw new Error('Login failed - no user data received');
      }
    } catch (error) {
      console.error('Login error:', error);
      clearTokensAndState();
      throw error;
    }
  };

  const logout = () => {
    console.log('Logout initiated');
    
    // First clear tokens and state (client-side cleanup)
    clearTokensAndState();
    
    // Set a flag to indicate user has logged out
    sessionStorage.setItem('userLoggedOut', 'true');
    
    // 保存邮箱，清除密码
    const savedEmail = localStorage.getItem('loginEmail');
    localStorage.removeItem('loginPassword');
    localStorage.removeItem('loginError');
    if (savedEmail) {
      localStorage.setItem('loginEmail', savedEmail);
    }
    
    // Then try to call APIs to update status (but continue with logout even if these fail)
    Promise.allSettled([
      apiService.user.logout(),
      apiService.userLoginStatus.updateLogoutStatus()
    ]).catch((error: Error) => {
      console.error('Error during API logout operations:', error);
    }).finally(() => {
      // Navigate to login page instead of home page
      window.location.href = '/login';
    });
  };

  // Add event listener for unauthorized events
  useEffect(() => {
    const handleUnauthorized = () => {
      console.log('Unauthorized event received, logging out');
      logout();
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isIntentionalLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 