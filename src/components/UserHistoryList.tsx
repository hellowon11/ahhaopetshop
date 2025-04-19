import React from 'react';
import { Appointment } from '../types';
import { formatToMalaysiaTime } from '../utils/dateUtils';

interface UserHistoryListProps {
  appointments: Appointment[];
}

// 获取预约的日期时间对象
const getAppointmentDateTime = (appointment: Appointment): Date => {
  if (appointment.utcDateTime) {
    return new Date(appointment.utcDateTime);
  }
  if (appointment.date && appointment.time) {
    return new Date(`${appointment.date}T${appointment.time}`);
  }
  return new Date(0);
};

// 格式化日期时间显示为12小时制
const formatDateTime = (appointment: Appointment): string => {
  const date = getAppointmentDateTime(appointment);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// 获取预约状态的样式和显示文本
const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'Completed':
      return {
        text: 'Completed',
        bgColor: '#dbeafe',
        textColor: '#1e40af'
      };
    case 'Cancelled':
      return {
        text: 'Cancelled',
        bgColor: '#fee2e2',
        textColor: '#991b1b'
      };
    default:
      return {
        text: status.charAt(0).toUpperCase() + status.slice(1),
        bgColor: '#f3f4f6',
        textColor: '#374151'
      };
  }
};

const UserHistoryList: React.FC<UserHistoryListProps> = ({
  appointments
}) => {
  // 过滤出已完成和已取消的预约并按时间倒序排序
  const historyAppointments = appointments
    .filter(appointment => 
      appointment.status === 'Completed' || appointment.status === 'Cancelled'
    )
    .sort((a, b) => {
      const dateA = getAppointmentDateTime(a);
      const dateB = getAppointmentDateTime(b);
      return dateB.getTime() - dateA.getTime(); // 倒序排序，最新的在前面
    });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Appointment History</h2>
      {historyAppointments.length === 0 ? (
        <p className="text-gray-500">No history appointments</p>
      ) : (
        <div className="space-y-4">
          {historyAppointments.map(appointment => {
            const statusDisplay = getStatusDisplay(appointment.status);
            
            return (
              <div
                key={appointment._id}
                className="bg-white rounded-lg shadow p-4 border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 text-xl">🐾</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold text-gray-900">
                      {appointment.service}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDateTime(appointment)}
                    </p>
                    {appointment.notes && (
                      <p className="text-sm text-gray-600 mt-1">
                        Notes: {appointment.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <span className="px-3 py-1 text-sm font-medium rounded-full" style={{
                      backgroundColor: statusDisplay.bgColor,
                      color: statusDisplay.textColor
                    }}>
                      {statusDisplay.text}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserHistoryList; 