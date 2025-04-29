import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Calendar, Clock, Scissors, Dog, Cat, ChevronLeft, User, Home, Bath, Sparkles, ArrowLeft, ArrowRight, ChevronDown, AlertTriangle, Check, LogOut, LayoutDashboard, Zap } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import axios from 'axios';  // 添加axios导入
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { Appointment, TimeSlot as ApiTimeSlot } from '../types';
import { convertToUTC, convertToMalaysiaTime } from '../utils/dateUtils';

// Initialize EmailJS with your public key
emailjs.init("-aRgYaBSN6vwDOahT");

// Define interfaces
interface GroomingService {
  id: string;
  _id: string;
  name: string;
  description: string;
  price: number;
  displayPrice: string;
  duration: number;
  displayDuration: string;
  features: { text: string }[];
  discount: number;
  recommended: boolean;
  capacityLimit: number;
}

interface DayCareOption {
  type: string;
  price: number;
  displayPrice: string;
  description: string;
}

interface FormData {
  petName: string;
  petType: string;
  date: string;
  time: string;
  serviceType: string;
  notes: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  dayCare: {
    enabled: boolean;
    type: string;
    days: number;
  };
}

interface FormErrors {
  name: string;
  email: string;
  phone: string;
  petName: string;
  date: string;
  time: string;
}

// 本地TimeSlot接口定义
interface TimeSlot {
  time: string;
  available: boolean;
  currentBookings: number;
}

// API返回的时间槽接口
interface ApiTimeSlotResponse {
  time: string;
  currentBookings?: number | string; // API可能返回数字或字符串
  isAvailable?: boolean;  // API可能返回isAvailable而不是available
  available?: boolean;    // 或者是available
}

interface BookedAppointment {
  date: string;
  startTime: string;
  endTime: string;
}

interface ServiceType {
  _id: string;
  name: string;
  description: string;
  price: string;
  duration: string;
  icon: React.ReactElement;
  features: string[];
  recommended: boolean;
}

