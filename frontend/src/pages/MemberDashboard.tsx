import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { Pet, Appointment } from '../types';
import PetList from '../components/PetList';
import AppointmentList from '../components/AppointmentList';
import '../styles/MemberDashboard.css';

const MemberDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const [petsData, appointmentsData] = await Promise.all([
          apiService.pets.getAll(),
          apiService.appointments.getAll()
        ]);
        setPets(petsData);
        setAppointments(appointmentsData);
      } catch (err) {
        setError('获取数据失败，请稍后重试');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleAddPet = async (pet: Omit<Pet, '_id'>) => {
    if (!user) return;
    
    try {
      const newPet = await apiService.pets.add(pet);
      setPets(prev => [...prev, newPet]);
    } catch (err) {
      setError('添加宠物失败，请稍后重试');
      console.error('Error adding pet:', err);
    }
  };

  const handleUpdatePet = async (id: string, petData: Partial<Pet>) => {
    try {
      const updatedPet = await apiService.pets.update(id, petData);
      setPets(prev => prev.map(pet => pet._id === id ? updatedPet : pet));
    } catch (err) {
      setError('更新宠物失败，请稍后重试');
      console.error('Error updating pet:', err);
    }
  };

  const handleDeletePet = async (id: string) => {
    try {
      await apiService.pets.delete(id);
      setPets(prev => prev.filter(pet => pet._id !== id));
    } catch (err) {
      setError('删除宠物失败，请稍后重试');
      console.error('Error deleting pet:', err);
    }
  };

  const handleAddAppointment = async (appointment: Omit<Appointment, '_id'>) => {
    if (!user) return;
    
    try {
      const newAppointment = await apiService.appointments.add(appointment);
      setAppointments(prev => [...prev, newAppointment]);
    } catch (err) {
      setError('添加预约失败，请稍后重试');
      console.error('Error adding appointment:', err);
    }
  };

  const handleUpdateAppointment = async (id: string, appointmentData: Partial<Appointment>) => {
    try {
      const updatedAppointment = await apiService.appointments.update(id, appointmentData);
      setAppointments(prev => prev.map(appointment => 
        appointment._id === id ? updatedAppointment : appointment
      ));
    } catch (err) {
      setError('更新预约失败，请稍后重试');
      console.error('Error updating appointment:', err);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      await apiService.appointments.delete(id);
      setAppointments(prev => prev.filter(appointment => appointment._id !== id));
    } catch (err) {
      setError('删除预约失败，请稍后重试');
      console.error('Error deleting appointment:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-xl font-semibold text-red-600 mb-3">出错了</h2>
          <p className="text-gray-700">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">会员中心</h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">我的宠物</h2>
              <PetList
                pets={pets}
                onAdd={handleAddPet}
                onUpdate={handleUpdatePet}
                onDelete={handleDeletePet}
              />
            </div>
          </div>
          
          <div className="lg:col-span-8">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">我的预约</h2>
              <AppointmentList
                appointments={appointments}
                onAdd={handleAddAppointment}
                onUpdate={handleUpdateAppointment}
                onDelete={handleDeleteAppointment}
              />
              
              <div className="mt-6 flex justify-center">
                <button 
                  onClick={() => navigate('/grooming-appointment')}
                  className="px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600"
                >
                  预约新服务
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MemberDashboard; 