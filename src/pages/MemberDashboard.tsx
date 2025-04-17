import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { Calendar, Clock, User as UserIcon, LogOut, ChevronDown, Phone, Mail, Edit2, Bell, ArrowLeft, PlusCircle, Scissors, CheckCircle } from 'lucide-react';
import LoyaltyCard from '../components/LoyaltyCard';
import PetProfiles from '../components/PetProfiles';
import { Pet, Appointment, Notification, User } from '../types';
import { apiService } from '../services/apiService';
import NotificationList from '../components/NotificationList';
import ProfileForm from '../components/ProfileForm';
import { useNavigation } from '../contexts/NavigationContext';
import { formatToMalaysiaTime, formatToMalaysiaDate } from '../utils/dateUtils';

// Add custom scrollbar styles
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
`;

// Add style tag to head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = scrollbarStyles;
  document.head.appendChild(style);
}

// 添加通知类型的 emoji 映射
const notificationEmoji: Record<Notification['type'], string> = {
  appointment: '📅',
  welcome: '👋',
  reminder: '⏰',
  update: '📝',
  success: '✅'
};

// 格式化日期时间显示为12小时制
const formatDateTime = (appointment: Appointment): string => {
  // 创建日期对象
  if (appointment.date && appointment.time) {
    const dateObj = new Date(`${appointment.date}T${appointment.time}`);
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  
  // 如果没有日期或时间
  return appointment.date ? `${appointment.date} ${appointment.time || ''}` : 'Unknown time';
};

// 获取预约的时间戳，用于排序，确保正确时间顺序：10AM-11AM-12PM-1PM-2PM-3PM-4PM...
const getAppointmentTimestamp = (appointment: Appointment): number => {
  if (appointment.date && appointment.time) {
    const [hours, minutes] = appointment.time.split(':').map(Number);
    // 创建日期对象
    const dateObj = new Date(`${appointment.date}T${appointment.time}`);
    // 确保正确的排序
    return dateObj.getTime();
  }
  return 0;
};

const MemberDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { setReturningFromDashboard } = useNavigation();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || ''
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showAddPet, setShowAddPet] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [expandedPriceDetails, setExpandedPriceDetails] = useState<Record<string, boolean>>({});
  
  // 加载用户数据
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // 获取宠物列表
        const petsData = await apiService.pets.getAll();
        setPets(petsData);

        // 获取未来预约列表
        const appointmentsData = await apiService.appointments.getAll();
        console.log('Loaded appointments:', appointmentsData.length);
        
        // 确保预约按时间正确排序
        const sortedAppointments = appointmentsData.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time}`);
          const dateB = new Date(`${b.date}T${b.time}`);
          return dateA.getTime() - dateB.getTime();
        });
        
        setAppointments(sortedAppointments);
        
        // 获取历史预约（已完成和已取消的预约）
        try {
          const historyData = await apiService.appointments.getHistory();
          // 将历史预约添加到状态中，但标记为历史记录
          if (historyData && historyData.length > 0) {
            // 将历史记录合并到预约中，但避免重复
            const existingIds = sortedAppointments.map(a => a._id);
            const newHistoryAppointments = historyData.filter(a => !existingIds.includes(a._id));
            setAppointments([...sortedAppointments, ...newHistoryAppointments]);
          }
        } catch (historyError) {
          console.error('获取历史预约失败:', historyError);
        }

        // 获取通知列表
        const notificationsData = await apiService.notifications.getAll();
        setNotifications(notificationsData);
      } catch (error) {
        console.error('Failed to load user data:', error);
        setError('Failed to load data. Please refresh the page and try again.');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();

    // 检查sessionStorage中是否有刷新标记
    const checkRefreshFlag = () => {
      const shouldRefresh = sessionStorage.getItem('refreshDashboard');
      if (shouldRefresh === 'true') {
        console.log('Dashboard refresh flag detected, reloading data...');
        sessionStorage.removeItem('refreshDashboard');
        loadUserData();
      }
    };

    // 首次加载和每次渲染后检查刷新标记
    checkRefreshFlag();

    // 添加预约创建事件监听器
    const handleAppointmentCreated = () => {
      console.log('Appointment creation event detected, reloading dashboard data');
      loadUserData();
    };

    window.addEventListener('appointmentCreated', handleAppointmentCreated);

    // 添加页面可见性变化事件监听器
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('页面变为可见，检查更新');
        loadUserData(); // 直接重新加载数据，而不是只检查标记
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 清理事件监听器
    return () => {
      window.removeEventListener('appointmentCreated', handleAppointmentCreated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // 计算未读通知数量
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // 标记通知为已读
  const markAsRead = async (notificationId: string) => {
    try {
      await apiService.notifications.markAsRead(notificationId);
      setNotifications(notifications.map(n =>
        n._id === notificationId ? { ...n, isRead: true } : n
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setError('Operation failed. Please try again.');
    }
  };

  // 标记所有通知为已读
  const markAllAsRead = async () => {
    try {
      await apiService.notifications.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      setError('Operation failed. Please try again.');
    }
  };

  // 添加删除通知的函数
  const deleteNotification = async (notificationId: string) => {
    try {
      await apiService.notifications.delete(notificationId);
      setNotifications(notifications.filter(n => n._id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
      setError('Delete failed. Please try again.');
    }
  };

  // 切换选择模式
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedNotifications([]);
  };

  // 选择/取消选择单个通知
  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(nId => nId !== id)
        : [...prev, id]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map(n => n._id));
    }
  };

  // 删除选中的通知
  const deleteSelectedNotifications = async () => {
    try {
      await apiService.notifications.deleteMultiple(selectedNotifications);
      setNotifications(notifications.filter(
        n => !selectedNotifications.includes(n._id)
      ));
      setSelectedNotifications([]);
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Failed to delete selected notifications:', error);
      setError('Delete failed, please try again');
    }
  };

  // 删除所有通知
  const deleteAllNotifications = async () => {
    try {
      await apiService.notifications.deleteAll();
      setNotifications([]);
      setSelectedNotifications([]);
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
      setError('Delete failed, please try again');
    }
  };

  // Calculate base price of service
  const calculateBasePrice = (serviceType: string): number => {
    switch (serviceType) {
      case 'Basic Grooming':
        return 60;
      case 'Full Grooming':
        return 120;
      case 'Spa Treatment':
        return 220;
      default:
        return 0;
    }
  };

  // Calculate day care price
  const calculateDayCarePrice = (dayCareOptions?: { type: 'daily' | 'longTerm'; days: number }): number => {
    if (!dayCareOptions || !dayCareOptions.type) return 0;
    
    if (dayCareOptions.type === 'daily') return 50;
    return dayCareOptions.days * 80; // Long term price
  };

  // Calculate total price
  const calculateTotalPrice = (serviceType: string, dayCareOptions?: { type: 'daily' | 'longTerm'; days: number }): number => {
    let total = calculateBasePrice(serviceType);
    
    // Add day care cost
    const dayCarePrice = calculateDayCarePrice(dayCareOptions);
    total += dayCarePrice;
    
    // Apply member discounts
    if (serviceType === 'Spa Treatment') {
      total = total * 0.9; // 10% discount for spa
    } else if (serviceType === 'Basic Grooming' || serviceType === 'Full Grooming') {
      total = total * 0.92; // 8% discount for basic and full grooming
    }

    return Math.round(total * 100) / 100; // Round to 2 decimal places
  };

  // Toggle price details dropdown
  const togglePriceDetails = (appointmentId: string) => {
    setExpandedPriceDetails(prev => ({
      ...prev,
      [appointmentId]: !prev[appointmentId]
    }));
  };

  // 点击空白处关闭价格详情菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 如果有打开的价格详情菜单
      const openMenuIds = Object.keys(expandedPriceDetails).filter(id => expandedPriceDetails[id]);
      
      if (openMenuIds.length > 0) {
        // 检查点击是否在价格详情菜单外
        let clickedOutside = true;
        
        // 检查是否点击在价格菜单或切换按钮上
        const priceDetails = document.querySelectorAll('.price-details-dropdown');
        const toggleButtons = document.querySelectorAll('.price-toggle-button');
        
        priceDetails.forEach(element => {
          if (element.contains(event.target as Node)) {
            clickedOutside = false;
          }
        });
        
        toggleButtons.forEach(element => {
          if (element.contains(event.target as Node)) {
            clickedOutside = false;
          }
        });
        
        // 如果点击在价格菜单外，关闭所有打开的菜单
        if (clickedOutside) {
          setExpandedPriceDetails({});
        }
      }
    };
    
    // 添加事件监听器
    document.addEventListener('click', handleClickOutside);
    
    // 清理函数
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [expandedPriceDetails]);

  const handleBackToHome = () => {
    // 始终返回主页
    navigate('/', { replace: true });
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
  };

  // 添加点击外部关闭下拉菜单的处理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // 如果点击的不是通知下拉菜单内部元素且不是铃铛图标，则关闭通知
      if (!target.closest('.notification-dropdown') && !target.closest('.notification-bell-button')) {
        setShowNotifications(false);
      }
      
      // 如果点击的不是用户档案下拉菜单内部元素，则关闭用户档案
      if (!target.closest('.profile-dropdown') && !target.closest('.profile-button')) {
        setShowProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleProfileUpdate = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 确保所有必填字段都有值
      if (!userProfile.name || !userProfile.phone) {
        throw new Error('Name and phone number are required');
      }

      // 更新用户资料
      const updatedUser = await apiService.user.update({
        name: userProfile.name,
        phone: userProfile.phone
      });

      // 更新本地状态
      setUserProfile({
        name: updatedUser.name,
        phone: updatedUser.phone,
        email: updatedUser.email
      });

      setIsEditing(false);
      setError(null);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setError(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 处理宠物添加
  const handleAddPet = async (petData: Omit<Pet, '_id'>) => {
    try {
      setLoading(true);
      setError(null);

      // 确保用户已登录
      if (!user || !user._id) {
        console.error('User authentication issue when adding pet:', user);
        setError('Authentication error. Please try logging out and logging in again.');
        return;
      }

      console.log('Adding pet for user:', user.name, 'ID:', user._id);
      console.log('Pet data:', petData);

      // 添加宠物
      const newPet = await apiService.pets.add({
        ...petData,
        owner: user._id
      });

      console.log('Pet added successfully:', newPet);

      // 更新本地状态
      setPets(prevPets => [...prevPets, newPet]);
      setShowAddPet(false);
      setError(null);
    } catch (error: any) {
      console.error('Failed to add pet:', error);
      if (error.response?.status === 401) {
        setError('Authentication error. Please log in again.');
      } else {
        setError(error.message || 'Failed to add pet. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle pet update
  const handleUpdatePet = async (id: string, petData: Partial<Pet>) => {
    try {
      const updatedPet = await apiService.pets.update(id, petData);
      setPets(pets.map(pet => pet._id === id ? updatedPet : pet));
    } catch (error) {
      console.error('Failed to update pet:', error);
      setError('Failed to update pet. Please try again.');
    }
  };

  // Handle pet deletion
  const handleDeletePet = async (id: string) => {
    try {
      await apiService.pets.delete(id);
      setPets(pets.filter(pet => pet._id !== id));
    } catch (error) {
      console.error('Failed to delete pet:', error);
      setError('Failed to delete pet. Please try again.');
    }
  };

  // Handle appointment addition
  const handleAddAppointment = async (appointmentData: Omit<Appointment, '_id'>) => {
    try {
      const newAppointment = await apiService.appointments.add(appointmentData);
      setAppointments([...appointments, newAppointment]);
    } catch (error) {
      console.error('Failed to add appointment:', error);
      setError('Failed to add appointment. Please try again.');
    }
  };

  // Handle appointment update
  const handleUpdateAppointment = async (id: string, appointmentData: Partial<Appointment>) => {
    try {
      const updatedAppointment = await apiService.appointments.update(id, appointmentData);
      setAppointments(appointments.map(appointment => 
        appointment._id === id ? updatedAppointment : appointment
      ));
    } catch (error) {
      console.error('Failed to update appointment:', error);
      setError('Failed to update appointment. Please try again.');
    }
  };

  // Handle appointment deletion
  const handleDeleteAppointment = async (id: string) => {
    try {
      await apiService.appointments.delete(id);
      setAppointments(appointments.filter(appointment => appointment._id !== id));
    } catch (error) {
      console.error('Failed to delete appointment:', error);
      setError('Failed to delete appointment. Please try again.');
    }
  };

  // 处理通知标记为已读
  const handleMarkNotificationAsRead = async (id: string) => {
    try {
      await apiService.notifications.markAsRead(id);
      setNotifications(notifications.map(notification => 
        notification._id === id ? { ...notification, isRead: true } : notification
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setError('Operation failed. Please try again.');
    }
  };

  // 处理通知删除
  const handleDeleteNotification = async (id: string) => {
    try {
      await apiService.notifications.delete(id);
      setNotifications(notifications.filter(notification => notification._id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
      setError('Delete failed. Please try again.');
    }
  };

  // Handle profile update
  const handleUpdateProfile = async (userData: Partial<User>) => {
    try {
      const updatedUser = await apiService.user.update(userData);
      if (updatedUser) {
        setUserProfile({
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone
        });
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError('Failed to update profile. Please try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      setShowProfile(false);
      setShowLogoutModal(true);
      
      // 显示登出动画 1.5 秒后执行实际登出
      setTimeout(async () => {
        try {
          await logout();
        } catch (error) {
          console.error('Error signing out:', error);
          setShowLogoutModal(false);
        }
      }, 1500);
    } catch (error) {
      console.error('Error during sign out process:', error);
      setShowLogoutModal(false);
    }
  };

  // 更新通知面板渲染
  const renderNotifications = () => (
    <div className="notification-dropdown fixed top-[4.5rem] right-4 w-80 md:w-96 bg-white rounded-lg shadow-2xl border border-gray-200/80 py-2 z-50 backdrop-blur-sm backdrop-saturate-150">
      {/* 头部操作栏 */}
      <div className="px-3 md:px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">Notifications</h3>
          <div className="flex items-center space-x-2">
            {notifications.length > 0 && (
              <button
                onClick={toggleSelectionMode}
                className="text-xs md:text-sm text-gray-600 hover:text-gray-800 px-1.5 md:px-2 py-1 rounded hover:bg-gray-100"
              >
                {isSelectionMode ? 'Cancel' : 'Select'}
              </button>
            )}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs md:text-sm text-blue-600 hover:text-blue-700 px-1.5 md:px-2 py-1 rounded hover:bg-blue-50"
              >
                Read All
              </button>
            )}
          </div>
        </div>
        
        {/* 选择模式工具栏 */}
        {isSelectionMode && notifications.length > 0 && (
          <div className="flex justify-between items-center bg-gray-50 px-4 py-2 -mx-4 border-y border-gray-100">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSelectAll}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {selectedNotifications.length === notifications.length 
                  ? 'Deselect All' 
                  : 'Select All'}
              </button>
              <span className="text-sm text-gray-500">
                {selectedNotifications.length} selected
              </span>
            </div>
            {selectedNotifications.length > 0 && (
              <button
                onClick={deleteSelectedNotifications}
                className="text-sm text-rose-500 hover:text-rose-600 flex items-center space-x-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" 
                     className="h-4 w-4" 
                     viewBox="0 0 20 20" 
                     fill="currentColor">
                  <path fillRule="evenodd" 
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" 
                        clipRule="evenodd" />
                </svg>
                <span>Delete Selected</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 通知列表 */}
      <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
        {notifications.length > 0 ? (
          notifications.map(notification => (
            <div
              key={notification._id}
              className={`px-3 md:px-4 py-2 md:py-3 hover:bg-gray-100 transition-colors duration-200 relative group border-b border-gray-100 last:border-b-0 ${
                !notification.isRead ? 'bg-blue-50/80 backdrop-blur-sm' : ''
              } cursor-pointer`}
              onClick={(e) => {
                if (isSelectionMode) {
                  e.stopPropagation();
                  toggleNotificationSelection(notification._id);
                } else {
                  // 标记任何通知为已读
                  if (!notification.isRead) {
                    handleMarkNotificationAsRead(notification._id);
                  }
                  // Add other notification click handling logic here, such as navigation
                  console.log('Notification clicked:', notification.title);
                }
              }}
              style={{ cursor: isSelectionMode ? 'pointer' : 'pointer' }}
            >
              <div className="flex items-start">
                {/* 选择框 */}
                {isSelectionMode && (
                  <div 
                    className="mr-3 mt-1 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation(); // 阻止冒泡，避免触发父元素的点击事件
                      toggleNotificationSelection(notification._id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification._id)}
                      onChange={() => {}} // 空函数，实际点击处理由父div处理
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                )}

                <div className="flex items-start flex-grow">
                  <div className="bg-blue-100 rounded-full p-2 mr-3 flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <p className="text-xs md:text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      {notification.isRead && (
                        <span className="text-xs text-blue-500 ml-2 flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          <span className="hidden md:inline-block">Read</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatToMalaysiaTime(notification.createdAt)}
                    </p>
                  </div>
                </div>

                {/* 单个删除按钮 - 非选择模式时显示 */}
                {!isSelectionMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification._id);
                    }}
                    className="ml-2 p-1.5 hover:bg-gray-100 rounded-full group-hover:opacity-100 opacity-0 transition-opacity duration-200"
                  >
                    <svg className="w-5 h-5 text-gray-500 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-6 text-sm text-gray-600 text-center">
            No notifications
          </div>
        )}
      </div>
    </div>
  );

  const handleWhatsApp = () => {
    window.open('https://wa.me/60102568641', '_blank');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 登出提示模态框 */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 transform transition-all animate-fade-in-up">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-100 mb-4">
                <LogOut className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Signing Out...
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Thank you for visiting AH HAO PET SHOP!
              </p>
              <div className="flex justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-rose-600 border-t-transparent rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 顶部导航栏 - 移除粉色背景 */}
      <div className="bg-slate-50 pb-24">
        <nav className="border-b border-slate-200/40 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              {/* Logo - 移除Member Dashboard文字 */}
              <div className="flex items-center">
                <img
                  src="/imgs/AH HAO PET SHOP LOGO.png"
                  alt="AH HAO PET SHOP Logo"
                  className="h-8 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={handleBackToHome}
                />
                {/* 仅在非移动设备上显示标题 */}
                <span className="text-slate-700 font-medium hidden md:inline-block ml-4">Member Dashboard</span>
              </div>

              {/* 通知和用户信息 */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="notification-bell-button relative flex items-center space-x-2 text-gray-800 hover:text-rose-600 transition-colors duration-300"
                >
                  <Bell className={`w-6 h-6 ${showNotifications ? 'text-rose-600' : ''}`} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowProfile(!showProfile)}
                    className="profile-button flex items-center text-slate-600 hover:text-slate-900 transition-colors p-2 hover:bg-white/90 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-100 to-sky-100 rounded-full flex items-center justify-center border border-white/60">
                      <UserIcon className="w-4 h-4 text-slate-600" />
                    </div>
                    {/* 仅在非移动设备上显示用户名和下拉箭头 */}
                    <span className="text-sm font-medium ml-2 hidden md:inline-block">
                      {userProfile.name || user?.email}
                    </span>
                    <ChevronDown className="w-4 h-4 hidden md:inline-block ml-1" />
                  </button>

                  {/* Profile Dropdown */}
                  {showProfile && (
                    <div 
                      className="profile-dropdown absolute right-0 mt-2 w-64 md:w-80 bg-white rounded-lg border border-slate-200 py-2 z-50"
                      onClick={(e) => {
                        // Prevent outer click event when clicking inside dropdown menu
                        e.stopPropagation();
                      }}
                    >
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
                          <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="px-4 py-3 space-y-3">
                        <div className="flex items-center space-x-3">
                          <UserIcon className="w-4 h-4 text-gray-400" />
                          {isEditing ? (
                            <input
                              type="text"
                              value={userProfile.name}
                              onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleProfileUpdate();
                                }
                              }}
                              className="flex-1 px-2 py-1 border rounded"
                              placeholder="Your name"
                            />
                          ) : (
                            <span className="text-gray-600">{userProfile.name || 'Add your name'}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {isEditing ? (
                            <input
                              type="tel"
                              value={userProfile.phone}
                              onChange={(e) => setUserProfile({...userProfile, phone: e.target.value})}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleProfileUpdate();
                                }
                              }}
                              className="flex-1 px-2 py-1 border rounded"
                              placeholder="Your phone number"
                            />
                          ) : (
                            <span className="text-gray-600">{userProfile.phone || 'Add phone number'}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{userProfile.email}</span>
                        </div>
                        {isEditing && (
                          <button
                            onClick={handleProfileUpdate}
                            className="w-full mt-2 bg-rose-600 text-white px-4 py-2 rounded-md hover:bg-rose-700 transition-colors"
                          >
                            Save Changes
                          </button>
                        )}
                      </div>
                      <div className="border-t border-gray-100 mt-2">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center space-x-2 px-4 py-3 text-gray-600 hover:bg-rose-50 w-full transition-colors duration-200 hover:text-rose-600 group"
                        >
                          <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {showNotifications && renderNotifications()}
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* 主要内容区域 - 移动端优化 */}
      <main className="-mt-20">
        <div className="max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8">
          {/* 欢迎部分 - 移动端优化 */}
          <div className="mb-6 p-2">
            <div className="flex flex-col md:flex-row md:items-center">
              <button
                onClick={handleBackToHome}
                className="inline-flex items-center px-4 py-2 mb-4 md:mb-0 md:mr-4 bg-white text-slate-700 
                        rounded-lg shadow-sm hover:bg-slate-50 border border-slate-200
                        transition-colors duration-200 group"
              >
                <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-0.5 transition-transform" />
                Home
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
                <p className="text-gray-800 font-medium mt-1">{userProfile.name || 'Member'}</p>
                <p className="text-gray-600 text-sm mt-1">Manage your pets and appointments</p>
              </div>
            </div>
          </div>

          {/* 内容布局 - 移动端优化 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Quick Actions Section */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3 h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                <div 
                  onClick={() => navigate('/grooming-appointment')}
                  className="bg-gray-50 hover:bg-blue-50 rounded-xl p-2 sm:p-3 h-[70px] sm:h-[80px] cursor-pointer transition-colors flex items-center justify-center flex-col"
                >
                  <Calendar className="w-5 h-5 text-blue-600 mb-1 sm:mb-2" />
                  <span className="text-xs sm:text-sm font-medium text-gray-800">Book Appointment</span>
                </div>
                
                <div 
                  onClick={handleWhatsApp}
                  className="bg-gray-50 hover:bg-green-50 rounded-xl p-2 sm:p-3 h-[70px] sm:h-[80px] cursor-pointer transition-colors flex items-center justify-center flex-col"
                >
                  <svg 
                    viewBox="0 0 24 24" 
                    className="w-5 h-5 text-green-600 mb-1 sm:mb-2"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span className="text-xs sm:text-sm font-medium text-gray-800">Contact Us</span>
                </div>
                
                <div 
                  onClick={() => navigate('/appointments')}
                  className="bg-gray-50 hover:bg-purple-50 rounded-xl p-2 sm:p-3 h-[70px] sm:h-[80px] cursor-pointer transition-colors flex items-center justify-center flex-col"
                >
                  <Scissors className="w-5 h-5 text-purple-600 mb-1 sm:mb-2" />
                  <span className="text-xs sm:text-sm font-medium text-gray-800">Grooming History</span>
                </div>
                
                <div 
                  onClick={() => navigate('/favourites')}
                  className="bg-gray-50 hover:bg-pink-50 rounded-xl p-2 sm:p-3 h-[70px] sm:h-[80px] cursor-pointer transition-colors flex items-center justify-center flex-col"
                >
                  <svg 
                    className="w-5 h-5 text-pink-600 mb-1 sm:mb-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span className="text-xs sm:text-sm font-medium text-gray-800">Favourite</span>
                </div>
              </div>
            </div>

            {/* Upcoming Appointments Section */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Appointments</h3>
              
              <div className="space-y-3 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                {appointments.length > 0 ? 
                  appointments
                    .filter(appt => {
                      if (!appt.date || !appt.time) return false;
                      
                      // 创建预约的完整日期时间对象
                      const appointmentDateTime = new Date(`${appt.date}T${appt.time}`);
                      
                      // 获取当前时间
                      const now = new Date();
                      
                      // 如果预约时间大于当前时间，则显示
                      return appointmentDateTime > now;
                    })
                    .sort((a, b) => getAppointmentTimestamp(a) - getAppointmentTimestamp(b))
                    .map(appointment => (
                      <div key={appointment._id} className="border border-gray-100 rounded-lg p-3 hover:border-blue-200 transition-colors">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <Calendar className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            {/* Pet Name - Main Focus */}
                            <h4 className="text-base font-medium text-gray-900 mb-1">
                              {appointment.petName || 'Pet Name'}
                              <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                {appointment.petType === 'dog' ? '🐕 Dog' : '🐱 Cat'}
                              </span>
                            </h4>
                            
                            {/* Service Type */}
                            <div className="text-sm text-gray-800 mb-1">
                              {appointment.serviceType}
                            </div>
                            
                            {/* Date and Time - 使用12小时格式 */}
                            <div className="text-sm text-gray-600">
                              {formatDateTime(appointment)}
                            </div>
                            
                            {/* Daycare Info */}
                            {appointment.dayCareOptions && 
                             appointment.dayCareOptions.type && 
                             appointment.dayCareOptions.days && 
                             appointment.dayCareOptions.days > 0 && (
                              <div className="mt-1.5 flex items-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {appointment.dayCareOptions.type === 'daily' 
                                    ? 'Daily Daycare'
                                    : `${appointment.dayCareOptions.days} Days Daycare`}
                                </span>
                              </div>
                            )}
                            
                            {/* Price Information with Dropdown */}
                            <div className="mt-2 relative">
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900">
                                  RM {appointment.totalPrice ? Number(appointment.totalPrice).toFixed(2) : 
                                  calculateTotalPrice(appointment.serviceType || 'Basic Grooming', appointment.dayCareOptions).toFixed(2)}
                                </span>
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePriceDetails(appointment._id || '');
                                  }}
                                  className="ml-1 text-xs text-gray-500 hover:text-gray-700 focus:outline-none price-toggle-button"
                                  aria-label={expandedPriceDetails[appointment._id || ''] ? "Hide price details" : "Show price details"}
                                >
                                  <svg 
                                    className={`h-4 w-4 transition-transform ${expandedPriceDetails[appointment._id || ''] ? 'transform rotate-180' : ''}`} 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    viewBox="0 0 20 20" 
                                    fill="currentColor"
                                  >
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                              
                              {/* Price Details Dropdown */}
                              {expandedPriceDetails[appointment._id || ''] && (
                                <div className="mb-2 bg-white rounded-md shadow-sm border border-gray-200 p-2 space-y-1 absolute z-10 right-0 bottom-full w-48 price-details-dropdown">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Service:</span>
                                    <span className="text-gray-800">
                                      RM {calculateBasePrice(appointment.serviceType || 'Basic Grooming')}
                                    </span>
                                  </div>
                                  
                                  {appointment.dayCareOptions && 
                                   appointment.dayCareOptions.type && 
                                   appointment.dayCareOptions.days && 
                                   appointment.dayCareOptions.days > 0 && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">
                                        Day Care:
                                      </span>
                                      <span className="text-gray-800">
                                        RM {calculateDayCarePrice(appointment.dayCareOptions)}
                                      </span>
                                    </div>
                                  )}
                                  
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">
                                      Member Discount:
                                    </span>
                                    <span className="text-rose-600">
                                      -RM {(
                                        (calculateBasePrice(appointment.serviceType || 'Basic Grooming') + 
                                         calculateDayCarePrice(appointment.dayCareOptions || { type: 'daily', days: 0 }) - 
                                         (appointment.totalPrice || calculateTotalPrice(appointment.serviceType || 'Basic Grooming', appointment.dayCareOptions || { type: 'daily', days: 0 })))
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                  
                                  <div className="flex justify-between text-xs font-medium pt-1 border-t border-gray-100">
                                    <span className="text-gray-800">Total:</span>
                                    <span className="text-gray-900 font-bold">
                                      RM {appointment.totalPrice ? Number(appointment.totalPrice).toFixed(2) : 
                                      calculateTotalPrice(appointment.serviceType || 'Basic Grooming', appointment.dayCareOptions || { type: 'daily', days: 0 }).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  : (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      No upcoming appointments
                    </div>
                  )
                }
              </div>
            </div>

            {/* My Pets Section */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">My Pets</h2>

                {/* Add New Pet 按钮 */}
                <button
                  onClick={() => setShowAddPet(true)}
                  className="inline-flex items-center px-3 py-1.5 bg-rose-500 text-white 
                           rounded-lg hover:bg-rose-600 transition-colors duration-200
                           text-xs font-medium"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                  Add New Pet
                </button>
              </div>

              <div className="max-h-[240px] overflow-y-auto pr-2 overflow-x-auto">
                <PetProfiles 
                  isAddingPet={showAddPet} 
                  setIsAddingPet={setShowAddPet} 
                  onAddPet={handleAddPet}
                  onUpdatePet={handleUpdatePet}
                  onDeletePet={handleDeletePet}
                  hideNavigationButtons={true}
                />
              </div>
            </div>
            
            {/* Member Benefits Section */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Member Benefits</h3>
              <div className="space-y-4">
                {/* Birthday Benefit */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-rose-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    <h3 className="text-base font-medium text-gray-900">Birthday Month Special</h3>
                  </div>
                  <div className="ml-8 space-y-2">
                    <p className="text-xs text-gray-500">Get a FREE grooming session of any type for your pet during their birthday month! Simply show your IC at the counter for verification.</p>
                  </div>
                </div>

                {/* Regular Grooming Discounts */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-rose-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <h3 className="text-base font-medium text-gray-900">Grooming Discounts</h3>
                  </div>
                  <div className="space-y-2 ml-8">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Basic Grooming</span>
                      <span className="font-medium text-rose-600">8% OFF</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Full Grooming</span>
                      <span className="font-medium text-rose-600">8% OFF</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Spa Treatment</span>
                      <span className="font-medium text-rose-600">10% OFF</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MemberDashboard; 