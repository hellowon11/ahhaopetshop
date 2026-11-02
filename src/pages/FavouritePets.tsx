import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ShopPet } from "../types/index";
import { apiService } from "../services/apiService";
import { Heart, ArrowLeft, ZoomIn, X } from "lucide-react";
import Toast, { ToastState } from "../components/Toast";
import { GenderBadge } from "../components/GenderIcon";
import { getDashboardPath, useAuth } from "../contexts/AuthContext";

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
  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = useCallback(
    (message: string, type: ToastState["type"] = "success") => {
      setToast({ message, type });
    },
    [],
  );
  const clearToast = useCallback(() => setToast(null), []);

  // 获取收藏列表
  useEffect(() => {
    const fetchFavourites = async () => {
      try {
        setLoading(true);
        const data = await apiService.favourites.getAll();
        setFavourites(data as FavouriteItem[]);
        setError(null);
      } catch (error) {
        console.error("Error fetching favourites:", error);
        setError("Failed to load your favourite pets. Please try again later.");
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
      setFavourites(
        favourites.filter(
          (item) =>
            item.pet?.petId !== petId && (item.pet as ShopPet)?._id !== petId,
        ),
      );
      showToast("Removed from favourites");
    } catch (error) {
      console.error("Error removing favourite:", error);
      showToast("Failed to remove from favourites", "error");
    }
  };

  // 返回会员仪表板
  const handleBackToDashboard = () => {
    navigate("/member-dashboard");
  };

  // WhatsApp 查询
  const generateWhatsAppUrl = (pet: ShopPet) => {
    const phoneNumber = "60102568641";
    const message = `Hi AH HAO Pet Shop, I'm interested in ${pet.name} (${pet.petId}, ${pet.breed}). Can you tell me more about this pet?`;
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <Toast toast={toast} onClose={clearToast} />
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

            <h1 className="absolute left-1/2 transform -translate-x-1/2 text-xl font-semibold text-gray-900">
              My Favourite Pets
            </h1>

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
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
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
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              No favourite pets yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Browse our pet shop and add some pets to your favourites list.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate("/all-pets")}
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
                <div
                  key={item._id}
                  className="overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={pet.imageUrl}
                      alt={pet.name}
                      className="h-full w-full bg-gray-50 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFavourite(pet._id)}
                      className="absolute top-3 right-3 rounded-full bg-white/80 p-1.5 shadow-md transition-colors hover:bg-white"
                      aria-label="Remove from favourites"
                    >
                      <Heart className="h-5 w-5 fill-rose-600 text-rose-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnlargedImage(pet.imageUrl)}
                      className="absolute bottom-3 right-3 rounded-full bg-white/80 p-1.5 shadow-md transition-colors hover:bg-white"
                      aria-label="Zoom image"
                    >
                      <ZoomIn className="h-5 w-5 text-gray-700" />
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="truncate text-xl font-semibold text-gray-800">
                          {pet.name}
                        </h3>
                        <GenderBadge gender={pet.gender} />
                      </div>
                      <span className="shrink-0 text-sm text-gray-500">
                        {pet.petId}
                      </span>
                    </div>
                    <p className="mb-1 text-gray-600">{pet.breed}</p>
                    <p className="mb-4 text-gray-600">{pet.age}</p>
                    <div className="flex justify-end">
                      {pet.name === "Milo" || pet.isForSale === false ? (
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
                          Enquire Now
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
