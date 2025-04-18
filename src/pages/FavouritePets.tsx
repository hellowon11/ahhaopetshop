import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShopPet } from '../types/index';
import { apiService } from '../services/apiService';
import { Heart, ArrowLeft, ZoomIn, X } from 'lucide-react';

interface FavouriteItem {
  _id: string;
  pet: ShopPet;
}

const FavouritePets: React.FC = () => {
  const navigate = useNavigate();
  const [favourites, setFavourites] = useState<FavouriteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // 获取收藏列表
  useEffect(() => {
    const fetchFavourites = async () => {
      try {
        setLoading(true);
        const data = await apiService.favourites.getAll();
        setFavourites(data as FavouriteItem[]);
        setError(null);
      } catch (error) {
        console.error('Error fetching favourites:', error);
        setError('Failed to load your favourite pets. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchFavourites();
  }, []);

  // 移除收藏
  const handleRemoveFavourite = async (petId: string) => {
    try {
      await apiService.favourites.remove(petId);
      // 更新收藏列表
      setFavourites(favourites.filter(item => (item.pet as ShopPet)._id !== petId));
    } catch (error) {
      console.error('Error removing favourite:', error);
      setError('Failed to remove pet from favourites. Please try again.');
    }
  };

  // 返回会员仪表板
  const handleBackToDashboard = () => {
    navigate('/member-dashboard');
  };

  // WhatsApp 查询
  const generateWhatsAppUrl = (pet: ShopPet) => {
    const phoneNumber = "60102568641";
    const message = `Hi, I'm interested in ${pet.name} (${pet.petId}, ${pet.breed}). Can you tell me more about this pet?`;
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center relative">
            <button
              onClick={handleBackToDashboard}
              className="inline-flex items-center p-2 text-gray-700 hover:text-rose-600 transition-colors duration-300"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            
            <h1 className="absolute left-1/2 transform -translate-x-1/2 text-xl font-semibold text-gray-900">My Favourite Pets</h1>
            
            {/* Empty div to balance the layout */}
            <div className="w-6"></div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        ) : favourites.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No favourite pets yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Browse our pet shop and add some pets to your favourites list.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/all-pets')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
              >
                Browse Pets
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favourites.map((item) => {
              const pet = item.pet as ShopPet;
              return (
                <div key={item._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src={pet.imageUrl} 
                      alt={pet.name} 
                      className="w-full h-full object-contain bg-gray-50 transition-transform duration-300 hover:scale-105"
                    />
                    <button
                      onClick={() => handleRemoveFavourite(pet._id)}
                      className="absolute top-3 right-3 bg-white/80 hover:bg-white p-1.5 rounded-full shadow-md transition-colors"
                      aria-label="Remove from favourites"
                    >
                      <Heart className="h-5 w-5 text-rose-600 fill-rose-600" />
                    </button>
                    <button 
                      onClick={() => setEnlargedImage(pet.imageUrl)}
                      className="absolute bottom-3 right-3 bg-white/80 hover:bg-white p-1.5 rounded-full shadow-md transition-colors"
                      aria-label="Zoom image"
                    >
                      <ZoomIn className="w-5 h-5 text-gray-700" />
                    </button>
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
                          className="text-sm font-medium text-rose-600 hover:text-rose-700"
                        >
                          Enquiry Now
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 图片放大模态框 */}
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

export default FavouritePets; 