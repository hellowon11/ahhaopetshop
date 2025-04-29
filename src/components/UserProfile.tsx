import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, Save, Edit2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

interface UserProfileData {
  name: string;
  phone: string;
  email: string;
}

const UserProfile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfileData>({
    name: '',
    phone: '',
    email: user?.email || '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setError(null);
      await updateUser({
        name: profile.name,
        phone: profile.phone
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <span className="bg-blue-100 rounded-full p-2 mr-3">
            <User className="w-5 h-5 text-blue-600" />
          </span>
          User Profile
        </h2>
        {isEditing ? (
          <button
            onClick={handleSave}
            className="text-gray-600 hover:text-blue-600 transition-colors"
          >
            <Save className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-gray-600 hover:text-blue-600 transition-colors"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Name */}
        <div className="flex items-center space-x-4">
          <User className="w-5 h-5 text-gray-400" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            {isEditing ? (
              <input
                type="text"
                name="name"
                value={profile.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your name"
              />
            ) : (
              <p className="text-gray-900">{profile.name || 'Not set'}</p>
            )}
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-center space-x-4">
          <Phone className="w-5 h-5 text-gray-400" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            {isEditing ? (
              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your phone number"
              />
            ) : (
              <p className="text-gray-900">{profile.phone || 'Not set'}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="flex items-center space-x-4">
          <Mail className="w-5 h-5 text-gray-400" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <p className="text-gray-900">{profile.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 