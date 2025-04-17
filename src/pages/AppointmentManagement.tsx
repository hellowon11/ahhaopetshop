import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Scissors, Dog, Cat, ChevronLeft, User, Home, Bath, Sparkles, Trash2, Edit2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { Appointment } from '../types';
import { convertToMalaysiaTime, formatDateTimeForDisplay } from '../utils/dateUtils';

interface ExtendedAppointment extends Omit<Appointment, 'service' | 'dayCareOptions'> {
  petName: string;
  petType: string;
  time: string;
  service: string;
  serviceType?: 'Basic Grooming' | 'Full Grooming' | 'Spa Treatment';
  dayCareOptions?: {
    type: 'daily' | 'longTerm';
    days: number;
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
  };
  totalPrice: number;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
}

const AppointmentManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<ExtendedAppointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<ExtendedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchTime, setSearchTime] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<ExtendedAppointment | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ExtendedAppointment>>({
    petName: '',
    service: '',
    date: '',
    time: '',
    dayCareOptions: {
      type: 'daily',
      days: 1,
      morning: false,
      afternoon: false,
      evening: false
    },
    notes: ''
  });
  const [availableTimeSlots, setAvailableTimeSlots] = useState<Array<{ time: string; currentBookings: number }>>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [expandedPriceDetails, setExpandedPriceDetails] = useState<Record<string, boolean>>({});

  // Add price calculation functions
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

  const calculateDayCarePrice = (dayCareOptions?: { type: 'daily' | 'longTerm'; days: number; morning?: boolean; afternoon?: boolean; evening?: boolean }): number => {
    if (!dayCareOptions || 
        !dayCareOptions.type || 
        !dayCareOptions.days || 
        dayCareOptions.days <= 0 ||
        !(dayCareOptions.morning || dayCareOptions.afternoon || dayCareOptions.evening)) {
      return 0;
    }
    
    const dailyRate = dayCareOptions.type === 'daily' ? 50 : 80;
    return dailyRate * dayCareOptions.days;
  };

  const calculateTotalPrice = (serviceType: string, dayCareOptions?: { type: 'daily' | 'longTerm'; days: number; morning?: boolean; afternoon?: boolean; evening?: boolean }): number => {
    let total = calculateBasePrice(serviceType);
    
    // Add day care cost if applicable
    const dayCarePrice = calculateDayCarePrice(dayCareOptions);
    total += dayCarePrice;
    
    // Apply member discounts ONLY to grooming services (not daycare)
    if (user) {
      // Calculate base grooming price without daycare
      const baseGroomingPrice = calculateBasePrice(serviceType);
      
      // Apply discount only to the grooming portion
      let discountedGroomingPrice = baseGroomingPrice;
      if (serviceType === 'Spa Treatment') {
        discountedGroomingPrice = baseGroomingPrice * 0.9; // 10% discount for spa
      } else if (serviceType === 'Basic Grooming' || serviceType === 'Full Grooming') {
        discountedGroomingPrice = baseGroomingPrice * 0.92; // 8% discount for basic and full grooming
      }
      
      // Total is discounted grooming price + full daycare price
      total = discountedGroomingPrice + dayCarePrice;
    }

    return Math.round(total * 100) / 100; // Round to 2 decimal places
  };

  // Update the getAvailableTimesByService function
  const getAvailableTimesByService = (service: string) => {
    const allTimeSlots = [
      '10:00', '11:00', '12:00', '13:00', '14:00',
      '15:00', '16:00', '17:00', '18:00', '19:00',
      '20:00', '21:00'
    ];

    switch (service) {
      case 'Spa Treatment':
        // Spa Treatment: Available from 10 AM to 6 PM (4-hour service)
        return allTimeSlots.filter(time => {
          const hour = parseInt(time.split(':')[0]);
          return hour >= 10 && hour <= 18;
        });
      case 'Full Grooming':
        // Full Grooming: Not available in last 3 hours (until 7 PM)
        return allTimeSlots.filter(time => {
          const hour = parseInt(time.split(':')[0]);
          return hour >= 10 && hour <= 19;
        });
      case 'Basic Grooming':
      default:
        // Basic Grooming: Available all hours
        return allTimeSlots;
    }
  };

  // 获取用户的所有预约
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await apiService.appointments.getAll();
        console.log('Raw appointments from API:', response); // Debug log

        // Convert appointments data to match the extended interface
        const extendedAppointments: ExtendedAppointment[] = response
          .filter(apt => apt.status === 'Completed') // Only keep completed appointments
          .map(apt => {
          // Debug log for each appointment
          console.log('Processing appointment:', {
            id: apt._id,
            originalService: apt.serviceType,
            status: apt.status
          });

          // Map the service type correctly based on the backend model
          let mappedService = '';
          if (apt.serviceType) {
            mappedService = apt.serviceType;
          } else if (apt.service) {
            // Convert service to proper format if needed
            switch (apt.service.toLowerCase()) {
              case 'basic':
              case 'basicgrooming':
              case 'basic grooming':
                mappedService = 'Basic Grooming';
                break;
              case 'full':
              case 'fullgrooming':
              case 'full grooming':
                mappedService = 'Full Grooming';
                break;
              case 'spa':
              case 'spatreatment':
              case 'spa treatment':
                mappedService = 'Spa Treatment';
                break;
              default:
                mappedService = apt.service;
            }
          }

          const mappedAppointment = {
            ...apt,
            petName: apt.petName || '',
            petType: apt.petType || '',
            time: apt.time || '',
            service: mappedService,
            dayCareOptions: apt.dayCareOptions || {
              type: 'daily',
              days: 1,
              morning: false,
              afternoon: false,
              evening: false
            },
            totalPrice: apt.totalPrice || 0,
            ownerName: apt.ownerName || '',
            ownerPhone: apt.ownerPhone || '',
            ownerEmail: apt.ownerEmail || ''
          };

          // Debug log for mapped appointment
          console.log('Mapped appointment:', {
            id: mappedAppointment._id,
            service: mappedAppointment.service
          });

          return mappedAppointment;
        })
        // Sort appointments by date (oldest first) and then by time
        .sort((a, b) => {
          // Compare dates first
          const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date;
          const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date;
          
          // If dates are different, sort by date (oldest first)
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
          }
          
          // If dates are the same, sort by time
          return a.time.localeCompare(b.time);
        });

        console.log('Final processed appointments:', extendedAppointments);
        setAppointments(extendedAppointments);
        setFilteredAppointments(extendedAppointments);
      } catch (error) {
        setError('Failed to fetch appointments');
        console.error('Error fetching appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  // 处理预约取消
  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      await apiService.appointments.update(appointmentId, { status: 'Cancelled' });
      setAppointments(appointments.map(apt => 
        apt._id === appointmentId ? { ...apt, status: 'Cancelled' } : apt
      ));
      setFilteredAppointments(filteredAppointments.map(apt => 
        apt._id === appointmentId ? { ...apt, status: 'Cancelled' } : apt
      ));
    } catch (error) {
      setError('Failed to cancel appointment');
      console.error('Error cancelling appointment:', error);
    }
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

  // Update handleEditAppointment function
  const handleEditAppointment = (appointment: ExtendedAppointment) => {
    console.log('Editing appointment:', {
      id: appointment._id,
      service: appointment.service,
      serviceType: appointment.serviceType,
      date: appointment.date,
      time: appointment.time,
      dayCareOptions: appointment.dayCareOptions
    });

    // Set the selected date
    const appointmentDate = typeof appointment.date === 'string' ? appointment.date : appointment.date.toISOString().split('T')[0];
    setSelectedDate(appointmentDate);

    setSelectedAppointment(appointment);
    setEditForm({
      petName: appointment.petName || '',
      service: appointment.service || '',
      date: appointmentDate,
      time: appointment.time || '',
      dayCareOptions: appointment.dayCareOptions || {
        type: 'daily',
        days: 1,
        morning: false,
        afternoon: false,
        evening: false
      },
      notes: appointment.notes || ''
    });
    setIsEditing(true);

    // The time slots will be updated automatically through the useEffect when service is set
  };

  // Update handleDateChange function to include service type check
  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    setEditForm(prev => ({ ...prev, date: newDate, time: '' }));
    
    try {
      const response = await apiService.appointments.getTimeSlots(newDate);
      const availableTimes = getAvailableTimesByService(editForm.service || '');
      
      // Filter time slots based on service type and current bookings
      const filteredTimeSlots = availableTimes.map(time => {
        const existingSlot = response.find(slot => slot.time === time);
        return {
          time,
          currentBookings: existingSlot ? existingSlot.currentBookings : 0
        };
      });
      
      setAvailableTimeSlots(filteredTimeSlots);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      const availableTimes = getAvailableTimesByService(editForm.service || '');
      setAvailableTimeSlots(availableTimes.map(time => ({ time, currentBookings: 0 })));
    }
  };

  // 处理编辑表单提交
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    try {
      const serviceType = editForm.service as 'Basic Grooming' | 'Full Grooming' | 'Spa Treatment';
      const newTotalPrice = calculateTotalPrice(
        serviceType,
        editForm.dayCareOptions
      );

      const updatedData = {
        serviceType,
        notes: editForm.notes,
        dayCareOptions: editForm.dayCareOptions,
        totalPrice: newTotalPrice,
        date: editForm.date || '',
        time: editForm.time || ''
      };

      const updatedAppointment = await apiService.appointments.update(
        selectedAppointment._id!,
        updatedData
      );

      // Update the local state with the new data
      setAppointments(prevAppointments => 
        prevAppointments.map(apt =>
          apt._id === selectedAppointment._id
            ? {
                ...apt,
                ...updatedAppointment,
                service: updatedAppointment.serviceType || updatedAppointment.service || '',
                totalPrice: newTotalPrice,
                date: updatedAppointment.date || '',
                time: updatedAppointment.time || ''
              }
            : apt
        )
      );
      
      setIsEditing(false);
      setSelectedAppointment(null);
    } catch (error) {
      setError('Failed to update appointment');
      console.error('Error updating appointment:', error);
    }
  };

  // Add price preview to the edit form
  const [previewPrice, setPreviewPrice] = useState<number>(0);

  // Update preview price when service type changes
  useEffect(() => {
    if (editForm.service) {
      const newPrice = calculateTotalPrice(
        editForm.service,
        editForm.dayCareOptions
      );
      setPreviewPrice(newPrice);
    }
  }, [editForm.service, editForm.dayCareOptions]);

  // 格式化日期和时间
  const formatDateTime = (date: Date | string, time?: string) => {
    // 如果date是Date对象，且有utcDateTime字段，使用utcDateTime
    if (selectedAppointment?.utcDateTime) {
      const malaysiaTime = convertToMalaysiaTime(String(selectedAppointment.utcDateTime));
      return `${malaysiaTime.date} ${malaysiaTime.time}`;
    }
    
    // 否则尝试使用date和time
    try {
      if (typeof date === 'string' && time) {
        // 如果提供了字符串日期和时间
        return formatDateTimeForDisplay(date, time);
      } else if (date instanceof Date) {
        // 如果是Date对象
        const dateStr = date.toISOString().split('T')[0]; // 提取YYYY-MM-DD
        const timeStr = time || date.toTimeString().substring(0, 5); // 使用提供的时间或Date对象的时间
        return formatDateTimeForDisplay(dateStr, timeStr);
      }
    } catch (error) {
      console.error('Error formatting date time:', error);
    }
    
    // 回退方案
    if (date instanceof Date) {
      return time ? `${date.toLocaleDateString()} at ${time}` : date.toLocaleString();
    }
    
    return time ? `${date} at ${time}` : String(date);
  };

  // 获取服务图标
  const getServiceIcon = (serviceType: string | undefined) => {
    if (!serviceType) {
      return <Scissors className="w-4 h-4 text-gray-500" />;
    }
    
    switch (serviceType) {
      case 'Basic Grooming':
        return <Scissors className="w-4 h-4 text-gray-500" />;
      case 'Full Grooming':
        return <Sparkles className="w-4 h-4 text-gray-500" />;
      case 'Spa Treatment':
        return <Bath className="w-4 h-4 text-gray-500" />;
      case 'Pet DayCare':
        return <Home className="w-4 h-4 text-gray-500" />;
      default:
        return <Scissors className="w-4 h-4 text-gray-500" />;
    }
  };

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Add effect to update time slots when service changes
  useEffect(() => {
    if (editForm.date && editForm.service) {
      handleDateChange({ target: { value: editForm.date } } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [editForm.service]);

  // Add function to handle filtering by date and time
  const handleSearch = () => {
    if (!searchDate && !searchTime) {
      setFilteredAppointments(appointments);
      return;
    }

    const filtered = appointments.filter(appointment => {
      // Get appointment date in consistent format
      const appointmentDate = typeof appointment.date === 'string' 
        ? appointment.date 
        : appointment.date.toISOString().split('T')[0];
      
      // Check if date matches
      const dateMatches = !searchDate || appointmentDate.includes(searchDate);
      
      // Check if time matches
      const timeMatches = !searchTime || appointment.time.includes(searchTime);
      
      return dateMatches && timeMatches;
    });
    
    setFilteredAppointments(filtered);
  };

  // Reset filter
  const resetSearch = () => {
    setSearchDate('');
    setSearchTime('');
    setFilteredAppointments(appointments);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/member-dashboard')}
                className="flex items-center text-gray-800 hover:text-rose-600 transition-colors duration-300"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>
            <h1 className="text-xl font-bold text-gray-800">
              Appointment History
            </h1>
            <div className="w-32">
              {/* 这个空的 div 用来平衡布局 */}
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="container mx-auto px-4 pt-20 pb-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Add search functionality */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <div className="flex">
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                  onClick={(e) => {
                    const input = e.target as HTMLInputElement;
                    input.showPicker();
                  }}
                />
                {searchDate && (
                  <button
                    onClick={() => {
                      setSearchDate('');
                      handleSearch();
                    }}
                    className="px-2 bg-gray-200 rounded-r-md hover:bg-gray-300"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <div className="flex">
                <input
                  type="time"
                  value={searchTime}
                  onChange={(e) => setSearchTime(e.target.value)}
                  className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                  onClick={(e) => {
                    const input = e.target as HTMLInputElement;
                    input.showPicker();
                  }}
                />
                {searchTime && (
                  <button
                    onClick={() => {
                      setSearchTime('');
                      handleSearch();
                    }}
                    className="px-2 bg-gray-200 rounded-r-md hover:bg-gray-300"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 mr-2"
              >
                Search
              </button>
              {(searchDate || searchTime) && (
                <button
                  onClick={resetSearch}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {appointments.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Completed Appointments Found</h2>
            <p className="text-gray-600 mb-4">Your completed appointment history will appear here.</p>
            <button
              onClick={() => navigate('/grooming-appointment')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
            >
              Book an Appointment
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment._id}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {appointment.petName || "Unnamed Pet"}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completed
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">Appointment ID: {appointment._id?.substring(0, 8)}</p>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Service Type</p>
                      <div className="flex items-center mt-1">
                        {getServiceIcon(appointment.service)}
                        <p className="text-sm font-medium ml-2">
                          {appointment.service || appointment.serviceType || "Not specified"}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Date & Time</p>
                      <div className="flex items-center mt-1">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <p className="text-sm font-medium ml-2">
                          {typeof appointment.date === 'string' ? appointment.date : appointment.date.toLocaleDateString()} {appointment.time}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Pet Type</p>
                      <div className="flex items-center mt-1">
                        {appointment.petType === 'dog' ? (
                          <Dog className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Cat className="w-4 h-4 text-gray-500" />
                        )}
                        <p className="text-sm font-medium ml-2">
                          {appointment.petType === 'dog' ? 'Dog' : 'Cat'}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Contact</p>
                      <div className="flex items-center mt-1">
                        <User className="w-4 h-4 text-gray-500" />
                        <p className="text-sm font-medium ml-2">{appointment.ownerPhone || "Not provided"}</p>
                      </div>
                    </div>
                    
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Day Care Service</p>
                      <div className="flex items-center mt-1">
                        <Home className="w-4 h-4 text-gray-500" />
                        <p className="text-sm font-medium ml-2">
                          {appointment.dayCareOptions && 
                           appointment.dayCareOptions.type && 
                           appointment.dayCareOptions.days && 
                           appointment.dayCareOptions.days > 0 && 
                           (appointment.dayCareOptions.morning || 
                            appointment.dayCareOptions.afternoon || 
                            appointment.dayCareOptions.evening) ? 
                            `${appointment.dayCareOptions.type === 'daily' ? 'Daily Care' : 'Long Term Care'}${appointment.dayCareOptions.days > 1 ? ` (${appointment.dayCareOptions.days} days)` : ''}` : 
                            'No'
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="col-span-2 mt-2">
                      <p className="text-xs text-gray-500">Price</p>
                      <div className="relative">
                        <div className="flex items-center">
                          <p className="text-lg font-bold text-gray-900">
                            RM {Number(appointment.totalPrice).toFixed(2)}
                          </p>
                          <button 
                            type="button"
                            onClick={() => togglePriceDetails(appointment._id || '')}
                            className="ml-2 text-xs text-gray-500 hover:text-gray-700 focus:outline-none price-toggle-button"
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
                        
                        {expandedPriceDetails[appointment._id || ''] && (
                          <div className="mt-2 bg-white rounded-md shadow-sm border border-gray-200 p-2 space-y-1 price-details-dropdown">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Service:</span>
                              <span className="text-gray-800">
                                RM {calculateBasePrice(appointment.service)}
                              </span>
                            </div>
                            
                            {appointment.dayCareOptions && 
                             appointment.dayCareOptions.type && 
                             appointment.dayCareOptions.days && 
                             appointment.dayCareOptions.days > 0 &&
                             (appointment.dayCareOptions.morning || 
                              appointment.dayCareOptions.afternoon || 
                              appointment.dayCareOptions.evening) && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">
                                  Day Care ({appointment.dayCareOptions.type === 'daily' ? 'Daily' : 'Long Term'}
                                  {appointment.dayCareOptions.type === 'longTerm' ? ` ${appointment.dayCareOptions.days} days` : ''}):
                                </span>
                                <span className="text-gray-800">
                                  RM {calculateDayCarePrice(appointment.dayCareOptions)}
                                </span>
                              </div>
                            )}
                            
                            {user && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">
                                  Member Discount (Grooming Only):
                                </span>
                                <span className="text-rose-600">
                                  -RM {(
                                    calculateBasePrice(appointment.service) - 
                                    (appointment.service === 'Spa Treatment' ? 
                                      calculateBasePrice(appointment.service) * 0.9 : 
                                      calculateBasePrice(appointment.service) * 0.92)
                                  ).toFixed(2)}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex justify-between text-xs font-medium pt-1 border-t border-gray-100">
                              <span className="text-gray-800">Total:</span>
                              <span className="text-gray-900 font-bold">
                                RM {Number(appointment.totalPrice).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 bg-gray-50 flex justify-end space-x-3">
                  {/* Edit and Cancel buttons removed - users can no longer modify appointments themselves */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 编辑预约模态框 */}
      {isEditing && selectedAppointment && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Appointment</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Pet Name</label>
                <input
                  type="text"
                  value={editForm.petName}
                  onChange={(e) => setEditForm({ ...editForm, petName: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Service Type</label>
                <select
                  value={editForm.service}
                  onChange={(e) => setEditForm({ ...editForm, service: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                >
                  <option value="">Select a service</option>
                  <option value="Basic Grooming">Basic Grooming</option>
                  <option value="Full Grooming">Full Grooming</option>
                  <option value="Spa Treatment">Spa Treatment</option>
                </select>
              </div>

              {/* Add Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={typeof editForm.date === 'string' ? editForm.date : ''}
                  onChange={handleDateChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                />
              </div>

              {/* Update the Time Selection component */}
              {editForm.date && editForm.service && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Time</label>
                  <select
                    value={editForm.time || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, time: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                  >
                    <option value="">Select a time</option>
                    {availableTimeSlots.map((slot) => {
                      const isFull = slot.currentBookings >= 5;
                      const isCurrentTime = selectedAppointment?.time === slot.time;
                      return (
                        <option
                          key={slot.time}
                          value={slot.time}
                          disabled={isFull && !isCurrentTime}
                        >
                          {slot.time}{isFull && !isCurrentTime ? ' (Full)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Add Day Care Options */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Day Care Service</label>
                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={editForm.dayCareOptions?.type === 'daily'}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        dayCareOptions: {
                          type: 'daily',
                          days: 1,
                          morning: true,
                          afternoon: true,
                          evening: true
                        }
                      })}
                      className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="ml-2">Daily Care</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={editForm.dayCareOptions?.type === 'longTerm'}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        dayCareOptions: {
                          type: 'longTerm',
                          days: 2,
                          morning: true,
                          afternoon: true,
                          evening: true
                        }
                      })}
                      className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="ml-2">Long Term Care</span>
                  </label>
                </div>

                {editForm.dayCareOptions?.type === 'longTerm' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Number of Days</label>
                    <input
                      type="number"
                      min="2"
                      value={editForm.dayCareOptions.days}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        dayCareOptions: {
                          ...editForm.dayCareOptions!,
                          days: parseInt(e.target.value) || 2
                        }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                    />
                  </div>
                )}
              </div>

              {/* Add price preview */}
              {editForm.service && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700">Updated Price:</p>
                  <p className="text-lg font-bold text-gray-900">
                    RM {previewPrice.toFixed(2)}
                    {user && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        (Member discount applied)
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                />
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
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

export default AppointmentManagement; 