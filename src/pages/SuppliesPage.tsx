import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Search,
  User,
  X,
} from "lucide-react";
import { PetSupply } from "../types";
import {
  FALLBACK_SUPPLIES,
  SUPPLY_CATEGORY_LABELS,
} from "../data/fallbackSupplies";
import { getSuppliesCache, prefetchSupplies } from "../utils/pageDataCache";
import SiteFooter from "../components/SiteFooter";
import { getDashboardPath, useAuth } from "../contexts/AuthContext";

const WHATSAPP_URL =
  "https://wa.me/60102568641?text=Hi%20AH%20HAO%20Pet%20Shop%2C%20I%27d%20like%20to%20ask%20about%20pet%20supplies.";
const INITIAL_VISIBLE = 9;

const SuppliesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cached = getSuppliesCache();
  const [items, setItems] = useState<PetSupply[]>(cached ?? FALLBACK_SUPPLIES);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const hadCache = !!getSuppliesCache();
    const load = async () => {
      try {
        const data = await prefetchSupplies({ force: hadCache });
        setItems(data.length > 0 ? data : FALLBACK_SUPPLIES);
      } catch {
        /* keep fallback / cache already on screen */
      }
    };
    load();
  }, []);

  const q = searchQuery.trim().toLowerCase();
  const filtered = items.filter((item) => {
    const matchesCategory = filter === "all" || item.category === filter;
    if (!matchesCategory) return false;
    if (!q) return true;
    const label = SUPPLY_CATEGORY_LABELS[item.category] || item.category;
    return (
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      label.toLowerCase().includes(q)
    );
  });
  const hasMore = filtered.length > INITIAL_VISIBLE;
  const visibleItems = showAll ? filtered : filtered.slice(0, INITIAL_VISIBLE);

  const setCategory = (key: string) => {
    setFilter(key);
    setShowAll(false);
  };

  const categories = [
    { key: "all", label: "All" },
    { key: "dog-food", label: "Dog Food" },
    { key: "cat-food", label: "Cat Food" },
    { key: "treats", label: "Treats" },
    { key: "toys", label: "Toys" },
    { key: "accessories", label: "Accessories" },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gray-50">
      <header className="sticky top-0 z-30 shrink-0 border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="-ml-1.5 shrink-0 rounded-lg p-2 text-gray-500 transition hover:bg-rose-50 hover:text-gray-800 sm:-ml-2"
              aria-label="Back to Home"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="truncate text-base font-bold tracking-tight text-gray-900 sm:text-xl">
              Pet Supplies
            </h1>
          </div>
          <button
            type="button"
            onClick={() =>
              user ? navigate(getDashboardPath(user)) : navigate("/login")
            }
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-rose-50 hover:text-rose-700"
            aria-label={user ? "Go to Dashboard" : "Login"}
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">
              {user ? "Account" : "Login"}
            </span>
          </button>
        </div>
      </header>

      <div className="sticky top-14 z-20 border-b border-gray-200 bg-white/95 backdrop-blur-md sm:top-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-4 py-2.5 sm:px-6 lg:px-8">
          <p className="hidden text-xs text-gray-500 sm:block sm:text-sm">
            Food, treats & toys — enquire for availability
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition sm:text-sm ${
                    filter === cat.key
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-600"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="relative w-full shrink-0 sm:w-56 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search supplies…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowAll(false);
                }}
                className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setShowAll(false);
                  }}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto w-full max-w-7xl flex-1 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
            {q
              ? "No supplies match your search."
              : "No items in this category yet."}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-3">
              {visibleItems.map((item) => (
                <article
                  key={item._id}
                  className="group flex overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200/80 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative h-28 w-28 shrink-0 overflow-hidden bg-gray-50 sm:h-32 sm:w-32">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/imgs/pet supplies.jpg";
                      }}
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-center px-3.5 py-3 sm:px-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-500">
                      {SUPPLY_CATEGORY_LABELS[item.category] || item.category}
                    </p>
                    <h2 className="mt-0.5 truncate text-base font-semibold text-gray-900">
                      {item.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                      {item.description}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <span className="text-base font-bold text-rose-600">
                        {item.displayPrice}
                      </span>
                      <a
                        href={`${WHATSAPP_URL}%20I%27m%20interested%20in%20${encodeURIComponent(item.name)}.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-400 underline-offset-2 transition hover:text-rose-600 hover:underline"
                      >
                        Enquire Now
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAll((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                >
                  {showAll ? (
                    <>
                      Show less
                      <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      View more ({filtered.length - INITIAL_VISIBLE})
                      <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <div className="mt-auto shrink-0">
        <SiteFooter compact />
      </div>
    </div>
  );
};

export default SuppliesPage;
