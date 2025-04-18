import React, { useRef, useState, useEffect } from 'react';
import { PawPrint as Paw, Heart, Phone, Mail, MapPin, Dog, Cat, Bath, Scissors, Medal, Users, Facebook, Instagram, Home, ShoppingBag, ArrowRight, Clock } from 'lucide-react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import PetList from './PetList';
import { useAuth } from '../contexts/AuthContext';
import Navigation from './Navigation';
import AuthButtons from './AuthButtons';
import ChatDogHouse from './ChatDogHouse';

const address = "2, Persiaran Jalil 8, Bukit Jalil, 57000 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur (Pavilion Bukit Jalil)";

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [emailError, setEmailError] = useState('');
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const googleMapsApiKey = "AIzaSyDkUYcDF3nqXz6ETGxwZO-_C-nJtPr6sHE";
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedPetType, setSelectedPetType] = useState<'dog' | 'cat'>('dog');

  useEffect(() => {
    if (location.state) {
      // Handle scrolling to Dogs section from All Pets page
      if ('scrollToDogsSection' in location.state) {
        console.log("MainApp: Scrolling to Dogs section", location.state);
        
        // Delay to ensure DOM is fully loaded
        setTimeout(() => {
          // Use a fixed position that corresponds to the screenshot (constant value)
          // Disable smooth scrolling temporarily
          document.documentElement.style.scrollBehavior = 'auto';
          document.body.style.scrollBehavior = 'auto';
          
          // Use fixed position that matches the screenshot exactly
          window.scrollTo({
            top: 2400 // Absolute position that matches the screenshot
          });
          
          // Set the pet type
          setSelectedPetType('dog');
          
          // Re-enable smooth scrolling after scrolling
          setTimeout(() => {
            document.documentElement.style.scrollBehavior = 'smooth';
            document.body.style.scrollBehavior = 'smooth';
          }, 100);
          
          // Clear navigation state after handling but with a delay
          setTimeout(() => {
            window.history.replaceState({}, document.title);
          }, 200);
        }, 100);
        
        return;
      }
      
      // Handle scrolling to Cats section from All Pets page
      if ('scrollToCatsSection' in location.state) {
        console.log("MainApp: Scrolling to Cats section", location.state);
        
        // Delay to ensure DOM is fully loaded
        setTimeout(() => {
          // Use a fixed position that corresponds to the desired view
          // Disable smooth scrolling temporarily
          document.documentElement.style.scrollBehavior = 'auto';
          document.body.style.scrollBehavior = 'auto';
          
          // Use fixed position that shows the cats section similarly to dogs
          window.scrollTo({
            top: 3000 // Absolute position for cats section below dogs
          });
          
          // Set the pet type
          setSelectedPetType('cat');
          
          // Re-enable smooth scrolling after scrolling
          setTimeout(() => {
            document.documentElement.style.scrollBehavior = 'smooth';
            document.body.style.scrollBehavior = 'smooth';
          }, 100);
          
          // Clear navigation state after handling but with a delay
          setTimeout(() => {
            window.history.replaceState({}, document.title);
          }, 200);
        }, 100);
        
        return;
      }
      
      // Handle returning from All Pets page to specific section
      if ('scrollTo' in location.state && location.state.fromAllPets) {
        const sectionId = location.state.scrollTo;
        const element = document.getElementById(sectionId);
        if (element) {
          const navHeight = 80;
          const elementPosition = element.getBoundingClientRect().top;
          
          // Calculate different offset based on where we're coming from
          let offsetPosition;
          if (location.state.fromViewAllButton) {
            // When returning from View All Dogs/Cats button, position to top of that section
            offsetPosition = elementPosition + window.pageYOffset - navHeight - 10;
          } else {
            // Standard offset for other returns
            offsetPosition = elementPosition + window.pageYOffset - navHeight - 120;
          }
          
          // Disable smooth scrolling temporarily
          document.documentElement.style.scrollBehavior = 'auto';
          document.body.style.scrollBehavior = 'auto';
          
          // Instant scroll
          window.scrollTo({
            top: location.state.maintainScroll ? offsetPosition - 50 : offsetPosition
          });
          
          // Re-enable smooth scrolling after a short delay
          setTimeout(() => {
            document.documentElement.style.scrollBehavior = 'smooth';
            document.body.style.scrollBehavior = 'smooth';
          }, 100);

          // Set the pet type after scrolling
          setSelectedPetType(location.state.scrollTo === 'dogs-section' ? 'dog' : 'cat');
        }
      } 
      // Handle returning from All Pets page to hero section
      else if ('fromHero' in location.state) {
        window.scrollTo({
          top: 0
        });
      } 
      // Handle returning from grooming page to Premium Grooming section
      else if ('scrollToPremiumGrooming' in location.state) {
        const element = document.getElementById('premium-grooming');
        if (element) {
          const navHeight = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - navHeight;

          // Disable smooth scrolling temporarily
          document.documentElement.style.scrollBehavior = 'auto';
          document.body.style.scrollBehavior = 'auto';
          
          window.scrollTo({
            top: offsetPosition
          });
          
          // Re-enable smooth scrolling after a short delay
          setTimeout(() => {
            document.documentElement.style.scrollBehavior = 'smooth';
            document.body.style.scrollBehavior = 'smooth';
          }, 100);
        }
      }

      // Clear the state by replacing, but don't do it for Dogs/Cats sections
      // (they are already cleared above)
      if (!('scrollToDogsSection' in location.state) && 
          !('scrollToCatsSection' in location.state)) {
        // Clear the state for other navigations
        navigate('/', {});
      }
    }
  }, [location.state, navigate]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // 获取导航栏高度
      const navHeight = 80;
      // 获取元素位置
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset;
      
      // 检测是否为移动设备
      const isMobile = window.innerWidth < 768;
      
      // 计算滚动位置
      let scrollPosition;
      if (isMobile) {
        // 移动端: 为不同部分设置特定偏移量
        switch(sectionId) {
          case 'home':
            scrollPosition = 0; // 首页直接滚到顶部
            break;
          case 'about':
            // About Us部分需要更精确的位置调整，使标题恰好位于视图顶部
            scrollPosition = offsetPosition - navHeight + 5;
            break;
          case 'services':
            scrollPosition = offsetPosition - navHeight;
            break;
          case 'our-pets':
            scrollPosition = offsetPosition - navHeight;
            break;
          case 'premium-grooming':
            scrollPosition = offsetPosition - navHeight;
            break;
          case 'contact':
            // For Contact Us section, scroll with a -20px offset on mobile
            scrollPosition = offsetPosition - navHeight + 20;
            break;
          default:
            scrollPosition = offsetPosition - navHeight;
        }
      } else {
        // 桌面端: 保持原有逻辑，但为Contact部分添加15px的负偏移量
        if (sectionId === 'contact') {
          scrollPosition = offsetPosition - navHeight + 15; // Using -15px offset (adding 15px to position)
        } else {
          scrollPosition = offsetPosition - navHeight;
        }
      }
      
      window.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

  const handlePetTypeChange = (type: 'dog' | 'cat') => {
    setSelectedPetType(type);
    const sectionId = type === 'dog' ? 'dogs-section' : 'cats-section';
    const element = document.getElementById(sectionId);
    if (element) {
      // 获取导航栏高度
      const navHeight = 80;
      // 检测是否为移动设备
      const isMobile = window.innerWidth < 768;
      
      // 获取元素位置
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset;
      
      // 计算滚动位置
      let scrollPosition;
      if (isMobile) {
        // 移动端: 将部分放在顶部导航栏下方一小段距离
        scrollPosition = offsetPosition - navHeight - 20;
      } else {
        // 桌面端: 保持原有逻辑
        const extraOffset = type === 'cat' ? 120 : 80;
        scrollPosition = offsetPosition - navHeight - extraOffset;
      }

      window.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setFormStatus('sending');
      const form = formRef.current;
      if (!form) return;

      // 准备发送的数据，使用正确的类型转换方式
      const formElements = form as HTMLFormElement;
      const nameInput = formElements.elements.namedItem('name') as HTMLInputElement;
      const emailInput = formElements.elements.namedItem('email') as HTMLInputElement;
      const phoneInput = formElements.elements.namedItem('phone') as HTMLInputElement;
      const messageInput = formElements.elements.namedItem('message') as HTMLTextAreaElement;

      // 获取当前日期时间
      const now = new Date();
      const formattedDate = now.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // 准备发送到管理员的数据 - 确保参数名称与管理员模板中的变量名完全匹配
      const adminTemplateParams = {
        name: nameInput.value,
        email: emailInput.value,
        phone: phoneInput.value,
        message: messageInput.value,
        submit_date: formattedDate,
        reply_to: emailInput.value
      };

      console.log('Sending admin email with params:', adminTemplateParams);

      // 发送给管理员的邮件
      const adminResponse = await emailjs.send(
        'service_1lvspsq',
        'template_zm1ko18',
        adminTemplateParams,
        'XZAZGsFEqh4uujbjP'
      );

      console.log('EmailJS admin response:', adminResponse);

      // 发送给用户的确认邮件
      if (adminResponse.status === 200) {
        try {
          // 准备发送给用户的确认邮件数据 - 确保变量名与用户模板完全匹配
          const userTemplateParams = {
            name: nameInput.value,
            email: emailInput.value,
            phone: phoneInput.value,
            message: messageInput.value,
            to_email: emailInput.value, // 发送邮件的目标地址
            reply_to: 'ahhaopetshop@gmail.com' // 回复地址
          };
          
          console.log('Sending user confirmation email with params:', userTemplateParams);
          
          const userResponse = await emailjs.send(
            'service_1lvspsq',
            'template_yxcxsx3',
            userTemplateParams,
            'XZAZGsFEqh4uujbjP'
          );
          
          console.log('EmailJS user response:', userResponse);
        } catch (userEmailError) {
          // 记录用户邮件错误详情，以便调试
          console.warn('Failed to send confirmation to user:', userEmailError);
        }
        
        setFormStatus('success');
        form.reset();
      } else {
        throw new Error(`Failed with status: ${adminResponse.status}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setFormStatus('error');
    }
  };

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError('');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address (e.g. name@example.com)');
    } else {
      setEmailError('');
    }
  };

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (path: string, fromHero?: boolean, isGrooming?: boolean) => {
    if (path === '/all-pets' && fromHero) {
      navigate(path, { 
        state: { fromHero: true }
      });
    } else if (path === '/grooming-appointment') {
      // 无论是从哪个按钮导航到预约页面，都添加状态信息
      navigate(path, { 
        state: { fromPremiumGrooming: isGrooming === true }
      });
    } else {
      window.scrollTo(0, 0);
      navigate(path, { replace: true });
    }
  };

  const handleMemberClick = () => {
    navigate('/member-dashboard');
  };

  return (
    <div className="relative">
      <Navigation onSectionClick={scrollToSection} />
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section id="home" className="pt-16 sm:pt-24 pb-10 sm:pb-12 bg-gradient-to-r from-rose-50 to-rose-100">
          <div className="container mx-auto px-6 py-6 sm:py-16">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-8 lg:gap-12">
              <div className="text-center lg:text-left lg:w-1/2 space-y-4 sm:space-y-6 mt-4 sm:mt-0">
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Welcome to <span className="text-rose-600">AH HAO</span> PET SHOP
                </h1>
                <p className="text-base sm:text-xl text-gray-600 max-w-2xl">
                  Your trusted partner in pet care and happiness
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                  <button
                    onClick={() => handleNavigate('/grooming-appointment')}
                    className="px-6 py-3 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    Book Grooming Service
                  </button>
                  <button
                    onClick={() => handleNavigate('/all-pets', true)}
                    className="px-6 py-3 bg-white text-rose-600 border-2 border-rose-600 rounded-lg font-medium hover:bg-rose-50 transition-colors duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    Meet Our Pets
                  </button>
                </div>
              </div>
              <div className="lg:w-1/2 mt-6 lg:mt-0">
                <div className="grid grid-rows-2 gap-4 h-[500px]">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group overflow-hidden rounded-lg shadow-xl">
                      <img 
                        src="/imgs/cute-pets.jpg"
                        alt="Cute Pets"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent h-32">
                        <div className="absolute bottom-2 left-4">
                          <h3 className="text-2xl font-bold text-white">Cute Pets</h3>
                          <p className="text-sm text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300">Dogs and Cats</p>
                        </div>
                      </div>
                    </div>
                    <div className="relative group overflow-hidden rounded-lg shadow-xl">
                      <img 
                        src="/imgs/grooming.jpg"
                        alt="Grooming Service"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent h-32">
                        <div className="absolute bottom-2 left-4">
                          <h3 className="text-2xl font-bold text-white">Grooming</h3>
                          <p className="text-sm text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300">Professional pet care</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group overflow-hidden rounded-lg shadow-xl">
                      <img 
                        src="/imgs/pet supplies.jpg"
                        alt="Pet Supplies"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent h-32">
                        <div className="absolute bottom-2 left-4">
                          <h3 className="text-2xl font-bold text-white">Pet Supplies</h3>
                          <p className="text-sm text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300">Quality products</p>
                        </div>
                      </div>
                    </div>
                    <div className="relative group overflow-hidden rounded-lg shadow-xl">
                      <img 
                        src="/imgs/pet daycare.jpg"
                        alt="Pet Daycare"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent h-32">
                        <div className="absolute bottom-2 left-4">
                          <h3 className="text-2xl font-bold text-white">Pet Daycare</h3>
                          <p className="text-sm text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300">Safe and fun</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-12 sm:py-16 bg-white">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 mb-8 sm:mb-12">About Us</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-4xl mx-auto text-center">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 mb-6">
                  <svg className="w-full h-full text-rose-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold mb-3">Passionate Care</h3>
                <p className="text-gray-600">We treat every pet as our own family member</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 mb-6">
                  <svg className="w-full h-full text-rose-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="9" r="6" fill="currentColor"/>
                    <path d="M7.5 14.5L5 22L9 19L12 22L15 19L19 22L16.5 14.5" fill="currentColor"/>
                    <circle cx="12" cy="9" r="3" fill="white"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold mb-3">Professional Service</h3>
                <p className="text-gray-600">Certified professionals with years of experience</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 mb-6">
                  <svg className="w-full h-full text-rose-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 7C16 9.21 14.21 11 12 11C9.79 11 8 9.21 8 7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7Z" fill="currentColor" />
                    <path d="M12 14C8.13 14 5 17.13 5 21H19C19 17.13 15.87 14 12 14Z" fill="currentColor" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold mb-3">Community Focus</h3>
                <p className="text-gray-600">Building lasting relationships with pet owners</p>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-12 sm:py-16 bg-white">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 mb-6 sm:mb-6">Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {/* Grooming Service */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="p-6">
                  <Scissors className="h-8 w-8 text-rose-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Premium Grooming</h3>
                  <p className="text-gray-600">
                    Professional grooming services for both dogs and cats, including bathing, haircuts, and nail trimming.
                  </p>
                </div>
              </div>

              {/* Quality Pets */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="p-6">
                  <Dog className="h-8 w-8 text-rose-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Quality Dogs & Cats</h3>
                  <p className="text-gray-600">
                    Healthy and adorable puppies and kittens from reputable breeders.
                  </p>
                </div>
              </div>

              {/* Pet Daycare */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="p-6">
                  <Home className="h-8 w-8 text-rose-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Pet Daycare</h3>
                  <p className="text-gray-600">
                    Comfortable dog and cat hotel services with 24/7 care and attention. Your pets can play and socialize with other dogs and cats in our supervised play areas.
                  </p>
                </div>
              </div>

              {/* Pet Supplies */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="p-6">
                  <ShoppingBag className="h-8 w-8 text-rose-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Pet Supplies</h3>
                  <p className="text-gray-600">
                    High-quality pet food, toys, accessories, and grooming products for your beloved pets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Premium Grooming Section */}
        <section id="premium-grooming" className="py-16 sm:py-24 bg-gradient-to-br from-rose-50 via-white to-rose-50 overflow-hidden">
          <div className="container mx-auto px-6">
            <div className="relative">
              <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
                {/* Left Content */}
                <div className="lg:pr-8 mb-10 lg:mb-0">
                  <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">Premium Grooming</h2>
                  <p className="text-lg text-gray-600 mb-8">
                    From basic baths to luxury spa treatments, we offer professional grooming services for all breeds.
                  </p>
                  <div className="mb-8">
                    <p className="text-xl text-gray-900 font-semibold mb-6">Starting from RM50</p>
                    <div className="relative pl-4 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-full before:w-1 before:bg-gradient-to-b before:from-rose-500 before:to-rose-300 before:rounded-full">
                      <div className="flex items-center gap-3">
                        <div className="bg-rose-100 p-2 rounded-lg">
                          <Home className="h-5 w-5 text-rose-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Daycare Available</h4>
                          <p className="text-gray-600">Extend your pet's stay with us after grooming</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/grooming-appointment', { state: { from: 'premium-grooming' } })}
                    className="inline-flex items-center px-8 py-3 bg-rose-600 text-white rounded-xl font-medium text-lg shadow-lg hover:bg-rose-700 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl gap-2"
                  >
                    Learn More
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
                {/* Right Image */}
                <div className="relative">
                  <div className="aspect-w-4 aspect-h-3 rounded-2xl overflow-hidden shadow-2xl">
                    <img
                      src="/imgs/premium-pet-grooming.jpg"
                      alt="Premium Pet Grooming"
                      className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pets Section */}
        <section id="our-pets" className="py-12 md:py-16 bg-gray-50">
          <div className="container mx-auto px-6">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Meet Our Pets</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-3">
                Looking for a new furry companion? Meet some of our adorable friends looking for their forever homes.
              </p>
              <p className="text-base text-rose-600 max-w-2xl mx-auto mb-6">
                ✓ All pets are fully vaccinated and receive regular veterinary check-ups for health assurance
              </p>
              {/* Mobile View - See All Pets Button */}
              <div className="md:hidden mt-2 mb-8">
                <button
                  onClick={() => navigate('/all-pets')}
                  className="w-full bg-rose-600 text-white px-6 py-3 rounded-xl font-medium text-lg shadow-lg hover:bg-rose-700 transition-colors duration-300 flex items-center justify-center gap-2"
                >
                  <span>See All Pets</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              {/* Desktop View - Dogs/Cats Buttons */}
              <div className="hidden md:flex justify-center mt-6 space-x-4">
                <button
                  onClick={() => handlePetTypeChange('dog')}
                  className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                    selectedPetType === 'dog'
                      ? 'bg-rose-600 text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-rose-50 border-2 border-rose-600'
                  }`}
                >
                  <Dog className="w-5 h-5 mr-2" />
                  Dogs
                </button>
                <button
                  onClick={() => handlePetTypeChange('cat')}
                  className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                    selectedPetType === 'cat'
                      ? 'bg-rose-600 text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-rose-50 border-2 border-rose-600'
                  }`}
                >
                  <Cat className="w-5 h-5 mr-2" />
                  Cats
                </button>
              </div>
            </div>
            
            {/* PetList 组件 */}
            <div className="hidden md:block">
              <PetList />
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="bg-white py-12 md:py-16">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 mb-8 md:mb-12">Contact Us</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
              <div className="space-y-8">
                <div className="flex items-center">
                  <Phone className="h-6 w-6 text-rose-600 mr-4 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold">Phone</h3>
                    <p className="text-gray-600">+6010-2568641</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="h-6 w-6 text-rose-600 mr-4 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold">Email</h3>
                    <p className="text-gray-600">ahhaopetshop@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="h-6 w-6 text-rose-600 mr-4 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold">Hours</h3>
                    <p className="text-gray-600">Mon-Sun 10AM-10PM</p>
                  </div>
                </div>
                {/* Social Media Links */}
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-rose-600 mr-4 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Follow Us</h3>
                    <div className="flex items-center space-x-4">
                      <a
                        href="https://web.facebook.com/jie.hao.14"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 p-2 rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
                        aria-label="Visit our Facebook page"
                      >
                        <Facebook className="h-5 w-5 text-white" />
                      </a>
                      <a
                        href="https://www.instagram.com/jiehao_08/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gradient-to-br from-pink-500 via-rose-500 to-yellow-500 p-2 rounded-lg hover:opacity-90 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
                        aria-label="Visit our Instagram page"
                      >
                        <Instagram className="h-5 w-5 text-white" />
                      </a>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-start mb-4">
                    <MapPin className="h-6 w-6 text-rose-600 mr-4 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold">Address</h3>
                      <p className="text-gray-600">{address}</p>
                    </div>
                  </div>
                  <div className="w-full h-64 rounded-lg overflow-hidden shadow-md">
                    <iframe
                      title="AH HAO PET SHOP Location"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      src={`https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodeURIComponent(address)}`}
                    ></iframe>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-8 rounded-lg shadow-md">
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                  <div className="mb-5">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                      Name
                    </label>
                    <input
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder="Your Name"
                    />
                  </div>
                  <div className="mb-5">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                      Email
                    </label>
                    <input
                      className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 ${emailError ? 'border-red-500' : ''}`}
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="Your Email"
                      onChange={(e) => validateEmail(e.target.value)}
                      onBlur={(e) => validateEmail(e.target.value)}
                    />
                    {emailError && (
                      <p className="text-red-500 text-xs italic mt-1">{emailError}</p>
                    )}
                  </div>
                  <div className="mb-5">
                    <label htmlFor="phone" className="block text-gray-700 text-sm font-bold mb-2">
                      Contact No
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                      required
                      placeholder="Your Phone Number"
                    />
                  </div>
                  <div className="mb-5">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="message">
                      Message
                    </label>
                    <textarea
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 h-32"
                      id="message"
                      name="message"
                      required
                      placeholder="Your Message"
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    disabled={formStatus === 'sending'}
                    className="bg-rose-600 text-white font-bold py-2 px-4 rounded hover:bg-rose-700 transition duration-300 w-full disabled:opacity-50 relative"
                  >
                    {formStatus === 'sending' ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </span>
                    ) : 'Send Message'}
                  </button>
                  {formStatus === 'success' && (
                    <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md text-center">
                      Thank you for your message! We will get back to you soon.
                    </div>
                  )}
                  {formStatus === 'error' && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-center">
                      Unable to send message. Please try again or contact us via WhatsApp.
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-8">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center mb-4 md:mb-0">
                <div className="flex-shrink-0 -ml-3">
                  <img 
                    src="/imgs/AH HAO PET SHOP LOGO.png"
                    alt="AH HAO PET SHOP Logo"
                    className="h-20 w-auto object-contain mix-blend-screen"
                  />
                </div>
                <span className="ml-3 text-2xl font-bold">AH HAO PET SHOP</span>
              </div>
              {/* Quick Links - Only visible on mobile */}
              <div className="md:hidden w-full mb-6">
                <h3 className="text-xl font-semibold mb-4 text-center">Quick Links</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => scrollToSection('home')}
                    className="text-gray-300 hover:text-white transition-colors duration-300 py-2.5 px-4 rounded-lg hover:bg-gray-700/50"
                  >
                    Home
                  </button>
                  <button 
                    onClick={() => scrollToSection('about')}
                    className="text-gray-300 hover:text-white transition-colors duration-300 py-2.5 px-4 rounded-lg hover:bg-gray-700/50"
                  >
                    About Us
                  </button>
                  <button 
                    onClick={() => scrollToSection('services')}
                    className="text-gray-300 hover:text-white transition-colors duration-300 py-2.5 px-4 rounded-lg hover:bg-gray-700/50"
                  >
                    Services
                  </button>
                  <button 
                    onClick={() => handleNavigate('/grooming-appointment')}
                    className="text-gray-300 hover:text-white transition-colors duration-300 py-2.5 px-4 rounded-lg hover:bg-gray-700/50"
                  >
                    Grooming
                  </button>
                  <button 
                    onClick={() => scrollToSection('our-pets')}
                    className="text-gray-300 hover:text-white transition-colors duration-300 py-2.5 px-4 rounded-lg hover:bg-gray-700/50"
                  >
                    Our Pets
                  </button>
                  <button 
                    onClick={() => navigate('/login')}
                    className="text-gray-300 hover:text-white transition-colors duration-300 py-2.5 px-4 rounded-lg hover:bg-gray-700/50"
                  >
                    Sign Up
                  </button>
                </div>
              </div>
              <div className="text-center md:text-right">
                <p>&copy; 2024 AH HAO PET SHOP. All rights reserved.</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
      <ChatDogHouse phoneNumber="60102568641" />
    </div>
  );
};

export default MainApp; 