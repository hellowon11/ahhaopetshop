import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { Pet } from '../types';

interface PetProfilesProps {
  isAddingPet: boolean;
  setIsAddingPet: (value: boolean) => void;
  onAddPet: (petData: Omit<Pet, '_id'>) => Promise<void>;
  onUpdatePet: (id: string, petData: Partial<Pet>) => Promise<void>;
  onDeletePet: (id: string) => Promise<void>;
  hideNavigationButtons?: boolean;
}

// 扩展 Pet 类型以包含额外的 UI 相关字段
interface PetWithUI extends Pet {
  imageUrl?: string;
  specialNeeds?: string;
}

const PetProfiles: React.FC<PetProfilesProps> = ({ 
  isAddingPet, 
  setIsAddingPet,
  onAddPet,
  onUpdatePet,
  onDeletePet,
  hideNavigationButtons = false
}) => {
  const { user } = useAuth();
  const [pets, setPets] = useState<PetWithUI[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingPet, setEditingPet] = useState<PetWithUI | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user is logged in with proper debugging
    console.log('User in useEffect:', user ? `User exists with ID: ${user._id}` : 'User not logged in');
    
    // Only attempt to load pets if user exists and has an ID
    if (user && user._id) {
      loadPets();
    } else {
      console.warn('Cannot load pets: User not properly authenticated');
    }
  }, [user]);

  const loadPets = async () => {
    if (!user || !user._id) {
      console.error('Cannot load pets: User not authenticated');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Loading pets for user:', user._id);
      const petsData = await apiService.pets.getAll();
      console.log('Pets loaded:', petsData.length);
      setPets(petsData.map(pet => ({
        ...pet,
        imageUrl: pet.imageUrl || '/default-pet-image.png'
      })));
    } catch (err) {
      console.error('Failed to load pets:', err);
      setError('Failed to load pets. Please refresh the page and try again.');
    } finally {
      setLoading(false);
    }
  };

  // 显示成功消息的函数
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000); // 3秒后自动消失
  };

  const handleAddPet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Add more detailed logging to debug the authentication issue
    console.log('Current user state:', {
      user: user,
      isUserObject: !!user,
      hasId: user?._id ? true : false,
      userId: user?._id
    });
    
    // Check if user exists and has an ID
    if (!user || !user._id) {
      console.error('User not properly authenticated:', user);
      setError('Authentication error. Please try logging out and logging in again.');
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // Get form data
      const formData = new FormData(e.currentTarget);
      const name = formData.get('name') as string;
      const breed = formData.get('breed') as string;
      const ageStr = formData.get('age') as string;
      const gender = formData.get('gender') as 'male' | 'female';
      const specialNeeds = formData.get('specialNeeds') as string;

      // Validate required fields
      if (!name.trim()) {
        setError('Pet name is required');
        return;
      }

      if (!gender || !['male', 'female'].includes(gender)) {
        setError('Please select a valid gender');
        return;
      }

      // 处理年龄，保留原始输入的字符串
      const age = ageStr.trim();

      // Prepare data for backend
      const petData: Omit<Pet, '_id'> = {
        owner: user.id || user._id,
        name: name.trim(),
        breed: breed.trim() || '',
        age,
        gender,
        specialNeeds: specialNeeds.trim() || '',
        imageUrl: selectedImage || '',
        type: breed.trim() || 'Other',  // Set type based on breed or default to 'Other'
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Submitting pet data:', petData);

      // Call parent component method to add pet
      await onAddPet(petData);
      
      // Reload pets list
      await loadPets();
      
      // Reset form state
      setIsAddingPet(false);
      setSelectedImage(null);
      setEditingPet(null);
      setError(null);

      // Show success message
      showSuccessMessage('Pet added successfully!');
    } catch (err: any) {
      console.error('Error adding pet:', err);
      setError(err.response?.data?.message || 'Failed to add pet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.match('image.*')) {
        setError('Please select a valid image file (JPG, PNG, etc.)');
        return;
      }
      
      try {
        // Create an image element to load the file
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = () => {
          img.src = reader.result as string;
        };
        
        img.onload = () => {
          // Create a canvas to compress the image
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions while maintaining aspect ratio
          const maxSize = 800;
          if (width > height && width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          } else if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress the image
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with reduced quality
          const compressedImage = canvas.toDataURL('image/jpeg', 0.6);
          console.log('Compressed image size:', Math.round(compressedImage.length / 1024), 'KB');
          
          setSelectedImage(compressedImage);
        };
        
        reader.readAsDataURL(file);
      } catch (err) {
        console.error('Error processing image:', err);
        setError('Error processing image. Please try again with a different image.');
      }
    }
  };

  const handleDeletePet = async (id: string) => {
    if (!user?._id) return;

    try {
      await onDeletePet(id);
      await loadPets();
    } catch (err) {
      setError('Failed to delete pet');
      console.error('Error deleting pet:', err);
    }
  };

  const handleEditPet = (pet: PetWithUI) => {
    setEditingPet(pet);
    setSelectedImage(pet.imageUrl || null);
    setIsAddingPet(true);
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -300,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 300,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* 成功消息提示 */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-out flex items-center">
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-3 hover:text-green-200"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
          <button
            onClick={() => setError(null)}
            className="absolute top-2 right-2 text-red-700 hover:text-red-900"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Desktop Grid View */}
      <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Loading pets...
          </div>
        ) : pets.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No pets added yet. Click "Add New Pet" to get started.
          </div>
        ) : (
          pets.map((pet) => (
            <div key={pet._id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="relative h-56">
                <img
                  src={pet.imageUrl || '/default-pet-image.png'}
                  alt={pet.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/default-pet-image.png';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-2xl font-bold text-white mb-1">{pet.name}</h3>
                  <p className="text-white/90 text-sm">
                    {pet.type} • {pet.breed}
                  </p>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm">{pet.gender.charAt(0).toUpperCase() + pet.gender.slice(1)}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm">{pet.age}</span>
                  </div>
                  {pet.specialNeeds && (
                    <div className="flex items-start text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm flex-1">{pet.specialNeeds}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => handleEditPet(pet)}
                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-150"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePet(pet._id)}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-150"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mobile Horizontal Scroll View */}
      <div className="md:hidden relative">
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading ? (
            <div className="flex-shrink-0 w-full text-center py-8 text-gray-500">
              Loading pets...
            </div>
          ) : pets.length === 0 ? (
            <div className="flex-shrink-0 w-full text-center py-8 text-gray-500">
              No pets added yet. Click "Add New Pet" to get started.
            </div>
          ) : (
            pets.map((pet) => (
              <div 
                key={pet._id} 
                className="flex-shrink-0 w-[300px] bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <div className="relative w-full h-[200px]">
                  <img
                    src={pet.imageUrl || '/default-pet-image.png'}
                    alt={pet.name}
                    className="w-full h-full object-contain bg-gray-100"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/default-pet-image.png';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <h3 className="text-xl font-bold text-white mb-1">{pet.name}</h3>
                    <p className="text-white/90 text-sm">
                      {pet.type} • {pet.breed}
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-sm">{pet.gender.charAt(0).toUpperCase() + pet.gender.slice(1)}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm">{pet.age}</span>
                    </div>
                    {pet.specialNeeds && (
                      <div className="flex items-start text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm flex-1">{pet.specialNeeds}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      onClick={() => handleEditPet(pet)}
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-150"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePet(pet._id)}
                      className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-150"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Scroll Buttons - 仅在hideNavigationButtons为false时显示 */}
        {pets.length > 0 && !hideNavigationButtons && (
          <>
            <button
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      {/* Add/Edit Pet Modal */}
      {isAddingPet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">
              {editingPet ? 'Edit Pet' : 'Add New Pet'}
            </h3>
            <form onSubmit={handleAddPet} className="space-y-4" encType="multipart/form-data">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Pet Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/gif, image/webp"
                  onChange={handleImageChange}
                  className="w-full"
                />
                {selectedImage && (
                  <div className="relative">
                    <img
                      src={selectedImage}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-md"
                    />
                    <button 
                      type="button"
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <input
                  name="name"
                  type="text"
                  placeholder="Pet Name *"
                  defaultValue={editingPet?.name}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <input
                  name="breed"
                  type="text"
                  placeholder="Breed (Optional)"
                  defaultValue={editingPet?.breed}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <input
                  name="age"
                  type="text"
                  placeholder="Age (Optional)"
                  defaultValue={editingPet?.age}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <select
                  name="gender"
                  className="w-full p-2 border rounded-md"
                  defaultValue=""
                  required
                >
                  <option value="">Select Gender *</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <textarea
                  name="specialNeeds"
                  placeholder="Special Needs (Optional)"
                  defaultValue={editingPet?.specialNeeds}
                  className="w-full p-2 border rounded-md"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingPet(false);
                    setEditingPet(null);
                    setSelectedImage(null);
                    setError(null);
                  }}
                  className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 text-sm text-white rounded ${
                    loading 
                      ? 'bg-blue-300 cursor-not-allowed' 
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {loading ? 'Adding...' : (editingPet ? 'Save' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetProfiles; 