import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, CheckCircle, Mail, AlertCircle, RefreshCw, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import axios from 'axios';
import { apiService } from '../services/apiService';
import { User, Notification } from '../types';

// 添加自定义CSS动画样式
const fadeInDownAnimation = `
  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in-down {
    animation: fadeInDown 0.2s ease-out forwards;
  }
`;

const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:4003/api';

// API响应接口定义
interface PreRegisterResponse {
  message: string;
  userId: string;
}

interface VerifyEmailResponse {
  message: string;
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    phone: string;
    role: string;
    isVerified: boolean;
  };
}

interface ResendVerificationResponse {
  message: string;
}

// 创建 axios 实例
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

interface LocationState {
  from: string;
  showRegister?: boolean;
  message?: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isIntentionalLogin } = useAuth();
  const { from, showRegister = false, message } = (location.state as LocationState) || { from: '/' };

  // 使用 sessionStorage 替代 localStorage 来保存敏感信息
  const [isRegistering, setIsRegistering] = useState(showRegister);
  const [email, setEmail] = useState(() => {
    return sessionStorage.getItem('loginEmail') || '';
  });
  const [password, setPassword] = useState(() => {
    return sessionStorage.getItem('loginPassword') || '';
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(() => {
    return sessionStorage.getItem('loginError') || '';
  });
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { setReturningFromDashboard } = useNavigation();

  // 验证码相关状态
  const [showVerificationStep, setShowVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationDigits, setVerificationDigits] = useState(['', '', '', '', '', '']);
  const [tempUserId, setTempUserId] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  
  // 为每个验证码输入框创建 ref
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // 初始化 ref 数组
  useEffect(() => {
    digitRefs.current = digitRefs.current.slice(0, 6);
    while (digitRefs.current.length < 6) {
      digitRefs.current.push(null);
    }
  }, []);
  
  // 当单独的数字输入变化时，更新完整的验证码
  useEffect(() => {
    setVerificationCode(verificationDigits.join(''));
  }, [verificationDigits]);

  // 在组件挂载时恢复所有状态
  useEffect(() => {
    const savedEmail = sessionStorage.getItem('loginEmail');
    const savedPassword = sessionStorage.getItem('loginPassword');
    const savedError = sessionStorage.getItem('loginError');

    if (savedEmail) setEmail(savedEmail);
    if (savedPassword) setPassword(savedPassword);
    if (savedError) setError(savedError);

    // Cleanup function to clear credentials when component unmounts
    return () => {
      sessionStorage.removeItem('loginEmail');
      sessionStorage.removeItem('loginPassword');
      sessionStorage.removeItem('loginError');
    };
  }, []);

  // 监听email和password的变化，保存到sessionStorage
  useEffect(() => {
    if (email) sessionStorage.setItem('loginEmail', email);
    if (password) sessionStorage.setItem('loginPassword', password);
  }, [email, password]);

  // 监听error的变化，保存到sessionStorage
  useEffect(() => {
    if (error) sessionStorage.setItem('loginError', error);
  }, [error]);

  // Reset form when switching between login and register
  useEffect(() => {
    if (isRegistering) {
      setEmail('');
      setPassword('');
      setName('');
      setPhone('');
      setError('');
      // 清除sessionStorage中的表单数据
      sessionStorage.removeItem('loginEmail');
      sessionStorage.removeItem('loginPassword');
      sessionStorage.removeItem('loginError');
    }
  }, [isRegistering]);

  // 处理重新发送倒计时
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
    } else {
      setResendDisabled(false);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // 处理验证码数字输入
  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // 只允许数字
    
    const newDigits = [...verificationDigits];
    newDigits[index] = value.slice(-1); // 只取最后一个字符
    setVerificationDigits(newDigits);
    
    // 自动跳转到下一个输入框
    if (value && index < 5 && digitRefs.current[index + 1]) {
      digitRefs.current[index + 1]?.focus();
    }
  };
  
  // 处理验证码输入的键盘事件
  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // 如果按下删除键且当前输入框为空，则聚焦到前一个输入框
    if (e.key === 'Backspace' && !verificationDigits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  };
  
  // 处理粘贴验证码
  const handleVerificationCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');
    
    // 填充所有可用的数字
    const newDigits = [...verificationDigits];
    digits.forEach((digit, index) => {
      if (index < 6) newDigits[index] = digit;
    });
    
    setVerificationDigits(newDigits);
    
    // 聚焦到最后一个填充的数字之后的输入框，或者是最后一个
    const focusIndex = Math.min(digits.length, 5);
    digitRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          setError('Please enter a valid email address');
          setLoading(false);
          return;
        }

        // 验证密码匹配
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        // 验证必填字段
        if (!name || !phone) {
          setError('Please fill in all required fields');
          setLoading(false);
          return;
        }

        try {
          // 预注册用户并发送验证码
          const response = await api.post<PreRegisterResponse>('/auth/pre-register', { 
            email, 
            password, 
            name, 
            phone 
          });

          console.log('Pre-registration successful, verification code sent');
          
          // 保存临时用户ID，并显示验证码输入界面
          setTempUserId(response.data.userId);
          setShowVerificationStep(true);
          setError('');
          
        } catch (err: any) {
          console.error('Pre-registration error:', err);
          if (err.response?.data) {
            const errorMessage = err.response.data.message || err.response.data.error;
            if (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('already')) {
              setError('This email is already registered. Please use a different email or sign in.');
            } else if (errorMessage.toLowerCase().includes('phone') && errorMessage.toLowerCase().includes('already')) {
              setError('This phone number is already registered. Please use a different phone number.');
            } else {
              setError(errorMessage || 'Registration failed. Please try again.');
            }
          } else {
            setError(err.message || 'An error occurred. Please try again.');
          }
        }
      } else {
        // 登录流程
        await login(email, password);
        console.log('Login successful');
        
        // 清除登录相关的sessionStorage数据
        sessionStorage.removeItem('loginEmail');
        sessionStorage.removeItem('loginPassword');
        sessionStorage.removeItem('loginError');
        // 清除预约页面相关标记，但保留returnToBooking以便正确导航
        sessionStorage.removeItem('fromGroomingRegister');
        
        // 显示成功提示和加载动画
        setShowSuccessModal(true);
        
        // 延迟跳转到目标页面
        setTimeout(() => {
          console.log('Redirecting after login to:', from);
          
          // Check if this is an admin login
          if (email === 'ahhaopetshop@gmail.com' && password === '12345') {
            navigate('/admin-portal', { replace: true });
          } else {
            // 检查是否需要返回到预约页面
            const returnToBooking = sessionStorage.getItem('returnToBooking');
            const fromGroomingRegister = sessionStorage.getItem('fromGroomingRegister');
            
            // 如果是从预约页面点击注册按钮来的，或者是设置了返回预约标记
            if (returnToBooking === 'true' || fromGroomingRegister === 'true') {
              // 清除所有相关标记
              sessionStorage.removeItem('returnToBooking');
              sessionStorage.removeItem('fromGroomingRegister');
              // 导航到预约页面
              navigate('/grooming-appointment', { replace: true });
            } else if (from && from !== '/') {
              navigate(from, { replace: true });
            } else {
              navigate('/member-dashboard', { replace: true });
            }
          }
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error:', err);
      let errorMessage = '';
      if (err.response?.data) {
        errorMessage = err.response.data.message || err.response.data.error;
        if (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('already')) {
          errorMessage = 'This email is already registered. Please use a different email or sign in.';
        } else if (errorMessage.toLowerCase().includes('phone') && errorMessage.toLowerCase().includes('already')) {
          errorMessage = 'This phone number is already registered. Please use a different phone number.';
        } else {
          errorMessage = errorMessage || 'Registration failed. Please try again.';
        }
      } else {
        errorMessage = err.message || 'An error occurred. Please try again.';
      }
      setError(errorMessage);
      // 保存错误信息到sessionStorage
      sessionStorage.setItem('loginError', errorMessage);
      setShowSuccessModal(false);
      setLoading(false);
      // 确保不会导航到其他页面
      return;
    } finally {
      setLoading(false);
    }
  };

  // 处理验证码提交
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 验证邮箱验证码
      const response = await api.post<VerifyEmailResponse>('/auth/verify-email', {
        email,
        verificationCode
      });

      console.log('Email verification successful:', response.data);
      
      // 设置token和cookie (后端已设置)
      const token = response.data.token;
      const userData = response.data.user;

      // 更新localStorage以便全局使用
      localStorage.setItem('token', token);

      // 创建欢迎通知
      try {
        // 创建通知数据
        const notificationData = {
          user: userData.id,
          title: "👋 Welcome to AH HAO PET SHOP",
          message: `Welcome to AH HAO PET SHOP Member Club, ${userData.name}! You can now enjoy our exclusive member benefits and services.`,
          type: "welcome",
          isRead: false
        };

        // 使用axios发送请求
        const notificationResponse = await axios.post(
          `${API_URL}/notifications/create`,
          notificationData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (notificationResponse.status === 201) {
          console.log('Welcome notification created successfully:', notificationResponse.data);
        } else {
          throw new Error('Failed to create notification');
        }
      } catch (notificationError) {
        console.error('Failed to create welcome notification:', notificationError);
        // 即使通知创建失败，也继续流程
      }

      // 显示成功消息
      setShowSuccessModal(true);

      // 使用login函数设置全局认证状态
      try {
        await login(email, password);
        console.log('Auto logged in after verification');
      } catch (loginErr) {
        console.error('Error auto-logging in after verification:', loginErr);
        // 如果直接登录失败，尝试通过token登录
        try {
          document.cookie = `token=${token}; path=/; max-age=${30 * 24 * 60 * 60}; sameSite=lax`;
          document.cookie = `auth=true; path=/; max-age=${30 * 24 * 60 * 60}; sameSite=lax`;
        } catch (cookieErr) {
          console.error('Error setting cookies manually:', cookieErr);
        }
      }

      // 确保sessionStorage清理
      sessionStorage.removeItem('loginEmail');
      sessionStorage.removeItem('loginPassword');
      sessionStorage.removeItem('loginError');
      // 清除预约页面相关标记
      sessionStorage.removeItem('fromGroomingRegister');
      // 保留returnToBooking标记以便正确导航
      
      // 延迟跳转
      setTimeout(() => {
        console.log('Redirecting to dashboard after verification');
        
        // 检查是否需要返回到预约页面
        const returnToBooking = sessionStorage.getItem('returnToBooking');
        const fromGroomingRegister = sessionStorage.getItem('fromGroomingRegister');
        
        // 如果是从预约页面点击注册按钮来的，或者是设置了返回预约标记
        if (returnToBooking === 'true' || fromGroomingRegister === 'true') {
          // 清除所有相关标记
          sessionStorage.removeItem('returnToBooking');
          sessionStorage.removeItem('fromGroomingRegister');
          // 导航到预约页面
          window.location.href = '/grooming-appointment';
        } else {
          // 使用replace确保用户不能返回到验证页面
          window.location.href = '/member-dashboard';
        }
      }, 2000);
      
    } catch (err: any) {
      console.error('Verification error:', err);
      if (err.response?.data) {
        setError(err.response.data.message || 'Invalid verification code. Please try again.');
      } else {
        setError('Failed to verify email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 重新发送验证码
  const handleResendCode = async () => {
    setError('');
    setLoading(true);
    setResendDisabled(true);
    setResendCountdown(60); // 60秒倒计时

    try {
      const response = await api.post<ResendVerificationResponse>('/auth/resend-verification', { email });
      console.log('Verification code resent:', response.data);
      setError(''); // 清除错误信息
    } catch (err: any) {
      console.error('Failed to resend verification code:', err);
      if (err.response?.data) {
        setError(err.response.data.message || 'Failed to resend verification code.');
      } else {
        setError('Failed to resend verification code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await api.post<{ message: string }>('/auth/forgot-password', { email });
      
      if (response.data.message === 'Password reset email sent') {
        setResetEmailSent(true);
        setShowSuccessModal(true);
        
        // 添加1秒后自动重新加载页面的功能
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
    } catch (err: any) {
      console.error('Forgot password error:', err);
      if (err.response?.data?.message === 'User not found') {
        setError('No account found with this email address');
      } else if (err.response?.data?.message === 'Email service not configured') {
        setError('Password reset service is currently unavailable. Please try again later.');
      } else if (err.response?.data?.error) {
        setError(`Failed to send reset email: ${err.response.data.error}`);
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    // 如果在注册页面，点击返回按钮应该回到登录页面
    if (isRegistering) {
      // 检查是否是从预约页面的注册按钮过来的
      const fromGroomingRegister = sessionStorage.getItem('fromGroomingRegister');
      if (fromGroomingRegister === 'true') {
        // 清除标记
        sessionStorage.removeItem('fromGroomingRegister');
        sessionStorage.removeItem('returnToBooking');
        // 导航到预约页面
        navigate('/grooming-appointment');
        return;
      }
      // 不是从预约页面来的，只需切换到登录模式
      setIsRegistering(false);
      return;
    }

    // 检查是否应该返回到预约页面
    const returnToBooking = sessionStorage.getItem('returnToBooking');
    
    if (returnToBooking === 'true') {
      // 清除标记
      sessionStorage.removeItem('returnToBooking');
      // 导航到预约页面
      navigate('/grooming-appointment');
    } else {
      // Instead of just using navigate(-1), explicitly navigate to home
      // This ensures consistent behavior when browser history is empty
      navigate('/');
    }
  };

  // 从验证步骤返回到注册表单
  const handleBackToRegister = () => {
    setShowVerificationStep(false);
    setVerificationCode('');
    setVerificationDigits(['', '', '', '', '', '']);
    setError('');
  };

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 添加点击外部关闭菜单的处理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNavigateTo = (path: string) => {
    navigate(path);
    setShowMenu(false);
  };

  // 将动画样式添加到文档中
  useEffect(() => {
    // 添加样式标签
    const styleTag = document.createElement('style');
    styleTag.textContent = fadeInDownAnimation;
    document.head.appendChild(styleTag);

    // 清理函数
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToHome}
              className="flex items-center space-x-2 text-gray-800 hover:text-rose-600 transition-colors duration-300 group"
            >
              <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform duration-300" />
              <span className="text-lg font-medium hidden sm:inline">Back</span>
            </button>
            
            {/* 桌面端显示标题，移动端显示汉堡菜单 */}
            <h1 className="text-xl font-bold text-gray-800 hidden sm:block">
              {showVerificationStep 
                ? 'Email Verification' 
                : isRegistering 
                  ? 'Create Account' 
                  : 'Sign In'}
            </h1>

            {/* 移动端汉堡菜单 */}
            <div className="sm:hidden relative" ref={menuRef}>
              <div className="flex items-center justify-end">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-gray-800 hover:text-rose-600 transition-colors duration-300 p-1"
                >
                  <Menu className="w-6 h-6" />
                </button>
              </div>
              
              {showMenu && (
                <>
                  {/* 背景遮罩 */}
                  <div className="fixed inset-0 bg-black bg-opacity-20 z-40" onClick={() => setShowMenu(false)}></div>
                  
                  {/* 菜单内容 */}
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl py-2 z-50 transition-all duration-300 transform origin-top-right animate-fade-in-down border border-gray-100">
                    <button
                      onClick={() => handleNavigateTo('/')}
                      className="flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <span>Home</span>
                    </button>
                    <button
                      onClick={() => handleNavigateTo('/grooming-appointment')}
                      className="flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <span>Grooming Appointment</span>
                    </button>
                    <button
                      onClick={() => handleNavigateTo('/all-pets')}
                      className="flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <span>All Pets</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 transform transition-all">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mt-3 text-lg font-medium text-gray-900">
                {resetEmailSent 
                  ? 'Password Reset Email Sent' 
                  : showVerificationStep && !isRegistering
                    ? 'Email Verified Successfully!'
                    : isRegistering 
                      ? 'Registration Successful!' 
                      : 'Login Successful!'}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {resetEmailSent 
                    ? 'We\'ve sent you an email with instructions to reset your password.' 
                    : showVerificationStep && !isRegistering
                      ? 'Your email has been verified. Redirecting to your dashboard...'
                      : isRegistering
                        ? 'Your account has been created. Redirecting to your dashboard...'
                        : 'You are now signed in. Redirecting you...'}
                </p>
              </div>
              <div className="mt-4 flex justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-rose-600 border-t-transparent rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto pt-20 sm:pt-16">
        <div className="text-center mb-4 sm:mb-8">
          <img 
            src="/imgs/AH HAO PET SHOP LOGO.png"
            alt="AH HAO PET SHOP Logo"
            className="h-16 sm:h-20 mx-auto mb-2 sm:mb-4"
          />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            {showVerificationStep 
              ? 'Verify your email' 
              : isRegistering 
                ? 'Create Account' 
                : 'Sign In to Your Account'}
          </h2>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">
            {showVerificationStep 
              ? `We've sent a 6-digit verification code to ${email}` 
              : isRegistering 
                ? 'Join member and enjoy exclusive member benefits' 
                : 'Welcome back to AH HAO PET SHOP'}
          </p>
        </div>

        <div className="bg-white py-6 sm:py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {showVerificationStep ? (
            // 新的验证码输入表单
            <form onSubmit={handleVerifyEmail} className="space-y-4 sm:space-y-6">
              <div>
                <div className="flex justify-center items-center gap-2 mb-4">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      ref={(el) => (digitRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={verificationDigits[index]}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(index, e)}
                      onPaste={index === 0 ? handleVerificationCodePaste : undefined}
                      className="w-12 h-14 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:ring-rose-500 focus:border-rose-500"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBackToRegister}
                  className="text-sm font-medium text-rose-600 hover:text-rose-500"
                >
                  Back to registration
                </button>

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendDisabled}
                  className={`text-sm font-medium ${
                    resendDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-rose-600 hover:text-rose-500'
                  } flex items-center`}
                >
                  {resendDisabled ? (
                    <>
                      <span>Resend in {resendCountdown}s</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      <span>Resend code</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 ${
                    (loading || verificationCode.length !== 6) ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    'Complete Registration'
                  )}
                </button>
              </div>
            </form>
          ) : (
            // 登录/注册表单
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {isRegistering && (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <div className="mt-1">
                      <input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="appearance-none block w-full px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <div className="mt-1">
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="appearance-none block w-full px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
              </div>

              {isRegistering && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>
                </div>
              )}

              {/* 根据登录/注册状态显示不同的元素 */}
              {isRegistering ? (
                // 注册模式 - 不显示任何导航链接
                <></>
              ) : (
                // 登录模式 - 显示忘记密码链接和注册链接
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsRegistering(true)}
                    className="text-sm font-medium text-rose-600 hover:text-rose-500"
                  >
                    Need an account?
                  </button>

                  <div className="text-sm">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="font-medium text-rose-600 hover:text-rose-500"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>
              )}

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
                    isRegistering ? 'Register' : 'Sign In'
                  )}
                </button>
              </div>

              {/* 注册模式下显示分隔线和登录链接 */}
              {isRegistering && (
                <div className="mt-4 sm:mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">
                        Already have an account?
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-6">
                    <button
                      type="button"
                      onClick={() => setIsRegistering(false)}
                      className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                    >
                      Sign in instead
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login; 