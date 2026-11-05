import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  Search,
  ZoomIn,
  X,
  Heart,
  User,
} from "lucide-react";
import { apiService } from "../services/apiService";
import { getDashboardPath, useAuth } from "../contexts/AuthContext";
import { getImageUrl } from "../utils/imageUrl";
import { favouritesToPetIdMap } from "../utils/favourites";
import { GenderBadge } from "../components/GenderIcon";
import SiteFooter from "../components/SiteFooter";
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
  status?: string;
  _id?: string;
}

type SortBy = "default" | "name" | "breed" | "age" | "gender" | "petId";

const AllPets: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Initialize selected type from location state or query params
  const initialType = location.state?.initialType || "all";

  const [selectedType, setSelectedType] = useState<"all" | "dog" | "cat">(
    initialType,
  );
  const [selectedGender, setSelectedGender] = useState<
    "all" | "Male" | "Female"
  >("all");
  const [sortBy, setSortBy] = useState<SortBy>("petId");
  const [searchQuery, setSearchQuery] = useState("");
  const cachedPets = getShopPetsCache()?.filter(
    (pet) => pet.status !== "Sold",
  ) as Pet[] | undefined;
  const [pets, setPets] = useState<Pet[]>(cachedPets ?? []);
  const [loading, setLoading] = useState(!cachedPets);
  const [error, setError] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [favourites, setFavourites] = useState<Record<string, boolean>>({});
  const [clickedPetId, setClickedPetId] = useState<string | null>(null);

  // Reuse homepage cache when present; revalidate in background
  useEffect(() => {
    const hadCache = !!getShopPetsCache();
    const fetchPets = async () => {
      try {
        if (!hadCache) setLoading(true);
        const allPets = (
          (await prefetchShopPets({ force: hadCache })) as Pet[]
        ).filter((pet) => pet.status !== "Sold" && pet.status !== "Unlisted");
        setPets(allPets);
        setError(null);
      } catch (err) {
        console.error("Error fetching pets:", err);
        if (!hadCache) {
          setError("Failed to load pets. Please try again later.");
          setPets([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPets();
  }, []);

  const canUseFavourites = Boolean(user && user.role !== "admin");

  // Members only — admins should not see or use favourites
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

  // Toggle favorite status
  const toggleFavourite = async (petId: string, event: React.MouseEvent) => {
    // Prevent event bubbling
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
        // Remove from favorites
        await apiService.favourites.remove(petId);
        setFavourites((prev) => {
          const newFavourites = { ...prev };
          delete newFavourites[petId];
          return newFavourites;
        });
      } else {
        // Add to favorites
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

  // Improve scroll behavior when navigating
  useEffect(() => {
    // Set scroll behavior to auto initially
    document.documentElement.style.scrollBehavior = "auto";
    document.body.style.scrollBehavior = "auto";

    // Scroll to top
    window.scrollTo(0, 0);

    // Set a timer to restore smooth scrolling
    const timer = setTimeout(() => {
      document.documentElement.style.scrollBehavior = "smooth";
      document.body.style.scrollBehavior = "smooth";
    }, 100);

    return () => {
      clearTimeout(timer);
      document.documentElement.style.scrollBehavior = "smooth";
      document.body.style.scrollBehavior = "smooth";
    };
  }, []);

  const sortPets = (petsToSort: Pet[]): Pet[] => {
    let sortedPets = [...petsToSort];
    // Dogs (D…) before cats (C…) — old "#" check put C before D
    const byType = (a: Pet, b: Pet) => {
      if (a.type === b.type) return 0;
      return a.type === "dog" ? -1 : 1;
    };

    switch (sortBy) {
      case "name":
        sortedPets.sort(
          (a, b) => byType(a, b) || a.name.localeCompare(b.name),
        );
        break;
      case "breed":
        sortedPets.sort(
          (a, b) => byType(a, b) || a.breed.localeCompare(b.breed),
        );
        break;
      case "age":
        sortedPets.sort((a, b) => {
          const typeOrder = byType(a, b);
          if (typeOrder !== 0) return typeOrder;
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
      case "gender":
        sortedPets.sort(
          (a, b) => byType(a, b) || a.gender.localeCompare(b.gender),
        );
        break;
      case "petId":
        sortedPets.sort((a, b) => {
          const typeOrder = byType(a, b);
          if (typeOrder !== 0) return typeOrder;
          const numA = parseInt(a.petId.replace(/[^0-9]/g, ""), 10) || 0;
          const numB = parseInt(b.petId.replace(/[^0-9]/g, ""), 10) || 0;
          return numA - numB;
        });
        break;
      default:
        sortedPets.sort(
          (a, b) => byType(a, b) || a.name.localeCompare(b.name),
        );
    }

    return sortedPets;
  };

  // Filter pets based on search query and selected filters
  const filteredPets = pets.filter((pet) => {
    const matchesType = selectedType === "all" || pet.type === selectedType;
    const matchesGender =
      selectedGender === "all" || pet.gender === selectedGender;
    const matchesSearch =
      searchQuery === "" ||
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
    if (state && state.from === "dogs-section") {
      console.log("Going back to dogs section");
      navigate("/", {
        state: {
          scrollToDogsSection: true,
          timestamp: Date.now(),
          scrollPosition:
            sessionStorage.getItem("dogsScrollPosition") || undefined,
        },
      });
      return;
    }
    // If coming from Cats section, restore to that position
    else if (state && state.from === "cats-section") {
      console.log("Going back to cats section");
      navigate("/", {
        state: {
          scrollToCatsSection: true,
          timestamp: Date.now(),
          scrollPosition:
            sessionStorage.getItem("catsScrollPosition") || undefined,
        },
      });
      return;
    }
    // If coming from hero section
    else if (state && state.fromHero) {
      navigate("/", { state: { fromHero: true } });
      return;
    }

    // Default case - go back
    window.history.back();
  };

  const generateWhatsAppUrl = (pet: Pet) => {
    const phoneNumber = "60102568641";
    const message = `Hi AH HAO Pet Shop, I'm interested in ${pet.name} (${pet.petId}, ${pet.breed}). Can you tell me more about this pet?`;
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  };

  const handlePetCardClick = (petId: string) => {
    if (clickedPetId === petId) {
      setClickedPetId(null);
    } else {
      setClickedPetId(petId);
    }
  };

  const pageHeader = (
    <header className="sticky top-0 z-30 shrink-0 border-b border-gray-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="shrink-0 rounded-lg p-2 text-gray-500 transition hover:bg-rose-50 hover:text-gray-800"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="truncate text-base font-bold tracking-tight text-gray-900 sm:text-xl">
            Meet Our Pets
          </h1>
        </div>
        <button
          type="button"
          onClick={() =>
            user ? navigate(getDashboardPath(user)) : navigate("/login")
          }
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-rose-50 hover:text-rose-700"
          aria-label={user ? "Go to Dashboard" : "Login"}
        >
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">{user ? "Account" : "Login"}</span>
        </button>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-gray-50">
        {pageHeader}
        <div className="flex flex-1 items-center justify-center py-16">
          <p className="text-gray-500">Loading pets…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-gray-50">
        {pageHeader}
        <div className="flex flex-1 items-center justify-center py-16">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gray-50">
      {pageHeader}

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            Showing {sortedPets.length}{" "}
            {sortedPets.length === 1 ? "pet" : "pets"}
          </p>
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:mb-6">
          <div className="flex items-center gap-3">
            <div
              className="relative inline-grid w-fit shrink-0 grid-cols-3 rounded-full bg-stone-100 p-1"
              role="group"
              aria-label="Pet type"
            >
              <span
                aria-hidden
                className={`pointer-events-none absolute bottom-1 left-1 top-1 w-[calc((100%-8px)/3)] rounded-full shadow-sm transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                  selectedType === "dog"
                    ? "bg-green-100"
                    : selectedType === "cat"
                      ? "bg-sky-100"
                      : "bg-violet-100"
                }`}
                style={{
                  transform: `translateX(${selectedType === "dog" ? 100 : selectedType === "cat" ? 200 : 0}%)`,
                }}
              />
              {(
                [
                  { value: "all", label: "All Pets" },
                  { value: "dog", label: "Dogs" },
                  { value: "cat", label: "Cats" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedType(opt.value)}
                  className={`relative z-10 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-300 sm:px-4 ${
                    selectedType === opt.value
                      ? "text-gray-900"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="relative ml-auto w-full min-w-0 max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              {!searchQuery && (
                <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-sm text-gray-400 sm:hidden">
                  Search
                </span>
              )}
              <input
                type="text"
                placeholder="Search name or breed…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm outline-none transition placeholder:text-transparent focus:border-rose-300 focus:ring-2 focus:ring-rose-100 sm:placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Gender</span>
              {(
                [
                  { value: "all", label: "All" },
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedGender(opt.value)}
                  className={`px-1 text-xs transition ${
                    selectedGender === opt.value
                      ? "font-semibold text-gray-900"
                      : "font-medium text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Sort</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="appearance-none rounded-full border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-xs text-gray-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                >
                  <option value="name">By Name</option>
                  <option value="petId">By Pet ID</option>
                  <option value="breed">By Breed</option>
                  <option value="age">By Age</option>
                  <option value="gender">By Gender</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Pet Grid */}
        {sortedPets.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-gray-500">
              No pets found matching your criteria.
            </p>
            <button
              onClick={() => {
                setSelectedType("all");
                setSelectedGender("all");
                setSearchQuery("");
                setSortBy("default");
              }}
              className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {sortedPets.map((pet) => (
              <div
                key={pet.petId}
                onClick={() => handlePetCardClick(pet.petId)}
                className={`overflow-hidden rounded-xl bg-white transition-all duration-300 ${
                  clickedPetId === pet.petId
                    ? "-translate-y-1 shadow-xl"
                    : "shadow-md hover:-translate-y-1 hover:shadow-xl"
                }`}
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={getImageUrl(pet.imageUrl)}
                    alt={pet.name}
                    className="h-full w-full bg-gray-50 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/default-pet-image.png";
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
                  {canUseFavourites && pet.petId && pet.name !== "Milo" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavourite(pet.petId, e);
                      }}
                      className="absolute top-3 right-3 bg-white/80 hover:bg-white p-1.5 rounded-full shadow-md transition-colors cursor-pointer"
                      aria-label={
                        favourites[pet.petId]
                          ? "Remove from favourites"
                          : "Add to favourites"
                      }
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          favourites[pet.petId]
                            ? "text-rose-600 fill-rose-600"
                            : "text-gray-400 hover:text-rose-600"
                        }`}
                      />
                    </button>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-2 gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="truncate text-xl font-semibold text-gray-800">
                        {pet.name}
                      </h3>
                      <GenderBadge gender={pet.gender} />
                    </div>
                    <span className="shrink-0 text-gray-500 text-sm">
                      {pet.petId}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-1">{pet.breed}</p>
                  <p className="text-gray-600 mb-4">{pet.age}</p>
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

      <SiteFooter compact />
    </div>
  );
};

export default AllPets;
