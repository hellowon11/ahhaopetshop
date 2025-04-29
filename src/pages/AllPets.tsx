import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, ZoomIn, X, Heart, User } from 'lucide-react';
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
  status?: string;
  _id?: string;
}

type SortBy = 'default' | 'name' | 'breed' | 'age' | 'gender' | 'petId';

const AllPets: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Initialize selected type from location state or query params
  const initialType = location.state?.initialType || 'all';
  
  const [selectedType, setSelectedType] = useState<'all' | 'dog' | 'cat'>(initialType);
  const [selectedGender, setSelectedGender] = useState<'all' | 'Male' | 'Female'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('petId');
  const [searchQuery, setSearchQuery] = useState('');
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [favourites, setFavourites] = useState<Record<string, boolean>>({});
  const [clickedPetId, setClickedPetId] = useState<string | null>(null);

  // 处理图片URL的函数
  const getImageUrl = (url: string) => {
    if (!url) return '/default-pet-image.png';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) return `${import.meta.env.VITE_API_URL}${url}`;
    return url;
  };

  // Fetch pets from backend
  useEffect(() => {
    const fetchPets = async () => {
      try {
        setLoading(true);
        const response = await shopPets.getAll();
        
        if (response.data) {
          const allPets = (response.data as Pet[]).filter(pet => pet.status !== 'Sold');
          setPets(allPets);
        }
      } catch (err) {
        console.error('Error fetching pets:', err);
        setError('Failed to load pets. Please try again later.');
        setPets([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPets();
  }, []);

  // Fetch user's favourites
  useEffect(() => {
    if (user) {
      const fetchFavouritesStatus = async () => {
        try {
          // Get all favorites
          const favouritesData = await apiService.favourites.getAll();
          
          // Create favorites status mapping
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

  // Toggle favorite status
  const toggleFavourite = async (petId: string, event: React.MouseEvent) => {
    // Prevent event bubbling
    event.stopPropagation();
    
    if (!user) {
      // Prompt login for unauthenticated users
      alert('Please login to add favourites');
      navigate('/login');
      return;
    }

    try {
      if (favourites[petId]) {
        // Remove from favorites
        await apiService.favourites.remove(petId);
        setFavourites(prev => {
          const newFavourites = { ...prev };
          delete newFavourites[petId];
          return newFavourites;
        });
      } else {
        // Add to favorites
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
  
  // Improve scroll behavior when navigating
  useEffect(() => {
    // Set scroll behavior to auto initially
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.scrollBehavior = 'auto';
    
    // Scroll to top
    window.scrollTo(0, 0);

    // Set a timer to restore smooth scrolling
    const timer = setTimeout(() => {
      document.documentElement.style.scrollBehavior = 'smooth';
      document.body.style.scrollBehavior = 'smooth';
    }, 100);

    return () => {
      clearTimeout(timer);
      document.documentElement.style.scrollBehavior = 'smooth';
      document.body.style.scrollBehavior = 'smooth';
    };
  }, []);

  const sortPets = (petsToSort: Pet[]): Pet[] => {
    let sortedPets = [...petsToSort];
    
    switch (sortBy) {
      case 'name':
        sortedPets.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'breed':
        sortedPets.sort((a, b) => a.breed.localeCompare(b.breed));
        break;
      case 'age':
        sortedPets.sort((a, b) => {
          const getMonths = (ageStr: string): number => {
            const years = ageStr.match(/(\d+)\s*year/i);
            const months = ageStr.match(/(\d+)\s*month/i);
            
            let totalMonths = 0;
            if (years) totalMonths += parseInt(years[1]) * 12;
            if (months) totalMonths += parseInt(months[1]);
            
            return totalMonths || 0;
          };
          
          return getMonths(a.age) - getMonths(b.age);
        });
        break;
      case 'gender':
        sortedPets.sort((a, b) => a.gender.localeCompare(b.gender));
        break;
      case 'petId':
        // Sort by petId - specific handling for format #XXX and CXXX
        sortedPets.sort((a, b) => {
          // First separate by type - dogs (#) come before cats (C)
          if (a.petId[0] !== b.petId[0]) {
            return a.petId[0] === '#' ? -1 : 1;
          }
          // Then sort numerically by the number part
          const numA = parseInt(a.petId.replace(/[^0-9]/g, ''));
          const numB = parseInt(b.petId.replace(/[^0-9]/g, ''));
          return numA - numB;
        });
        break;
      default:
        // Default sorting: sort by name
        sortedPets.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return sortedPets;
  };

  // Filter pets based on search query and selected filters
  const filteredPets = pets.filter(pet => {
    const matchesType = selectedType === 'all' || pet.type === selectedType;
    const matchesGender = selectedGender === 'all' || pet.gender === selectedGender;
    const matchesSearch = searchQuery === '' || 
      pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.breed.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesGender && matchesSearch;
  });

  const sortedPets = sortPets(filteredPets);

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    const { state } = location;
    console.log("Back button clicked, state:", state);
    
    // If coming from Dogs section, restore to that position
    if (state && state.from === 'dogs-section') {
      console.log("Going back to dogs section");
      navigate('/', { 
        state: { 
          scrollToDogsSection: true, 
          timestamp: Date.now(),
          scrollPosition: sessionStorage.getItem('dogsScrollPosition') || undefined
        } 
      });
      return;
    } 
    // If coming from Cats section, restore to that position
    else if (state && state.from === 'cats-section') {
      console.log("Going back to cats section");
      navigate('/', { 
        state: { 
          scrollToCatsSection: true, 
          timestamp: Date.now(),
          scrollPosition: sessionStorage.getItem('catsScrollPosition') || undefined
        }
      });
      return;
    }
    // If coming from hero section
    else if (state && state.fromHero) {
      navigate('/', { state: { fromHero: true } });
      return;
    }
    
    // Default case - go back
    window.history.back();
  };

  const generateWhatsAppUrl = (pet: Pet) => {
    const phoneNumber = "60102568641";
    const message = `Hi, I'm interested in ${pet.name} (${pet.petId}, ${pet.breed}). Can you tell me more about this pet?`;
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  };

  const handlePetCardClick = (petId: string) => {
    if (clickedPetId === petId) {
      setClickedPetId(null);
    } else {
      setClickedPetId(petId);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="py-16 flex justify-center items-center min-h-screen bg-white">
        <p className="text-xl">Loading pets...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="py-16 flex justify-center items-center min-h-screen bg-white">
        <p className="text-xl text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="py-16 bg-white min-h-screen">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-rose-600 hover:text-rose-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          
          {/* Mobile Member Icon */}
          <button
            onClick={() => navigate('/member-dashboard')}
            className="md:hidden flex items-center gap-2 text-gray-600 hover:text-rose-600 transition-colors"
          >
            <User className="w-5 h-5" />
          </button>
        </div>

        <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">
          AH HAO PET SHOP
        </h1>
        
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8">
        {/* Filter Buttons */}
          <div className="flex justify-center gap-4 mb-8 md:mb-0">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-6 py-2 rounded-full transition-colors ${
              selectedType === 'all' 
                ? 'bg-rose-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Pets
          </button>
          <button
            onClick={() => setSelectedType('dog')}
            className={`px-6 py-2 rounded-full transition-colors ${
              selectedType === 'dog' 
                ? 'bg-rose-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Dogs
          </button>
          <button
            onClick={() => setSelectedType('cat')}
            className={`px-6 py-2 rounded-full transition-colors ${
              selectedType === 'cat' 
                ? 'bg-rose-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Cats
          </button>
        </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search by name or breed..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
        </div>
        
        {/* Additional Filters */}
        <div className="flex flex-wrap justify-between gap-4 mb-8">
          <div className="flex items-center">
            <span className="mr-3 text-gray-700 font-medium">Gender:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedGender('all')}
                className={`px-4 py-1 rounded-full transition-colors text-sm ${
                  selectedGender === 'all' 
                    ? 'bg-rose-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedGender('Male')}
                className={`px-4 py-1 rounded-full transition-colors text-sm ${
                  selectedGender === 'Male' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Male
              </button>
              <button
                onClick={() => setSelectedGender('Female')}
                className={`px-4 py-1 rounded-full transition-colors text-sm ${
                  selectedGender === 'Female' 
                    ? 'bg-pink-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Female
              </button>
            </div>
          </div>
          
          <div className="flex items-center">
            <span className="mr-3 text-gray-700 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-4 py-1 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white"
            >
              <option value="name">By Name</option>
              <option value="petId">By Pet ID</option>
              <option value="breed">By Breed</option>
              <option value="age">By Age</option>
              <option value="gender">By Gender</option>
            </select>
          </div>
        </div>
        
        {/* Results Count */}
        <p className="text-gray-600 mb-6">
          Showing {sortedPets.length} {sortedPets.length === 1 ? 'pet' : 'pets'}
        </p>
        
        {/* Pet Grid */}
        {sortedPets.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-gray-500">No pets found matching your criteria.</p>
            <button 
              onClick={() => {
                setSelectedType('all');
                setSelectedGender('all');
                setSearchQuery('');
                setSortBy('default');
              }}
              className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {sortedPets.map(pet => (
              <div
                key={pet.petId}
                onClick={() => handlePetCardClick(pet.petId)}
                className={`bg-white rounded-xl overflow-hidden transition-all duration-300 ${
                  clickedPetId === pet.petId 
                    ? 'shadow-2xl transform -translate-y-2' 
                    : 'shadow-lg hover:shadow-xl'
                }`}
                style={clickedPetId === pet.petId ? { boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' } : {}}
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={getImageUrl(pet.imageUrl)}
                    alt={pet.name}
                    className="w-full h-full object-contain bg-gray-50 transition-transform duration-300 hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/default-pet-image.png';
                    }}
                  />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEnlargedImage(pet.imageUrl);
                    }}
                    className="absolute bottom-3 right-3 bg-white/80 hover:bg-white p-1.5 rounded-full shadow-md transition-colors cursor-pointer"
                    aria-label="Zoom image"
                  >
                    <ZoomIn className="w-5 h-5 text-gray-700" />
                  </button>
                  {pet._id && pet.name !== 'Milo' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavourite(pet._id, e);
                      }}
                      className="absolute top-3 right-3 bg-white/80 hover:bg-white p-1.5 rounded-full shadow-md transition-colors cursor-pointer"
                      aria-label={pet._id && favourites[pet._id] ? "Remove from favourites" : "Add to favourites"}
                    >
                      <Heart 
                        className={`w-5 h-5 ${
                          pet._id && favourites[pet._id] 
                            ? 'text-rose-600 fill-rose-600' 
                            : 'text-gray-400 hover:text-rose-600'
                        }`} 
                      />
                    </button>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <h3 className="text-xl font-semibold text-gray-800 mr-2">{pet.name}</h3>
                      <span className="text-gray-500 text-sm">{pet.petId}</span>
                    </div>
                    <div className={`text-sm px-2 py-1 rounded-full ${
                    pet.gender === 'Male' 
                      ? 'bg-blue-100 text-blue-800' 
                        : 'bg-pink-100 text-pink-800'
                  }`}>
                    {pet.gender}
                </div>
                </div>
                  <p className="text-gray-600 mb-1">{pet.breed}</p>
                  <p className="text-gray-600 mb-4">{pet.age}</p>
                  <div className="flex justify-end">
                    {pet.name === 'Milo' || pet.isForSale === false ? (
                      <span className="text-sm font-medium text-gray-600">
                        Owner's Pet
                      </span>
                  ) : (
                    <a
                      href={generateWhatsAppUrl(pet)}
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
        )}
      </div>

      {/* Image Enlargement Modal */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-5xl w-full flex items-center justify-center">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setEnlargedImage(null);
              }}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <X className="w-8 h-8" />
            </button>
            <img 
              src={getImageUrl(enlargedImage)} 
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

export default AllPets; 