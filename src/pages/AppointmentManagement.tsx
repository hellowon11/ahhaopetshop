import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Scissors, Dog, Cat, ChevronLeft, User, Home, Bath, Sparkles, Trash2, Edit2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { Appointment, GroomingService, DayCareOption, TimeSlot } from '../types';
import { convertToMalaysiaTime, formatDateTimeForDisplay } from '../utils/dateUtils';

interface ExtendedAppointment extends Omit<Appointment, 'dayCareOptions' | 'serviceType'> {
  petName: string;
  petType: 'dog' | 'cat';
  time: string;
  service: string;
  serviceType: 'Basic Grooming' | 'Premium Grooming' | 'Spa Treatment';
  dayCareOptions?: Appointment['dayCareOptions'];
  totalPrice: number;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
}

interface TimeSlotWithBookings extends TimeSlot {
  currentBookings: number;
  available: boolean;
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
  const [editForm, setEditForm] = useState<Partial<Pick<ExtendedAppointment, 'petName' | 'service' | 'date' | 'time' | 'notes' | 'dayCareOptions'>>>({});
  const [availableTimeSlots, setAvailableTimeSlots] = useState<Array<TimeSlotWithBookings>>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [expandedPriceDetails, setExpandedPriceDetails] = useState<Record<string, boolean>>({});
  const [groomingServices, setGroomingServices] = useState<GroomingService[]>([]);
  const [dayCareOptions, setDayCareOptions] = useState<DayCareOption[]>([]);

  const fetchServicesData = async () => {
    try {
      const [servicesResponse, dayCareResponse] = await Promise.all([
        apiService.services.getGroomingServices(),
        apiService.services.getDayCareOptions()
      ]);
      
      console.log('Fetched grooming services:', servicesResponse);
      console.log('Fetched daycare options:', dayCareResponse);
      
      setGroomingServices(Array.isArray(servicesResponse) ? servicesResponse : []);
      setDayCareOptions(Array.isArray(dayCareResponse) ? dayCareResponse : []);
    } catch (error) {
      console.error('Error fetching services data:', error);
      setError('Failed to fetch services data');
      setGroomingServices([]);
      setDayCareOptions([]);
    }
  };

  const calculateBasePrice = (serviceType: string): number => {
    const mappedServiceType = serviceType === 'Full Grooming' ? 'Premium Grooming' : serviceType;
    console.log(`[calculateBasePrice] Input: "${serviceType}", Mapped: "${mappedServiceType}"`);

    if (!groomingServices || groomingServices.length === 0) {
      console.warn(`[calculateBasePrice] Grooming services not loaded. Using fallback for "${mappedServiceType}".`);
      if (mappedServiceType === 'Premium Grooming') return 140;
      if (mappedServiceType === 'Basic Grooming') return 70;
      if (mappedServiceType === 'Spa Treatment') return 220;
        return 0;
    }

    const service = groomingServices.find(s => s.name === mappedServiceType);
    if (!service) {
      console.warn(`[calculateBasePrice] Service named "${mappedServiceType}" not found. Using fallback.`);
      if (mappedServiceType === 'Premium Grooming') return 140;
      if (mappedServiceType === 'Basic Grooming') return 70;
      if (mappedServiceType === 'Spa Treatment') return 220;
      return 0;
    }
    
    if (typeof service.price !== 'number' || isNaN(service.price)) {
      console.error(`[calculateBasePrice] Invalid price for "${mappedServiceType}": ${service.price}. Using fallback.`);
      if (mappedServiceType === 'Premium Grooming') return 140;
      if (mappedServiceType === 'Basic Grooming') return 70;
      if (mappedServiceType === 'Spa Treatment') return 220;
      return 0;
    }
    return service.price;
  };

  const calculateDayCarePrice = (options?: Appointment['dayCareOptions']): number => {
    if (!options?.type || !options.days || options.days <= 0) {
      return 0;
    }
    if (!dayCareOptions || dayCareOptions.length === 0) {
        console.warn(`[calculateDayCarePrice] DayCare options not loaded yet.`);
        const dailyRate = options.type === 'daily' ? 50 : 80; 
        return dailyRate * options.days;
    }

    const option = dayCareOptions.find(opt => opt.type === options.type);
    if (!option) {
      console.warn(`[calculateDayCarePrice] DayCare option type "${options.type}" not found. Using fallback.`);
       const dailyRate = options.type === 'daily' ? 50 : 80; 
       return dailyRate * options.days;
    }
     if (typeof option.price !== 'number' || isNaN(option.price)) {
        console.error(`[calculateDayCarePrice] Invalid price for DayCare type "${options.type}": ${option.price}. Using fallback.`);
         const dailyRate = options.type === 'daily' ? 50 : 80; 
         return dailyRate * options.days;
     }

    return option.price * options.days;
  };

