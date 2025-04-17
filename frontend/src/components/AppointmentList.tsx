import React, { useState } from 'react';
import { Appointment } from '../types';

interface AppointmentListProps {
  appointments: Appointment[];
  onAdd: (appointment: Omit<Appointment, '_id'>) => Promise<void>;
  onUpdate: (id: string, appointmentData: Partial<Appointment>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const AppointmentList: React.FC<AppointmentListProps> = ({
  appointments,
  onAdd,
  onUpdate,
  onDelete
}) => {
  const [newAppointment, setNewAppointment] = useState<Omit<Appointment, '_id'>>({
    petName: '',
    date: '',
    time: '',
    serviceType: '',
    status: 'Booked'
  });
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAppointment) {
      await onUpdate(editingAppointment._id!, newAppointment);
      setEditingAppointment(null);
    } else {
      await onAdd(newAppointment);
    }
    setNewAppointment({
      petName: '',
      date: '',
      time: '',
      serviceType: '',
      status: 'Booked'
    });
    setShowAddForm(false);
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setNewAppointment({
      petName: appointment.petName,
      date: appointment.date,
      time: appointment.time,
      serviceType: appointment.serviceType,
      status: appointment.status
    });
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setEditingAppointment(null);
    setNewAppointment({
      petName: '',
      date: '',
      time: '',
      serviceType: '',
      status: 'Booked'
    });
    setShowAddForm(false);
  };

  return (
    <div className="appointment-list">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">预约列表</h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded"
        >
          {showAddForm ? '取消' : '添加预约'}
        </button>
      </div>
      
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow-md mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">宠物名称</label>
            <input
              type="text"
              placeholder="宠物名称"
              value={newAppointment.petName}
              onChange={(e) => setNewAppointment({ ...newAppointment, petName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
            <input
              type="date"
              value={newAppointment.date}
              onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">时间</label>
            <input
              type="time"
              value={newAppointment.time}
              onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">服务类型</label>
            <input
              type="text"
              placeholder="服务类型"
              value={newAppointment.serviceType}
              onChange={(e) => setNewAppointment({ ...newAppointment, serviceType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={newAppointment.status}
              onChange={(e) => setNewAppointment({ ...newAppointment, status: e.target.value as 'Booked' | 'Cancelled' })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              required
            >
              <option value="Booked">已预约</option>
              <option value="Cancelled">已取消</option>
            </select>
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            {editingAppointment && (
              <button type="button" onClick={handleCancel} className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded">
                取消
              </button>
            )}
            <button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded">
              {editingAppointment ? '更新' : '添加'}
            </button>
          </div>
        </form>
      )}
      
      {appointments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded">
          <p className="text-gray-600">暂无预约记录</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {appointments.map((appointment) => (
            <div key={appointment._id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{appointment.petName}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    appointment.status === 'Booked' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {appointment.status === 'Booked' ? '已预约' : '已取消'}
                  </span>
                </div>
                <p className="text-sm text-gray-500">预约编号: {appointment._id?.substring(0, 8)}</p>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">日期</p>
                    <p className="text-sm font-medium">{appointment.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">时间</p>
                    <p className="text-sm font-medium">{appointment.time}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">服务类型</p>
                    <p className="text-sm font-medium">{appointment.serviceType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">日托服务</p>
                    <p className="text-sm font-medium">{appointment.dayCare?.enabled ? '是' : '否'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">联系电话</p>
                    <p className="text-sm font-medium">{appointment.ownerPhone || '-'}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 flex justify-end space-x-2">
                <button 
                  onClick={() => handleEdit(appointment)}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  编辑
                </button>
                <button 
                  onClick={() => onDelete(appointment._id!)}
                  className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentList; 