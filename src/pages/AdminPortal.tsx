import React, { useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, Search, Filter, Users, Calendar, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, ChevronDown, DollarSign, X, ArrowLeft, LogOut, Dog, Scissors, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { User, Appointment, GroomingService, DayCareOption, Feature } from '../types';
import PetListingsManager from '../components/PetListingsManager';

interface MemberAppointment {
  member: {
    name: string;
    email: string;
    phone: string;
  };
  appointments: Appointment[];
}

// 定义更新任务的接口
interface AppointmentUpdateTask {
  id: string; 
  oldDateTime: string;
  serviceType: string;
}

// 将getDisplayStatus函数移到最上面，在hooks使用之前
// 添加一个辅助函数来获取正确的显示状态
const getDisplayStatus = (appointment: Appointment): string => {
  // 如果已经是Completed或Cancelled，保持不变
  if (appointment.status === 'Completed' || appointment.status === 'Cancelled') {
    return appointment.status;
  }
  
  // 检查预约时间是否已过
  const apptDate = typeof appointment.date === 'string' 
    ? appointment.date.split('T')[0] 
    : new Date(appointment.date).toISOString().split('T')[0];
  const apptTime = appointment.time || '';
  
  // 创建日期对象进行比较
  const apptDateTime = new Date(`${apptDate}T${apptTime}`);
  const currentDateTime = new Date();
  
  // 如果预约时间已过但状态仍为Booked，返回Completed
  if (apptDateTime < currentDateTime && appointment.status === 'Booked') {
    return 'Completed';
  }
  
  // 如果是Booked状态，返回Upcoming用于显示
  if (appointment.status === 'Booked') {
    return 'Upcoming';
  }
  
  // 否则返回原始状态
  return appointment.status;
};

const AdminPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterTime, setFilterTime] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    time: '',
    serviceType: 'Basic Grooming' as Appointment['serviceType'],
    notes: '',
    status: 'Booked' as Appointment['status'],
    hasDaycare: false,
    dayCareOptions: {
      type: 'daily' as 'daily' | 'longTerm',
      days: 1,
      morning: true,
      afternoon: true,
      evening: true
    }
  });
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 2;
  const [activeView, setActiveView] = useState<'dashboard' | 'users' | 'all-appointments' | 'upcoming' | 'completed' | 'pet-listings' | 'services'>('dashboard');

  // Add state
  const [groomingServices] = useState<GroomingService[]>([]);
  const [dayCareOptions] = useState<DayCareOption[]>([]);

  type DayCareType = 'daily' | 'longTerm';

  const [dayCareType, setDayCareType] = useState<DayCareType>('daily');
  const [features, setFeatures] = useState<Feature[]>([]);

  // Add handler for daycare type changes
  const handleDayCareTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as 'daily' | 'longTerm';
    // Default to 1 day for daily and 2 days for longTerm
    const defaultDays = newType === 'daily' ? 1 : 2;
    
    setEditFormData({
      ...editFormData,
      dayCareOptions: {
        ...editFormData.dayCareOptions,
        type: newType,
        days: defaultDays
      }
    });
    
    console.log(`Changed daycare type to ${newType}, with ${defaultDays} days`);
  };

  // Add handler for daycare days changes
  const handleDayCareDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const days = parseInt(e.target.value) || 1;
    
    setEditFormData({
      ...editFormData,
      dayCareOptions: {
        ...editFormData.dayCareOptions,
        days
      }
    });
    
    console.log(`Changed daycare days to ${days}`);
  };

  const handleFeatureChange = (index: number, text: string) => {
    const newFeatures = [...features];
    newFeatures[index] = { text };
    setFeatures(newFeatures);
  };

  const handleDeleteFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleAddFeature = () => {
    setFeatures([...features, { text: '' }]);
  };

  useEffect(() => {
    // Check if user is admin, if not redirect to member dashboard
    if (user && user.role !== 'admin') {
      navigate('/member-dashboard');
    }

    // Fetch users and appointments
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersData, appointmentsData] = await Promise.all([
          apiService.admin.getAllUsers(),
          apiService.admin.getAllAppointments()
        ]);
        setUsers(usersData);
        
        // Auto-update status of past appointments from Booked to Completed
        const currentDateTime = new Date();
        const needsUpdate: AppointmentUpdateTask[] = [];
        
        const updatedAppointments = appointmentsData.map(appt => {
          // Get appointment date and time
          const apptDate = typeof appt.date === 'string' 
            ? appt.date.split('T')[0] 
            : new Date(appt.date).toISOString().split('T')[0];
          const apptTime = appt.time || '';
          
          // Create Date object for comparison
          const apptDateTime = new Date(`${apptDate}T${apptTime}`);
          
          // Clean up daycare options - ensure we only have valid daycare options
          if (appt.dayCareOptions) {
            const { type, days, morning, afternoon, evening } = appt.dayCareOptions;
            if (!type || !days || days <= 0 || !(morning || afternoon || evening)) {
              // If daycare options are invalid, set to undefined
              appt.dayCareOptions = undefined;
            }
          }
          
          // If appointment time has passed and status is still Booked, update to Completed
          if (apptDateTime < currentDateTime && appt.status === 'Booked') {
            console.log(`Marking appointment ${appt._id} as Completed: ${apptDate} ${apptTime}`);
            
            // Add to list for database update
            needsUpdate.push({
              id: appt._id || '',
              oldDateTime: `${apptDate}T${apptTime}`,
              serviceType: appt.serviceType || 'Basic Grooming'
            });
            
            return { ...appt, status: 'Completed' as const };
          }
          
          return appt;
        });
        
        setAppointments(updatedAppointments);
        
        // Update database for each appointment that needs status change
        if (needsUpdate.length > 0) {
          console.log(`Found ${needsUpdate.length} appointments to update to Completed status`);
          await updateExpiredAppointmentsInDB(needsUpdate);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Set a small timeout to ensure everything is properly loaded before checking again
    const initialRefreshTimeout = setTimeout(() => {
      console.log('Performing initial status refresh check');
      refreshAppointments();
    }, 2000);
    
    // Set up interval to check for completed appointments every 30 seconds
    const statusCheckInterval = setInterval(async () => {
      const currentDateTime = new Date();
      const needsUpdate: AppointmentUpdateTask[] = [];
      let hasChanges = false;
      
      setAppointments(prevAppointments => {
        const updated = prevAppointments.map(appt => {
          // Get appointment date and time
          const apptDate = typeof appt.date === 'string' 
            ? appt.date.split('T')[0] 
            : new Date(appt.date).toISOString().split('T')[0];
          const apptTime = appt.time || '';
          
          // Create Date object for comparison
          const apptDateTime = new Date(`${apptDate}T${apptTime}`);
          
          // Clean up daycare options - ensure we only have valid daycare options
          if (appt.dayCareOptions) {
            const { type, days, morning, afternoon, evening } = appt.dayCareOptions;
            if (!type || !days || days <= 0 || !(morning || afternoon || evening)) {
              // If daycare options are invalid, set to undefined
              appt.dayCareOptions = undefined;
            }
          }
          
          // If appointment time has passed and status is still Booked, update to Completed
          if (apptDateTime < currentDateTime && appt.status === 'Booked') {
            console.log(`Interval check: Marking appointment ${appt._id} as Completed: ${apptDate} ${apptTime}`);
            
            // Add to list for database update
            needsUpdate.push({
              id: appt._id || '',
              oldDateTime: `${apptDate}T${apptTime}`,
              serviceType: appt.serviceType || 'Basic Grooming'
            });
            
            hasChanges = true;
            return { ...appt, status: 'Completed' as const };
          }
          
          return appt;
        });
        
        return hasChanges ? updated : prevAppointments;
      });
      
      // Update database for each appointment that needs status change
      if (needsUpdate.length > 0) {
        console.log(`Interval found ${needsUpdate.length} appointments to update to Completed status`);
        await updateExpiredAppointmentsInDB(needsUpdate);
      }
    }, 30000);  // Check every 30 seconds instead of every minute
    
    return () => {
      clearInterval(statusCheckInterval);
      clearTimeout(initialRefreshTimeout);
    };
  }, [user, navigate]);

  // Helper function to format date
  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString();
  };

  // Helper function to format time in 12-hour format (AM/PM)
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    
    // Parse the time (assumes format like "14:00")
    const [hourStr, minuteStr] = timeString.split(':');
    const hour = parseInt(hourStr);
    const minute = minuteStr;
    
    // Convert to 12-hour format
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12; // Convert 0 to 12
    
    return `${hour12}:${minute} ${period}`;
  };

  // Group appointments by member, sort appointments by date/time
  const memberAppointments = React.useMemo(() => {
    const groupedByEmail: Record<string, MemberAppointment> = {};
    
    appointments.forEach(appt => {
      const email = appt.ownerEmail;
      if (!email) return;
      
      if (!groupedByEmail[email]) {
        groupedByEmail[email] = {
          member: {
            name: appt.ownerName || '',
            email: email,
            phone: appt.ownerPhone || ''
          },
          appointments: []
        };
      }
      
      groupedByEmail[email].appointments.push(appt);
    });
    
    // Sort appointments within each member
    Object.values(groupedByEmail).forEach(member => {
      member.appointments.sort((a, b) => {
        // First sort by completion status (completed appointments go to the bottom)
        const statusA = getDisplayStatus(a);
        const statusB = getDisplayStatus(b);
        
        if (statusA === 'Completed' && statusB !== 'Completed') {
          return 1; // a (completed) goes after b (not completed)
        } else if (statusA !== 'Completed' && statusB === 'Completed') {
          return -1; // a (not completed) goes before b (completed)
        }
        
        // For appointments with the same completion status, sort by date/time
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });
    });
    
    return Object.values(groupedByEmail);
  }, [appointments]);

  // Filter members based on search term and status
  const filteredMembers = React.useMemo(() => {
    // 首先过滤匹配搜索条件的会员
    const filtered = memberAppointments.filter(item => {
      const { name, email, phone } = item.member;
      
      // Check if member info matches search term
      const memberMatches = 
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        phone.toLowerCase().includes(searchTerm.toLowerCase());
      
      // For member filtering, we just need at least one appointment that matches all filters
      const hasMatchingAppointments = item.appointments.some(appt => {
        // Status filter
        const statusMatches = filterStatus === 'All Status' || 
          (filterStatus === 'Upcoming' && getDisplayStatus(appt) === 'Upcoming') ||
          (filterStatus === 'Completed' && getDisplayStatus(appt) === 'Completed');
        
        // Date filter
        const dateMatches = !filterDate || 
          (typeof appt.date === 'string' ? 
            appt.date.split('T')[0] === filterDate : 
            new Date(appt.date).toISOString().split('T')[0] === filterDate);
        
        // Time filter
        const timeMatches = !filterTime || appt.time.startsWith(filterTime);
        
        return statusMatches && dateMatches && timeMatches;
      });
      
      return memberMatches && hasMatchingAppointments;
    });

    // 然后按会员状态和名字排序
    return filtered.sort((a, b) => {
      // 检查是否为会员
      const isAMember = users.some(user => user.email === a.member.email);
      const isBMember = users.some(user => user.email === b.member.email);
      
      // 先按会员状态排序 (会员优先)
      if (isAMember && !isBMember) return -1;
      if (!isAMember && isBMember) return 1;
      
      // 然后按名字字母顺序排序
      return a.member.name.localeCompare(b.member.name);
    });
  }, [memberAppointments, searchTerm, filterStatus, filterDate, filterTime, users]);

  // Count metrics for the dashboard
  const totalUsers = React.useMemo(() => {
    // 统计唯一的电子邮件地址数量
    const uniqueEmails = new Set<string>();
    appointments.forEach(appt => {
      if (appt.ownerEmail) {
        uniqueEmails.add(appt.ownerEmail);
      }
    });
    return uniqueEmails.size;
  }, [appointments]);

  // 总预约数量
  const totalAppointments = appointments.length;

  // 重新计算统计数据，使用getDisplayStatus函数而不是原始状态
  // 计算即将到来的预约数量 - 只有状态实际为Upcoming的预约
  const upcomingAppointments = React.useMemo(() => {
    return appointments.filter(appt => getDisplayStatus(appt) === 'Upcoming').length;
  }, [appointments]);

  // 使用getDisplayStatus获取实际状态来计算已完成的预约数量
  const completedAppointments = React.useMemo(() => {
    return appointments.filter(appt => getDisplayStatus(appt) === 'Completed').length;
  }, [appointments]);

  const cancelledAppointments = React.useMemo(() => {
    return appointments.filter(appt => appt.status === 'Cancelled').length;
  }, [appointments]);

  // Convert 24h time to 12h time for display in the edit form
  const convertTo12HourFormat = (time24: string): string => {
    if (!time24) return '';
    
    const [hourStr, minuteStr] = time24.split(':');
    const hour = parseInt(hourStr);
    const minute = minuteStr;
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12.toString().padStart(2, '0')}:${minute} ${period}`;
  };

  // Convert 12h time back to 24h time for submission
  const convertTo24HourFormat = (time12: string): string => {
    if (!time12) return '';
    
    const [timePart, periodPart] = time12.split(' ');
    const [hourStr, minuteStr] = timePart.split(':');
    let hour = parseInt(hourStr);
    
    if (periodPart === 'PM' && hour < 12) {
      hour += 12;
    } else if (periodPart === 'AM' && hour === 12) {
      hour = 0;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minuteStr}`;
  };

  // Update handleEditClick to save the original appointment data
  const handleEditClick = (appointment: Appointment) => {
    // 首先记录原始预约信息，以便在控制台显示变更
    console.log('Original appointment:', JSON.stringify(appointment, null, 2));
    
    // 检查预约是否有日托选项
    const hasDaycareService = Boolean(
      appointment.dayCareOptions && 
      (appointment.dayCareOptions.type === 'daily' || appointment.dayCareOptions.type === 'longTerm')
    );
    
    setCurrentAppointment(appointment);
    setEditFormData({
      date: typeof appointment.date === 'string' ? appointment.date.split('T')[0] : new Date(appointment.date).toISOString().split('T')[0],
      time: appointment.time || '',
      serviceType: appointment.serviceType || 'Basic Grooming',
      notes: appointment.notes || '',
      status: appointment.status,
      hasDaycare: hasDaycareService,
      dayCareOptions: appointment.dayCareOptions || {
        type: 'daily' as 'daily' | 'longTerm',
        days: 1,
        morning: true,
        afternoon: true,
        evening: true
      }
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = async (id: string, oldDateTime: string, oldServiceType: string) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        await apiService.admin.deleteAppointment(id, oldDateTime, oldServiceType);
        // Update local state
        setAppointments(appointments.filter(appt => appt._id !== id));
      } catch (error) {
        console.error('Failed to delete appointment:', error);
        alert('Failed to delete appointment. Please try again.');
      }
    }
  };

  // Update handleEditSubmit to handle automatic status updates
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAppointment) return;

    // Debug the current form state
    console.log('Edit form data before submission:', JSON.stringify(editFormData, null, 2));
    console.log('原始预约信息:', JSON.stringify(currentAppointment, null, 2));

    const newDateTime = `${editFormData.date}T${editFormData.time}`;
    const oldDateTime = typeof currentAppointment.date === 'string' 
      ? `${currentAppointment.date.split('T')[0]}T${currentAppointment.time}`
      : `${new Date(currentAppointment.date).toISOString().split('T')[0]}T${currentAppointment.time}`;

    // Check if the appointment time has passed, if so, set status to Completed
    const appointmentDateTime = new Date(`${editFormData.date}T${editFormData.time}`);
    const currentDateTime = new Date();
    
    // Determine status based on date - only Booked or Completed
    let finalStatus: Appointment['status'] = 'Booked';
    if (appointmentDateTime < currentDateTime) {
      finalStatus = 'Completed';
    }

    // Prepare the update data
    const updateData: Partial<Appointment> = {
      date: editFormData.date,
      time: editFormData.time,
      serviceType: editFormData.serviceType,
      notes: editFormData.notes,
      status: finalStatus
    };

    // Handle daycare options - always explicitly update them based on form state
    if (editFormData.hasDaycare) {
      console.log('添加日托选项:', editFormData.dayCareOptions);
      updateData.dayCareOptions = {
        type: editFormData.dayCareOptions.type,
        days: editFormData.dayCareOptions.days,
        morning: editFormData.dayCareOptions.morning,
        afternoon: editFormData.dayCareOptions.afternoon,
        evening: editFormData.dayCareOptions.evening
      };
    } else {
      // Set to null to remove daycare options
      console.log('移除日托选项');
      updateData.dayCareOptions = null;
    }

    console.log('发送到API的更新数据:', JSON.stringify(updateData, null, 2));

    try {
      const updatedAppointment = await apiService.admin.updateAppointment(
        currentAppointment._id || '',
        updateData,
        oldDateTime,
        currentAppointment.serviceType || 'Basic Grooming'
      );

      console.log('更新后的预约信息:', JSON.stringify(updatedAppointment, null, 2));

      // Update local state
      setAppointments(prevAppointments => 
        prevAppointments.map(appt => 
          appt._id === currentAppointment._id ? updatedAppointment : appt
        )
      );

      setIsEditModalOpen(false);
      setCurrentAppointment(null);
      
      // 显示成功消息
      alert('预约更新成功！');
    } catch (error) {
      console.error('更新预约失败:', error);
      alert('更新预约失败，请重试。');
    }
  };

  // Helper function to check if appointment time has passed
  const hasAppointmentTimePassed = (date: string, time: string): boolean => {
    const appointmentDateTime = new Date(`${date}T${time}`);
    const currentDateTime = new Date();
    return appointmentDateTime < currentDateTime;
  };

  // Helper function to render daycare details - simplify to only show type and days
  const renderDayCareDetails = (dayCareOptions: any) => {
    if (!dayCareOptions) return null;
    
    const { type, days } = dayCareOptions;
    
    // Only display daycare if the type and days are valid
    if (!type || !days || days <= 0) {
      return null;
    }
    
    return (
      <div className="mt-1 text-gray-600 text-sm">
        <p>Daycare: {type === 'daily' ? 'Daily' : 'Long Term'} ({days} day{days > 1 ? 's' : ''})</p>
      </div>
    );
  };

  // Handle the daycare checkbox toggle
  const handleDaycareToggle = (checked: boolean) => {
    if (checked) {
      // If enabling daycare, initialize with default options
      setEditFormData({
        ...editFormData,
        hasDaycare: true,
        dayCareOptions: {
          type: 'daily',
          days: 1,
          morning: true,
          afternoon: true,
          evening: true
        }
      });
    } else {
      // If disabling daycare, keep the options but set hasDaycare to false
      setEditFormData({
        ...editFormData,
        hasDaycare: false
      });
    }
  };

  // Helper function to update appointment status
  const updateAppointmentStatus = async (appointmentId: string, oldDateTime: string, serviceType: string) => {
    try {
      await apiService.admin.updateAppointment(
        appointmentId,
        { status: 'Completed' as const },
        oldDateTime,
        serviceType
      );

      // Update local state
      setAppointments(prevAppointments =>
        prevAppointments.map(appt =>
          appt._id === appointmentId
            ? { ...appt, status: 'Completed' as const }
            : appt
        )
      );
    } catch (error) {
      console.error('Failed to update appointment status:', error);
    }
  };

  // Update expired appointments in DB
  const updateExpiredAppointmentsInDB = async (tasks: AppointmentUpdateTask[]) => {
    try {
      await Promise.all(
        tasks.map(task =>
          updateAppointmentStatus(task.id, task.oldDateTime, task.serviceType)
        )
      );
    } catch (error) {
      console.error('Failed to update expired appointments:', error);
    }
  };

  // Add a refresh function that can be called on demand
  const refreshAppointments = async () => {
    setLoading(true);
    try {
      const appointmentsData = await apiService.admin.getAllAppointments();
      
      // Auto-update status of past appointments from Booked to Completed
      const currentDateTime = new Date();
      const needsUpdate: AppointmentUpdateTask[] = [];
      
      const updatedAppointments = appointmentsData.map(appt => {
        // Get appointment date and time
        const apptDate = typeof appt.date === 'string' 
          ? appt.date.split('T')[0] 
          : new Date(appt.date).toISOString().split('T')[0];
        const apptTime = appt.time || '';
        
        // Create Date object for comparison
        const apptDateTime = new Date(`${apptDate}T${apptTime}`);
        
        // If appointment time has passed and status is still Booked, update to Completed
        if (apptDateTime < currentDateTime && appt.status === 'Booked') {
          console.log(`Refresh: Marking appointment ${appt._id} as Completed: ${apptDate} ${apptTime}`);
          
          // Add to list for database update
          needsUpdate.push({
            id: appt._id || '',
            oldDateTime: `${apptDate}T${apptTime}`,
            serviceType: appt.serviceType || 'Basic Grooming'
          });
          
          return { ...appt, status: 'Completed' as const };
        }
        
        return appt;
      });
      
      setAppointments(updatedAppointments);
      
      // Update database for each appointment that needs status change
      if (needsUpdate.length > 0) {
        console.log(`Refresh found ${needsUpdate.length} appointments to update to Completed status`);
        await updateExpiredAppointmentsInDB(needsUpdate);
      } else {
        console.log('No appointments needing status update were found');
      }
    } catch (error) {
      console.error('Failed to refresh appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to get all unique users from appointments
  const getAllUniqueUsers = React.useMemo(() => {
    const usersMap = new Map<string, { name: string; email: string; phone: string; isMember: boolean }>();
    
    // 获取所有users，同时检查每个用户的会员状态
    const userEmails = new Set<string>();
    users.forEach(user => {
      if (user.email) {
        userEmails.add(user.email);
      }
    });
    
    appointments.forEach(appt => {
      if (appt.ownerEmail && !usersMap.has(appt.ownerEmail)) {
        // 检查此用户是否为会员（在users列表中查找）
        const isMember = userEmails.has(appt.ownerEmail);
        
        usersMap.set(appt.ownerEmail, {
          name: appt.ownerName || '',
          email: appt.ownerEmail,
          phone: appt.ownerPhone || '',
          isMember: isMember
        });
      }
    });
    
    // Convert to array and sort
    return Array.from(usersMap.values())
      .sort((a, b) => {
        // First sort by member status (members first)
        if (a.isMember && !b.isMember) return -1;
        if (!a.isMember && b.isMember) return 1;
        
        // Then sort alphabetically by name
        return a.name.localeCompare(b.name);
      });
  }, [appointments, users]);

  // Function to get all appointments in a flat list without grouping by user
  const renderAppointmentList = (appointments: Appointment[]) => {
    if (appointments.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
          No appointments found.
        </div>
      );
    }

    // Group appointments by date
    const appointmentsByDate: Record<string, Appointment[]> = {};
    
    appointments.forEach(appointment => {
      const date = typeof appointment.date === 'string' 
        ? appointment.date.split('T')[0] 
        : new Date(appointment.date).toISOString().split('T')[0];
      
      if (!appointmentsByDate[date]) {
        appointmentsByDate[date] = [];
      }
      
      appointmentsByDate[date].push(appointment);
    });
    
    // Sort each group by time
    Object.values(appointmentsByDate).forEach(group => {
      group.sort((a, b) => a.time.localeCompare(b.time));
    });
    
    // Get sorted dates
    const sortedDates = Object.keys(appointmentsByDate).sort();

    return (
      <div className="space-y-6">
        {sortedDates.map(date => (
          <div key={date} className="space-y-4">
            <h3 className="font-medium text-gray-700 border-b pb-2">
              {formatDate(date)}
            </h3>
            {appointmentsByDate[date].map((appointment) => (
              <div
                key={appointment._id}
                className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm"
              >
                <div className="flex-grow">
                  <div className="flex items-center mb-1">
                    <h4 className="font-semibold">{appointment.serviceType} - {appointment.petName}</h4>
                  </div>
                  <p className="text-gray-700 mb-1">
                    <span className="font-medium">{appointment.ownerName}</span> • {appointment.ownerEmail} • {appointment.ownerPhone}
                  </p>
                  <p className="text-gray-600">
                    {formatTime(appointment.time)}
                  </p>
                  {appointment.dayCareOptions && renderDayCareDetails(appointment.dayCareOptions)}
                  <div className="flex justify-between items-center mt-1">
                    <span
                      className={`inline-block px-2 py-1 text-sm rounded ${
                        getDisplayStatus(appointment) === 'Completed'
                          ? 'bg-green-100 text-green-800'
                          : getDisplayStatus(appointment) === 'Cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {getDisplayStatus(appointment)}
                    </span>
                    <PriceDetailsDropdown appointment={appointment} />
                  </div>
                </div>
                <div className="flex gap-2">
                  {getDisplayStatus(appointment) !== 'Completed' && (
                    <button
                      onClick={() => handleEditClick(appointment)}
                      className="p-2 text-blue-600 hover:text-blue-800"
                    >
                      <Edit size={18} />
                    </button>
                  )}
                  <button
                    onClick={() =>
                      handleDeleteClick(
                        appointment._id || '',
                        `${appointment.date}T${appointment.time}`,
                        appointment.serviceType
                      )
                    }
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Function to render date and time filters for detailed views
  const renderDateTimeFilters = () => {
    return (
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <div className="flex">
            <input
              type="date"
              className="pr-4 py-2 pl-3 border border-gray-300 rounded-l-md w-full cursor-pointer"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              placeholder="Filter by date"
              onClick={(e) => {
                const target = e.target as HTMLInputElement;
                target.showPicker();
              }}
            />
            <button
              onClick={() => setFilterDate('')}
              className="px-2 py-2 bg-gray-200 rounded-r-md hover:bg-gray-300"
              title="Reset date filter"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="relative">
          <div className="flex">
            <input
              type="time"
              className="pr-4 py-2 pl-3 border border-gray-300 rounded-l-md w-full cursor-pointer"
              value={filterTime}
              onChange={(e) => setFilterTime(e.target.value)}
              placeholder="Filter by time"
              onClick={(e) => {
                const target = e.target as HTMLInputElement;
                target.showPicker();
              }}
            />
            <button
              onClick={() => setFilterTime('')}
              className="px-2 py-2 bg-gray-200 rounded-r-md hover:bg-gray-300"
              title="Reset time filter"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Function to filter appointments based on search and date/time filters
  const filterAppointments = (appts: Appointment[]) => {
    return appts.filter(appt => {
      // Search filter
      const searchMatches = !searchTerm || 
        appt.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.ownerPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.serviceType?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Date filter
      const dateMatches = !filterDate || 
        (typeof appt.date === 'string' ? 
          appt.date.split('T')[0] === filterDate : 
          new Date(appt.date).toISOString().split('T')[0] === filterDate);
      
      // Time filter
      const timeMatches = !filterTime || appt.time.startsWith(filterTime);
      
      return searchMatches && dateMatches && timeMatches;
    }).sort((a, b) => {
      // Sort by date first
      const dateA = typeof a.date === 'string' ? new Date(a.date) : new Date(a.date);
      const dateB = typeof b.date === 'string' ? new Date(b.date) : new Date(b.date);
      
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      
      // If dates are the same, sort by time
      return a.time.localeCompare(b.time);
    });
  };

  // Update getPriceDetails function to use groomingServices and dayCareOptions
  const getPriceDetails = (appointment: Appointment) => {
    // Get base price based on service type
    let basePrice = 0;
    let memberDiscount = 0;
    let discountRate = 0;
    
    // Find the matching service in groomingServices
    const service = groomingServices.find(s => s.name === appointment.serviceType);
    if (service) {
      basePrice = service.price;
      discountRate = service.discount;
      // Calculate member discount if applicable
      if (appointment.user) {  // If user exists, it means they are a member
        memberDiscount = (basePrice * discountRate) / 100;
      }
      console.log(`Found service price for ${service.name}: ${service.price}, discount: ${discountRate}%`);
    } else {
      console.warn(`Service not found for type: ${appointment.serviceType}, using default price`);
      // Use default prices and discount rates as fallback
      switch (appointment.serviceType) {
        case 'Basic Grooming':
          basePrice = 70;
          discountRate = 8;
          break;
        case 'Premium Grooming':
        case 'Full Grooming':
          basePrice = 140;
          discountRate = 8;
          break;
        case 'Spa Treatment':
          basePrice = 240;
          discountRate = 10; // Updated to 10% to match the correct rate
          break;
        default:
          basePrice = 0;
          discountRate = 0;
      }
      if (appointment.user) {
        memberDiscount = (basePrice * discountRate) / 100;
      }
    }

    // Calculate daycare price if applicable
    let dayCarePrice = 0;
    if (appointment.dayCareOptions && 
        appointment.dayCareOptions.type && 
        appointment.dayCareOptions.days && 
        appointment.dayCareOptions.days > 0) {
      const { type, days } = appointment.dayCareOptions;
      const dayCareOption = dayCareOptions.find(opt => opt.type === type);
      if (dayCareOption) {
        dayCarePrice = dayCareOption.price * days;
      } else {
        // Fallback to default prices
        if (type === 'daily') {
          dayCarePrice = 50 * days;
        } else if (type === 'longTerm') {
          dayCarePrice = 80 * days;
        }
      }
    }

    // Calculate total
    const totalBeforeDiscount = basePrice + dayCarePrice;
    const totalAfterDiscount = totalBeforeDiscount - memberDiscount;

    return {
      servicePrice: basePrice,
      dayCarePrice,
      memberDiscount,
      totalBeforeDiscount,
      totalPrice: totalAfterDiscount,
      discountRate // Added to help with debugging
    };
  };

  // Add a component for price details dropdown
  const PriceDetailsDropdown: React.FC<{ appointment: Appointment }> = ({ appointment }) => {
    const [isOpen, setIsOpen] = useState(false);
    const priceDetails = getPriceDetails(appointment);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const [showAbove, setShowAbove] = useState(false);
    
    // Function to determine if dropdown should appear above or below
    const calculatePosition = () => {
      if (!dropdownRef.current) return;
      
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 200; // Approximate height of dropdown
      
      setShowAbove(spaceBelow < dropdownHeight);
    };

    // Add click outside listener to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);
    
    // Detect position when opening the dropdown
    useEffect(() => {
      if (isOpen) {
        calculatePosition();
      }
    }, [isOpen]);

    return (
      <div className="relative" ref={dropdownRef}>
        <div 
          className="flex items-center cursor-pointer text-lg font-medium text-green-600 hover:text-green-800"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>RM {priceDetails.totalPrice.toFixed(2)}</span>
          <ChevronDown 
            size={16} 
            className={`ml-1 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} 
          />
        </div>
        
        {isOpen && (
          <div 
            className={`absolute ${showAbove ? 'bottom-full' : 'top-full'} right-0 ${showAbove ? 'mb-1' : 'mt-1'} bg-white shadow-lg rounded-lg p-4 z-50 min-w-[250px]`}
            style={{ maxHeight: '300px', overflowY: 'auto' }}
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-lg font-semibold">Price Details</h4>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Price details */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Service Price:</span>
                <span>RM {priceDetails.servicePrice.toFixed(2)}</span>
              </div>
              
              {priceDetails.dayCarePrice > 0 && appointment.dayCareOptions && (
                <div className="flex justify-between">
                  <span>Day Care ({appointment.dayCareOptions.type === 'daily' ? 'Daily' : 'Long Term'} - {appointment.dayCareOptions.days} day{appointment.dayCareOptions.days > 1 ? 's' : ''}):</span>
                  <span>RM {priceDetails.dayCarePrice.toFixed(2)}</span>
                </div>
              )}
              
              {priceDetails.memberDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Member Discount ({priceDetails.discountRate}%):</span>
                  <span>-RM {priceDetails.memberDiscount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>RM {priceDetails.totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Function to render the appropriate content based on activeView
  const renderContent = (): ReactNode => {
    switch (activeView) {
      case 'users':
        return (
          <div className="space-y-6">
            <div className="flex items-center mb-4">
              <button 
                onClick={() => setActiveView('dashboard')}
                className="mr-3 text-gray-600 hover:text-gray-900"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-xl font-bold">All Users ({getAllUniqueUsers.length})</h2>
            </div>
            {getAllUniqueUsers.map(user => (
              <div key={user.email} className="bg-white rounded-lg shadow-md p-6">
                {user.isMember && (
                  <div className="mb-1">
                    <span className="bg-pink-100 text-pink-600 text-sm font-medium px-3 py-1 rounded-full">
                      Member
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{user.name}</h3>
                <p className="text-gray-600">{user.email}</p>
                <p className="text-gray-600">{user.phone}</p>
              </div>
            ))}
          </div>
        );
      
      case 'all-appointments':
        return (
          <div className="space-y-6">
            <div className="flex items-center mb-4">
              <button 
                onClick={() => setActiveView('dashboard')}
                className="mr-3 text-gray-600 hover:text-gray-900"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-xl font-bold">All Appointments ({totalAppointments})</h2>
            </div>
            {renderDateTimeFilters()}
            {renderAppointmentList(filterAppointments(appointments))}
          </div>
        );
      
      case 'upcoming':
        const upcomingAppointmentsList = appointments.filter(appt => getDisplayStatus(appt) === 'Upcoming');
        return (
          <div className="space-y-6">
            <div className="flex items-center mb-4">
              <button 
                onClick={() => setActiveView('dashboard')}
                className="mr-3 text-gray-600 hover:text-gray-900"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-xl font-bold">Upcoming Appointments ({upcomingAppointmentsList.length})</h2>
            </div>
            {renderDateTimeFilters()}
            {renderAppointmentList(filterAppointments(upcomingAppointmentsList))}
          </div>
        );
      
      case 'completed':
        const completedAppointmentsList = appointments.filter(appt => getDisplayStatus(appt) === 'Completed');
        return (
          <div className="space-y-6">
            <div className="flex items-center mb-4">
              <button 
                onClick={() => setActiveView('dashboard')}
                className="mr-3 text-gray-600 hover:text-gray-900"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-xl font-bold">Completed Appointments ({completedAppointmentsList.length})</h2>
            </div>
            {renderDateTimeFilters()}
            {renderAppointmentList(filterAppointments(completedAppointmentsList))}
          </div>
        );
      
      case 'pet-listings':
        return <PetListingsManager />;
      
      case 'services':
        return <ServiceManagement />;
      
      default:
        return (
          <>
            {/* Stats Cards - 移动端为单列，桌面版为四列 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-5 md:mb-8">
              <div 
                className="bg-white p-4 md:p-6 rounded-xl shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50"
                onClick={() => setActiveView('users')}
              >
                <div>
                  <p className="text-gray-500">Total Users</p>
                  <h2 className="text-3xl font-bold">{totalUsers}</h2>
                </div>
                <div className="bg-pink-100 p-3 rounded-full">
                  <Users className="text-pink-600" size={24} />
                </div>
              </div>

              <div 
                className="bg-white p-4 md:p-6 rounded-xl shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50"
                onClick={() => setActiveView('all-appointments')}
              >
                <div>
                  <p className="text-gray-500">Total Appointments</p>
                  <h2 className="text-3xl font-bold">{totalAppointments}</h2>
                  <p className="text-sm font-medium text-green-600 mt-2">
                    Total Income: RM {appointments
                      .reduce((sum, appt) => sum + (appt.totalPrice || 0), 0)
                      .toFixed(2)}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <Calendar className="text-purple-600" size={24} />
                </div>
              </div>

              <div 
                className="bg-white p-4 md:p-6 rounded-xl shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50"
                onClick={() => setActiveView('upcoming')}
              >
                <div>
                  <p className="text-gray-500">Upcoming</p>
                  <h2 className="text-3xl font-bold">{upcomingAppointments}</h2>
                  <p className="text-sm font-medium text-green-600 mt-2">
                    Expected Income: RM {appointments
                      .filter(appt => getDisplayStatus(appt) === 'Upcoming')
                      .reduce((sum, appt) => sum + (appt.totalPrice || 0), 0)
                      .toFixed(2)}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Clock className="text-blue-600" size={24} />
                </div>
              </div>

              <div 
                className="bg-white p-4 md:p-6 rounded-xl shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50"
                onClick={() => setActiveView('completed')}
              >
                <div>
                  <p className="text-gray-500">Completed</p>
                  <h2 className="text-3xl font-bold">{completedAppointments}</h2>
                  <p className="text-sm font-medium text-green-600 mt-2">
                    Received Income: RM {appointments
                      .filter(appt => getDisplayStatus(appt) === 'Completed')
                      .reduce((sum, appt) => sum + (appt.totalPrice || 0), 0)
                      .toFixed(2)}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="text-green-600" size={24} />
                </div>
              </div>
            </div>

            {/* Search, Filter, and Member List - 改进移动端布局 */}
            <div className="flex flex-col md:flex-row gap-3 mb-5 md:mb-6">
              <div className="relative flex-grow md:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-col md:flex-row gap-2 md:gap-4">
              <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 md:hidden" size={20} />
                <select
                    className="pl-10 md:pl-4 pr-4 py-2 border border-gray-300 rounded-md appearance-none bg-white w-[180px]"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option>All Status</option>
                  <option>Upcoming</option>
                  <option>Completed</option>
                </select>
              </div>
              <div className="relative">
                <div className="flex">
                  <input
                    type="date"
                      className="pr-8 py-2 pl-3 border border-gray-300 rounded-l-md w-[180px] cursor-pointer"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                      placeholder="mm/dd/yyyy"
                    onClick={(e) => {
                      const target = e.target as HTMLInputElement;
                      target.showPicker();
                    }}
                  />
                  <button
                    onClick={() => setFilterDate('')}
                      className="px-2 py-2 bg-gray-100 border-y border-r border-gray-300 rounded-r-md hover:bg-gray-200"
                    title="Reset date filter"
                  >
                      <X size={16} className="text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="relative">
                <div className="flex">
                  <input
                    type="time"
                      className="pr-8 py-2 pl-3 border border-gray-300 rounded-l-md w-[180px] cursor-pointer"
                    value={filterTime}
                    onChange={(e) => setFilterTime(e.target.value)}
                      placeholder="--:-- --"
                    onClick={(e) => {
                      const target = e.target as HTMLInputElement;
                      target.showPicker();
                    }}
                  />
                  <button
                    onClick={() => setFilterTime('')}
                      className="px-2 py-2 bg-gray-100 border-y border-r border-gray-300 rounded-r-md hover:bg-gray-200"
                    title="Reset time filter"
                  >
                      <X size={16} className="text-gray-500" />
                  </button>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <>
                {/* Member list with pagination - 调整移动端布局 */}
                <div className="space-y-4 md:space-y-6">
                  {filteredMembers
                    .slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage)
                    .map((item) => {
                      // Filter appointments based on selected filter
                      const filteredAppointments = item.appointments.filter(appt => {
                        // Status filter
                        const statusMatches = filterStatus === 'All Status' || 
                          (filterStatus === 'Upcoming' && getDisplayStatus(appt) === 'Upcoming') ||
                          (filterStatus === 'Completed' && getDisplayStatus(appt) === 'Completed');
                        
                        // Date filter
                        const dateMatches = !filterDate || 
                          (typeof appt.date === 'string' ? 
                            appt.date.split('T')[0] === filterDate : 
                            new Date(appt.date).toISOString().split('T')[0] === filterDate);
                        
                        // Time filter
                        const timeMatches = !filterTime || appt.time.startsWith(filterTime);
                        
                        return statusMatches && dateMatches && timeMatches;
                      });
                      
                      // If no appointments match the filter, don't show this member
                      if (filteredAppointments.length === 0) return null;
                      
                      // 检查此用户是否为会员
                      const isMember = users.some(user => user.email === item.member.email);
                      
                      return (
                        <div key={item.member.email} className="bg-white rounded-lg shadow-md p-4 md:p-6">
                          <div className="flex flex-col md:grid md:grid-cols-3 md:gap-4">
                            {/* Member info */}
                            <div className="mb-3 md:mb-0 md:col-span-1">
                              <div className="flex flex-col md:flex-col">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="text-lg md:text-xl font-semibold text-gray-800">{item.member.name}</h3>
                              {isMember && (
                                  <span className="bg-pink-100 text-pink-600 text-sm font-medium px-3 py-1 rounded-full">
                                    Member
                                  </span>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <p className="text-gray-600 text-sm">{item.member.email}</p>
                                  <p className="text-gray-600 text-sm">{item.member.phone}</p>
                                </div>
                              </div>
                            </div>

                            {/* Appointments with scroll */}
                            <div className="md:col-span-2">
                              <div className="max-h-[300px] overflow-y-auto pr-2 md:pr-4 custom-scrollbar">
                                <div className="space-y-3 md:space-y-4">
                                  {filteredAppointments.map((appointment) => (
                                    <div
                                      key={appointment._id}
                                      className="bg-gray-50 p-3 md:p-4 rounded-lg"
                                    >
                                      <div className="flex justify-between items-start">
                                      <div className="flex-grow">
                                          <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-base font-medium text-gray-900">
                                              {appointment.serviceType} - {appointment.petName}
                                            </h4>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                {appointment.petType === 'dog' ? '🐕 Dog' : '🐱 Cat'}
                                              </span>
                                          </div>
                                          <p className="text-gray-600 text-sm">
                                          {formatDate(appointment.date)} at {formatTime(appointment.time)}
                                        </p>
                                          {appointment.dayCareOptions && (
                                            <p className="text-gray-600 text-sm">
                                              Daycare: {appointment.dayCareOptions.type === 'longTerm' ? 'Long Term' : 'Daily'} ({appointment.dayCareOptions.days} days)
                                            </p>
                                          )}
                                          <div className="flex justify-between items-center mt-2">
                                          <span
                                              className={`inline-block px-2 py-1 text-xs rounded ${
                                                getDisplayStatus(appointment) === 'Upcoming'
                                                  ? 'bg-blue-100 text-blue-700'
                                                  : getDisplayStatus(appointment) === 'Completed'
                                                  ? 'bg-green-100 text-green-700'
                                                  : 'bg-gray-100 text-gray-700'
                                            }`}
                                          >
                                            {getDisplayStatus(appointment)}
                                          </span>
                                            <div className="flex items-center gap-4">
                                          <PriceDetailsDropdown appointment={appointment} />
                                          <button
                                                onClick={() => handleDeleteClick(
                                              appointment._id || '',
                                              `${appointment.date}T${appointment.time}`,
                                                  appointment.serviceType || ''
                                                )}
                                                className="text-red-500 hover:text-red-700"
                                                title="Delete appointment"
                                        >
                                          <Trash2 size={18} />
                                        </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* 分页控制 */}
                {Math.ceil(filteredMembers.length / usersPerPage) > 1 && (
                <div className="mt-6 flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Showing {Math.min((currentPage - 1) * usersPerPage + 1, filteredMembers.length)} to{' '}
                    {Math.min(currentPage * usersPerPage, filteredMembers.length)} of {filteredMembers.length} results
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`p-2 rounded ${
                        currentPage === 1
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredMembers.length / usersPerPage), p + 1))}
                      disabled={currentPage >= Math.ceil(filteredMembers.length / usersPerPage)}
                      className={`p-2 rounded ${
                        currentPage >= Math.ceil(filteredMembers.length / usersPerPage)
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
                )}
              </>
            )}
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center">
          <div className="flex items-center text-blue-600">
            <Users className="h-6 w-6 mr-2" />
            <h1 className="text-xl font-bold">Admin Portal</h1>
          </div>
          <button 
            onClick={logout}
            className="ml-auto p-2 text-red-500 rounded-full hover:bg-red-50 transition-colors" 
            title="Logout"
          >
            <LogOut className="h-6 w-6" />
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 sm:py-8">
        {/* Tabs for different views */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex justify-between md:justify-start overflow-x-auto max-w-sm md:max-w-none mx-auto md:mx-0" aria-label="Tabs">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`flex-1 md:flex-none text-center md:text-left py-4 md:py-2 md:px-6 ${
                activeView === 'dashboard'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col md:flex-row items-center">
                <Users className="h-5 w-5 mb-1 md:mb-0 md:mr-2" />
                <span className="text-sm md:text-base whitespace-nowrap">
                  <span className="hidden md:inline">Members & </span>
                  <span className="md:hidden">Members &</span>
                  <span>Appointments</span>
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveView('services')}
              className={`flex-1 md:flex-none text-center md:text-left py-4 md:py-2 md:px-6 ${
                activeView === 'services'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col md:flex-row items-center">
                <Scissors className="h-5 w-5 mb-1 md:mb-0 md:mr-2" />
                <span className="text-sm md:text-base whitespace-nowrap">
                  <span className="hidden md:inline">Services Management</span>
                  <span className="md:hidden">Services</span>
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveView('pet-listings')}
              className={`flex-1 md:flex-none text-center md:text-left py-4 md:py-2 md:px-6 ${
                activeView === 'pet-listings'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col md:flex-row items-center">
                <Dog className="h-5 w-5 mb-1 md:mb-0 md:mr-2" />
                <span className="text-sm md:text-base whitespace-nowrap">
                  <span className="hidden md:inline">Pet Listings</span>
                  <span className="md:hidden">Pet</span>
                </span>
              </div>
            </button>
          </nav>
        </div>

        {/* Content area */}
        <div className="max-w-7xl mx-auto">
          {activeView === 'pet-listings' ? (
            <PetListingsManager />
          ) : activeView === 'services' ? (
            <ServiceManagement />
          ) : (
            renderContent()
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Edit Appointment</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  <input
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                    className="w-full p-2 pl-10 border rounded cursor-pointer"
                    required
                    onClick={(e) => {
                      // Force open the date picker
                      const target = e.target as HTMLInputElement;
                      target.showPicker();
                    }}
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  <input
                    type="time"
                    value={editFormData.time}
                    onChange={(e) => setEditFormData({...editFormData, time: e.target.value})}
                    className="w-full p-2 pl-10 border rounded cursor-pointer"
                    required
                    onClick={(e) => {
                      // Force open the time picker
                      const target = e.target as HTMLInputElement;
                      target.showPicker();
                    }}
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Service Type</label>
                <select
                  value={editFormData.serviceType || ''}
                  onChange={(e) => setEditFormData({...editFormData, serviceType: e.target.value as Appointment['serviceType']})}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="Basic Grooming">Basic Grooming</option>
                  <option value="Full Grooming">Full Grooming</option>
                  <option value="Spa Treatment">Spa Treatment</option>
                  <option value="Premium Grooming">Premium Grooming</option>
                </select>
              </div>
              <div className="mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hasDaycare"
                    checked={editFormData.hasDaycare}
                    onChange={(e) => handleDaycareToggle(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="hasDaycare" className="font-medium text-gray-700">Add Daycare Service</label>
                </div>
              </div>
              {/* Daycare Options */}
              {editFormData.hasDaycare && (
                <div className="mb-3 p-3 border border-gray-200 rounded bg-gray-50">
                  <h4 className="font-medium mb-2">日托选项</h4>
                  
                  {/* Daycare Type */}
                  <div className="mb-3">
                    <label className="block text-gray-700 mb-1">类型</label>
                    <select
                      value={editFormData.dayCareOptions?.type || 'daily'}
                      onChange={handleDayCareTypeChange}
                      className="w-full p-2 border rounded"
                    >
                      <option value="daily">每日 (Daily)</option>
                      <option value="longTerm">长期 (Long Term)</option>
                    </select>
                  </div>
                  
                  {/* Number of Days - Show for longTerm only */}
                  {editFormData.dayCareOptions?.type === 'longTerm' && (
                    <div className="mb-3">
                      <label className="block text-gray-700 mb-1">天数</label>
                      <input
                        type="number"
                        value={editFormData.dayCareOptions?.days || 1}
                        onChange={handleDayCareDaysChange}
                        className="w-full p-2 border rounded"
                        min={2}
                      />
                      {editFormData.dayCareOptions?.days < 2 && editFormData.dayCareOptions?.type === 'longTerm' && (
                        <p className="text-sm text-red-500">长期选项至少需要2天</p>
                      )}
                    </div>
                  )}
                  
                  {/* Time slots (hidden but preserved for data integrity) */}
                  <input type="hidden" name="morning" value={editFormData.dayCareOptions?.morning ? 'true' : 'false'} />
                  <input type="hidden" name="afternoon" value={editFormData.dayCareOptions?.afternoon ? 'true' : 'false'} />
                  <input type="hidden" name="evening" value={editFormData.dayCareOptions?.evening ? 'true' : 'false'} />
                </div>
              )}
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Status</label>
                {hasAppointmentTimePassed(editFormData.date, editFormData.time) ? (
                  // If appointment time has passed, show static "Completed" status
                  <div className="p-2 bg-green-100 text-green-700 rounded border border-green-200">
                    Appointment time has passed. Status will be set to "Completed".
                  </div>
                ) : (
                  // Otherwise, only show Upcoming option (Booked)
                  <div className="p-2 bg-blue-100 text-blue-700 rounded border border-blue-200">
                    Upcoming appointment
                  </div>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                  className="w-full p-2 border rounded"
                  rows={3}
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ServiceManagement: React.FC = () => {
  const [groomingServices, setGroomingServices] = useState<GroomingService[]>([]);
  const [dayCareOptions, setDayCareOptions] = useState<DayCareOption[]>([]);
  const [editingService, setEditingService] = useState<GroomingService | null>(null);
  const [editingDayCare, setEditingDayCare] = useState<DayCareOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{id: string, type: 'service' | 'daycare'} | null>(null);

  // 改进服务数据获取函数，添加错误处理
  useEffect(() => {
    // Add an async function to fetch services data
    const fetchServicesData = async () => {
      try {
        const servicesResponse = await apiService.services.getGroomingServices();
        console.log("Fetched grooming services:", servicesResponse);
        if (Array.isArray(servicesResponse)) {
          setGroomingServices(servicesResponse as GroomingService[]);
        }
        
        const optionsResponse = await apiService.services.getDayCareOptions();
        console.log("Fetched daycare options:", optionsResponse);
        if (Array.isArray(optionsResponse)) {
          setDayCareOptions(optionsResponse as DayCareOption[]);
        }
      } catch (error) {
        console.error("Failed to fetch services data:", error);
      }
    };

    // Call the function
    fetchServicesData();
    
    // Existing code...
  }, []);

  // 处理美容服务更新，添加更多日志
  const handleUpdateGroomingService = async (service: GroomingService) => {
    try {
      setLoading(true);
      console.log('Updating grooming service:', service);
      
      // 判断是否是新服务
      const isNewService = service.id.startsWith('new-');
      console.log('Is new service:', isNewService);
      
      // 确保displayPrice和displayDuration正确设置
      const hours = Math.floor(service.duration / 60);
      const hourWord = hours === 1 ? 'hour' : 'hours';
      
      const serviceToUpdate = {
        ...service,
        displayPrice: `RM ${service.price.toFixed(2)}`,
        displayDuration: `${hours} ${hourWord}`
      };
      
      console.log('Service to update:', serviceToUpdate);
      
      // 打印授权信息
      const token = localStorage.getItem('token');
      console.log('Auth token exists:', !!token);
      
      try {
        const updatedService = await apiService.admin.updateGroomingService(serviceToUpdate);
        console.log('Service update response:', updatedService);
        
        // 更新本地状态
        if (isNewService) {
          setGroomingServices((prevServices) => [...prevServices, updatedService]);
          setSuccessMessage("New grooming service created successfully");
        } else {
          setGroomingServices((prevServices) => 
            prevServices.map((s) => s.id === updatedService.id ? updatedService : s)
          );
          setSuccessMessage("Grooming service updated successfully");
        }
        
        setEditingService(null);
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (apiError: any) {
        console.error("API error details:", apiError);
        if (apiError.response) {
          console.error("Response status:", apiError.response.status);
          console.error("Response data:", apiError.response.data);
          
          if (apiError.response.status === 401) {
            setErrorMessage("You are not authorized to update services. Please log in as an admin.");
            return;
          }
        }
        throw apiError;
      }
    } catch (error: any) {
      console.error("Failed to update grooming service:", error);
      const errorMsg = error.response?.data?.message || "Failed to update grooming service. Please try again.";
      const isNewService = service.id.startsWith('new-');
      setErrorMessage(isNewService ? `Failed to create grooming service: ${errorMsg}` : `Failed to update grooming service: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // 处理日托选项更新
  const handleUpdateDayCareOption = async (option: DayCareOption) => {
    try {
      setLoading(true);
      
      // 判断是否是新选项
      const isNewOption = option.type === 'new-option';
      
      // 确保displayPrice正确设置
      const optionToUpdate = {
        ...option,
        displayPrice: `RM ${option.price.toFixed(2)}`
      };
      
      const updatedOption = await apiService.admin.updateDayCareOption(optionToUpdate);
      
      // 更新本地状态
      if (isNewOption) {
        setDayCareOptions(prevOptions => [...prevOptions, updatedOption]);
        setSuccessMessage("New day care option created successfully");
      } else {
        setDayCareOptions(prevOptions => 
          prevOptions.map(o => o.type === updatedOption.type ? updatedOption : o)
        );
        setSuccessMessage("Day care option updated successfully");
      }
      
      setEditingDayCare(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Failed to update day care option:", error);
      const isNewOption = option.type === 'new-option';
      setErrorMessage(isNewOption ? "Failed to create day care option. Please try again." : "Failed to update day care option. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 美容服务编辑表单
  const renderGroomingServiceForm = () => {
    if (!editingService) return null;
    
    const isNewService = editingService.id.startsWith('new-');
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-bold mb-4">{isNewService ? 'Add New Service' : 'Edit Grooming Service'}</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleUpdateGroomingService(editingService);
          }}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">Name</label>
              <input 
                type="text" 
                value={editingService.name} 
                onChange={(e) => setEditingService({...editingService, name: e.target.value})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">Description</label>
              <textarea
                value={editingService.description}
                onChange={(e) => setEditingService({...editingService, description: e.target.value})}
                className="w-full p-2 border rounded"
                rows={3}
                required
              ></textarea>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">Price (RM)</label>
              <input 
                type="number" 
                value={editingService.price} 
                onChange={(e) => setEditingService({...editingService, price: Number(e.target.value)})}
                className="w-full p-2 border rounded"
                min="0"
                step="0.01"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">Duration (hours)</label>
              <input 
                type="number" 
                value={editingService.duration} 
                onChange={(e) => {
                  const hours = Number(e.target.value) || 0;
                  setEditingService({...editingService, duration: hours});
                }}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">Member Discount (%)</label>
              <input 
                type="number" 
                value={editingService.discount} 
                onChange={(e) => setEditingService({...editingService, discount: Number(e.target.value)})}
                className="w-full p-2 border rounded"
                min="0"
                max="100"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">Features</label>
              {editingService.features && editingService.features.map((feature: { text: string }, index: number) => (
                <div key={index} className="flex mb-2">
                  <input 
                    type="text" 
                    value={feature.text} 
                    onChange={(e) => {
                      const newFeatures = [...editingService.features];
                      newFeatures[index] = { text: e.target.value };
                      setEditingService({...editingService, features: newFeatures});
                    }}
                    className="w-full p-2 border rounded"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const newFeatures = editingService.features.filter((_: { text: string }, i: number) => i !== index);
                      setEditingService({...editingService, features: newFeatures});
                    }}
                    className="ml-2 p-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              <button 
                type="button"
                onClick={() => {
                  const newFeatures = [...editingService.features, { text: '' }];
                  setEditingService({...editingService, features: newFeatures});
                }}
                className="mt-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
              >
                Add Feature
              </button>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="recommended"
                  checked={editingService.recommended}
                  onChange={(e) => setEditingService({...editingService, recommended: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="recommended" className="text-gray-700">Recommended</label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {isNewService ? 'Create Service' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // 日托选项编辑表单
  const renderDayCareOptionForm = () => {
    if (!editingDayCare) return null;
    
    const isNewOption = editingDayCare.type === 'new-option';
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-xl font-bold mb-4">{isNewOption ? 'Add New Day Care Option' : 'Edit Day Care Option'}</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleUpdateDayCareOption(editingDayCare);
          }}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">Type</label>
              {isNewOption ? (
                <input 
                  type="text" 
                  value={editingDayCare.type === 'new-option' ? '' : editingDayCare.type} 
                  onChange={(e) => setEditingDayCare({...editingDayCare, type: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="e.g. weekend, holiday"
                  required
                />
              ) : (
                <input 
                  type="text" 
                  value={editingDayCare.type} 
                  className="w-full p-2 border rounded bg-gray-100"
                  disabled
                />
              )}
              {!isNewOption && (
                <p className="text-xs text-gray-500 mt-1">Type cannot be changed</p>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">Description</label>
              <textarea
                value={editingDayCare.description}
                onChange={(e) => setEditingDayCare({...editingDayCare, description: e.target.value})}
                className="w-full p-2 border rounded"
                rows={3}
                required
              ></textarea>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">Price per Day (RM)</label>
              <input 
                type="number" 
                value={editingDayCare.price} 
                onChange={(e) => setEditingDayCare({...editingDayCare, price: Number(e.target.value)})}
                className="w-full p-2 border rounded"
                min="0"
                step="0.01"
                required
              />
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setEditingDayCare(null)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {isNewOption ? 'Create Option' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // 处理美容服务删除
  const handleDeleteGroomingService = async (serviceId: string) => {
    try {
      setLoading(true);
      console.log('Deleting grooming service with ID:', serviceId);
      
      // 调用API删除服务
      await apiService.admin.deleteGroomingService(serviceId);
      
      // 从本地状态移除该服务
      setGroomingServices(prevServices => prevServices.filter(service => service.id !== serviceId));
      setSuccessMessage("Grooming service deleted successfully");
      setShowDeleteConfirm(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Failed to delete grooming service:", error);
      setErrorMessage("Failed to delete grooming service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 处理日托选项删除
  const handleDeleteDayCareOption = async (optionType: string) => {
    try {
      setLoading(true);
      console.log('Deleting day care option with type:', optionType);
      
      // 调用API删除日托选项
      await apiService.admin.deleteDayCareOption(optionType);
      
      // 从本地状态移除该选项
      setDayCareOptions(prevOptions => prevOptions.filter(option => option.type !== optionType));
      setSuccessMessage("Day care option deleted successfully");
      setShowDeleteConfirm(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Failed to delete day care option:", error);
      setErrorMessage("Failed to delete day care option. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 删除确认对话框
  const renderDeleteConfirmDialog = () => {
    if (!showDeleteConfirm) return null;
    
    const isService = showDeleteConfirm.type === 'service';
    const itemName = isService 
      ? groomingServices.find(s => s.id === showDeleteConfirm.id)?.name || 'this service'
      : dayCareOptions.find(o => o.type === showDeleteConfirm.id)?.type || 'this option';
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
          <p className="mb-6">Are you sure you want to delete {itemName}? This action cannot be undone.</p>
          
          <div className="flex justify-end space-x-3">
            <button 
              onClick={() => setShowDeleteConfirm(null)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                if (isService) {
                  handleDeleteGroomingService(showDeleteConfirm.id);
                } else {
                  handleDeleteDayCareOption(showDeleteConfirm.id);
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {errorMessage}
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Grooming Services</h2>
      <button 
          className="md:px-4 md:py-2 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
        onClick={() => setEditingService({
          id: `new-${Date.now()}`,
          name: '',
          description: '',
          price: 0,
          duration: 60,
          discount: 0,
          features: [{ text: '' }]
        })}
      >
          <Plus size={18} className="md:mr-1" /> 
          <span className="hidden md:inline">Add New Service</span>
      </button>
      </div>
      
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto mb-12 bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="text-left p-4">NAME</th>
              <th className="text-left p-4">PRICE</th>
              <th className="text-left p-4">DURATION</th>
              <th className="text-left p-4">DISCOUNT</th>
              <th className="text-left p-4">RECOMMENDED</th>
              <th className="text-left p-4">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {groomingServices.map(service => (
              <tr key={service.id} className="border-b">
                <td className="p-4">
                  <div className="font-medium">{service.name}</div>
                  <div className="text-sm text-gray-500">{service.description}</div>
                </td>
                <td className="p-4">{service.displayPrice || `RM ${service.price.toFixed(2)}`}</td>
                <td className="p-4">{service.displayDuration || `${Math.floor(service.duration / 60)} hour(s)`}</td>
                <td className="p-4">{service.discount}%</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${service.recommended ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {service.recommended ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <button 
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => setEditingService(service)}
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      className="text-red-600 hover:text-red-800"
                      onClick={() => setShowDeleteConfirm({id: service.id, type: 'service'})}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {groomingServices.map(service => (
          <div key={service.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4">
              {/* Service Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{service.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                </div>
                <div className="flex items-center space-x-2">
      <button 
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => setEditingService(service)}
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    className="text-red-600 hover:text-red-800"
                    onClick={() => setShowDeleteConfirm({id: service.id, type: 'service'})}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Service Details */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs text-gray-500">Price</p>
                  <p className="text-sm font-medium">{service.displayPrice || `RM ${service.price.toFixed(2)}`}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="text-sm font-medium">{service.displayDuration || `${Math.floor(service.duration / 60)} hour(s)`}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Discount</p>
                  <p className="text-sm font-medium">{service.discount}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Recommended</p>
                  <span className={`inline-flex px-2 py-1 mt-1 rounded-full text-xs font-medium ${
                    service.recommended ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {service.recommended ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between items-center mb-6 mt-12">
        <h2 className="text-2xl font-bold">Day Care Options</h2>
        <button 
          className="md:px-4 md:py-2 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
        onClick={() => setEditingDayCare({
          type: 'new-option',
          description: '',
          price: 0,
          displayPrice: ''
        })}
      >
          <Plus size={18} className="md:mr-1" /> 
          <span className="hidden md:inline">Add New Option</span>
      </button>
      </div>
      
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="text-left p-4">TYPE</th>
              <th className="text-left p-4">DESCRIPTION</th>
              <th className="text-left p-4">PRICE PER DAY</th>
              <th className="text-left p-4">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {dayCareOptions.map(option => (
              <tr key={option.type} className="border-b">
                <td className="p-4">{option.type}</td>
                <td className="p-4">{option.description}</td>
                <td className="p-4">{option.displayPrice || `RM ${option.price.toFixed(2)}`}</td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <button 
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => setEditingDayCare(option)}
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      className="text-red-600 hover:text-red-800"
                      onClick={() => setShowDeleteConfirm({id: option.type, type: 'daycare'})}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {dayCareOptions.map(option => (
          <div key={option.type} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4">
              {/* Option Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{option.type}</h3>
                  <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => setEditingDayCare(option)}
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    className="text-red-600 hover:text-red-800"
                    onClick={() => setShowDeleteConfirm({id: option.type, type: 'daycare'})}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Option Details */}
              <div className="mt-4">
                <p className="text-xs text-gray-500">Price per Day</p>
                <p className="text-sm font-medium mt-1">{option.displayPrice || `RM ${option.price.toFixed(2)}`}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {editingService && renderGroomingServiceForm()}
      {editingDayCare && renderDayCareOptionForm()}
      {renderDeleteConfirmDialog()}
    </div>
  );
};

export default AdminPortal; 