  const calculateTotalPrice = (serviceType: string, dayCareOptions?: Appointment['dayCareOptions']): number => {
    const mappedServiceType = serviceType === 'Full Grooming' ? 'Premium Grooming' : serviceType;
    const baseGroomingPrice = calculateBasePrice(mappedServiceType);
    const dayCarePrice = calculateDayCarePrice(dayCareOptions);
    let total = baseGroomingPrice + dayCarePrice;
    
    if (user) {
        const service = groomingServices.find(s => s.name === mappedServiceType);
        let discountRate = 8;
        if (service && typeof service.discount === 'number' && !isNaN(service.discount)) {
            discountRate = service.discount;
        } else if (service) {
          console.warn(`[calculateTotalPrice] Missing or invalid discount for service "${mappedServiceType}", using default ${discountRate}%`);
        } else {
             console.warn(`[calculateTotalPrice] Service "${mappedServiceType}" not found for discount calculation, using default ${discountRate}%`);
        }
        
      const discountMultiplier = 1 - (discountRate / 100);
      total = (baseGroomingPrice * discountMultiplier) + dayCarePrice;
    }

    console.log(`[calculateTotalPrice] Service: ${mappedServiceType}, Base: ${baseGroomingPrice}, Daycare: ${dayCarePrice}, Total: ${total}`);
    return Math.round(total * 100) / 100;
  };

