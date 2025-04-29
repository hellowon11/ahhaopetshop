import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';

interface NavigationProps {
  onSectionClick: (section: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ onSectionClick }) => {
  const { user, isIntentionalLogin } = useAuth();
  const { isReturningFromDashboard } = useNavigation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // 检测用户登录状态
  useEffect(() => {
    // 检查是否从登出操作返回
    const wasLoggedOut = sessionStorage.getItem('userLoggedOut') === 'true';
    
    if (wasLoggedOut) {
      // 如果有登出标记，清除它并确保登录状态为false
      sessionStorage.removeItem('userLoggedOut');
      setIsLoggedIn(false);
      console.log('Navigation detected logout, updating UI');
    } else if (user && isIntentionalLogin) {
      // 如果有用户数据且是有意识登录，则认为已登录
      setIsLoggedIn(true);
      console.log('User is logged in:', user.name);
    } else {
      setIsLoggedIn(false);
    }
  }, [user, isIntentionalLogin]);

  const handleMemberClick = () => {
    navigate('/member-dashboard');
    setIsMenuOpen(false);
  };

  const handleSignIn = () => {
    navigate('/login');
    setIsMenuOpen(false);
  };

  const handleMenuClick = (section: string) => {
    onSectionClick(section);
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-md fixed w-full z-10">
      <div className="container mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center hover:opacity-95 transition-opacity duration-300"
          >
            <img 
              src="/imgs/AH HAO PET SHOP LOGO.png"
              alt="AH HAO PET SHOP Logo"
              className="h-12 sm:h-16 w-auto object-contain"
            />
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => onSectionClick('home')}
              className="text-gray-700 hover:text-rose-600 bg-transparent border-none font-medium text-base sm:text-lg tracking-wide"
            >
              Home
            </button>
            <button 
              onClick={() => onSectionClick('about')}
              className="text-gray-700 hover:text-rose-600 bg-transparent border-none font-medium text-base sm:text-lg tracking-wide"
            >
              About Us
            </button>
            <button 
              onClick={() => onSectionClick('services')}
              className="text-gray-700 hover:text-rose-600 bg-transparent border-none font-medium text-base sm:text-lg tracking-wide"
            >
              Services
            </button>
            <div className="relative group">
              <button 
                onClick={() => onSectionClick('our-pets')}
                className="text-gray-700 hover:text-rose-600 bg-transparent border-none font-medium text-base sm:text-lg tracking-wide"
              >
                Our Pets
              </button>
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-72 bg-white rounded-lg shadow-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="text-sm text-gray-600 text-center">
                  <p className="font-medium text-rose-600 mb-1">✓ Health Certification Guaranteed</p>
                  <p>All pets are fully vaccinated</p>
                  <p>Regular veterinary check-ups for health assurance</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => onSectionClick('premium-grooming')}
              className="text-gray-700 hover:text-rose-600 bg-transparent border-none font-medium text-base sm:text-lg tracking-wide"
            >
              Premium Grooming
            </button>
            <button 
              onClick={() => onSectionClick('contact')}
              className="text-gray-700 hover:text-rose-600 bg-transparent border-none font-medium text-base sm:text-lg tracking-wide"
            >
              Contact Us
            </button>
            <div className="flex items-center">
              {isLoggedIn ? (
                <button
                  onClick={handleMemberClick}
                  className="flex items-center justify-center text-gray-800 hover:text-rose-600 transition-colors duration-300"
                  title="Member Dashboard"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                    <path d="M19 21C19 17.134 15.866 14 12 14C8.13401 14 5 17.134 5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="px-4 py-2 text-rose-600 border-2 border-rose-600 rounded-lg hover:bg-rose-50 transition-colors duration-300 font-semibold text-base sm:text-lg"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4">
            <div className="flex flex-col space-y-4">
              <button 
                onClick={() => handleMenuClick('home')}
                className="text-gray-700 hover:text-rose-600 bg-transparent border-none font-medium text-base"
              >
                Home
              </button>
              <button 
                onClick={() => handleMenuClick('about')}
                className="text-gray-700 hover:text-rose-600 bg-transparent border-none font-medium text-base"
              >
                About Us
              </button>
              <button 
                onClick={() => handleMenuClick('services')}
                className="text-gray-700 hover:text-rose-600 bg-transparent border-none font-medium text-base"
              >
                Services
              </button>
              <button 
                onClick={() => handleMenuClick('our-pets')}
                className="text-gray-700 hover:text-rose-600 bg-transparent border-none font-medium text-base"
              >
                Our Pets
              </button>
              <button 
                onClick={() => handleMenuClick('premium-grooming')}
                className="text-gray-700 hover:text-rose-600 bg-transparent border-none font-medium text-base"
              >
                Premium Grooming
              </button>
              <button 
                onClick={() => handleMenuClick('contact')}
                className="text-gray-700 hover:text-rose-600 bg-transparent border-none font-medium text-base"
              >
                Contact Us
              </button>
              <div className="flex justify-center w-full">
                {isLoggedIn ? (
                  <button
                    onClick={handleMemberClick}
                    className="px-4 py-2 text-rose-600 border-2 border-rose-600 rounded-lg hover:bg-rose-50 transition-colors duration-300 font-semibold text-base sm:text-lg"
                  >
                    Member
                  </button>
                ) : (
                  <button
                    onClick={handleSignIn}
                    className="px-4 py-2 text-rose-600 border-2 border-rose-600 rounded-lg hover:bg-rose-50 transition-colors duration-300 font-semibold text-base"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation; 