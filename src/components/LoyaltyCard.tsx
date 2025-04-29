import React from 'react';
import { Check, Gift, Scissors } from 'lucide-react';

interface LoyaltyCardProps {
  completedServices: number;
  totalRequired: number;
}

const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ 
  completedServices = 3,
  totalRequired = 10 
}) => {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 mb-1">Grooming Loyalty Card</h3>
        <p className="text-sm text-gray-600">
          Get a FREE grooming service after {totalRequired} visits!
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-4">
        {[...Array(totalRequired)].map((_, index) => (
          <div
            key={index}
            className={`aspect-square rounded-md flex items-center justify-center p-1
              ${index < completedServices 
                ? 'bg-rose-100 border border-rose-500' 
                : 'bg-gray-50 border border-gray-200'}`}
          >
            {index < completedServices ? (
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-full rounded-full border-2 border-rose-500 opacity-20"></div>
                </div>
                <Check className="w-5 h-5 text-rose-600 relative z-10" />
              </div>
            ) : (
              <Scissors className="w-4 h-4 text-gray-400" />
            )}
          </div>
        ))}
      </div>

      <div className="text-center space-y-2 text-sm">
        <div>
          <span className="text-gray-600">Progress: </span>
          <span className="font-bold text-rose-600">{completedServices}/{totalRequired}</span>
        </div>
        
        {completedServices >= totalRequired ? (
          <div className="bg-green-50 text-green-800 p-2 rounded-lg flex items-center justify-center space-x-2 text-sm">
            <Gift className="w-4 h-4" />
            <span className="font-medium">Congratulations! You've earned a FREE grooming service!</span>
          </div>
        ) : (
          <p className="text-gray-600">
            {totalRequired - completedServices} more visits until your free grooming service!
          </p>
        )}
      </div>

      <div className="mt-4 bg-gray-50 rounded p-3 text-xs text-gray-600">
        <h4 className="font-medium mb-1">How it works:</h4>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Each grooming service counts as one stamp</li>
          <li>Valid for any type of grooming service</li>
          <li>Free service must be redeemed within 3 months</li>
        </ul>
      </div>
    </div>
  );
};

export default LoyaltyCard; 