export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4003';

// 输出环境变量以帮助调试
console.log('Using API URL:', API_BASE_URL);
console.log('Environment Variables:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_APP_MODE: import.meta.env.VITE_APP_MODE,
  VITE_PUBLIC_URL: import.meta.env.VITE_PUBLIC_URL
}); 