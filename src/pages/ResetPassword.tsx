import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, useParams } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4003';

interface ResetPasswordResponse {
  message: string;
}

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const params = useParams<{ token?: string }>();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 页面加载时尝试从多个位置获取token
  useEffect(() => {
    // 首先尝试从URL路径参数中获取token (新方法，更可靠)
    let foundToken = params.token;
    
    // 如果没有找到，尝试从URL查询参数获取
    if (!foundToken) {
      foundToken = searchParams.get('token');
    }
    
    // 如果没有找到，尝试从URL hash中获取
    if (!foundToken && location.hash) {
      const hashParams = new URLSearchParams(location.hash.substring(1));
      foundToken = hashParams.get('token');
    }
    
    // 检查是否是Render的SPA路由问题（例如：/reset-password:1?token=xyz）
    if (!foundToken && location.pathname.includes(':')) {
      const pathWithParams = location.pathname.replace(/:/g, '?');
      const paramsMatch = pathWithParams.match(/\?token=([^&]+)/);
      if (paramsMatch && paramsMatch[1]) {
        foundToken = paramsMatch[1];
      }
    }
    
    // 设置找到的token
    setToken(foundToken);
    
    if (!foundToken) {
      console.error('No token found in URL:', location);
      setError('Invalid reset token - No token provided in URL');
    } else {
      console.log('Token found in URL:', foundToken.substring(0, 5) + '...' + foundToken.substring(foundToken.length - 5));
    }
  }, [searchParams, location, params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!token) {
      setError('Invalid reset token - Token is missing');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      console.log('Sending password reset request with token:', token.substring(0, 5) + '...' + token.substring(token.length - 5));
      
      const response = await axios.post<ResetPasswordResponse>(
        `${API_URL}/auth/reset-password`, 
        {
          token: token.trim(), // 确保token没有额外的空格
          newPassword: password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Password reset response:', response.data);

      if (response.data.message === 'Password has been reset successfully') {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      console.error('Error details:', err.response?.data);
      
      if (err.response?.data?.message === 'Invalid or expired reset token') {
        setError('The password reset link has expired. Please request a new one.');
      } else if (err.response?.data?.message === 'Reset token has expired') {
        setError('The password reset link has expired. Please request a new one.');
      } else if (err.response?.data?.message === 'Invalid reset token') {
        setError('Invalid reset token. Please request a new password reset link.');
      } else {
        setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Password Reset Successful</h2>
          <p className="text-gray-600 mb-6">Your password has been reset successfully. You will be redirected to the login page.</p>
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin h-8 w-8 border-4 border-rose-500 border-t-transparent rounded-full"></div>
            <p className="text-sm text-gray-500">Redirecting to login page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <img 
            src="/imgs/AH HAO PET SHOP LOGO.png"
            alt="AH HAO PET SHOP Logo"
            className="h-20 mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-900">Reset Your Password</h2>
          <p className="text-gray-600 mt-2">Please enter your new password below.</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-rose-500 focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <div className="mt-1">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-rose-500 focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                'Reset Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword; 