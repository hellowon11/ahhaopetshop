import React from 'react';
import { Bell } from 'lucide-react';

interface Notification {
  id: string;
  type: 'appointment' | 'loyalty';
  message: string;
  date: string;
  isRead: boolean;
}

interface NotificationDropdownProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  onMarkAsRead
}) => {
  return (
    <div className="relative inline-block">
      <button className="relative text-white hover:text-gray-200 transition-colors">
        <Bell className="w-5 h-5" />
        {notifications.some(n => !n.isRead) && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        )}
      </button>
      
      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-2 z-50">
        <div className="px-4 py-2 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-3 text-gray-600 text-center">
              No notifications
            </div>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                className={`px-4 py-3 border-b border-gray-100 last:border-0 ${
                  notification.isRead ? 'bg-white' : 'bg-blue-50'
                }`}
                onClick={() => onMarkAsRead(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {notification.type === 'appointment' ? (
                      <span className="text-xl">📅</span>
                    ) : (
                      <span className="text-xl">🎉</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{notification.date}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationDropdown; 