import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 处理来自 404.html 的重定向
const processRedirect = () => {
  const query = window.location.search;
  const urlParams = new URLSearchParams(query);
  const redirect = urlParams.get('redirect');
  
  if (redirect) {
    // 移除 URL 中的重定向参数
    const newUrl = window.location.pathname + window.location.search.replace(/[\?&]redirect=[^&]+/, '');
    window.history.replaceState({}, document.title, newUrl);
    
    // 使用 history API 导航到 redirect 路径，而不是刷新页面
    window.history.pushState({}, document.title, redirect);
  }
};

// 页面加载时处理重定向
processRedirect();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
) 