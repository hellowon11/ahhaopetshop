import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const handleNavigation = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  // 检查用户登录状态
  useEffect(() => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    if (token && !user && !loading) {
      // 如果有 token 但没有用户数据，重新加载页面以触发 AuthContext 的检查
      window.location.reload();
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center">
          <img
            src="/imgs/AH HAO PET SHOP LOGO.png"
            alt="AH HAO PET SHOP Logo"
            className="h-16 sm:h-24 w-auto mx-auto mb-6 sm:mb-8"
          />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-6 sm:mb-8">
            Welcome to <span className="whitespace-nowrap"><span className="text-rose-600">AH HAO</span> PET SHOP</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8">
            Your trusted partner in pet care and happiness
          </p>
          <div className="space-y-4 sm:space-y-6">
            <button 
              onClick={() => navigate('/grooming-appointment')}
              className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-rose-500 text-white 
                       rounded-lg hover:bg-rose-600 transition-colors duration-200
                       text-base sm:text-lg font-medium shadow-md hover:shadow-lg
                       w-full sm:w-auto max-w-xs mx-auto"
            >
              Book Grooming Service
            </button>
            <button 
              onClick={() => navigate('/all-pets')}
              className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-white text-rose-600 
                       border-2 border-rose-600 rounded-lg hover:bg-rose-50 
                       transition-colors duration-200 text-base sm:text-lg font-medium
                       w-full sm:w-auto max-w-xs mx-auto"
            >
              See Our Pets
            </button>
          </div>
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {/* Cute Pets Card */}
          <Link to="/all-pets" className="group relative h-[200px] sm:h-[280px] rounded-2xl overflow-hidden shadow-lg">
            <img 
              src="/imgs/cute-pets@cute-pets.jpg" 
              alt="Cute Pets" 
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white text-xl font-semibold mb-2">Cute Pets</h3>
                <p className="text-white/90 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Find your perfect companion from our selection of lovely pets
                </p>
              </div>
            </div>
          </Link>

          {/* Grooming Card */}
          <Link to="/grooming-appointment" className="group relative h-[200px] sm:h-[280px] rounded-2xl overflow-hidden shadow-lg">
            <img 
              src="/imgs/grooming.jpg" 
              alt="Grooming" 
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white text-xl font-semibold mb-2">Grooming</h3>
                <p className="text-white/90 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Professional pet care services for your furry friends
                </p>
              </div>
            </div>
          </Link>

          {/* Pet Supplies Card */}
          <Link to="/pet-supplies" className="group relative h-[200px] sm:h-[280px] rounded-2xl overflow-hidden shadow-lg">
            <img 
              src="/imgs/pet supplies.jpg" 
              alt="Pet Supplies" 
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white text-xl font-semibold mb-2">Pet Supplies</h3>
                <p className="text-white/90 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Quality products for all your pet's needs
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home; 