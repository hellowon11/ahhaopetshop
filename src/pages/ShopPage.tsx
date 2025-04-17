import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { Heart, Filter, Search, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// 定义商店宠物类型
interface ShopPetType {
  _id: string;
  petId: string;
  name: string;
  breed: string;
  age: string;
  gender: 'Male' | 'Female';
  imageUrl: string;
  type: 'dog' | 'cat';
  description?: string;
  isForSale: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShopPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pets, setPets] = useState<ShopPetType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [favourites, setFavourites] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState({
    type: '',
    gender: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // 获取宠物列表
  useEffect(() => {
    const fetchPets = async () => {
      try {
        setLoading(true);
        const data = await apiService.shopPets.getAll();
        setPets(data as ShopPetType[]);
        setError(null);
      } catch (error) {
        console.error('Error fetching pets:', error);
        setError('Failed to load pets. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPets();
  }, []);

  // 获取用户收藏状态
  useEffect(() => {
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

  // 筛选宠物
  const filteredPets = pets.filter(pet => {
    // 筛选宠物类型
    if (filter.type && pet.type !== filter.type) {
      return false;
    }
    
    // 筛选宠物性别
    if (filter.gender && pet.gender !== filter.gender) {
      return false;
    }
    
    // 搜索宠物名称或品种
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      return (
        pet.name.toLowerCase().includes(searchTerm) ||
        pet.breed.toLowerCase().includes(searchTerm)
      );
    }
    
    return true;
  });

  // 重置筛选条件
  const resetFilters = () => {
    setFilter({
      type: '',
      gender: '',
      search: ''
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold text-gray-900">Pet Shop</h1>
            {user && (
              <button
                onClick={() => navigate('/favourites')}
                className="inline-flex items-center px-4 py-2 border border-rose-300 text-sm font-medium rounded-md text-rose-700 bg-white hover:bg-rose-50"
              >
                <Heart className="w-4 h-4 mr-2" />
                My Favourites
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white shadow-sm rounded-lg p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* 搜索框 */}
            <div className="relative flex-1 w-full sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                placeholder="Search by name or breed"
              />
            </div>

            {/* 筛选按钮 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {(filter.type || filter.gender) && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                  {(filter.type ? 1 : 0) + (filter.gender ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* 筛选选项 */}
          {showFilters && (
            <div className="mt-4 border-t pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 宠物类型筛选 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pet Type</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setFilter({ ...filter, type: 'dog' })}
                      className={`px-3 py-1 rounded-full text-sm ${
                        filter.type === 'dog'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      Dogs
                    </button>
                    <button
                      onClick={() => setFilter({ ...filter, type: 'cat' })}
                      className={`px-3 py-1 rounded-full text-sm ${
                        filter.type === 'cat'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      Cats
                    </button>
                  </div>
                </div>

                {/* 性别筛选 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setFilter({ ...filter, gender: 'Male' })}
                      className={`px-3 py-1 rounded-full text-sm ${
                        filter.gender === 'Male'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      Male
                    </button>
                    <button
                      onClick={() => setFilter({ ...filter, gender: 'Female' })}
                      className={`px-3 py-1 rounded-full text-sm ${
                        filter.gender === 'Female'
                          ? 'bg-pink-100 text-pink-800 border border-pink-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      Female
                    </button>
                  </div>
                </div>
              </div>

              {/* 重置筛选 */}
              {(filter.type || filter.gender) && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center px-3 py-1 text-sm text-gray-700 hover:text-gray-900"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 宠物列表 */}
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
        ) : filteredPets.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No pets found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
            {(filter.type || filter.gender || filter.search) && (
              <div className="mt-6">
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-rose-700 bg-rose-100 hover:bg-rose-200"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {filteredPets.length} Pets Available
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPets.map((pet) => (
                <div 
                  key={pet._id} 
                  className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-shadow hover:shadow-lg"
                  onClick={() => navigate(`/shop/pet/${pet._id}`)}
                >
                  <div className="relative h-48 bg-gray-200">
                    <img 
                      src={pet.imageUrl} 
                      alt={pet.name} 
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => toggleFavourite(pet._id, e)}
                      className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
                      aria-label={favourites[pet._id] ? "Remove from favourites" : "Add to favourites"}
                    >
                      <Heart 
                        className={`h-5 w-5 ${
                          favourites[pet._id] 
                            ? 'text-rose-600 fill-rose-600' 
                            : 'text-gray-400 hover:text-rose-600'
                        }`} 
                      />
                    </button>
                    <div className="absolute top-2 left-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pet.type === 'dog' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {pet.type === 'dog' ? 'Dog' : 'Cat'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{pet.name}</h3>
                        <p className="text-sm text-gray-600">{pet.breed}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pet.gender === 'Male' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-pink-100 text-pink-800'
                      }`}>
                        {pet.gender}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">{pet.age}</p>
                    
                    {pet.description && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{pet.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopPage; 