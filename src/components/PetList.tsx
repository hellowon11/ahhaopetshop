import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, ZoomIn, X, Heart } from 'lucide-react';
import { shopPets } from '../services/api';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';

interface Pet {
  petId: string;
  name: string;
  breed: string;
  age: string;
  gender: 'Male' | 'Female';
  imageUrl: string;
  type: 'dog' | 'cat';
  isForSale?: boolean;
  _id?: string;
  status?: string;
}

const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

const PetList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [dogPage, setDogPage] = useState(0);
  const [catPage, setCatPage] = useState(0);
  const [dogDisplayCount, setDogDisplayCount] = useState(0);
  const [catDisplayCount, setCatDisplayCount] = useState(0);
  const [dogs, setDogs] = useState<Pet[]>([]);
  const [cats, setCats] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [favourites, setFavourites] = useState<Record<string, boolean>>({});
  const [clickedPetId, setClickedPetId] = useState<string | null>(null);

  const handleViewAllDogs = () => {
    console.log("View All Dogs clicked - navigating to All Pets");
    // Save the current scroll position before navigating
    const scrollPosition = window.pageYOffset;
    sessionStorage.setItem('dogsScrollPosition', scrollPosition.toString());
    
    navigate('/all-pets', { 
      state: { 
        initialType: 'dog',
        fromComponent: 'PetList',
        from: 'dogs-section',
        // Add a timestamp to make each navigation unique
        timestamp: Date.now()
      } 
    });
  };

  const handleViewAllCats = () => {
    console.log("View All Cats clicked - navigating to All Pets");
    // Save the current scroll position before navigating
    const scrollPosition = window.pageYOffset;
    sessionStorage.setItem('catsScrollPosition', scrollPosition.toString());
    
    navigate('/all-pets', { 
      state: { 
        initialType: 'cat',
        fromComponent: 'PetList',
        from: 'cats-section',
        // Add a timestamp to make each navigation unique
        timestamp: Date.now()
      } 
    });
  };

  // 获取用户收藏状态
  useEffect(() => {
    // 只有登录用户才获取收藏列表
    if (user) {
      const fetchFavouritesStatus = async () => {
        try {
          // 获取所有收藏
          const favouritesData = await apiService.favourites.getAll();
          
          // 创建收藏状态映射
          const favouritesMap: Record<string, boolean> = {};
          (favouritesData as any[]).forEach((item) => {
            if (item.pet?._id) {
              favouritesMap[item.pet._id] = true;
            }
          });
          
          setFavourites(favouritesMap);
        } catch (error) {
          console.error('Error fetching favourites status:', error);
        }
      };

      fetchFavouritesStatus();
    }
  }, [user]);

  // 切换收藏状态
  const toggleFavourite = async (petId: string, event: React.MouseEvent) => {
    // 阻止点击事件冒泡
    event.stopPropagation();
    
    if (!user) {
      // 未登录用户提示登录
      alert('Please login to add favourites');
      navigate('/login');
      return;
    }

    try {
      if (favourites[petId]) {
        // 取消收藏
        await apiService.favourites.remove(petId);
        setFavourites(prev => {
          const newFavourites = { ...prev };
          delete newFavourites[petId];
          return newFavourites;
        });
      } else {
        // 添加收藏
        await apiService.favourites.add(petId);
        setFavourites(prev => ({
          ...prev,
          [petId]: true
        }));
      }
    } catch (error) {
      console.error('Error toggling favourite:', error);
    }
  };

  // Fetch pets from backend
  useEffect(() => {
    const fetchPets = async () => {
      try {
        setLoading(true);
        const response = await shopPets.getAll();
        
        if (response.data) {
          const allPets = response.data as Pet[];
          
          // Filter dogs and cats, exclude pets with status 'Sold'
          const fetchedDogs = allPets.filter(pet => pet.type === 'dog' && pet.status !== 'Sold');
          const fetchedCats = allPets.filter(pet => pet.type === 'cat' && pet.status !== 'Sold');
          
          // Sort dogs by petId, but make Milo (#001) always first
          const sortedDogs = fetchedDogs.sort((a, b) => {
            // Milo is always first
            if (a.name === 'Milo' || a.petId === '#001') return -1;
            if (b.name === 'Milo' || b.petId === '#001') return 1;
            
            // Sort other dogs by petId
            const numA = parseInt(a.petId.replace(/[^0-9]/g, ''));
            const numB = parseInt(b.petId.replace(/[^0-9]/g, ''));
            return numA - numB;
          });
          
          // Sort cats by petId
          const sortedCats = fetchedCats.sort((a, b) => {
            const numA = parseInt(a.petId.replace(/[^0-9]/g, ''));
            const numB = parseInt(b.petId.replace(/[^0-9]/g, ''));
            return numA - numB;
          });
          
          setDogs(sortedDogs);
          setCats(sortedCats);
        }
      } catch (err) {
        console.error('Error fetching pets:', err);
        setError('Failed to load pets. Please try again later.');
        
        // Fallback to empty arrays if fetch fails
        setDogs([]);
        setCats([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPets();
  }, []);

  const dogsPerPage = 3;
  const catsPerPage = 3;
  const totalDogPages = Math.ceil(dogs.length / dogsPerPage);
  const totalCatPages = Math.ceil(cats.length / catsPerPage);

  const visibleDogs = dogs.slice(dogPage * dogsPerPage, (dogPage + 1) * dogsPerPage);
  const visibleCats = cats.slice(catPage * catsPerPage, (catPage + 1) * catsPerPage);

  const nextDogPage = () => {
    setDogPage((prev) => (prev + 1) % totalDogPages);
    setDogDisplayCount((prev) => (prev + dogsPerPage) % dogs.length);
  };

  const prevDogPage = () => {
    setDogPage((prev) => (prev - 1 + totalDogPages) % totalDogPages);
    setDogDisplayCount((prev) => Math.max(0, prev - dogsPerPage));
  };

  const nextCatPage = () => {
    setCatPage((prev) => (prev + 1) % totalCatPages);
    setCatDisplayCount((prev) => (prev + catsPerPage) % cats.length);
  };

  const prevCatPage = () => {
    setCatPage((prev) => (prev - 1 + totalCatPages) % totalCatPages);
    setCatDisplayCount((prev) => Math.max(0, prev - catsPerPage));
  };

  const generateWhatsAppUrl = (pet: Pet) => {
    const phoneNumber = '60102568641'; // Your WhatsApp number
    const message = `Hi, I'm interested in ${pet.name} (${pet.petId}, ${pet.breed}, ${pet.age} old). Can you provide more information?`;
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  };

  // 添加处理点击的函数
  const handlePetCardClick = (petId: string) => {
    // 如果已经点击了这个卡片，则取消选择
    if (clickedPetId === petId) {
      setClickedPetId(null);
    } else {
      // 否则选择新卡片
      setClickedPetId(petId);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="py-16 flex justify-center items-center">
        <p className="text-xl">Loading pets...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="py-16 flex justify-center items-center">
        <p className="text-xl text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="py-16">
      {/* Mobile View */}
      <div className="md:hidden container mx-auto px-6">
        <div className="flex justify-center gap-4">
          <button
            onClick={() => navigate('/all-pets')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl font-medium text-lg shadow-lg hover:bg-rose-700 transition-colors duration-300"
          >
            <span>See All Pets</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop View - Original Content */}
      <div className="hidden md:block container mx-auto px-16">
        {/* Dogs Section */}
        <div id="dogs-section" className="mb-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-800">Dogs</h2>
            <button
              onClick={handleViewAllDogs}
              className="flex items-center text-rose-600 hover:text-rose-700"
            >
              View All
              <ArrowRight className="w-5 h-5 ml-1" />
            </button>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <button
                onClick={prevDogPage}
                className="absolute left-0 z-10 p-2 rounded-full bg-gradient-to-r from-white/90 via-white to-white/90 shadow-lg hover:shadow-xl hover:bg-white active:ring-2 active:ring-rose-500 focus:outline-none transition-all duration-150 backdrop-blur-sm group"
                style={{ transform: 'translateX(-50%)' }}
              >
                <ArrowLeft className="w-6 h-6 text-gray-600 group-hover:text-rose-600" />
              </button>
              <div className="grid grid-cols-3 gap-8 w-full mx-12">
                {visibleDogs.map((dog) => (
                  <div
                    key={dog.petId}
                    onClick={() => handlePetCardClick(dog.petId)}
                    className={`bg-white rounded-xl overflow-hidden transition-all duration-300 ${
                      clickedPetId === dog.petId 
                        ? 'shadow-2xl transform -translate-y-2' 
                        : 'shadow-lg hover:shadow-xl'
                    }`}
                    style={clickedPetId === dog.petId ? { boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' } : {}}
                  >
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={dog.imageUrl}
                        alt={dog.name}
                        className="w-full h-full object-contain bg-gray-50 transition-transform duration-300 hover:scale-105"
                      />
                      {user && dog._id && (
                        <button
                          onClick={(e) => toggleFavourite(dog._id!, e)}
                          className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors cursor-pointer"
                          aria-label={favourites[dog._id] ? "Remove from favourites" : "Add to favourites"}
                        >
                          <Heart 
                            className={`h-5 w-5 ${
                              favourites[dog._id] 
                                ? 'text-rose-600 fill-rose-600' 
                                : 'text-gray-400 hover:text-rose-600'
                            }`} 
                          />
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnlargedImage(dog.imageUrl)
                        }}
                        className="absolute bottom-3 right-3 bg-white/80 hover:bg-white p-1.5 rounded-full shadow-md transition-colors cursor-pointer"
                        aria-label="Zoom image"
                      >
                        <ZoomIn className="w-5 h-5 text-gray-700" />
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-semibold text-gray-800">{dog.name}</h3>
                        <span className="text-gray-500 text-sm">{dog.petId}</span>
                      </div>
                      <p className="text-gray-600 mb-1">{dog.breed}</p>
                      <p className="text-gray-600 mb-1">{dog.age}</p>
                      <p className="text-gray-600 mb-4">{dog.gender}</p>
                      <div className="flex justify-end">
                        {dog.name === 'Milo' || dog.isForSale === false ? (
                          <span className="text-sm font-medium text-gray-600">
                            Owner's Pet
                          </span>
                        ) : (
                          <a
                            href={generateWhatsAppUrl(dog)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-rose-600 hover:text-rose-700 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Enquiry Now
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={nextDogPage}
                className="absolute right-0 z-10 p-2 rounded-full bg-gradient-to-l from-white/90 via-white to-white/90 shadow-lg hover:shadow-xl hover:bg-white active:ring-2 active:ring-rose-500 focus:outline-none transition-all duration-150 backdrop-blur-sm group"
                style={{ transform: 'translateX(50%)' }}
              >
                <ArrowRight className="w-6 h-6 text-gray-600 group-hover:text-rose-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Cats Section */}
        <div id="cats-section">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-800">Cats</h2>
            <button
              onClick={handleViewAllCats}
              className="flex items-center text-rose-600 hover:text-rose-700"
            >
              View All
              <ArrowRight className="w-5 h-5 ml-1" />
            </button>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <button
                onClick={prevCatPage}
                className="absolute left-0 z-10 p-2 rounded-full bg-gradient-to-r from-white/90 via-white to-white/90 shadow-lg hover:shadow-xl hover:bg-white active:ring-2 active:ring-rose-500 focus:outline-none transition-all duration-150 backdrop-blur-sm group"
                style={{ transform: 'translateX(-50%)' }}
              >
                <ArrowLeft className="w-6 h-6 text-gray-600 group-hover:text-rose-600" />
              </button>
              <div className="grid grid-cols-3 gap-8 w-full mx-12">
                {visibleCats.map((cat) => (
                  <div
                    key={cat.petId}
                    onClick={() => handlePetCardClick(cat.petId)}
                    className={`bg-white rounded-xl overflow-hidden transition-all duration-300 ${
                      clickedPetId === cat.petId 
                        ? 'shadow-2xl transform -translate-y-2' 
                        : 'shadow-lg hover:shadow-xl'
                    }`}
                    style={clickedPetId === cat.petId ? { boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' } : {}}
                  >
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="w-full h-full object-contain bg-gray-50 transition-transform duration-300 hover:scale-105"
                      />
                      {user && cat._id && (
                        <button
                          onClick={(e) => toggleFavourite(cat._id!, e)}
                          className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors cursor-pointer"
                          aria-label={favourites[cat._id] ? "Remove from favourites" : "Add to favourites"}
                        >
                          <Heart 
                            className={`h-5 w-5 ${
                              favourites[cat._id] 
                                ? 'text-rose-600 fill-rose-600' 
                                : 'text-gray-400 hover:text-rose-600'
                            }`} 
                          />
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnlargedImage(cat.imageUrl)
                        }}
                        className="absolute bottom-3 right-3 bg-white/80 hover:bg-white p-1.5 rounded-full shadow-md transition-colors cursor-pointer"
                        aria-label="Zoom image"
                      >
                        <ZoomIn className="w-5 h-5 text-gray-700" />
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-semibold text-gray-800">{cat.name}</h3>
                        <span className="text-gray-500 text-sm">{cat.petId}</span>
                      </div>
                      <p className="text-gray-600 mb-1">{cat.breed}</p>
                      <p className="text-gray-600 mb-1">{cat.age}</p>
                      <p className="text-gray-600 mb-4">{cat.gender}</p>
                      <div className="flex justify-end">
                        {cat.isForSale === false ? (
                          <span className="text-sm font-medium text-gray-600">
                            Owner's Pet
                          </span>
                        ) : (
                          <a
                            href={generateWhatsAppUrl(cat)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-rose-600 hover:text-rose-700 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Enquiry Now
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={nextCatPage}
                className="absolute right-0 z-10 p-2 rounded-full bg-gradient-to-l from-white/90 via-white to-white/90 shadow-lg hover:shadow-xl hover:bg-white active:ring-2 active:ring-rose-500 focus:outline-none transition-all duration-150 backdrop-blur-sm group"
                style={{ transform: 'translateX(50%)' }}
              >
                <ArrowRight className="w-6 h-6 text-gray-600 group-hover:text-rose-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Enlargement Modal */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-5xl w-full flex items-center justify-center">
            <button 
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <X className="w-8 h-8" />
            </button>
            <img 
              src={enlargedImage} 
              alt="Enlarged pet" 
              className="max-w-full max-h-[80vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PetList; 