const GroomingAppointment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isIntentionalLogin } = useAuth();
  
  // Initialize form data without user info
  const [formData, setFormData] = useState<FormData>({
    petName: '',
    petType: '',
    date: '',
    time: '',
    serviceType: '',
    notes: '',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    dayCare: {
      enabled: false,
      type: 'daily',
      days: 1  // Changed to 1 for daily care
    }
  });

  const [emailError, setEmailError] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
  const [petNameError, setPetNameError] = useState<string>('');
  const [bookedAppointments, setBookedAppointments] = useState<BookedAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const serviceTypeRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeSelectionRef = useRef<HTMLDivElement>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({
    name: '',
    email: '',
    phone: '',
    petName: '',
    date: '',
    time: ''
  });
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  // Initialize isMember as false by default
  const [isMember, setIsMember] = useState<boolean>(false);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [isPriceDropdownOpen, setIsPriceDropdownOpen] = useState<boolean>(false);

  // Add state for services and day care options
  const [backendServices, setBackendServices] = useState<GroomingService[]>([]);
  const [backendDayCareOptions, setBackendDayCareOptions] = useState<DayCareOption[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  const whatsappNumber = "60102568641";

  const [selectedService, setSelectedService] = useState<GroomingService | null>(null);

  // 从后端获取服务数据
  useEffect(() => {
    const fetchServicesData = async () => {
      setIsLoadingServices(true);
      try {
        // 从后端获取美容服务数据
        const servicesData = await apiService.services.getGroomingServices()
          .catch(() => []);
        
        // 从后端获取日托选项数据
        const dayCareOptionsData = await apiService.services.getDayCareOptions()
          .catch(() => []);
        
        if (servicesData && Array.isArray(servicesData) && servicesData.length > 0) {
          setBackendServices(servicesData);
          console.log('Loaded services from backend:', servicesData);
        }
        
        if (dayCareOptionsData && Array.isArray(dayCareOptionsData) && dayCareOptionsData.length > 0) {
          setBackendDayCareOptions(dayCareOptionsData);
          console.log('Loaded day care options from backend:', dayCareOptionsData);
        }
        setError('');
      } catch (error) {
        console.error('Failed to fetch services data:', error);
        setError('Failed to load services. Please try again later.');
      } finally {
        setIsLoadingServices(false);
      }
    };

    fetchServicesData();
  }, []);
  
  // 服务类型定义，使用后端数据
  const serviceTypes: ServiceType[] = backendServices.map(service => ({
    _id: service._id,
    name: service.name,
    description: service.description,
    price: service.displayPrice,
    duration: service.displayDuration,
    icon: service.name === 'Basic Grooming'
      ? <Scissors className="w-10 h-10 text-rose-500 mb-3" />
      : service.name === 'Premium Grooming'
        ? <Sparkles className="w-10 h-10 text-rose-500 mb-3" />
        : <Bath className="w-10 h-10 text-rose-500 mb-3" />,
    features: service.features?.map(f => f.text) || [],
    recommended: service.recommended
  })).sort((a, b) => {
    // Custom sort order: Basic Grooming first, then Premium Grooming, then others
    if (a.name === 'Basic Grooming') return -1;
    if (b.name === 'Basic Grooming') return 1;
    if (a.name === 'Premium Grooming') return -1;
    if (b.name === 'Premium Grooming') return 1;
    return 0;
  });
  
  // 获取服务时长
  const getServiceDuration = (serviceId: string): number => {
    const service = backendServices.find(s => s._id === serviceId);
    return service ? service.duration : 0;
  };

  // Calculate base price for grooming service
  const calculateBasePrice = (serviceId: string): number => {
    const service = backendServices.find(s => s._id === serviceId);
    return service ? service.price : 0;
  };

  // Calculate daycare price
  const calculateDayCarePrice = (dayCare: { enabled: boolean; type: string; days: number | string; }): number => {
    if (!dayCare.enabled) return 0;
    
    const option = backendDayCareOptions.find(opt => opt.type === dayCare.type);
    if (!option) {
      console.warn(`Day care option not found for type: ${dayCare.type}`);
      return 0;
    }
    
    const days = dayCare.type === 'daily' ? 1 : Number(dayCare.days);
    console.log(`Calculating daycare price for ${dayCare.type}, days: ${days}, base price: ${option.price}`);
    return option.price * days;
  };

  // Calculate total price including discounts
  const calculateTotalPrice = (serviceId: string, dayCare: { enabled: boolean; type: string; days: number | string; }, shouldApplyDiscount: boolean): number => {
    const service = backendServices.find(s => s._id === serviceId);
    if (!service) {
      console.warn(`Service not found for id: ${serviceId}`);
      return 0;
    }

    const basePrice = service.price;
    console.log('Base service price:', basePrice);

    const dayCarePrice = calculateDayCarePrice(dayCare);
    console.log('Day care price:', dayCarePrice);
    
    let total = basePrice + dayCarePrice;
    let discountAmount = 0;

    if (shouldApplyDiscount) {
      discountAmount = (basePrice * (service.discount / 100));
      total = (basePrice - discountAmount) + dayCarePrice;
      console.log(`Applied ${service.discount}% discount: -${discountAmount}`);
    }

    console.log('Total price:', total);
      setDiscount(discountAmount);
    return Math.round(total * 100) / 100;
  };

  // 检查用户是否是会员
  useEffect(() => {
    if (user) {
      setIsMember(true);
      // 如果用户已登录，自动填充联系信息
      setFormData(prev => ({
        ...prev,
        ownerName: user.name || '',
        ownerPhone: user.phone || '',
        ownerEmail: user.email || ''
      }));
    } else {
      setIsMember(false);
    }
  }, [user]);

  // 获取可用时间段
  useEffect(() => {
    if (formData.date && formData.serviceType) {
      const fetchAvailableTimes = async () => {
        setLoading(true);
        try {
          const response = await apiService.appointments.getTimeSlots(formData.date);
          console.log('API response:', response);
          
          if (response && Array.isArray(response)) {
            const allTimeSlots: TimeSlot[] = response.map((apiSlot: ApiTimeSlotResponse) => ({
              time: apiSlot.time,
              available: apiSlot.isAvailable !== undefined ? apiSlot.isAvailable : (apiSlot.available !== undefined ? apiSlot.available : false),
              currentBookings: typeof apiSlot.currentBookings === 'number' ? apiSlot.currentBookings : 
                              (typeof apiSlot.currentBookings === 'string' ? parseInt(apiSlot.currentBookings) : 0)
            }));
            
            setTimeSlots(allTimeSlots);
            console.log('Set time slots from API:', allTimeSlots);
          }
        } catch (error) {
          console.error('Failed to fetch time slots:', error);
          setError('Failed to load available time slots. Please try again later.');
          setTimeSlots([]);
        } finally {
          setLoading(false);
        }
      };
      
      fetchAvailableTimes();
      
      const refreshInterval = setInterval(() => {
        console.log('Refreshing time slots...');
        fetchAvailableTimes();
      }, 60000);
      
      return () => {
        clearInterval(refreshInterval);
      };
    } else {
      setTimeSlots([]);
    }
  }, [formData.date, formData.serviceType]);

  // 生成默认时间槽
  const generateDefaultTimeSlots = (serviceDuration: number): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    console.log('Generating default time slots for service duration:', serviceDuration);
    
    // 工作时间: 10:00 - 22:00
    for (let hour = 10; hour <= 21; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      
      // 检查是否是过去的时间
      const isPastTime = formData.date === new Date().toISOString().split('T')[0] && 
                         time < new Date().toTimeString().slice(0, 5);
      
      // 移除超出工作时间范围限制
      
      // 组合所有检查条件，确定是否可用
      const available = !isPastTime;
      
      // 默认时间槽不考虑预约已满情况，因为没有真实数据，所以设为0
      let currentBookings = 0;
      
      // 测试用：特定日期的特定时间槽设为已满
      if (formData.date === '2025-04-15') {
        // 10:00, 11:00和12:00这三个时间槽设为已满
        if (time === '10:00' || time === '11:00' || time === '12:00') {
          currentBookings = 5;
        }
      }
      
      console.log(`Default slot ${time}: available=${available && currentBookings < 5}, isPastTime=${isPastTime}, currentBookings=${currentBookings}`);
      
      // 添加到时间槽列表
      slots.push({ 
        time,
        available: available && currentBookings < 5, // 已满预约的时间槽设为不可用
        currentBookings: currentBookings
      });
    }
    
    // 确保至少有一些时间槽是可用的（用于测试）
    if (slots.every(slot => !slot.available)) {
      console.log('All slots were unavailable - forcing some slots to be available for testing');
      // 强制至少前几个时间槽可用（用于测试目的）
      for (let i = 0; i < Math.min(5, slots.length); i++) {
        if (slots[i].currentBookings < 5) { // 只有未满预约的时间槽才设为可用
          slots[i].available = true;
        }
      }
    }
    
    console.log('Generated default time slots:', slots.length, 'slots');
    return slots;
  };

  // 转换为12小时制
  const formatTo12Hour = (time: string): string => {
    const hour = parseInt(time.split(':')[0]);
    const minute = time.split(':')[1];
    
    if (hour === 0) {
      return `12:${minute} AM`;
    } else if (hour < 12) {
      return `${hour}:${minute} AM`;
    } else if (hour === 12) {
      return `12:${minute} PM`;
    } else {
      return `${hour - 12}:${minute} PM`;
    }
  };

  // 验证邮箱格式
  const validateEmail = (email: string): boolean => {
    // 使用更严格的邮箱验证正则表达式
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  // 表单验证
  const validateForm = (): boolean => {
    let isValid = true;
    const errors: FormErrors = {
      name: '',
      email: '',
      phone: '',
      petName: '',
      date: '',
        time: ''
    };
    
    // Validate pet type
    if (!formData.petType) {
      setPetNameError('Please select a pet type');
      isValid = false;
    }
    
    // Validate pet name
    if (!formData.petName.trim()) {
      errors.petName = 'Please enter your pet name';
      setPetNameError('Please enter your pet name');
      isValid = false;
    } else {
      setPetNameError('');
    }
    
    // Validate date
    if (!formData.date) {
      errors.date = 'Please select a date';
      isValid = false;
    }
    
    // Validate time
    if (!formData.time) {
      errors.time = 'Please select a time';
      isValid = false;
    }
    
    // 验证日托服务天数
    if (formData.dayCare.enabled && formData.dayCare.type === 'longTerm' && 
        (formData.dayCare.days < 2 || isNaN(Number(formData.dayCare.days)))) {
      setSubmitError('Please enter at least 2 days for multiple days daycare option');
      isValid = false;
            } else {
      setSubmitError('');
    }
    
    // If user is not logged in, validate contact information
    if (!user) {
      // Validate name
      if (!formData.ownerName.trim()) {
        errors.name = 'Please enter your name';
        setNameError('Please enter your name');
        isValid = false;
      } else {
        setNameError('');
      }
      
      // Validate phone
      if (!formData.ownerPhone.trim()) {
        errors.phone = 'Please enter your phone number';
        setPhoneError('Please enter your phone number');
        isValid = false;
    } else {
        setPhoneError('');
      }
      
      // Validate email
      if (!formData.ownerEmail.trim()) {
        errors.email = 'Please enter your email';
        setEmailError('Please enter your email');
        isValid = false;
      } else if (!validateEmail(formData.ownerEmail.trim())) {
        errors.email = 'Please enter a valid email address (e.g. name@example.com)';
        setEmailError('Please enter a valid email address (e.g. name@example.com)');
        isValid = false;
      } else {
        setEmailError('');
      }
    }
    
    setFormErrors(errors);
    return isValid;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // 确保我们有最新的服务数据
      const services = await apiService.services.getGroomingServices() as GroomingService[];
      const service = services.find(s => s._id === formData.serviceType);
      
      if (!service) {
        throw new Error(`Service not found for id: ${formData.serviceType}`);
      }

      // 计算实际价格
      const basePrice = service.price;
      const dayCareOptions = await apiService.services.getDayCareOptions() as DayCareOption[];
      const dayCarePrice = formData.dayCare.enabled ? 
        dayCareOptions.find(opt => opt.type === formData.dayCare.type)?.price || 0 : 0;
      
      const discountAmount = isMember ? (basePrice * (service.discount / 100)) : 0;
      const totalPrice = (basePrice - discountAmount) + (formData.dayCare.enabled ? dayCarePrice * (formData.dayCare.type === 'daily' ? 1 : parseInt(formData.dayCare.days.toString())) : 0);

      // Create appointment data with the latest service information
      const appointmentData: Omit<Appointment, '_id'> = {
        user: user?._id,
        petName: formData.petName,
        petType: formData.petType as 'dog' | 'cat',
        date: formData.date,
        time: formData.time,
        serviceType: service.name as 'Basic Grooming' | 'Premium Grooming' | 'Spa Treatment',
        serviceId: service._id,
        duration: service.duration,
        dayCareOptions: formData.dayCare.enabled ? {
          type: formData.dayCare.type as 'daily' | 'longTerm',
          days: formData.dayCare.type === 'daily' ? 1 : parseInt(formData.dayCare.days.toString()),
          morning: true,
          afternoon: true,
          evening: true
        } : undefined,
        totalPrice: Math.round(totalPrice * 100) / 100,
        ownerName: formData.ownerName,
        ownerPhone: formData.ownerPhone,
        ownerEmail: formData.ownerEmail,
        notes: formData.notes,
        status: 'Booked'
      };

      console.log('Submitting appointment data with latest service info:', appointmentData);
      
        const response = await apiService.appointments.add(appointmentData);
        if (response && response._id) {
      setSubmitSuccess(true);
          setSuccess('Appointment successful! We will contact you soon to confirm.');
          
        // Send confirmation emails
        try {
          const dayCareInfoText = formData.dayCare.enabled
            ? `${formData.dayCare.type === 'daily' ? 'Daily' : formData.dayCare.days + ' Days'} Day Care`
            : 'Not selected';
          
          const emailData = {
              to_name: formData.ownerName,
              to_email: formData.ownerEmail,
          customer_name: formData.ownerName,
          customer_email: formData.ownerEmail,
          customer_phone: formData.ownerPhone,
            member_status: user ? 'Member' : 'Non-member',
              appointment_date: new Date(formData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              appointment_time: formData.time,
              pet_name: formData.petName,
              pet_type: formData.petType === 'dog' ? 'Dog' : 'Cat',
            service_type: service.name,
            base_service_price: `RM ${basePrice.toFixed(2)}`,
            day_care_price: formData.dayCare.enabled ? `RM ${dayCarePrice.toFixed(2)}` : '-',
            member_discount: user ? `-${service.discount}%` : 'No discount',
            total_price: totalPrice.toFixed(2),
            day_care_info: dayCareInfoText
          };
          
          // Send email to customer
          await emailjs.send('service_4awqr8x', 'template_uznkxfq', emailData);
          
          // Send email to admin
          await emailjs.send('service_4awqr8x', 'template_7cysc9f', {
            ...emailData,
            notes: formData.notes || 'No special notes'
          });
          
          console.log('Emails sent successfully');
      } catch (emailError) {
            console.error('Failed to send emails:', emailError);
          }
          
        // Create notification for member
          if (user) {
            try {
              const notificationData = {
              title: `🐾 New ${service.name} Appointment`,
              message: `Your ${service.name} appointment for ${formData.petName} (${formData.petType === 'dog' ? 'Dog' : 'Cat'}) on ${new Date(formData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at ${formatTo12Hour(formData.time)} has been confirmed.`,
                type: 'appointment'
              };
              
              const token = localStorage.getItem('token');
              if (token) {
              await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:4003'}/notifications/create`, notificationData, {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  }
                });
                console.log('Notification created successfully');
              }
              
              window.dispatchEvent(new CustomEvent('appointmentCreated'));
              sessionStorage.setItem('refreshDashboard', 'true');
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError);
            }
      }
      
      // Reset form
      setFormData({
        petName: '',
            petType: '',
        date: '',
        time: '',
        serviceType: '',
          notes: '',
            ownerName: user ? user.name || '' : '',
            ownerPhone: user ? user.phone || '' : '',
            ownerEmail: user ? user.email || '' : '',
          dayCare: {
            enabled: false,
            type: backendDayCareOptions[0]?.type || 'daily',
            days: 1
          }
        });
        setTotalPrice(0);
        setDiscount(0);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error: any) {
      console.error('Failed to create appointment:', error);
      setSubmitError(error.message || 'Failed to submit appointment. Please try again later.');
      setSubmitSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 在useEffect中添加服务信息的获取
  useEffect(() => {
    const fetchServiceInfo = async () => {
      try {
        const services = await apiService.services.getGroomingServices();
        if (Array.isArray(services)) {
          const service = services.find((s) => s._id === formData.serviceType);
        setSelectedService(service || null);
        }
    } catch (error) {
        console.error('Failed to fetch service info:', error);
      }
    };

    if (formData.serviceType) {
      fetchServiceInfo();
    }
  }, [formData.serviceType]);

  // 修改时间槽渲染逻辑
  const renderTimeSlot = (time: string, remainingSlots: number) => {
    const maxCapacity = selectedService?.capacityLimit || 5;
    const displaySlots = Math.min(remainingSlots, maxCapacity);
    const isDisabled = displaySlots <= 0 || isPastTime(time);

    return (
      <button
        key={time}
        onClick={() => handleTimeSelect(time)}
        disabled={isDisabled}
        className={`p-4 rounded-lg border text-center transition-colors ${
          formData.time === time
            ? 'border-blue-500 bg-blue-50'
            : isDisabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-200 hover:border-blue-500'
        }`}
      >
        <div className="font-medium">{formatTime(time)}</div>
        {!isDisabled && (
          <div className="text-sm text-gray-500">{displaySlots} left</div>
        )}
        {isDisabled && <div className="text-sm text-red-500">Full</div>}
      </button>
    );
  };

  // Handle daycare option changes
  const handleDayCareChange = (field: string, value: any) => {
    if (field === 'enabled') {
      const defaultOption = backendDayCareOptions[0];
      if (!defaultOption) return;

      setFormData(prev => ({
        ...prev,
        dayCare: {
          ...prev.dayCare,
          enabled: value,
          type: defaultOption.type,
          days: defaultOption.type === 'daily' ? 1 : 2
        }
      }));
    } else if (field === 'type') {
      const option = backendDayCareOptions.find(opt => opt.type === value);
      if (!option) return;

      setFormData(prev => ({
        ...prev,
        dayCare: {
          ...prev.dayCare,
          type: value,
          days: value === 'daily' ? 1 : 2
        }
      }));
    } else if (field === 'days') {
      const option = backendDayCareOptions.find(opt => opt.type === formData.dayCare.type);
      if (!option || formData.dayCare.type === 'daily') return;

      // Allow any number input
      setFormData(prev => ({
        ...prev,
        dayCare: {
          ...prev.dayCare,
          days: value
        }
      }));
    }

    // Recalculate total price after daycare changes
    if (formData.serviceType) {
      const newTotal = calculateTotalPrice(
        formData.serviceType,
        {
          ...formData.dayCare,
          [field]: field === 'days' ? parseInt(value) || 1 : value
        },
        isMember
      );
      setTotalPrice(newTotal);
    }
  };

  // Add daycare options sorting
  const handleDayCareTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    setFormData({
      ...formData,
      dayCare: {
        ...formData.dayCare,
        type: newType,
        days: newType === 'daily' ? 1 : 2
      }
    });
  };

  // Sort daycare options to show daily first
  const sortedDayCareOptions = backendDayCareOptions.sort((a, b) => {
    if (a.type === 'daily') return -1;
    if (b.type === 'daily') return 1;
    return 0;
  });

  // 临时返回占位组件，后续将实现完整功能
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Section: Back Button and Shop Name */}
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-500 mr-3"
                aria-label="Back to Home"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">
                AH HAO PET SHOP
              </h1>
            </div>
            
            {/* Right Section: Login/Profile Icon */}
            <div className="flex items-center">
              <button
                onClick={() => {
                  // 设置标记，以便登录后返回预约页面
                  sessionStorage.setItem('returnToBooking', 'true');
                  
                  if (user) {
                    navigate('/member-dashboard'); // Navigate to member dashboard if logged in
                  } else {
                    navigate('/login'); // Navigate to login if not logged in
                  }
                }}
                className="p-2 mr-4 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-500"
                aria-label={user ? 'Go to Dashboard' : 'Login'}
              >
                {user ? <User className="h-6 w-6" /> : <User className="h-6 w-6" />}
              </button>
          </div>
        </div>
          </div>
      </header>

      {/* 营业时间信息 */}
      <div className="bg-gray-100 py-2 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-2 text-gray-500" />
            <span>Business Hours: Mon-Fri, 10AM-10PM</span>
            </div>
              </div>
            </div>

      {/* Main Content Area */}
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {submitSuccess ? (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                  </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Successful!</h2>
                <p className="text-lg text-gray-600 mb-6">{success}</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => {
                      setSubmitSuccess(false);
                      setSuccess('');
                    }}
                    className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Book Again
                  </button>
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600 transition-colors"
                >
                    Return to Home
                </button>
                  {user && (
        <button
                      onClick={() => navigate('/member-dashboard')}
                      className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
                      View My Appointments
        </button>
                )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-8">
                {isLoadingServices ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
                    </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Services</h3>
                    <p className="text-red-600">{error}</p>
                  </div>
            ) : (
                  <form ref={formRef} className="space-y-8" onSubmit={handleSubmit}>
                    {/* 标题部分 - 优化移动端显示 */}
                    <div className="text-center mb-6 sm:mb-8">
                      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
                        Grooming Appointment
                      </h1>
                      <p className="text-sm sm:text-base text-gray-600 px-2 sm:px-0 leading-relaxed">
                        Schedule a professional grooming session for your beloved pet
                      </p>
                </div>
                    
                    {submitError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <span className="block sm:inline">{submitError}</span>
              </div>
            )}

                    <div className="space-y-6">
                      {!user && (
                        <div className="bg-rose-50 p-4 rounded-lg border-l-4 border-rose-500 mb-4 sm:mb-6">
                          <div className="flex flex-col">
                            <h3 className="font-semibold text-gray-800 mb-1 sm:mb-2 flex items-center">
                              <Check className="w-5 h-5 text-rose-500 mr-2 flex-shrink-0" /> 
                              <span className="text-sm sm:text-base">Members save on all grooming services!</span>
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 mb-2">
                              Register as a member to enjoy exclusive Grooming Discount and benefits!
                            </p>
                            <div className="text-xs sm:text-sm">
                              <a 
                                href="#" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  // 设置标记，以便登录后返回预约页面
                                  sessionStorage.setItem('returnToBooking', 'true');
                                  // 添加标记，表示是从预约页面点击注册按钮
                                  sessionStorage.setItem('fromGroomingRegister', 'true');
                                  navigate('/login', { state: { showRegister: true } });
                                }}
                                className="text-black underline font-medium hover:text-gray-800"
                              >
                                Register Now
                              </a>
              </div>
            </div>
        </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center mb-2 sm:mb-0">
                          <Scissors className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                          <span>Select Service Type</span>
                        </h2>
                        {user && (
                          <div className="text-xs sm:text-sm text-green-600 flex items-center">
                            <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Member Discount Enabled
              </div>
                )}
                      </div>
                      
                      {/* Service type cards */}
                      <div ref={serviceTypeRef} className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
                    {serviceTypes.map((service) => (
                      <div
                        key={service._id}
                            className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-all duration-200 h-full
                              ${formData.serviceType === service._id 
                                ? 'border-rose-500 bg-rose-50 shadow-lg transform scale-[1.02]' 
                                : 'border-gray-200 hover:border-rose-300 hover:shadow-md hover:bg-gray-50'
                              }
                              ${service.recommended ? 'relative' : ''}
                            `}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                serviceType: formData.serviceType === service._id ? '' : service._id
                              });
                              
                              // Calculate new total
                              const newTotal = formData.serviceType === service._id 
                                ? 0 
                                : calculateTotalPrice(
                                    service._id, 
                                    formData.dayCare, 
                                    !!user
                                  );
                              setTotalPrice(newTotal);
                            }}
                          >
                            {service.recommended && (
                              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-rose-500 text-white px-2 py-0.5 sm:px-3 sm:py-1 text-xs rounded-full shadow-md">
                            Recommended
                          </div>
                        )}
                            <div className="flex flex-col items-center text-center mb-3 sm:mb-4">
                                {service.icon}
                              <h3 className={`font-bold text-xl sm:text-xl mb-0.5 sm:mb-1 ${formData.serviceType === service._id ? 'text-rose-700' : 'text-gray-900'}`}>{service.name}</h3>
                              <p className="text-sm sm:text-sm text-gray-500 mb-2 sm:mb-3 min-h-[40px]">{service.description}</p>
                              <div className={`font-bold text-2xl sm:text-2xl ${formData.serviceType === service._id ? 'text-rose-600' : 'text-gray-900'}`}>{service.price}</div>
                              <div className="text-sm sm:text-sm text-gray-500 mb-1">
                                {service.duration}
                            </div>
                              {user && (
                                <div className="text-sm sm:text-sm text-green-600 mb-1 sm:mb-2">
                                  {backendServices.length > 0 
                                    ? `${backendServices.find(s => s._id === service._id)?.discount || 0}% Off` 
                                    : service.name === 'Basic Grooming' ? '5% Off' 
                                      : service.name === 'Premium Grooming' ? '10% Off' 
                                      : service.name === 'Spa Treatment' ? '15% Off' : ''}
                          </div>
                              )}
                            </div>
                            <ul className="text-sm sm:text-sm">
                            {service.features.map((feature, index) => (
                                <li key={index} className="flex items-start mb-1.5 sm:mb-2">
                                  <Check className="w-4 h-4 sm:w-4 sm:h-4 text-rose-500 mt-0.5 mr-2 sm:mr-2 flex-shrink0" />
                                  <span className="text-gray-600">{feature}</span>
                              </li>
                            ))}
                          </ul>
                      </div>
                    ))}
                  </div>
                </div>

                    {/* Daycare service */}
                  <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex items-center">
                          <Home className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                          <span className="text-lg sm:text-xl font-bold text-gray-900">Day Care Service (Optional)</span>
                          <div className="hidden sm:flex items-center ml-4">
                            <input
                              id="enableDayCare"
                              type="checkbox"
                              checked={formData.dayCare.enabled}
                              onChange={(e) => {
                                const enabled = e.target.checked;
                                handleDayCareChange('enabled', enabled);
                              }}
                              className="h-4 w-4 text-rose-500 focus:ring-rose-500 rounded"
                            />
                            <label htmlFor="enableDayCare" className="ml-2 text-sm text-gray-700">
                              Add Day Care Service
                            </label>
                            </div>
                            </div>
                        <div className="sm:hidden flex items-center">
                            <input
                              id="enableDayCareMobile"
                              type="checkbox"
                              checked={formData.dayCare.enabled}
                              onChange={(e) => {
                                const enabled = e.target.checked;
                                handleDayCareChange('enabled', enabled);
                              }}
                              className="h-4 w-4 text-rose-500 focus:ring-rose-500 rounded"
                            />
                            <label htmlFor="enableDayCareMobile" className="ml-2 text-xs text-gray-700">
                              Add Day Care Service
                          </label>
                        </div>
                      </div>

                      {/* Walk-in notice for daycare */}
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 sm:p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                          </div>
                          <div className="ml-3">
                            <p className="text-xs sm:text-sm text-blue-700">
                              <span className="font-medium">Walk-in Day Care Service:</span> For day care only (without grooming), please walk in directly during business hours (Mon-Fri, 10:00 AM - 10:00 PM).
                            </p>
                          </div>
                          </div>
                        </div>

                        {formData.dayCare.enabled && (
                        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                          <div className="flex flex-col md:flex-row gap-4">
                            {/* Day care type */}
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700">Type</label>
                              <select
                                value={formData.dayCare.type}
                                onChange={handleDayCareTypeChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 sm:text-base p-2 bg-white"
                              >
                                {sortedDayCareOptions.map(option => (
                                    <option key={option.type} value={option.type}>
                                      {option.type === 'daily' ? 'Daily' : 'Long Term'} - {option.displayPrice}/day
                                    </option>
                                ))}
                              </select>
                            </div>

                            {/* Number of days */}
                            {formData.dayCare.type === 'longTerm' && (
                              <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700">Days</label>
                                  <input
                                  type="number"
                                  value={formData.dayCare.days}
                                  onChange={(e) => {
                                    const inputValue = e.target.value;
                                    handleDayCareChange('days', inputValue);
                                  }}
                                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 sm:text-base p-2 bg-white"
                                />
                                {formData.dayCare.type === 'longTerm' && Number(formData.dayCare.days) < 2 && (
                                  <p className="mt-1 text-sm text-red-600">Please enter at least 2 days for Long Term option</p>
                              )}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-600">
                            <p>Day Care Service Includes:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                              <li>Clean, comfortable environment</li>
                              <li>Scheduled feeding and fresh water</li>
                              <li>Regular walks/interaction</li>
                              <li>Playtime with other cats and dogs</li>
                              <li>24-hour monitoring</li>
                            </ul>
                      </div>
                    </div>
                      )}
                  </div>

                    {/* Price details */}
                    {formData.serviceType && (
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div 
                          className="flex justify-between items-center cursor-pointer"
                        onClick={() => setIsPriceDropdownOpen(!isPriceDropdownOpen)}
                        >
                          <div>
                            <h2 className="text-base font-bold text-gray-900">Total Price</h2>
                            <div className="text-xl font-bold text-rose-500">
                              RM {totalPrice.toFixed(2)}
                            </div>
                          </div>
                          <div className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isPriceDropdownOpen ? 'transform rotate-180' : ''}`} />
                          </div>
                    </div>
                    
                    {isPriceDropdownOpen && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Grooming Service:</span>
                                <span className="font-medium">
                                  RM {calculateBasePrice(formData.serviceType).toFixed(2)}
                                </span>
                            </div>
                          
                          {formData.dayCare.enabled && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                    {formData.dayCare.type === 'daily' 
                                      ? 'Day Care (1 day)' 
                                      : `Day Care (${formData.dayCare.days} days)`}:
                              </span>
                                  <span className="font-medium">
                                    RM {calculateDayCarePrice(formData.dayCare).toFixed(2)}
                                  </span>
                            </div>
                          )}
                          
                              {discount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                  <span>
                                    Member Discount - Grooming Only 
                                    {backendServices.length > 0 && formData.serviceType ? (
                                      <span> ({backendServices.find(s => s._id === formData.serviceType)?.discount || 0}%)</span>
                                    ) : (
                                      formData.serviceType === 'basic' ? <span> (5%)</span> :
                                      formData.serviceType === 'premium' ? <span> (10%)</span> :
                                      formData.serviceType === 'spa' ? <span> (15%)</span> : null
                                    )}:
                              </span>
                                    <span>-RM {discount.toFixed(2)}</span>
                            </div>
                          )}
                          
                                <div className="flex justify-between font-bold pt-2 border-t border-gray-200">
                                  <span>Total:</span>
                                  <span className="text-rose-500">RM {totalPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                    )}

                    {/* Pet information */}
                    <div className="space-y-6">
                      <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <Dog className="w-5 h-5 mr-2" />
                        Your Pet Information
                  </h2>
                      
                      {/* Pet type selection */}
                      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto sm:mx-0">
                        <div
                          className={`flex flex-col items-center p-1 border rounded-lg cursor-pointer transition-all duration-200
                            ${formData.petType === 'dog' 
                              ? 'border-rose-500 bg-rose-50 shadow-md' 
                              : 'border-gray-200 hover:border-rose-300 hover:shadow'
                            }`}
                          onClick={() => setFormData({ ...formData, petType: formData.petType === 'dog' ? '' : 'dog' })}
                        >
                          <Dog className={`w-5 h-5 mb-1 ${formData.petType === 'dog' ? 'text-rose-500' : 'text-gray-400'}`} />
                          <span className={`font-medium text-xs ${formData.petType === 'dog' ? 'text-rose-500' : 'text-gray-600'}`}>Dog</span>
                        </div>
                        <div
                          className={`flex flex-col items-center p-1 border rounded-lg cursor-pointer transition-all duration-200
                            ${formData.petType === 'cat' 
                              ? 'border-rose-500 bg-rose-50 shadow-md' 
                              : 'border-gray-200 hover:border-rose-300 hover:shadow'
                            }`}
                          onClick={() => setFormData({ ...formData, petType: formData.petType === 'cat' ? '' : 'cat' })}
                        >
                          <Cat className={`w-5 h-5 mb-1 ${formData.petType === 'cat' ? 'text-rose-500' : 'text-gray-400'}`} />
                          <span className={`font-medium text-xs ${formData.petType === 'cat' ? 'text-rose-500' : 'text-gray-600'}`}>Cat</span>
                        </div>
                      </div>
                      
                      {petNameError && formData.petType === '' && (
                        <p className="mt-1 text-sm text-red-600">Please select a pet type</p>
                      )}
                      
                      {/* Pet name */}
                      <div>
                        <label htmlFor="petName" className="block text-sm font-medium text-gray-700">Pet Name</label>
                        <div className="mt-1">
                          <input
                            type="text"
                            id="petName"
                            value={formData.petName}
                            onChange={(e) => {
                              setFormData({ ...formData, petName: e.target.value });
                              if (e.target.value.trim()) {
                                setPetNameError('');
                              }
                            }}
                            className={`block w-full rounded-md shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 sm:text-base p-2 border border-gray-300
                              ${petNameError ? 'border-red-300' : ''}`}
                            placeholder="Enter your pet's name"
                          />
                          {petNameError && <p className="mt-1 text-sm text-red-600">{petNameError}</p>}
                        </div>
                      </div>
                  </div>

                {/* Personal Information */}
                    <div className="space-y-6">
                      <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <User className="w-5 h-5 mr-2" />
                    Personal Information
                  </h2>
                      
                      {/* Owner Name */}
                    <div>
                        <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700">Your Name</label>
                        <div className="mt-1">
                      <input
                        type="text"
                            id="ownerName"
                        value={formData.ownerName}
                            onChange={(e) => {
                              setFormData({ ...formData, ownerName: e.target.value });
                              if (e.target.value.trim()) {
                                setNameError('');
                              }
                            }}
                            className={`block w-full rounded-md shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 sm:text-base p-2 border border-gray-300
                              ${nameError ? 'border-red-300' : ''}`}
                            placeholder="Enter your name"
                            disabled={!!user}
                          />
                          {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
                    </div>
                      </div>
                      
                      {/* Owner Phone */}
                    <div>
                        <label htmlFor="ownerPhone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                        <div className="mt-1">
                      <input
                        type="tel"
                            id="ownerPhone"
                        value={formData.ownerPhone}
                        onChange={(e) => {
                              setFormData({ ...formData, ownerPhone: e.target.value });
                              if (e.target.value.trim()) {
                                setPhoneError('');
                              }
                            }}
                            onBlur={(e) => {
                              // 失去焦点时再次验证
                              if (e.target.value.trim() && !validateEmail(e.target.value.trim())) {
                                setEmailError('Please enter a valid email address (e.g. name@example.com)');
                              }
                            }}
                            className={`block w-full rounded-md shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 sm:text-base p-2 border border-gray-300
                              ${phoneError ? 'border-red-300' : ''}`}
                            placeholder="Enter your phone number"
                        disabled={!!user}
                          />
                          {phoneError && <p className="mt-1 text-sm text-red-600">{phoneError}</p>}
                  </div>
                </div>

                      {/* Owner Email */}
                    <div>
                        <label htmlFor="ownerEmail" className="block text-sm font-medium text-gray-700">Email Address</label>
                        <div className="mt-1">
                      <input
                            type="email"
                            id="ownerEmail"
                            value={formData.ownerEmail}
                            onChange={(e) => {
                              setFormData({ ...formData, ownerEmail: e.target.value });
                              // 实时验证电子邮箱格式
                              if (e.target.value.trim()) {
                                if (!validateEmail(e.target.value.trim())) {
                                  setEmailError('Please enter a valid email address (e.g. name@example.com)');
                                } else {
                                  setEmailError('');
                                }
                              } else {
                                setEmailError('');
                              }
                            }}
                            onBlur={(e) => {
                              // 失去焦点时再次验证
                              if (e.target.value.trim() && !validateEmail(e.target.value.trim())) {
                                setEmailError('Please enter a valid email address (e.g. name@example.com)');
                              }
                            }}
                            className={`block w-full rounded-md shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 sm:text-base p-2 border border-gray-300
                              ${emailError ? 'border-red-300' : ''}`}
                            placeholder="Enter your email address"
                            disabled={!!user}
                          />
                          {emailError && <p className="mt-1 text-sm text-red-600">{emailError}</p>}
                          {user && <p className="mt-1 text-sm text-gray-500">You are logged in. Contact information will be taken from your account.</p>}
                    </div>
                  </div>
                </div>

                    {/* Date and time */}
                    <div className="space-y-4">
                      <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <Calendar className="w-5 h-5 mr-2" />
                        Select Date and Time
                  </h2>
                  
                      {/* Date selection */}
                      <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                        <div className="mt-1 relative">
                        <input
                            type="date"
                        id="date"
                            ref={dateInputRef}
                            min={new Date().toISOString().split('T')[0]}
                          value={formData.date}
                            onChange={(e) => {
                              const selectedDate = new Date(e.target.value);
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              
                              setFormData({ ...formData, date: e.target.value, time: '' });
                              
                              if (selectedDate < today) {
                                setFormErrors({ ...formErrors, date: 'Please select today or a future date' });
                              } else {
                                setFormErrors({ ...formErrors, date: '' });
                              }
                            }}
                            className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 sm:text-base p-2"
                            onClick={(e) => {
                              const input = e.target as HTMLInputElement;
                              input.showPicker();
                            }}
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Calendar className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                        {formErrors.date && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.date}</p>
                        )}
                  </div>

                      {/* Time selection */}
                      {formData.date && formData.serviceType && (
                        <div ref={timeSelectionRef}>
                          <label className="block text-sm font-medium text-gray-700">Time</label>
                          <p className="text-sm text-gray-500 mb-2">
                            Please select an available time slot · Working hours: 10:00 AM - 10:00 PM
                      {formData.serviceType && (
                              <span> · Requires {serviceTypes.find(s => s._id === formData.serviceType)?.duration || '-'}</span>
                            )}
                          </p>
                          
                          {loading ? (
                            <div className="py-4 flex justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
                          </div>
                          ) : timeSlots.length === 0 ? (
                            <p className="text-gray-600 py-4">No time slots available for the selected date. Please choose another date.</p>
                          ) : (
                            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                              {timeSlots.map((slot, slotIndex) => {
                                // 检查时间槽是否可用
                                const isDisabled = !slot.available;
                                const isBookingFull = slot.currentBookings >= 5;
                                
                                // 获取服务时长（小时数）
                                const serviceDuration = getServiceDuration(formData.serviceType);
                                
                                // 检查当前slot是否是选中时间槽或连续时间段的一部分
                                const isSelected = (() => {
                                  if (!formData.time) return false;
                                  
                                  // 找到当前选中时间槽的索引
                                  const selectedSlotIndex = timeSlots.findIndex(s => s.time === formData.time);
                                  if (selectedSlotIndex === -1) return false;
                                  
                                  // 如果当前渲染的时间槽在选中的时间范围内，则显示为已选择
                                  return slotIndex >= selectedSlotIndex && slotIndex < selectedSlotIndex + serviceDuration;
                                })();
                          
                          return (
                                  <button
                                    key={slot.time}
                                    type="button"
                                    disabled={isDisabled || isBookingFull}
                                    className={`py-2 px-3 text-sm rounded focus:outline-none transition-colors relative min-h-[70px] h-[70px] flex flex-col items-center justify-center
                                      ${isSelected 
                                        ? 'bg-rose-500 text-white border-rose-500 font-medium' 
                                        : isBookingFull
                                          ? 'bg-red-50 text-gray-500 cursor-not-allowed border border-red-200 opacity-90'
                                          : isDisabled
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300 opacity-70' 
                                            : 'bg-white border hover:bg-rose-50 hover:border-rose-300 text-gray-700'
                                      }
                                    `}
                                    title={isBookingFull ? "This time slot is fully booked" : isDisabled ? "This time slot is not available" : "Available"}
                                    onClick={() => {
                                      if (isDisabled || isBookingFull) return;
                                      
                                      // 检查是否有足够的连续时间槽可用
                                      let hasEnoughConsecutiveSlots = true;
                                      
                                      // 只有在用户选择首个时间槽时才进行检查（不是取消选择的情况）
                                      if (formData.time !== slot.time) {
                                        for (let i = 0; i < serviceDuration; i++) {
                                          // 检查是否超出工作时间范围（22:00是最晚的可用时间）
                                          const slotHour = parseInt(slot.time.split(':')[0]);
                                          if (slotHour + i >= 22) {
                                            hasEnoughConsecutiveSlots = false;
                                            setSubmitError(`This service requires ${serviceDuration} hours. Please select an earlier time slot to finish before 10 PM.`);
                                            break;
                                          }
                                          
                                          // 检查每个连续时间槽是否可用
                                          if (slotIndex + i >= timeSlots.length || !timeSlots[slotIndex + i].available) {
                                            hasEnoughConsecutiveSlots = false;
                                            setSubmitError(`This service requires ${serviceDuration} consecutive hours. Some of the required time slots are unavailable.`);
                                            break;
                                          }
                                        }
                                      } else {
                                        // 用户是取消选择，直接允许
                                        setSubmitError('');
                                      }
                                      
                                      if (!hasEnoughConsecutiveSlots) {
                                        return;
                                      } else {
                                        setSubmitError('');
                                      }
                                      
                                      setFormData({ 
                                        ...formData, 
                                        time: formData.time === slot.time ? '' : slot.time 
                                      });
                                      setFormErrors({ 
                                        ...formErrors, 
                                        time: formData.time === slot.time ? 'Please select a time' : '' 
                                      });
                                    }}
                                  >
                                    {formatTo12Hour(slot.time)}
                                    {isBookingFull && (
                                      <span className="text-xs text-red-500 block mt-1 font-medium">Full</span>
                                    )}
                                  </button>
                          );
                        })}
                        </div>
                          )}
                          {formErrors.time && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.time}</p>
                          )}
                            </div>
                          )}
                </div>

                    {/* Notes */}
                <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
                      <div className="mt-1">
                  <textarea
                    id="notes"
                    value={formData.notes}
                          onChange={(e) => {
                            setFormData({ ...formData, notes: e.target.value });
                          }}
                          className="block w-full rounded-md shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 sm:text-base p-2 border border-gray-300"
                          placeholder="Enter any additional notes"
                        />
                      </div>
                </div>

                    {/* Submit button */}
                    <div className="pt-6 border-t border-gray-200">
                      <div className="flex justify-end items-center">
                <button
                  type="submit"
                          disabled={!formData.serviceType || !formData.petType || !formData.petName || !formData.date || !formData.time || 
                                  (!user && (!formData.ownerName || !formData.ownerPhone || !formData.ownerEmail || !validateEmail(formData.ownerEmail))) ||
                                  (formData.dayCare.enabled && formData.dayCare.type === 'longTerm' && (formData.dayCare.days < 2 || isNaN(Number(formData.dayCare.days)))) ||
                                  isSubmitting}
                          className={`px-6 py-3 rounded-md font-medium text-white transition-colors
                            ${(!formData.serviceType || !formData.petType || !formData.petName || !formData.date || !formData.time || 
                                (!user && (!formData.ownerName || !formData.ownerPhone || !formData.ownerEmail || !validateEmail(formData.ownerEmail))) ||
                                (formData.dayCare.enabled && formData.dayCare.type === 'longTerm' && (formData.dayCare.days < 2 || isNaN(Number(formData.dayCare.days)))) ||
                                isSubmitting)
                              ? 'bg-gray-300 cursor-not-allowed'
                              : 'bg-rose-500 hover:bg-rose-600'
                            }`}
                >
                  {isSubmitting ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                            'Confirm Appointment'
                  )}
                </button>
                      </div>
                    </div>
              </form>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroomingAppointment; 