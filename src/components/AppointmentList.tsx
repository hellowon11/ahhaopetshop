import React from 'react';
import { Appointment } from '../types';
import { convertToMalaysiaTime, formatToMalaysiaTime } from '../utils/dateUtils';

interface AppointmentListProps {
  appointments: Appointment[];
  onAdd: (appointmentData: Omit<Appointment, '_id'>) => Promise<void>;
  onUpdate: (id: string, appointmentData: Partial<Appointment>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

// 格式化日期时间显示为12小时制
const formatDateTime = (appointment: Appointment): string => {
  // 如果有UTC时间，优先使用它
  if (appointment.utcDateTime) {
    return formatToMalaysiaTime(appointment.utcDateTime);
  }
  
  // 回退到原始date和time
  if (appointment.date && appointment.time) {
    try {
      const dateObj = new Date(`${appointment.date}T${appointment.time}`);
      return formatToMalaysiaTime(dateObj);
    } catch (error) {
      // 如果解析失败，简单拼接日期和时间
      return `${appointment.date} ${appointment.time || ''}`;
    }
  }
  
  // 最后的回退方案
  return 'Unknown time';
};

// 获取预约的日期时间对象
const getAppointmentDateTime = (appointment: Appointment): Date => {
  if (appointment.utcDateTime) {
    return new Date(appointment.utcDateTime);
  }
  if (appointment.date && appointment.time) {
    return new Date(`${appointment.date}T${appointment.time}`);
  }
  return new Date(0); // 如果没有有效日期，返回最早的时间
};

const AppointmentList: React.FC<AppointmentListProps> = ({
  appointments,
  onAdd,
  onUpdate,
  onDelete
}) => {
  // 对预约按时间排序
  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = getAppointmentDateTime(a);
    const dateB = getAppointmentDateTime(b);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <div className="appointment-list">
      <div className="appointment-header">
        <h3>Upcoming Appointments</h3>
        <button 
          className="add-button"
          onClick={() => {
            // TODO: 实现添加预约的模态框
          }}
        >
          Add Appointment
        </button>
      </div>

      {sortedAppointments.length === 0 ? (
        <p className="no-data">No appointments</p>
      ) : (
        <div className="appointments">
          {sortedAppointments.map(appointment => (
            <div key={appointment._id} className="appointment-item">
              <div className="appointment-info">
                <h4>{appointment.service}</h4>
                <p>Date & Time: {formatDateTime(appointment)}</p>
                <p>Status: {appointment.status}</p>
                {appointment.notes && <p>Notes: {appointment.notes}</p>}
              </div>
              <div className="appointment-actions">
                <button
                  onClick={() => {
                    // TODO: 实现编辑预约的模态框
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(appointment._id)}
                  className="delete-button"
                >
                  Delete
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