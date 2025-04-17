import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';

interface ChatDogHouseProps {
  phoneNumber: string;
}

const ChatDogHouse: React.FC<ChatDogHouseProps> = ({ phoneNumber }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [hasClicked, setHasClicked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 检测是否为移动设备
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // 初始检测
    checkIfMobile();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkIfMobile);
    
    // 组件卸载时移除监听
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  const handleClick = () => {
    if (isMobile) {
      if (!hasClicked) {
        // 第一次点击，显示tooltip
        setIsTooltipVisible(true);
        setHasClicked(true);
        
        // 3秒后自动隐藏tooltip
        setTimeout(() => {
          setIsTooltipVisible(false);
        }, 3000);
      } else {
        // 第二次点击，导航到WhatsApp
        const message = "Hi, I'm interested in your pets. Can you provide more information?";
        window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
        // 重置点击状态，使下次点击又成为"第一次点击"
        setHasClicked(false);
      }
    } else {
      // 桌面端保持原有行为
      const message = "Hi, I'm interested in your pets. Can you provide more information?";
      window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  return (
    <div
      className="fixed bottom-1 right-2 sm:bottom-6 sm:right-6 z-50"
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
    >
      <button
        onClick={handleClick}
        className={`relative group transition-transform duration-300 scale-90 sm:scale-100 ${
          isHovered ? 'transform scale-105' : ''
        }`}
      >
        {/* Dog House SVG */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-lg"
        >
          {/* Roof */}
          <path
            d="M20 50 L50 20 L80 50"
            stroke="#9CA3AF"
            strokeWidth="4"
            fill="#F3F4F6"
            className="transition-all duration-300"
          />
          
          {/* House Body */}
          <path
            d="M25 50 L25 80 L75 80 L75 50"
            stroke="#9CA3AF"
            strokeWidth="4"
            fill="#F3F4F6"
            className="transition-all duration-300"
          />
          
          {/* Door - Bone Shape */}
          <path
            d="M45 60 
               C45 57 47 55 50 55
               C53 55 55 57 55 60
               C55 63 53 65 50 65
               C47 65 45 63 45 60"
            fill="#9CA3AF"
            className="transition-all duration-300"
          />
          
          {/* Paw Print */}
          <path
            d="M65 70
               A2 2 0 1 1 69 70
               M63 73
               A2 2 0 1 1 67 73
               M67 73
               A2 2 0 1 1 71 73
               M65 76
               A2 2 0 1 1 69 76"
            fill="#9CA3AF"
            className="transition-all duration-300"
          />
        </svg>

        {/* Chat Icon */}
        <div className={`absolute top-[30px] right-[30px] transition-all duration-500 ${
          isHovered ? 'transform scale-110' : ''
        }`}>
          <MessageCircle className="w-5 h-5 text-gray-400 animate-bounce" />
        </div>

        {/* Hover/Click Message */}
        <div className={`absolute -top-10 right-0 bg-white rounded-full px-3 py-1 shadow-lg transition-opacity duration-300 ${
          (isHovered || isTooltipVisible) ? 'opacity-100' : 'opacity-0'
        }`}>
          <p className="text-xs font-medium text-gray-600 whitespace-nowrap">
            Chat with us
          </p>
        </div>
      </button>
    </div>
  );
};

export default ChatDogHouse; 