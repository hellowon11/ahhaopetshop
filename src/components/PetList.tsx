import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, ZoomIn, X, Heart } from "lucide-react";
import { apiService } from "../services/apiService";
import { useAuth } from "../contexts/AuthContext";
import { favouritesToPetIdMap } from "../utils/favourites";
import { GenderBadge } from "./GenderIcon";
import { getShopPetsCache, prefetchShopPets } from "../utils/pageDataCache";

interface Pet {
  petId: string;
  name: string;
  breed: string;
  age: string;
  gender: "Male" | "Female";
  imageUrl: string;
  type: "dog" | "cat";
  isForSale?: boolean;
  _id?: string;
  status?: string;
}

const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: "smooth" });
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
    sessionStorage.setItem("dogsScrollPosition", scrollPosition.toString());

    navigate("/all-pets", {
      state: {
        initialType: "dog",
        fromComponent: "PetList",
        from: "dogs-section",
        // Add a timestamp to make each navigation unique
        timestamp: Date.now(),
      },
    });
  };

  const handleViewAllCats = () => {
    console.log("View All Cats clicked - navigating to All Pets");
    // Save the current scroll position before navigating
    const scrollPosition = window.pageYOffset;
    sessionStorage.setItem("catsScrollPosition", scrollPosition.toString());

    navigate("/all-pets", {
      state: {
        initialType: "cat",
        fromComponent: "PetList",
        from: "cats-section",
        // Add a timestamp to make each navigation unique
        timestamp: Date.now(),
      },
    });
  };

  const canUseFavourites = Boolean(user && user.role !== "admin");

  // Members only — admins manage pets in Admin Portal, not favourites
  useEffect(() => {
    if (!canUseFavourites) {
      setFavourites({});
      return;
    }
    const fetchFavouritesStatus = async () => {
      try {
        const favouritesData = await apiService.favourites.getAll();
        setFavourites(favouritesToPetIdMap(favouritesData as any[]));
      } catch (error) {
        console.error("Error fetching favourites status:", error);
      }
    };
    fetchFavouritesStatus();
  }, [canUseFavourites]);

  // 切换收藏状态
  const toggleFavourite = async (petId: string, event: React.MouseEvent) => {
    // 阻止点击事件冒泡
    event.stopPropagation();

    if (!canUseFavourites) {
      if (!user) {
        alert("Please login to add favourites");
        navigate("/login");
      }
      return;
    }

    try {
      if (favourites[petId]) {
        // 取消收藏
        await apiService.favourites.remove(petId);
        setFavourites((prev) => {
          const newFavourites = { ...prev };
          delete newFavourites[petId];
          return newFavourites;
        });
      } else {
        // 添加收藏
        await apiService.favourites.add(petId);
        setFavourites((prev) => ({
          ...prev,
          [petId]: true,
        }));
      }
    } catch (error) {
      console.error("Error toggling favourite:", error);
    }
  };

  // Fetch pets (shared cache so All Pets opens instantly after home)
  useEffect(() => {
    const applyPets = (allPets: Pet[]) => {
      const isPublic = (pet: Pet) =>
        pet.status !== "Sold" && pet.status !== "Unlisted";
      const fetchedDogs = allPets.filter(
        (pet) => pet.type === "dog" && isPublic(pet),
      );
      const fetchedCats = allPets.filter(
        (pet) => pet.type === "cat" && isPublic(pet),
      );

      const sortedDogs = fetchedDogs.sort((a, b) => {
        if (a.name === "Milo" || a.petId === "D001") return -1;
        if (b.name === "Milo" || b.petId === "D001") return 1;
        const numA = parseInt(a.petId.replace(/[^0-9]/g, ""), 10);
        const numB = parseInt(b.petId.replace(/[^0-9]/g, ""), 10);
        return numA - numB;
      });

      const sortedCats = fetchedCats.sort((a, b) => {
        const numA = parseInt(a.petId.replace(/[^0-9]/g, ""), 10);
        const numB = parseInt(b.petId.replace(/[^0-9]/g, ""), 10);
        return numA - numB;
      });

      setDogs(sortedDogs);
      setCats(sortedCats);
    };

    const cached = getShopPetsCache();
    if (cached) {
      applyPets(cached as Pet[]);
      setLoading(false);
    }

    const fetchPets = async () => {
      try {
        if (!cached) setLoading(true);
        const allPets = (await prefetchShopPets({ force: !!cached })) as Pet[];
        applyPets(allPets);
      } catch (err) {
        console.error("Error fetching pets:", err);
        if (!cached) {
          setError("Failed to load pets. Please try again later.");
          setDogs([]);
          setCats([]);
        }
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

  const visibleDogs = dogs.slice(
    dogPage * dogsPerPage,
    (dogPage + 1) * dogsPerPage,
  );
  const visibleCats = cats.slice(
    catPage * catsPerPage,
    (catPage + 1) * catsPerPage,
  );

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
    const phoneNumber = "60102568641"; // Your WhatsApp number
    const message = `Hi AH HAO Pet Shop, I'm interested in ${pet.name} (${pet.petId}, ${pet.breed}, ${pet.age} old). Can you provide more information?`;
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
    <div className="pb-16">
      {/* Mobile View */}
      <div className="md:hidden container mx-auto px-6">
        <div className="flex justify-center gap-4">
          <button
            onClick={() => navigate("/all-pets")}
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
        <div id="dogs-section" className="mb-20 scroll-mt-28">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800 sm:text-3xl">
              Dogs
            </h2>
            <button
              type="button"
              onClick={handleViewAllDogs}
              className="flex items-center text-rose-600 hover:text-rose-700"
            >
              View All
              <ArrowRight className="ml-1 h-5 w-5" />
            </button>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <button
                onClick={prevDogPage}
                className="absolute left-0 z-10 p-2 rounded-full bg-gradient-to-r from-white/90 via-white to-white/90 shadow-lg hover:shadow-xl hover:bg-white active:ring-2 active:ring-rose-500 focus:outline-none transition-all duration-150 backdrop-blur-sm group"
                style={{ transform: "translateX(-50%)" }}
              >
                <ArrowLeft className="w-6 h-6 text-gray-600 group-hover:text-rose-600" />
              </button>
              <div className="grid grid-cols-3 gap-8 w-full mx-12">
                {visibleDogs.map((dog) => (
                  <div
                    key={dog.petId}
                    onClick={() => handlePetCardClick(dog.petId)}
                    className={`overflow-hidden rounded-xl bg-white transition-all duration-300 ${
                      clickedPetId === dog.petId
                        ? "-translate-y-1 shadow-xl"
                        : "shadow-md hover:-translate-y-1 hover:shadow-xl"
                    }`}
                  >
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={dog.imageUrl}
                        alt={dog.name}
                        className="h-full w-full bg-gray-50 object-contain"
                      />
                      {canUseFavourites && dog.petId && (
                        <button
                          onClick={(e) => toggleFavourite(dog.petId, e)}
                          className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors cursor-pointer"
                          aria-label={
                            favourites[dog.petId]
                              ? "Remove from favourites"
                              : "Add to favourites"
                          }
                        >
                          <Heart
                            className={`h-5 w-5 ${
                              favourites[dog.petId]
                                ? "text-rose-600 fill-rose-600"
                                : "text-gray-400 hover:text-rose-600"
                            }`}
                          />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnlargedImage(dog.imageUrl);
                        }}
                        className="absolute bottom-3 right-3 bg-white/80 hover:bg-white p-1.5 rounded-full shadow-md transition-colors cursor-pointer"
                        aria-label="Zoom image"
                      >
                        <ZoomIn className="w-5 h-5 text-gray-700" />
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <h3 className="truncate text-xl font-semibold text-gray-800">
                            {dog.name}
                          </h3>
                          <GenderBadge gender={dog.gender} />
                        </div>
                        <span className="shrink-0 text-gray-500 text-sm">
                          {dog.petId}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-1">{dog.breed}</p>
                      <p className="text-gray-600 mb-4">{dog.age}</p>
                      <div className="flex justify-end">
                        {dog.name === "Milo" || dog.isForSale === false ? (
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
                            Enquire Now
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
                style={{ transform: "translateX(50%)" }}
              >
                <ArrowRight className="w-6 h-6 text-gray-600 group-hover:text-rose-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Cats Section */}
        <div id="cats-section" className="scroll-mt-28">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800 sm:text-3xl">
              Cats
            </h2>
            <button
              type="button"
              onClick={handleViewAllCats}
              className="flex items-center text-rose-600 hover:text-rose-700"
            >
              View All
              <ArrowRight className="ml-1 h-5 w-5" />
            </button>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <button
                onClick={prevCatPage}
                className="absolute left-0 z-10 p-2 rounded-full bg-gradient-to-r from-white/90 via-white to-white/90 shadow-lg hover:shadow-xl hover:bg-white active:ring-2 active:ring-rose-500 focus:outline-none transition-all duration-150 backdrop-blur-sm group"
                style={{ transform: "translateX(-50%)" }}
              >
                <ArrowLeft className="w-6 h-6 text-gray-600 group-hover:text-rose-600" />
              </button>
              <div className="grid grid-cols-3 gap-8 w-full mx-12">
                {visibleCats.map((cat) => (
                  <div
                    key={cat.petId}
                    onClick={() => handlePetCardClick(cat.petId)}
                    className={`overflow-hidden rounded-xl bg-white transition-all duration-300 ${
                      clickedPetId === cat.petId
                        ? "-translate-y-1 shadow-xl"
                        : "shadow-md hover:-translate-y-1 hover:shadow-xl"
                    }`}
                  >
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="h-full w-full bg-gray-50 object-contain"
                      />
                      {canUseFavourites && cat.petId && (
                        <button
                          onClick={(e) => toggleFavourite(cat.petId, e)}
                          className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors cursor-pointer"
                          aria-label={
                            favourites[cat.petId]
                              ? "Remove from favourites"
                              : "Add to favourites"
                          }
                        >
                          <Heart
                            className={`h-5 w-5 ${
                              favourites[cat.petId]
                                ? "text-rose-600 fill-rose-600"
                                : "text-gray-400 hover:text-rose-600"
                            }`}
                          />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnlargedImage(cat.imageUrl);
                        }}
                        className="absolute bottom-3 right-3 bg-white/80 hover:bg-white p-1.5 rounded-full shadow-md transition-colors cursor-pointer"
                        aria-label="Zoom image"
                      >
                        <ZoomIn className="w-5 h-5 text-gray-700" />
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <h3 className="truncate text-xl font-semibold text-gray-800">
                            {cat.name}
                          </h3>
                          <GenderBadge gender={cat.gender} />
                        </div>
                        <span className="shrink-0 text-gray-500 text-sm">
                          {cat.petId}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-1">{cat.breed}</p>
                      <p className="text-gray-600 mb-4">{cat.age}</p>
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
                            Enquire Now
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
                style={{ transform: "translateX(50%)" }}
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
