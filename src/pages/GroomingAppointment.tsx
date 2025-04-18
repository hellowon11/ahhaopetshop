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
      days: 2
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
  
  // 服务类型定义，优先使用后端数据
  const serviceTypes = backendServices.length > 0 
    ? backendServices.map(service => ({
        id: service.id, 
        name: service.name, 
        description: service.description,
        price: service.displayPrice,
        duration: service.displayDuration,
        icon: service.name === 'Basic Grooming' || service.id === 'basic'
          ? <Scissors className="w-10 h-10 text-rose-500 mb-3" />
          : service.name === 'Premium Grooming' || service.id === 'full'
            ? <Sparkles className="w-10 h-10 text-rose-500 mb-3" />
            : <Bath className="w-10 h-10 text-rose-500 mb-3" />,
        features: service.features?.map(f => f.text) || [],
        recommended: service.recommended
      }))
    : [
    { 
      id: 'basic', 
      name: 'Basic Grooming', 
      description: 'Bath, brush, nail trim, ear cleaning',
      price: 'RM 60',
      duration: '1 hour',
      icon: <Scissors className="w-10 h-10 text-rose-500 mb-3" />,
      features: [
        'Bath with premium shampoo',
        'Brushing and detangling',
        'Nail trimming',
        'Ear cleaning'
      ]
    },
    { 
      id: 'full', 
      name: 'Premium Grooming', 
      description: 'Complete grooming experience with professional styling',
      price: 'RM 120',
      duration: '3 hours',
      icon: <Sparkles className="w-10 h-10 text-rose-500 mb-3" />,
      features: [
        'Everything in Basic Grooming',
        'Professional haircut',
        'Custom styling',
        'Sanitary trim',
        'Paw pad trimming'
      ]
    },
    { 
      id: 'spa', 
      name: 'Spa Treatment', 
      description: 'The ultimate luxurious pet relaxation',
      price: 'RM 220',
      duration: '4 hours',
      icon: <Bath className="w-10 h-10 text-rose-500 mb-3" />,
      features: [
        'Everything in Full Grooming',
        'Aromatherapy bath',
        'Deep conditioning treatment',
        'Professional massage',
        'Teeth brushing',
        'Blueberry facial'
      ],
      recommended: true
    }
  ];
  
  // 获取服务时长（优先使用后端数据）
  const getServiceDuration = (serviceType: string): number => {
    if (backendServices.length > 0) {
      const service = backendServices.find(s => s.id === serviceType);
      if (service) return service.duration;
    }
    
    // 后备方案
    switch (serviceType) {
      case 'basic': return 1;
      case 'full': return 3;
      case 'spa': return 4;
      default: return 1;
    }
  };
  
  // 计算基本价格（优先使用后端数据）
  const calculateBasePrice = (serviceType: string): number => {
    if (backendServices.length > 0) {
      const service = backendServices.find(s => s.id === serviceType);
      if (service) return service.price;
    }
    
    // 后备方案
    switch (serviceType) {
      case 'basic': return 60;
      case 'full': return 120;
      case 'spa': return 220;
      default: return 0;
    }
  };
  
  // 计算日托价格（优先使用后端数据）
  const calculateDayCarePrice = (dayCare: { enabled: boolean; type: string; days: number | string; }): number => {
    if (!dayCare.enabled) return 0;
    
    // 检查是否有有效天数
    const days = typeof dayCare.days === 'number' ? dayCare.days : parseInt(String(dayCare.days)) || 0;
    if (dayCare.type === 'longTerm' && days < 2) {
      // 对于多天选项，需要至少2天
      return 0;
    }
    
    if (backendDayCareOptions.length > 0) {
      const option = backendDayCareOptions.find(o => o.type === dayCare.type);
      if (option) {
        if (dayCare.type === 'daily') {
          return option.price;
        } else {
          return days * option.price;
        }
      }
    }
    
    // 后备方案
    if (dayCare.type === 'daily') return 50;
    return days * 80;
  };

  // 计算总价格（会考虑折扣）
  const calculateTotalPrice = (serviceType: string, dayCare: { enabled: boolean; type: string; days: number | string; }, shouldApplyDiscount: boolean): number => {
    // 计算基本美容服务价格
    let groomingPrice = calculateBasePrice(serviceType);
    
    // 添加日托价格
    const dayCarePrice = calculateDayCarePrice(dayCare);
    
    // 计算总价（不含折扣）
    let total = groomingPrice + dayCarePrice;
    
    // 应用会员折扣 - 只应用于美容服务
    if (shouldApplyDiscount && user) {
      // 找到当前服务的折扣率
      let discountRate = 0;
      if (backendServices.length > 0) {
        const service = backendServices.find(s => s.id === serviceType);
        if (service && service.discount) {
          discountRate = service.discount;
        }
      } else {
        // 默认折扣率
        switch (serviceType) {
          case 'basic': discountRate = 5; break;
          case 'full': discountRate = 10; break;
          case 'spa': discountRate = 15; break;
          default: discountRate = 0;
        }
      }
      
      // 计算折扣金额 - 只对美容服务应用
      const discountAmount = (groomingPrice * discountRate) / 100;
      setDiscount(discountAmount);
      
      // 应用折扣
      total -= discountAmount;
    } else {
      setDiscount(0);
    }
    
    return total;
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
          // 获取选定日期的所有预约
          const response = await apiService.appointments.getTimeSlots(formData.date);
          console.log('API response:', response); // 添加日志，查看返回的数据格式
          
          const serviceDuration = getServiceDuration(formData.serviceType);
          
          if (response && Array.isArray(response) && response.length > 0) {
            // 修复时间槽映射逻辑，使用正确的ApiTimeSlotResponse类型
            const allTimeSlots: TimeSlot[] = response.map((apiSlot: ApiTimeSlotResponse) => ({
              time: apiSlot.time,
              available: apiSlot.isAvailable !== undefined ? apiSlot.isAvailable : (apiSlot.available !== undefined ? apiSlot.available : false),
              currentBookings: typeof apiSlot.currentBookings === 'number' ? apiSlot.currentBookings : 
                              (typeof apiSlot.currentBookings === 'string' ? parseInt(apiSlot.currentBookings) : 0)
            }));
            
            // 设置处理好的时间槽
            setTimeSlots(allTimeSlots);
            console.log('Set time slots from API:', allTimeSlots.map(slot => 
              `${slot.time}: avail=${slot.available}, bookings=${slot.currentBookings}`).join(', '));
          } else {
            // 如果API没有返回有效数据，生成默认时间槽
            console.log('API returned no data, using default time slots');
            const defaultSlots = generateDefaultTimeSlots(serviceDuration);
            setTimeSlots(defaultSlots);
          }
        } catch (error) {
          console.error('Failed to fetch time slots:', error);
          setError('Failed to load available time slots. Please try again later.');
          
          // 生成默认时间槽
          const serviceDuration = getServiceDuration(formData.serviceType);
          const defaultSlots = generateDefaultTimeSlots(serviceDuration);
          setTimeSlots(defaultSlots);
          console.log('Set default time slots due to API error:', defaultSlots.length);
        } finally {
          setLoading(false);
        }
      };
      
      // 首次加载时获取时间槽
      fetchAvailableTimes();
      
      // 设置定时刷新，每60秒刷新一次时间槽数据
      const refreshInterval = setInterval(() => {
        console.log('Refreshing time slots...');
        fetchAvailableTimes();
      }, 60000); // 每60秒刷新一次
      
      // 组件卸载时清除定时器
      return () => {
        clearInterval(refreshInterval);
      };
    } else {
      // 如果没有选择日期或服务类型，清空时间槽
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSubmitError('Please fill out all required fields and check for errors.');
      return;
    }

    console.log('提交表单，选择的服务类型ID:', formData.serviceType);
    console.log('服务名称对照:', backendServices.map(s => `${s.id}: ${s.name}`));
    
    // 检查是否已提交
    if (isSubmitting) {
      return;
    }

    // 额外验证：检查选择的时间槽是否仍然可用（预约数量未超限）
    const selectedTimeSlot = timeSlots.find(slot => slot.time === formData.time);
    if (!selectedTimeSlot || !selectedTimeSlot.available || selectedTimeSlot.currentBookings >= 5) {
      setSubmitError('The selected time slot is no longer available. Please choose another time.');
      timeSelectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    // 验证是否有足够的连续时间槽
    const serviceDuration = getServiceDuration(formData.serviceType);
    const selectedSlotIndex = timeSlots.findIndex(slot => slot.time === formData.time);
    
    for (let i = 0; i < serviceDuration; i++) {
      if (selectedSlotIndex + i >= timeSlots.length || 
          !timeSlots[selectedSlotIndex + i].available ||
          timeSlots[selectedSlotIndex + i].currentBookings >= 5) {
        setSubmitError(`This service requires ${serviceDuration} consecutive hours. Some of the required time slots are no longer available.`);
        timeSelectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // Prepare appointment data
      const serviceDuration = getServiceDuration(formData.serviceType);
      
      // Get standardized service name based on service ID
      let serviceTypeName: 'Basic Grooming' | 'Full Grooming' | 'Spa Treatment' = 'Basic Grooming';
      switch (formData.serviceType) {
        case 'basic':
          serviceTypeName = 'Basic Grooming';
          break;
        case 'full':
          serviceTypeName = 'Full Grooming';
          break;
        case 'spa':
          serviceTypeName = 'Spa Treatment';
          break;
        default:
          // 尝试从服务名称直接匹配
          const matchedService = backendServices.find(s => s.id === formData.serviceType);
          if (matchedService) {
            if (matchedService.name === 'Premium Grooming') {
              serviceTypeName = 'Full Grooming';
            } else if (matchedService.name === 'Spa Treatment') {
              serviceTypeName = 'Spa Treatment';
            } else {
              serviceTypeName = 'Basic Grooming';
            }
          }
          console.log(`将服务类型${formData.serviceType}映射为${serviceTypeName}`);
          break;
      }
      
      const appointmentData = {
        petName: formData.petName,
        petType: formData.petType as 'dog' | 'cat',
        date: formData.date,
        time: formData.time,
        serviceType: serviceTypeName,
        duration: serviceDuration,
        notes: formData.notes,
        ownerName: formData.ownerName,
        ownerPhone: formData.ownerPhone,
        ownerEmail: formData.ownerEmail,
        totalPrice: totalPrice,
        status: 'Booked' as 'Booked' | 'Completed' | 'Cancelled',
        dayCareOptions: formData.dayCare.enabled ? {
          type: formData.dayCare.type as 'daily' | 'longTerm',
          days: formData.dayCare.days,
          morning: true,         // Default to full day
          afternoon: true,
          evening: true
        } : undefined,
        // 如果用户已登录，添加用户ID关联
        user: user?._id
      };
      
      // Send appointment request
      try {
        // 尝试使用忽略授权错误的方式提交预约
        const response = await apiService.appointments.add(appointmentData);
        if (response && response._id) {
      setSubmitSuccess(true);
          setSuccess('Appointment successful! We will contact you soon to confirm.');
          
          // 发送确认邮件给客户
          try {
            // 准备日托信息文本
            let dayCareInfoText = 'Not selected';
            if (formData.dayCare.enabled) {
              if (formData.dayCare.type === 'daily') {
                dayCareInfoText = 'Daily Day Care';
              } else if (formData.dayCare.type === 'longTerm') {
                dayCareInfoText = `${formData.dayCare.days} Days Long-term Day Care`;
              }
            }
            
            const customerTemplateParams = {
              to_name: formData.ownerName,
              to_email: formData.ownerEmail,
              // 添加客户信息字段
              customer_name: formData.ownerName,
              customer_email: formData.ownerEmail,
              customer_phone: formData.ownerPhone,
              member_status: user ? 'Member' : 'Non-member',
              // 预约详情字段
              appointment_date: new Date(formData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              appointment_time: formData.time,
              pet_name: formData.petName,
              pet_type: formData.petType === 'dog' ? 'Dog' : 'Cat',
              service_type: serviceTypeName,
              total_price: totalPrice.toFixed(2),
              price: `RM ${totalPrice.toFixed(2)}`,
              day_care_info: dayCareInfoText,
              // 店铺信息
              shop_address: '123 Jalan ABC, Taman XYZ, 12345 Kuala Lumpur, Malaysia'
            };
            
            console.log('发送客户确认邮件，参数:', customerTemplateParams);
            
            // 发送邮件给客户
            await emailjs.send(
          'service_4awqr8x',
              'template_uznkxfq',
              customerTemplateParams
            );
            
            // 发送邮件给管理员
            const adminTemplateParams = {
              customer_name: formData.ownerName,
              customer_email: formData.ownerEmail,
              customer_phone: formData.ownerPhone,
              member_status: user ? 'Member' : 'Non-member',
              appointment_date: new Date(formData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              appointment_time: formData.time,
              pet_name: formData.petName,
              pet_type: formData.petType === 'dog' ? 'Dog' : 'Cat',
              service_type: serviceTypeName,
              total_price: totalPrice.toFixed(2),
              price: `RM ${totalPrice.toFixed(2)}`,
              day_care_info: dayCareInfoText,
              notes: formData.notes || 'No special notes',
              shop_address: '123 Jalan ABC, Taman XYZ, 12345 Kuala Lumpur, Malaysia'
            };
            
            console.log('发送管理员通知邮件，参数:', adminTemplateParams);
            
            await emailjs.send(
              'service_4awqr8x',
              'template_7cysc9f',
              adminTemplateParams
            );
            
            console.log('Emails sent successfully to customer and admin');
      } catch (emailError) {
            console.error('Failed to send emails:', emailError);
            // 电子邮件发送失败不影响预约成功
          }
          
          // 处理预约成功后的通知创建
          if (user) {
            try {
              // 创建通知数据
              const notificationData = {
                title: `🐾 New ${serviceTypeName} Appointment`,
                message: `Your ${serviceTypeName} appointment for ${formData.petName} (${formData.petType === 'dog' ? 'Dog' : 'Cat'}) on ${new Date(formData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at ${formatTo12Hour(formData.time)} has been confirmed.`,
                type: 'appointment'
              };
              
              // 使用axios直接创建通知
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
              
              // 触发事件让会员仪表板知道有新预约和通知
              window.dispatchEvent(new CustomEvent('appointmentCreated'));
              
              // 强制刷新会员仪表板数据 - 设置一个标志
              sessionStorage.setItem('refreshDashboard', 'true');
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError);
              // 通知创建失败不影响预约成功
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
            type: 'daily',
              days: 2
          }
        });
        setTotalPrice(0);
        setDiscount(0);
      
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (error: any) {
        console.error('Failed to create appointment:', error);
        setSubmitError(error.message || 'Failed to submit appointment. Please try again later.');
        setSubmitSuccess(false);
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
          const service = services.find((s) => s.name === formData.serviceType);
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
                        key={service.id}
                            className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-all duration-200 h-full
                              ${formData.serviceType === service.id 
                                ? 'border-rose-500 bg-rose-50 shadow-lg transform scale-[1.02]' 
                                : 'border-gray-200 hover:border-rose-300 hover:shadow-md hover:bg-gray-50'
                              }
                              ${service.recommended ? 'relative' : ''}
                            `}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                serviceType: formData.serviceType === service.id ? '' : service.id
                              });
                              
                              // Calculate new total
                              const newTotal = formData.serviceType === service.id 
                                ? 0 
                                : calculateTotalPrice(
                                    service.id, 
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
                                {service.icon.type === Scissors || service.icon.type === Bath || service.icon.type === Sparkles ? 
                                  React.cloneElement(service.icon, { className: `w-10 h-10 sm:w-10 sm:h-10 mb-1 sm:mb-2 ${formData.serviceType === service.id ? 'text-rose-600' : 'text-rose-500'}` }) : 
                                  service.icon
                                }
                              <h3 className={`font-bold text-xl sm:text-xl mb-0.5 sm:mb-1 ${formData.serviceType === service.id ? 'text-rose-700' : 'text-gray-900'}`}>{service.name}</h3>
                              <p className="text-sm sm:text-sm text-gray-500 mb-2 sm:mb-3 min-h-[40px]">{service.description}</p>
                              <div className={`font-bold text-2xl sm:text-2xl ${formData.serviceType === service.id ? 'text-rose-600' : 'text-gray-900'}`}>{service.price}</div>
                              <div className="text-sm sm:text-sm text-gray-500 mb-1">
                                {service.duration}
                            </div>
                              {user && (
                                <div className="text-sm sm:text-sm text-green-600 mb-1 sm:mb-2">
                                  {backendServices.length > 0 
                                    ? `${backendServices.find(s => s.id === service.id)?.discount || 0}% Off` 
                                    : service.id === 'basic' ? '5% Off' 
                                      : service.id === 'full' ? '10% Off' 
                                      : service.id === 'spa' ? '15% Off' : ''}
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
                                setFormData({
                                  ...formData,
                                  dayCare: {
                                    ...formData.dayCare,
                                    enabled
                                  }
                                });
                                
                                // Recalculate price
                                if (formData.serviceType) {
                                  const newTotal = calculateTotalPrice(
                                    formData.serviceType, 
                                    { ...formData.dayCare, enabled }, 
                                    !!user
                                  );
                                  setTotalPrice(newTotal);
                                }
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
                                setFormData({
                                ...formData,
                                dayCare: {
                                  ...formData.dayCare,
                                    enabled
                                  }
                                });
                                
                                // Recalculate price
                                if (formData.serviceType) {
                                  const newTotal = calculateTotalPrice(
                                    formData.serviceType, 
                                    { ...formData.dayCare, enabled }, 
                                    !!user
                                  );
                                  setTotalPrice(newTotal);
                                }
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
                                onChange={(e) => {
                                  const type = e.target.value;
                                  const newDayCare = {
                                      ...formData.dayCare,
                                    type
                                  };
                                  setFormData({
                                    ...formData,
                                    dayCare: newDayCare
                                  });
                                  
                                  // Recalculate price
                                  if (formData.serviceType) {
                                    const newTotal = calculateTotalPrice(
                                      formData.serviceType, 
                                      newDayCare, 
                                      !!user
                                    );
                                    setTotalPrice(newTotal);
                                  }
                                }}
                                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 sm:text-base p-2 bg-white"
                              >
                                {backendDayCareOptions.length > 0 ? (
                                  backendDayCareOptions.map(option => (
                                    <option key={option.type} value={option.type}>
                                      {option.type === 'daily' ? 'Single Day' : 'Multiple Days'} - {option.displayPrice}/day
                                    </option>
                                  ))
                                ) : (
                                  <>
                                    <option value="daily">Single Day - RM50/day</option>
                                    <option value="longTerm">Multiple Days - RM80/day</option>
                                  </>
                                )}
                              </select>
                            </div>

                            {/* Number of days */}
                            {formData.dayCare.type === 'longTerm' && (
                              <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700">Days</label>
                                  <input
                                  type="text"
                                    value={formData.dayCare.days}
                                  onChange={(e) => {
                                    const inputValue = e.target.value;
                                    // 允许用户输入任何值，包括非数字字符
                                    const newDayCare = {
                                      ...formData.dayCare,
                                      days: inputValue === '' ? 0 : parseInt(inputValue) || 0
                                    };
                                      setFormData({
                                      ...formData,
                                      dayCare: newDayCare
                                    });
                                    
                                    // Recalculate price
                                    if (formData.serviceType) {
                                      const newTotal = calculateTotalPrice(
                                        formData.serviceType, 
                                        newDayCare, 
                                        !!user
                                      );
                                      setTotalPrice(newTotal);
                                    }
                                  }}
                                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 sm:text-base p-2 bg-white"
                                />
                                {formData.dayCare.days < 2 && (
                                  <p className="mt-1 text-sm text-red-600">Please enter at least 2 days for multiple days option</p>
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
                                      <span> ({backendServices.find(s => s.id === formData.serviceType)?.discount || 0}%)</span>
                                    ) : (
                                      formData.serviceType === 'basic' ? <span> (5%)</span> :
                                      formData.serviceType === 'full' ? <span> (10%)</span> :
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
                              <span> · Requires {serviceTypes.find(s => s.id === formData.serviceType)?.duration || '-'}</span>
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