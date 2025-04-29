import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AuthButtonsProps {}

const AuthButtons: React.FC<AuthButtonsProps> = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleMemberClick = () => {
    navigate('/member-dashboard');
  };

  return (
    <div className="flex items-center space-x-4">
      {user ? (
        <button
          onClick={handleMemberClick}
          className="px-4 py-2 text-rose-600 border-2 border-rose-600 rounded-lg hover:bg-rose-50 transition-colors duration-300"
        >
          Member
        </button>
      ) : (
        <button
          onClick={handleSignIn}
          className="px-4 py-2 text-rose-600 border-2 border-rose-600 rounded-lg hover:bg-rose-50 transition-colors duration-300"
        >
          Sign In
        </button>
      )}
    </div>
  );
};

export default AuthButtons; 