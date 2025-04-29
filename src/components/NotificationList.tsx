import React from 'react';
import { Notification } from '../types';

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onMarkAsRead,
  onDelete
}) => {
  return (
    <div className="notification-list">
      <div className="notification-header">
        <h3>通知列表</h3>
      </div>

      {notifications.length === 0 ? (
        <p className="no-data">暂无通知</p>
      ) : (
        <div className="notifications">
          {notifications.map(notification => (
            <div 
              key={notification._id} 
              className={`notification-item ${notification.read ? 'read' : 'unread'}`}
            >
              <div className="notification-info">
                <h4>{notification.title}</h4>
                <p>{notification.message}</p>
                <p className="notification-time">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="notification-actions">
                {!notification.read && (
                  <button
                    onClick={() => onMarkAsRead(notification._id)}
                    className="mark-read-button"
                  >
                    标记为已读
                  </button>
                )}
                <button
                  onClick={() => onDelete(notification._id)}
                  className="delete-button"
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

export default NotificationList; 