  const getAvailableTimesByService = (service: string) => {
    const allTimeSlots = [
      '10:00', '11:00', '12:00', '13:00', '14:00',
      '15:00', '16:00', '17:00', '18:00', '19:00',
      '20:00', '21:00'
    ];
    const mappedService = service === 'Full Grooming' ? 'Premium Grooming' : service;

    switch (mappedService) {
      case 'Spa Treatment':
        return allTimeSlots.filter(time => {
          const hour = parseInt(time.split(':')[0]);
          return hour >= 10 && hour <= 18;
        });
      case 'Premium Grooming':
        return allTimeSlots.filter(time => {
          const hour = parseInt(time.split(':')[0]);
          return hour >= 10 && hour <= 19;
        });
      case 'Basic Grooming':
      default:
        return allTimeSlots;
    }
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        await fetchServicesData();
        const response = await apiService.appointments.getAll();
        console.log('Raw appointments from API:', response);

        const extendedAppointments: ExtendedAppointment[] = response
          .filter(apt => apt.status === 'Completed')
          .map((apt): ExtendedAppointment => {
            const originalServiceType = apt.serviceType as string;
            let calculationServiceType: ExtendedAppointment['serviceType'] = 'Basic Grooming';
            if (originalServiceType === 'Full Grooming' || originalServiceType === 'Premium Grooming') {
                calculationServiceType = 'Premium Grooming';
            } else if (originalServiceType === 'Basic Grooming' || originalServiceType === 'Spa Treatment') {
                calculationServiceType = originalServiceType;
            } else {
                 console.warn(`Unrecognized original service type "${originalServiceType}" for apt ${apt._id}, defaulting to Basic Grooming for calculation.`);
                 calculationServiceType = 'Basic Grooming';
            }
            
            const serviceData = groomingServices.find(s => s.name === calculationServiceType);
            const calculatedTotalPrice = calculateTotalPrice(calculationServiceType, apt.dayCareOptions);

            return {
            ...apt,
            petName: apt.petName || '',
              petType: apt.petType || 'dog',
            time: apt.time || '',
              service: originalServiceType,
              serviceType: calculationServiceType,
              dayCareOptions: apt.dayCareOptions,
              totalPrice: calculatedTotalPrice,
            ownerName: apt.ownerName || '',
            ownerPhone: apt.ownerPhone || '',
            ownerEmail: apt.ownerEmail || ''
          };
          })
        .sort((a, b) => {
          const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date;
          const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date;
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
          }
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

  const togglePriceDetails = (appointmentId: string) => {
    setExpandedPriceDetails(prev => ({
      ...prev,
      [appointmentId]: !prev[appointmentId]
    }));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const openMenuIds = Object.keys(expandedPriceDetails).filter(id => expandedPriceDetails[id]);
      
      if (openMenuIds.length > 0) {
        let clickedOutside = true;
        
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
        
        if (clickedOutside) {
          setExpandedPriceDetails({});
        }
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [expandedPriceDetails]);

  const handleEditAppointment = (appointment: ExtendedAppointment) => {
    console.log('Editing appointment:', appointment);
    const appointmentDate = typeof appointment.date === 'string' ? appointment.date : appointment.date.toISOString().split('T')[0];
    setSelectedDate(appointmentDate);
    setSelectedAppointment(appointment);
    setEditForm({
      petName: appointment.petName,
      service: appointment.service,
      date: appointmentDate,
      time: appointment.time,
      dayCareOptions: appointment.dayCareOptions,
      notes: appointment.notes
    });
    setIsEditing(true);
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    setEditForm(prev => ({ ...prev, date: newDate, time: '' }));
    
    try {
      const response = await apiService.appointments.getTimeSlots(newDate);
      const serviceForTimes = editForm.service || selectedAppointment?.service || '';
      const availableTimes = getAvailableTimesByService(serviceForTimes);
      
      const filteredTimeSlots: TimeSlotWithBookings[] = availableTimes.map(time => {
        const existingSlot = response.find(slot => slot.time === time);
        return {
          time,
          available: existingSlot?.available ?? true,
          currentBookings: existingSlot?.currentBookings ?? 0
        } as TimeSlotWithBookings;
      });
      
      setAvailableTimeSlots(filteredTimeSlots);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      const serviceForTimes = editForm.service || selectedAppointment?.service || '';
      const availableTimes = getAvailableTimesByService(serviceForTimes);
      setAvailableTimeSlots(availableTimes.map(time => ({ 
        time, 
        available: true, 
        currentBookings: 0 
      })));
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    try {
      const serviceNameForCalc = editForm.service === 'Full Grooming' ? 'Premium Grooming' : editForm.service;
      const newTotalPrice = calculateTotalPrice(
        serviceNameForCalc || '',
        editForm.dayCareOptions
      );

      const serviceData = groomingServices.find(s => s.name === serviceNameForCalc);
      if (!serviceData && editForm.service) {
          throw new Error(`Could not find service data for ${serviceNameForCalc} during edit submit.`);
      }

      const updatedData: Partial<Appointment> = {
        petName: editForm.petName,
        serviceId: serviceData?.id,
        notes: editForm.notes,
        dayCareOptions: editForm.dayCareOptions,
        totalPrice: newTotalPrice,
        date: editForm.date || '',
        time: editForm.time || '',
        ownerName: selectedAppointment.ownerName,
        ownerPhone: selectedAppointment.ownerPhone,
        ownerEmail: selectedAppointment.ownerEmail,
        status: selectedAppointment.status 
      };
      
      Object.keys(updatedData).forEach(key => updatedData[key] === undefined && delete updatedData[key]);

      const responseAppointment = await apiService.appointments.update(
        selectedAppointment._id!,
        updatedData
      );

      const updateAppointments = (prevAppointments: ExtendedAppointment[]) => 
        prevAppointments.map(apt =>
          apt._id === selectedAppointment._id
            ? {
                ...apt,
                ...responseAppointment,
                petType: responseAppointment.petType || apt.petType,
                service: responseAppointment.serviceType || '',
                serviceType: (responseAppointment.serviceType === 'Full Grooming' ? 'Premium Grooming' : responseAppointment.serviceType) as ExtendedAppointment['serviceType'],
                totalPrice: responseAppointment.totalPrice ?? newTotalPrice,
              }
            : apt
      );

      setAppointments(updateAppointments);
      setFilteredAppointments(updateAppointments);
      
      setIsEditing(false);
      setSelectedAppointment(null);
    } catch (error) {
      setError('Failed to update appointment');
      console.error('Error updating appointment:', error);
    }
  };

  const [previewPrice, setPreviewPrice] = useState<number>(0);

  useEffect(() => {
    if (editForm.service) {
      const serviceNameForCalc = editForm.service === 'Full Grooming' ? 'Premium Grooming' : editForm.service;
      const newPrice = calculateTotalPrice(
        serviceNameForCalc || '',
        editForm.dayCareOptions
      );
      setPreviewPrice(newPrice);
    }
  }, [editForm.service, editForm.dayCareOptions]);

  const formatDateTime = (date: Date | string, time?: string) => {
      if (typeof date === 'string' && time) {
        return formatDateTimeForDisplay(date, time);
      } else if (date instanceof Date) {
      const dateStr = date.toISOString().split('T')[0]; 
      const timeStr = time || date.toTimeString().substring(0, 5);
        return formatDateTimeForDisplay(dateStr, timeStr);
      }
    return String(date);
  };

  const getServiceIcon = (serviceType: string | undefined) => {
    const displayType = serviceType === 'Full Grooming' ? 'Premium Grooming' : serviceType;
    switch (displayType) {
      case 'Basic Grooming': return <Scissors className="w-4 h-4 text-gray-500" />;
      case 'Premium Grooming': return <Sparkles className="w-4 h-4 text-gray-500" />;
      case 'Spa Treatment': return <Bath className="w-4 h-4 text-gray-500" />;
      case 'Pet DayCare': return <Home className="w-4 h-4 text-gray-500" />;
      default: return <Scissors className="w-4 h-4 text-gray-500" />;
    }
  };

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

  useEffect(() => {
    if (editForm.date && editForm.service) {
      handleDateChange({ target: { value: editForm.date } } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [editForm.service]);

  const handleSearch = () => {
    if (!searchDate && !searchTime) {
      setFilteredAppointments(appointments);
      return;
    }

    const filtered = appointments.filter(appointment => {
      const appointmentDate = typeof appointment.date === 'string' 
        ? appointment.date 
        : appointment.date.toISOString().split('T')[0];
      
      const dateMatches = !searchDate || appointmentDate.includes(searchDate);
      
      const timeMatches = !searchTime || appointment.time.includes(searchTime);
      
      return dateMatches && timeMatches;
    });
    
    setFilteredAppointments(filtered);
  };

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
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between md:justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/member-dashboard')}
                className="flex items-center text-gray-800 hover:text-rose-600 transition-colors duration-300"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>
            <h1 className="absolute left-1/2 transform -translate-x-1/2 md:static md:transform-none text-xl font-bold text-gray-800">
              Appointment History
            </h1>
            <div className="w-6 md:w-32">
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-20 pb-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

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
                          {appointment.service === 'Full Grooming' ? 'Premium Grooming' : appointment.service}
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
                          {appointment.dayCareOptions?.type ? 
                            `${appointment.dayCareOptions.type === 'daily' ? 'Daily Care' : 'Long Term Care'}${appointment.dayCareOptions.days > 1 ? ` (${appointment.dayCareOptions.days} days)` : ''}` : 
                            'No'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="col-span-2 mt-2">
                      <p className="text-xs text-gray-500">Price</p>
                      <div className="relative">
                        <div className="flex items-center">
                          <p className="text-lg font-bold text-gray-900">
                            RM {appointment.totalPrice.toFixed(2)}
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
                                RM {calculateBasePrice(appointment.serviceType).toFixed(2)}
                              </span>
                            </div>
                            
                            {appointment.dayCareOptions?.type && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">
                                  Day Care ({appointment.dayCareOptions.type === 'daily' ? 'Daily' : 'Long Term'}
                                  {appointment.dayCareOptions.type === 'longTerm' ? ` ${appointment.dayCareOptions.days} days` : ''}):
                                </span>
                                <span className="text-gray-800">
                                  RM {calculateDayCarePrice(appointment.dayCareOptions).toFixed(2)}
                                </span>
                              </div>
                            )}
                            
                            {user && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">
                                  Member Discount (Grooming Only):
                                </span>
                                <span className="text-rose-600">
                                  -RM {(() => {
                                    const basePrice = calculateBasePrice(appointment.serviceType);
                                    const service = groomingServices.find(s => s.name === appointment.serviceType);
                                    let discountRate = 8; 
                                    if (service && typeof service.discount === 'number' && !isNaN(service.discount)) {
                                      discountRate = service.discount;
                                    }
                                    const discountAmount = (basePrice * discountRate) / 100;
                                    return discountAmount.toFixed(2);
                                  })()}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex justify-between text-xs font-medium pt-1 border-t border-gray-100">
                              <span className="text-gray-800">Total:</span>
                              <span className="text-gray-900 font-bold">
                                RM {appointment.totalPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 bg-gray-50 flex justify-end space-x-3">
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                  {groomingServices.length > 0 ? 
                   groomingServices.map(service => (
                     <option key={service.id} value={service.name}>{service.name}</option>
                   )) : (
                     <>
                  <option value="Basic Grooming">Basic Grooming</option>
                       <option value="Premium Grooming">Premium Grooming</option>
                  <option value="Spa Treatment">Spa Treatment</option>
                     </>
                   )}
                </select>
              </div>

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