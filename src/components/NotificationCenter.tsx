import React from 'react';
import { Bell, Gift, Calendar, Info } from 'lucide-react';

const NotificationCenter: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-semibold mb-4">Notifications</h3>
      <div className="space-y-4">
        {/* 预约提醒 */}
        <div className="flex items-start space-x-4 p-4 bg-rose-50 rounded-lg">
          <Calendar className="w-6 h-6 text-rose-600 flex-shrink-0" />
          <div>
            <p className="font-medium">Upcoming Appointment</p>
            <p className="text-sm text-gray-600">Your grooming appointment is tomorrow at 10:00 AM</p>
            <button className="text-rose-600 text-sm mt-2 hover:text-rose-700">View Details</button>
          </div>
        </div>

        {/* 特别优惠通知 */}
        <div className="flex items-start space-x-4 p-4 border rounded-lg">
          <Gift className="w-6 h-6 text-rose-600 flex-shrink-0" />
          <div>
            <p className="font-medium">Special Offer</p>
            <p className="text-sm text-gray-600">20% off on spa treatments this weekend!</p>
            <button className="text-rose-600 text-sm mt-2 hover:text-rose-700">Learn More</button>
          </div>
        </div>

        {/* 服务更新通知 */}
        <div className="flex items-start space-x-4 p-4 border rounded-lg">
          <Info className="w-6 h-6 text-rose-600 flex-shrink-0" />
          <div>
            <p className="font-medium">Service Update</p>
            <p className="text-sm text-gray-600">We've added new premium grooming services!</p>
            <button className="text-rose-600 text-sm mt-2 hover:text-rose-700">Check Services</button>
          </div>
        </div>
      </div>

      {/* 没有更多通知时的显示 */}
      {/* <div className="text-center text-gray-500 py-4">
        <p>No new notifications</p>
      </div> */}
    </div>
  );
};

export default NotificationCenter; 