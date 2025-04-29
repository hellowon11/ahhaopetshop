import React, { useState, useEffect, useRef } from 'react';
import { Edit, Trash2, Plus, X, Search, CheckCircle, XCircle, Upload, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiService } from '../services/apiService';
import { ShopPet } from '../types/index';

interface PetListingsManagerProps {
  onClose?: () => void;
}

// 处理图片URL的函数
const getImageUrl = (url: string) => {
  if (!url) return '/default-pet-image.png';
  if (url.startsWith('http')) return url;
  return url;
};

const PetListingsManager: React.FC<PetListingsManagerProps> = ({ onClose }) => {
  const [pets, setPets] = useState<ShopPet[]>([]);
  const [allPetsStats, setAllPetsStats] = useState({ listed: 0, unlisted: 0, sold: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'dog' | 'cat'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'sold'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentPet, setCurrentPet] = useState<ShopPet | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const petsPerPage = 10;
  
  const [formData, setFormData] = useState({
    petId: '',
    name: '',
    breed: '',
    age: '',
    gender: 'Male' as 'Male' | 'Female',
    imageUrl: '',
    type: 'dog' as 'dog' | 'cat',
    description: '',
    isForSale: true,
    status: 'Listed' as 'Listed' | 'Unlisted' | 'Sold'
  });

  // 生成下一个可用的宠物ID
  const generateNextPetId = (type: 'dog' | 'cat'): string => {
    // 获取当前类型的所有宠物
    const typePets = pets.filter(pet => pet.type === type);
    
    // 提取ID数字部分
    const idNumbers = typePets.map(pet => {
      const match = pet.petId.match(/[0-9]+/);
      return match ? parseInt(match[0]) : 0;
    });
    
    // 查找最大ID号
    let maxId = idNumbers.length > 0 ? Math.max(...idNumbers) : 0;
    
    // 对于猫咪，如果没有找到现有ID，从C006开始编号
    if (type === 'cat' && maxId < 6) {
      maxId = 5; // 下一个ID将是6
    }
    
    // 生成下一个ID号
    const nextId = maxId + 1;
    
    // 格式化为3位数，前导零
    const formattedId = nextId.toString().padStart(3, '0');
    
    // 根据类型返回带前缀的ID
    return type === 'dog' ? `D${formattedId}` : `C${formattedId}`;
  };

  // 当类型改变时更新petId
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as 'dog' | 'cat';
    setFormData(prev => ({
      ...prev,
      type: newType,
      petId: generateNextPetId(newType)
    }));
  };

  useEffect(() => {
    fetchPets();
    
    // 测试用户权限
    const checkAuth = async () => {
      try {
        const authTest = await apiService.user.testAuth();
        console.log('Auth test result:', authTest);
        if (!authTest.isAdmin) {
          alert('Warning: You do not have admin privileges. Some operations may fail.');
        }
      } catch (error) {
        console.error('Failed to check auth:', error);
      }
    };
    
    checkAuth();
  }, []);

  // 当添加模态框打开时，自动生成下一个宠物ID
  useEffect(() => {
    if (isAddModalOpen) {
      const nextId = generateNextPetId(formData.type);
      setFormData(prev => ({
        ...prev,
        petId: nextId
      }));
    }
  }, [isAddModalOpen, formData.type, pets]);

  // 当filterStatus变化时重新获取宠物列表
  useEffect(() => {
    fetchPets();
  }, [filterStatus]);

  const fetchPets = async () => {
    try {
      setLoading(true);
      
      // 根据filterStatus决定要传递给API的参数
      let statusParam;
      if (filterStatus === 'sold') {
        statusParam = 'Sold';
      } else if (filterStatus === 'available') {
        statusParam = 'Listed';
      } else {
        // 对于"All Status"选项，使用特殊参数告诉后端要包含所有状态
        statusParam = 'all';
      }
      
      const data = await apiService.shopPets.getAll(statusParam);
      setPets(data as ShopPet[]);
      
      // 不管选择哪个过滤器，总是获取所有状态的宠物以计算正确的统计数据
      if (statusParam !== 'all') {
        const allPetsData = await apiService.shopPets.getAll('all');
        const stats = {
          listed: allPetsData.filter(pet => pet.status === 'Listed' || pet.status === undefined).length,
          unlisted: allPetsData.filter(pet => pet.status === 'Unlisted').length,
          sold: allPetsData.filter(pet => pet.status === 'Sold').length
        };
        setAllPetsStats(stats);
      } else {
        // 如果已经查询了所有宠物，直接使用这些数据计算统计
        const stats = {
          listed: data.filter(pet => pet.status === 'Listed' || pet.status === undefined).length,
          unlisted: data.filter(pet => pet.status === 'Unlisted').length,
          sold: data.filter(pet => pet.status === 'Sold').length
        };
        setAllPetsStats(stats);
      }
    } catch (error) {
      console.error('Failed to fetch pets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // 如果更改的是类型，则调用特殊处理
    if (name === 'type') {
      handleTypeChange(e as React.ChangeEvent<HTMLSelectElement>);
      return;
    }
    
    // Handle checkbox separately
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddPet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.shopPets.create(formData);
      await fetchPets();
      setIsAddModalOpen(false);
      setFormData({
        petId: '',
        name: '',
        breed: '',
        age: '',
        gender: 'Male',
        imageUrl: '',
        type: 'dog',
        description: '',
        isForSale: true,
        status: 'Listed'
      });
    } catch (error) {
      console.error('Failed to add pet:', error);
    }
  };

  const handleEditClick = (pet: ShopPet) => {
    console.log('Edit button clicked for pet:', pet);
    setCurrentPet(pet);
    setFormData({
      petId: pet.petId,
      name: pet.name,
      breed: pet.breed,
      age: pet.age,
      gender: pet.gender,
      imageUrl: pet.imageUrl,
      type: pet.type,
      description: pet.description || '',
      isForSale: pet.isForSale,
      status: pet.status || 'Listed'
    });
    
    // 确保正确设置图片预览
    if (pet.imageUrl) {
      setImagePreview(pet.imageUrl);
    } else {
      setImagePreview(null);
    }
    
    // 显式打开编辑模态框
    setTimeout(() => {
      setIsEditModalOpen(true);
    }, 0);
  };

  const handleUpdatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPet) {
      console.error('No current pet selected for update');
      return;
    }
    
    console.log('Current pet being updated:', currentPet);
    console.log('Form data before processing:', formData);
    
    // 创建一个更新数据的副本
    const updateData: Partial<typeof formData> = { ...formData };
    
    // 无论是什么类型的宠物，都删除type字段
    console.log('Removing type field for all pets');
    delete (updateData as any).type;
    
    // 删除petId字段，因为它是路径参数
    delete (updateData as any).petId;
    
    console.log('Update data after processing:', updateData);
    
    try {
      // 开始更新
      const response = await apiService.shopPets.update(currentPet.petId, updateData);
      console.log('Update response:', response);
      await fetchPets();
      setIsEditModalOpen(false);
      setCurrentPet(null);
      console.log('Pet updated successfully');
    } catch (error: any) {
      console.error('Failed to update pet:', error);
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', JSON.stringify(error.response.data));
        alert(`Failed to update pet: ${error.response.data?.message || 'Please try again.'}`);
      } else {
        alert('Failed to update pet. Please try again.');
      }
    }
  };

  const handleDeletePet = async (petId: string) => {
    if (window.confirm('Are you sure you want to delete this pet? This action cannot be undone.')) {
      try {
        await apiService.shopPets.delete(petId);
        await fetchPets();
      } catch (error) {
        console.error('Failed to delete pet:', error);
      }
    }
  };

  const toggleSaleStatus = async (petId: string, currentStatus: string) => {
    console.log(`Toggling status for pet ${petId} from ${currentStatus}`);
    try {
      let newStatus: 'Listed' | 'Unlisted' | 'Sold';
      
      // Cycle through statuses: Listed -> Unlisted -> Sold -> Listed
      if (currentStatus === 'Listed') {
        newStatus = 'Unlisted';
      } else if (currentStatus === 'Unlisted') {
        newStatus = 'Sold';
      } else {
        newStatus = 'Listed';
      }
      
      console.log(`New status will be: ${newStatus}`);
      await apiService.shopPets.updateStatus(petId, newStatus);
      await fetchPets();
      console.log('Status updated successfully');
    } catch (error) {
      console.error('Failed to toggle status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  // 过滤宠物列表
  const filteredPets = React.useMemo(() => {
    return pets
      .filter(pet => {
        const searchMatch = pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pet.breed.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pet.petId.toLowerCase().includes(searchTerm.toLowerCase());
        
        const typeMatch = filterType === 'all' || pet.type === filterType;
        
        const statusMatch = filterStatus === 'all' || 
          (filterStatus === 'available' && (pet.status === 'Listed' || pet.status === undefined)) ||
          (filterStatus === 'sold' && pet.status === 'Sold');
        
        return searchMatch && typeMatch && statusMatch;
      });
  }, [pets, searchTerm, filterType, filterStatus]);

  // 分页后的宠物列表
  const paginatedPets = React.useMemo(() => {
    const startIndex = (currentPage - 1) * petsPerPage;
    return filteredPets.slice(startIndex, startIndex + petsPerPage);
  }, [filteredPets, currentPage, petsPerPage]);

  // 当筛选条件改变时，重置为第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterStatus]);

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
      alert('Only JPEG and PNG images are allowed');
      return;
    }
    
    // Display preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    try {
      setUploadingImage(true);
      const imageUrl = await apiService.shopPets.uploadImage(file);
      setFormData(prev => ({ ...prev, imageUrl }));
      console.log('Image uploaded successfully:', imageUrl);
      setUploadingImage(false);
    } catch (error) {
      console.error('Failed to upload image:', error);
      setUploadingImage(false);
      alert('Failed to upload image. Please try again.');
    }
  };

  const triggerAddFileInput = () => {
    addFileInputRef.current?.click();
  };

  const triggerEditFileInput = () => {
    editFileInputRef.current?.click();
  };

  const addModal = (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex">
      <div className="relative p-6 bg-white rounded-lg m-auto w-full max-w-md">
        <button 
          onClick={() => setIsAddModalOpen(false)} 
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
        <h2 className="text-xl font-bold mb-4">Add New Pet</h2>
        <form onSubmit={handleAddPet}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Pet ID</label>
                <input 
                  type="text" 
                  name="petId" 
                  value={formData.petId} 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100"
                  placeholder="Auto-generated based on type"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">ID is automatically generated</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select 
                  name="type" 
                  value={formData.type} 
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                >
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Breed</label>
              <input 
                type="text" 
                name="breed" 
                value={formData.breed} 
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Age</label>
                <input 
                  type="text" 
                  name="age" 
                  value={formData.age} 
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="e.g. 2 years"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <select 
                  name="gender" 
                  value={formData.gender} 
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Pet Image</label>
              <div className="mt-1 flex flex-col items-center">
                <div 
                  onClick={triggerAddFileInput}
                  className="w-full h-40 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                >
                  {uploadingImage ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="mt-2 text-sm text-gray-500">Uploading...</span>
                    </div>
                  ) : imagePreview ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-contain p-2" 
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity flex items-center justify-center opacity-0 hover:opacity-100">
                        <span className="text-white text-sm font-medium">Click to change</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <ImageIcon className="h-10 w-10 text-gray-400" />
                      <span className="mt-2 text-sm text-gray-500">Click to upload image</span>
                      <span className="mt-1 text-xs text-gray-400">(JPEG, PNG)</span>
                    </div>
                  )}
                </div>
                <input
                  ref={addFileInputRef}
                  type="file"
                  accept="image/jpeg, image/png"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {formData.imageUrl && (
                  <span className="text-xs text-gray-500 mt-1">Image uploaded successfully</span>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                rows={3}
              />
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="isForSale" 
                name="isForSale" 
                checked={formData.isForSale} 
                onChange={(e) => setFormData(prev => ({ ...prev, isForSale: e.target.checked }))}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="isForSale" className="ml-2 block text-sm text-gray-700">Available for Sale</label>
            </div>
          </div>
          
          <div className="mt-6">
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={uploadingImage || !formData.imageUrl}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const editModal = currentPet && (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex">
      <div className="relative p-6 bg-white rounded-lg m-auto w-full max-w-md">
        <button 
          onClick={() => setIsEditModalOpen(false)} 
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
        <h2 className="text-xl font-bold mb-4">Edit Pet</h2>
        <form onSubmit={handleUpdatePet}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Pet ID</label>
                <input 
                  type="text" 
                  name="petId" 
                  value={formData.petId} 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select 
                  name="type" 
                  value={formData.type} 
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                >
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Breed</label>
              <input 
                type="text" 
                name="breed" 
                value={formData.breed} 
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Age</label>
                <input 
                  type="text" 
                  name="age" 
                  value={formData.age} 
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="e.g. 2 years"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <select 
                  name="gender" 
                  value={formData.gender} 
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Pet Image</label>
              <div className="mt-1 flex flex-col items-center">
                <div 
                  onClick={triggerEditFileInput}
                  className="w-full h-40 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                >
                  {uploadingImage ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="mt-2 text-sm text-gray-500">Uploading...</span>
                    </div>
                  ) : imagePreview ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-contain p-2" 
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity flex items-center justify-center opacity-0 hover:opacity-100">
                        <span className="text-white text-sm font-medium">Click to change</span>
                      </div>
                    </div>
                  ) : formData.imageUrl ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={formData.imageUrl} 
                        alt={formData.name} 
                        className="w-full h-full object-contain p-2" 
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity flex items-center justify-center opacity-0 hover:opacity-100">
                        <span className="text-white text-sm font-medium">Click to change</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <ImageIcon className="h-10 w-10 text-gray-400" />
                      <span className="mt-2 text-sm text-gray-500">Click to upload image</span>
                      <span className="mt-1 text-xs text-gray-400">(JPEG, PNG)</span>
                    </div>
                  )}
                </div>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/jpeg, image/png"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {formData.imageUrl && (
                  <span className="text-xs text-gray-500 mt-1">Image is set</span>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                rows={3}
              />
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="editIsForSale" 
                name="isForSale" 
                checked={formData.isForSale} 
                onChange={(e) => setFormData(prev => ({ ...prev, isForSale: e.target.checked }))}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="editIsForSale" className="ml-2 block text-sm text-gray-700">Available for Sale</label>
            </div>

            <div className="flex items-center mt-4">
              <label className="block text-sm font-medium text-gray-700 mr-4">Status:</label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleInputChange}
                className="mt-1 border border-gray-300 rounded-md shadow-sm p-2"
                required
              >
                <option value="Listed">Listed</option>
                <option value="Unlisted">Unlisted</option>
                <option value="Sold">Sold</option>
              </select>
            </div>
          </div>
          
          <div className="mt-6">
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={uploadingImage || !formData.imageUrl}
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Reset image preview when modal closes
  useEffect(() => {
    if (!isAddModalOpen && !isEditModalOpen) {
      setImagePreview(null);
    }
  }, [isAddModalOpen, isEditModalOpen]);

  // Set image preview when editing
  useEffect(() => {
    if (isEditModalOpen && currentPet && currentPet.imageUrl) {
      setImagePreview(currentPet.imageUrl);
    }
  }, [isEditModalOpen, currentPet]);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Pet Listings Management</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium md:py-2 md:px-4 p-2 rounded flex items-center"
          >
            <Plus size={16} className="md:mr-1" />
            <span className="hidden md:inline">Add New Pet</span>
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search pet name, breed or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
          />
          <div className="absolute left-3 top-2.5 text-gray-400">
            <Search size={18} />
          </div>
        </div>
        
        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'dog' | 'cat')}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Types</option>
            <option value="dog">Dogs</option>
            <option value="cat">Cats</option>
          </select>
        </div>
        
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'available' | 'sold')}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
          </select>
        </div>
        
        <div className="text-right">
          <span className="text-sm text-gray-500">
            Total: {filteredPets.length} pets
          </span>
        </div>
      </div>

      {/* Pet Statistics */}
      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-100 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">
            Listed: {allPetsStats.listed}
          </span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-100 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">
            Unlisted: {allPetsStats.unlisted}
          </span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-100 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">
            Sold: {allPetsStats.sold}
          </span>
        </div>
      </div>

      {/* Pets List - Desktop Table View */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden shadow-md rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Basic Info</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedPets.length > 0 ? (
                paginatedPets.map(pet => (
                  <tr key={pet._id} className={pet.status === 'Sold' ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {pet.petId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-16 w-16 rounded-md overflow-hidden bg-gray-100">
                          <img 
                            src={getImageUrl(pet.imageUrl)} 
                            alt={pet.name} 
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/default-pet-image.png';
                            }}
                          />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{pet.name}</span>
                        <span className="text-sm text-gray-500">{pet.breed}</span>
                        <div className="mt-1 flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            pet.type === 'dog' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {pet.type === 'dog' ? 'Dog' : 'Cat'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            pet.gender === 'Male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                          }`}>
                            {pet.gender === 'Male' ? 'Male' : 'Female'}
                          </span>
                          <span className="text-xs text-gray-500">{pet.age}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleSaleStatus(pet.petId, pet.status || 'Listed')}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          pet.status === 'Listed' || pet.status === undefined
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : pet.status === 'Unlisted'
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        }`}
                      >
                        {(pet.status === 'Listed' || pet.status === undefined) ? (
                          <>
                            <CheckCircle size={16} className="mr-1" />
                            Listed
                          </>
                        ) : pet.status === 'Unlisted' ? (
                          <>
                            <XCircle size={16} className="mr-1" />
                            Unlisted
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Sold
                          </>
                        )}
                      </button>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-3">
                        <button
                          onClick={() => handleEditClick(pet)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeletePet(pet.petId)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No pets found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {paginatedPets.length > 0 ? (
              paginatedPets.map(pet => (
                <div 
                  key={pet._id} 
                  className={`bg-white rounded-lg shadow-sm border ${
                    pet.status === 'Sold' ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'
                  }`}
                >
                  <div className="p-4">
                    {/* Header with ID and Status */}
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-sm font-medium text-gray-500">{pet.petId}</span>
                      <button
                        onClick={() => toggleSaleStatus(pet.petId, pet.status || 'Listed')}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          pet.status === 'Listed' || pet.status === undefined
                            ? 'bg-green-100 text-green-800' 
                            : pet.status === 'Unlisted'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {(pet.status === 'Listed' || pet.status === undefined) ? (
                          <>
                            <CheckCircle size={16} className="mr-1" />
                            Listed
                          </>
                        ) : pet.status === 'Unlisted' ? (
                          <>
                            <XCircle size={16} className="mr-1" />
                            Unlisted
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Sold
                          </>
                        )}
                      </button>
                    </div>

                    {/* Pet Info with Image */}
                    <div className="flex gap-4">
                      <div className="h-24 w-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <img 
                          src={getImageUrl(pet.imageUrl)} 
                          alt={pet.name} 
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/default-pet-image.png';
                          }}
                        />
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-lg font-medium text-gray-900">{pet.name}</h3>
                        <p className="text-gray-600">{pet.breed}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            pet.type === 'dog' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {pet.type === 'dog' ? 'Dog' : 'Cat'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            pet.gender === 'Male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                          }`}>
                            {pet.gender === 'Male' ? 'Male' : 'Female'}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                            {pet.age}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex justify-end space-x-3 border-t pt-4">
                      <button
                        onClick={() => handleEditClick(pet)}
                        className="flex items-center text-blue-600 hover:text-blue-900"
                      >
                        <Edit size={18} className="mr-1" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeletePet(pet.petId)}
                        className="flex items-center text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={18} className="mr-1" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                No pets found
              </div>
            )}
          </div>
        </>
      )}

      {/* Pagination Controls */}
      {paginatedPets.length > 0 && (
        <div className="mt-6 flex justify-between items-center">
          <p className="text-sm text-gray-700">
            Showing {(currentPage - 1) * petsPerPage + 1} to {Math.min(currentPage * petsPerPage, filteredPets.length)} of {filteredPets.length} pets
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded ${
                currentPage === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredPets.length / petsPerPage), prev + 1))}
              disabled={currentPage >= Math.ceil(filteredPets.length / petsPerPage)}
              className={`p-2 rounded ${
                currentPage >= Math.ceil(filteredPets.length / petsPerPage)
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {isAddModalOpen && addModal}
      {isEditModalOpen && editModal}
    </div>
  );
};

export default PetListingsManager; 