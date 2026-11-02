import React, { useState, useEffect } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Dog,
  Cat,
  Scissors,
  Home,
  ShoppingBag,
  ArrowRight,
  Clock,
  Share2,
  Check,
} from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import emailjs from "@emailjs/browser";
import PetList from "./PetList";
import { getDashboardPath, useAuth } from "../contexts/AuthContext";
import Navigation from "./Navigation";
import ChatDogHouse from "./ChatDogHouse";
import SiteFooter from "./SiteFooter";
import { GenderBadge } from "./GenderIcon";
import { prefetchDashboard } from "../utils/dashboardCache";
import { getImageUrl } from "../utils/imageUrl";
import {
  getShopPetsCache,
  prefetchGroomingServices,
  prefetchPublicPages,
  prefetchShopPets,
  prefetchSupplies,
} from "../utils/pageDataCache";

const ENQUIRY_EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

type PreviewPet = {
  petId: string;
  name: string;
  breed: string;
  age?: string;
  gender: "Male" | "Female";
  imageUrl: string;
  type: "dog" | "cat";
  status?: string;
};

/** Compact age for the photo chip — keeps card text block clean. */
function formatPeekAge(age: string): string {
  const raw = age.trim();
  if (!raw) return "";
  const years = raw.match(/(\d+)\s*years?/i);
  const months = raw.match(/(\d+)\s*months?/i);
  if (years && months) return `${years[1]}y ${months[1]}mo`;
  if (years) return Number(years[1]) === 1 ? "1 yr" : `${years[1]} yrs`;
  if (months) return Number(months[1]) === 1 ? "1 mo" : `${months[1]} mo`;
  return raw;
}

/** Mobile home strip: same light lift as Our Services cards, without opening a page. */
function MobilePetPeekCard({ pet }: { pet: PreviewPet }) {
  const ageLabel = pet.age ? formatPeekAge(pet.age) : "";

  return (
    <div className="w-[8.75rem] shrink-0 select-none rounded-2xl bg-white text-left shadow-sm ring-1 ring-gray-100 transition duration-300 [-webkit-touch-callout:none] hover:-translate-y-1 hover:shadow-md active:-translate-y-1 active:shadow-md min-[390px]:w-[9.5rem] min-[430px]:w-[10.25rem]">
      <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-gray-50">
        <img
          src={getImageUrl(pet.imageUrl)}
          alt={pet.name}
          className="pointer-events-none h-full w-full object-contain"
          loading="lazy"
          draggable={false}
        />
        {ageLabel ? (
          <span className="absolute bottom-1.5 left-1.5 max-w-[calc(100%-0.75rem)] truncate rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums leading-none text-gray-700 shadow-sm ring-1 ring-black/5 backdrop-blur-[2px]">
            {ageLabel}
          </span>
        ) : null}
      </div>
      <div className="px-2.5 py-2">
        <div className="flex items-center justify-between gap-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            {pet.name}
          </p>
          <GenderBadge gender={pet.gender} className="shrink-0 scale-90" />
        </div>
        <p className="mt-0.5 truncate text-xs text-gray-500">{pet.breed}</p>
      </div>
    </div>
  );
}

const address =
  "2, Persiaran Jalil 8, Bukit Jalil, 57000 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur (Pavilion Bukit Jalil)";

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const [enquiry, setEnquiry] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [enquiryErrors, setEnquiryErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
  }>({});
  const [formStatus, setFormStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const googleMapsApiKey = "AIzaSyDkUYcDF3nqXz6ETGxwZO-_C-nJtPr6sHE";
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedPetType, setSelectedPetType] = useState<"dog" | "cat">("dog");
  const [mobilePetSlide, setMobilePetSlide] = useState<"dog" | "cat" | null>(
    null,
  );
  const [mobilePets, setMobilePets] = useState<PreviewPet[]>(() => {
    const cached = getShopPetsCache() as PreviewPet[] | null;
    return (
      cached?.filter((p) => p.status !== "Sold" && p.status !== "Unlisted") ??
      []
    );
  });

  // Prefetch dashboard + public pages while browsing home so navigation feels instant
  useEffect(() => {
    if (user?._id) {
      void prefetchDashboard(user._id);
    }
  }, [user?._id]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const all = (await prefetchShopPets()) as PreviewPet[];
        if (cancelled) return;
        setMobilePets(
          all.filter((p) => p.status !== "Sold" && p.status !== "Unlisted"),
        );
      } catch {
        /* keep cache / empty */
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const idle =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? (
            window as Window & {
              requestIdleCallback: (cb: () => void) => number;
            }
          ).requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 400);
    const cancel =
      typeof window !== "undefined" && "cancelIdleCallback" in window
        ? (window as Window & { cancelIdleCallback: (id: number) => void })
            .cancelIdleCallback
        : (id: number) => window.clearTimeout(id);

    const id = idle(() => prefetchPublicPages());
    return () => cancel(id);
  }, []);

  useEffect(() => {
    if (location.state) {
      // Handle scrolling to Dogs section from All Pets page
      if ("scrollToDogsSection" in location.state) {
        console.log("MainApp: Scrolling to Dogs section", location.state);

        // Delay to ensure DOM is fully loaded
        setTimeout(() => {
          // Use a fixed position that corresponds to the screenshot (constant value)
          // Disable smooth scrolling temporarily
          document.documentElement.style.scrollBehavior = "auto";
          document.body.style.scrollBehavior = "auto";

          // Use fixed position that matches the screenshot exactly
          window.scrollTo({
            top: 2400, // Absolute position that matches the screenshot
          });

          // Set the pet type
          setSelectedPetType("dog");

          // Re-enable smooth scrolling after scrolling
          setTimeout(() => {
            document.documentElement.style.scrollBehavior = "smooth";
            document.body.style.scrollBehavior = "smooth";
          }, 100);

          // Clear navigation state after handling but with a delay
          setTimeout(() => {
            window.history.replaceState({}, document.title);
          }, 200);
        }, 100);

        return;
      }

      // Handle scrolling to Cats section from All Pets page
      if ("scrollToCatsSection" in location.state) {
        console.log("MainApp: Scrolling to Cats section", location.state);

        // Delay to ensure DOM is fully loaded
        setTimeout(() => {
          // Use a fixed position that corresponds to the desired view
          // Disable smooth scrolling temporarily
          document.documentElement.style.scrollBehavior = "auto";
          document.body.style.scrollBehavior = "auto";

          // Use fixed position that shows the cats section similarly to dogs
          window.scrollTo({
            top: 3000, // Absolute position for cats section below dogs
          });

          // Set the pet type
          setSelectedPetType("cat");

          // Re-enable smooth scrolling after scrolling
          setTimeout(() => {
            document.documentElement.style.scrollBehavior = "smooth";
            document.body.style.scrollBehavior = "smooth";
          }, 100);

          // Clear navigation state after handling but with a delay
          setTimeout(() => {
            window.history.replaceState({}, document.title);
          }, 200);
        }, 100);

        return;
      }

      // Handle returning from All Pets page to specific section
      if ("scrollTo" in location.state && location.state.fromAllPets) {
        const sectionId = location.state.scrollTo;
        const element = document.getElementById(sectionId);
        if (element) {
          const navHeight = 80;
          const elementPosition = element.getBoundingClientRect().top;

          // Calculate different offset based on where we're coming from
          let offsetPosition;
          if (location.state.fromViewAllButton) {
            // When returning from View All Dogs/Cats button, position to top of that section
            offsetPosition =
              elementPosition + window.pageYOffset - navHeight - 10;
          } else {
            // Standard offset for other returns
            offsetPosition =
              elementPosition + window.pageYOffset - navHeight - 120;
          }

          // Disable smooth scrolling temporarily
          document.documentElement.style.scrollBehavior = "auto";
          document.body.style.scrollBehavior = "auto";

          // Instant scroll
          window.scrollTo({
            top: location.state.maintainScroll
              ? offsetPosition - 50
              : offsetPosition,
          });

          // Re-enable smooth scrolling after a short delay
          setTimeout(() => {
            document.documentElement.style.scrollBehavior = "smooth";
            document.body.style.scrollBehavior = "smooth";
          }, 100);

          // Set the pet type after scrolling
          setSelectedPetType(
            location.state.scrollTo === "dogs-section" ? "dog" : "cat",
          );
        }
      }
      // Handle returning from All Pets page to hero section
      else if ("fromHero" in location.state) {
        window.scrollTo({
          top: 0,
        });
      }
      // Handle returning from grooming page to Premium Grooming section
      else if ("scrollToPremiumGrooming" in location.state) {
        const element = document.getElementById("premium-grooming");
        if (element) {
          const navHeight = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition =
            elementPosition + window.pageYOffset - navHeight;

          // Disable smooth scrolling temporarily
          document.documentElement.style.scrollBehavior = "auto";
          document.body.style.scrollBehavior = "auto";

          window.scrollTo({
            top: offsetPosition,
          });

          // Re-enable smooth scrolling after a short delay
          setTimeout(() => {
            document.documentElement.style.scrollBehavior = "smooth";
            document.body.style.scrollBehavior = "smooth";
          }, 100);
        }
      }
      // Footer / cross-page section jump (e.g. Contact from Daycare)
      else if (
        "scrollTo" in location.state &&
        typeof location.state.scrollTo === "string"
      ) {
        const sectionId = location.state.scrollTo as string;
        setTimeout(() => {
          const element = document.getElementById(sectionId);
          if (!element) return;
          const navHeight = 80;
          const top =
            element.getBoundingClientRect().top +
            window.pageYOffset -
            navHeight;
          window.scrollTo({ top, behavior: "smooth" });
          window.history.replaceState({}, document.title);
        }, 80);
      }

      // Clear the state by replacing, but don't do it for Dogs/Cats sections
      // (they are already cleared above)
      if (
        !("scrollToDogsSection" in location.state) &&
        !("scrollToCatsSection" in location.state)
      ) {
        // Clear the state for other navigations
        navigate("/", {});
      }
    }
  }, [location.state, navigate]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // 获取导航栏高度
      const navHeight = 80;
      // 获取元素位置
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset;

      // 检测是否为移动设备
      const isMobile = window.innerWidth < 768;

      // 计算滚动位置
      let scrollPosition;
      if (isMobile) {
        // 移动端: 为不同部分设置特定偏移量
        switch (sectionId) {
          case "home":
            scrollPosition = 0; // 首页直接滚到顶部
            break;
          case "about":
            // About Us部分需要更精确的位置调整，使标题恰好位于视图顶部
            scrollPosition = offsetPosition - navHeight + 5;
            break;
          case "services":
            scrollPosition = offsetPosition - navHeight;
            break;
          case "our-pets":
            scrollPosition = offsetPosition - navHeight;
            break;
          case "premium-grooming":
            scrollPosition = offsetPosition - navHeight;
            break;
          case "contact":
            // For Contact Us section, scroll with a -20px offset on mobile
            scrollPosition = offsetPosition - navHeight + 20;
            break;
          default:
            scrollPosition = offsetPosition - navHeight;
        }
      } else {
        // 桌面端: 保持原有逻辑，但为Contact部分添加15px的负偏移量
        if (sectionId === "contact") {
          scrollPosition = offsetPosition - navHeight + 15; // Using -15px offset (adding 15px to position)
        } else {
          scrollPosition = offsetPosition - navHeight;
        }
      }

      window.scrollTo({
        top: scrollPosition,
        behavior: "smooth",
      });
    }
  };

  const handlePetTypeChange = (type: "dog" | "cat") => {
    setSelectedPetType(type);
    const sectionId = type === "dog" ? "dogs-section" : "cats-section";
    const element = document.getElementById(sectionId);
    if (element) {
      // 获取导航栏高度
      const navHeight = 80;
      // 检测是否为移动设备
      const isMobile = window.innerWidth < 768;

      // 获取元素位置
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset;

      // 计算滚动位置
      let scrollPosition;
      if (isMobile) {
        // 移动端: 将部分放在顶部导航栏下方一小段距离
        scrollPosition = offsetPosition - navHeight - 20;
      } else {
        // 桌面端: 保持原有逻辑
        const extraOffset = type === "cat" ? 120 : 80;
        scrollPosition = offsetPosition - navHeight - extraOffset;
      }

      window.scrollTo({
        top: scrollPosition,
        behavior: "smooth",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const next: typeof enquiryErrors = {};
    if (!enquiry.name.trim()) next.name = "Please enter your name";
    if (!enquiry.phone.trim()) next.phone = "Please enter your phone number";
    if (!enquiry.email.trim()) next.email = "Please enter your email";
    else if (!ENQUIRY_EMAIL_RE.test(enquiry.email.trim()))
      next.email = "Please enter a valid email";
    if (!enquiry.message.trim()) next.message = "Please enter your message";
    setEnquiryErrors(next);
    if (Object.keys(next).length > 0) {
      setFormStatus("idle");
      return;
    }

    try {
      setFormStatus("sending");
      const adminResponse = await emailjs.send(
        "service_1lvspsq",
        "template_zm1ko18",
        {
          name: enquiry.name.trim(),
          email: enquiry.email.trim(),
          phone: enquiry.phone.trim(),
          message: enquiry.message.trim(),
          submit_date: new Date().toLocaleString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          to_email: "ahhaopetshop@gmail.com",
          reply_to: enquiry.email.trim(),
        },
        "XZAZGsFEqh4uujbjP",
      );

      if (adminResponse.status !== 200) {
        throw new Error(`Failed with status: ${adminResponse.status}`);
      }

      setEnquiry({ name: "", email: "", phone: "", message: "" });
      setEnquiryErrors({});
      setFormStatus("success");
    } catch (error) {
      console.error("Error sending email:", error);
      setFormStatus("error");
    }
  };

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNavigate = (
    path: string,
    fromHero?: boolean,
    isGrooming?: boolean,
  ) => {
    // Instant top — global CSS smooth scroll would otherwise animate from mid-page
    document.documentElement.style.scrollBehavior = "auto";
    document.body.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);

    if (path === "/all-pets" && fromHero) {
      navigate(path, {
        state: { fromHero: true },
      });
    } else if (path === "/grooming-appointment") {
      navigate(path, {
        state: { fromPremiumGrooming: isGrooming === true },
      });
    } else if (
      path === "/daycare" ||
      path === "/supplies" ||
      path === "/all-pets"
    ) {
      navigate(path);
    } else {
      navigate(path, { replace: true });
    }
  };

  const handleMemberClick = () => {
    navigate("/member-dashboard");
  };

  return (
    <div className="relative">
      <Navigation onSectionClick={scrollToSection} />
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section
          id="home"
          className="bg-gradient-to-r from-rose-50 to-rose-100 pb-8 pt-[4.5rem] sm:pb-12 sm:pt-24"
        >
          <div className="container mx-auto px-4 py-5 sm:px-6 sm:py-16">
            <div className="flex flex-col items-center justify-between gap-5 sm:gap-8 lg:flex-row lg:gap-12">
              <div className="mt-1 w-full space-y-3.5 text-center sm:mt-0 sm:space-y-6 lg:w-1/2 lg:text-left">
                <h1 className="text-[1.75rem] font-bold leading-snug text-gray-900 min-[390px]:text-3xl sm:text-5xl sm:leading-tight lg:text-6xl">
                  Welcome to <span className="text-rose-600">AH HAO</span> PET
                  SHOP
                </h1>
                <p className="mx-auto max-w-2xl text-[15px] text-gray-600 sm:mx-0 sm:text-xl">
                  Your trusted partner in pet care and happiness
                </p>
                <div className="flex flex-col justify-center gap-2.5 sm:flex-row sm:gap-4 lg:justify-start">
                  <button
                    onClick={() => handleNavigate("/grooming-appointment")}
                    onMouseEnter={() => void prefetchGroomingServices()}
                    onFocus={() => void prefetchGroomingServices()}
                    className="rounded-xl bg-rose-600 px-5 py-3 text-[15px] font-medium text-white shadow-lg transition-colors duration-300 hover:-translate-y-1 hover:bg-rose-700 hover:shadow-xl sm:rounded-lg sm:px-6 sm:text-base"
                  >
                    Book Grooming Service
                  </button>
                  <button
                    onClick={() => handleNavigate("/all-pets", true)}
                    onMouseEnter={() => void prefetchShopPets()}
                    onFocus={() => void prefetchShopPets()}
                    className="rounded-xl border-2 border-rose-600 bg-white px-5 py-3 text-[15px] font-medium text-rose-600 shadow-lg transition-colors duration-300 hover:-translate-y-1 hover:bg-rose-50 hover:shadow-xl sm:rounded-lg sm:px-6 sm:text-base"
                  >
                    Meet Our Pets
                  </button>
                </div>
              </div>
              {/* Image grid — shorter on phones so first screen isn’t all tiles */}
              <div className="mt-1 w-full lg:mt-0 lg:w-1/2">
                <div className="grid h-[248px] grid-rows-2 gap-2.5 min-[390px]:h-[272px] min-[430px]:h-[300px] sm:h-[400px] sm:gap-4 lg:h-[500px]">
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => handleNavigate("/all-pets", true)}
                      onMouseEnter={() => void prefetchShopPets()}
                      onFocus={() => void prefetchShopPets()}
                      className="group relative h-full w-full overflow-hidden rounded-xl bg-white text-left shadow-lg transition duration-300 active:-translate-y-1 active:shadow-xl sm:rounded-lg sm:shadow-xl sm:transition-none sm:active:translate-y-0 sm:active:shadow-xl"
                    >
                      <img
                        src="/imgs/cute-pets.jpg"
                        alt="Cute Pets"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 via-black/35 to-transparent sm:h-32">
                        <div className="absolute bottom-2 left-2.5 sm:bottom-2 sm:left-4">
                          <h3 className="text-base font-bold text-white min-[390px]:text-lg sm:text-2xl">
                            Cute Pets
                          </h3>
                          <p className="hidden text-sm text-gray-200 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:block">
                            Dogs and Cats
                          </p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavigate("/grooming-appointment")}
                      onMouseEnter={() => void prefetchGroomingServices()}
                      onFocus={() => void prefetchGroomingServices()}
                      className="group relative h-full w-full overflow-hidden rounded-xl bg-white text-left shadow-lg transition duration-300 active:-translate-y-1 active:shadow-xl sm:rounded-lg sm:shadow-xl sm:transition-none sm:active:translate-y-0 sm:active:shadow-xl"
                    >
                      <img
                        src="/imgs/grooming2.png"
                        alt="Grooming Service"
                        className="h-full w-full object-cover object-[42%_38%] transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 via-black/35 to-transparent sm:h-32">
                        <div className="absolute bottom-2 left-2.5 sm:bottom-2 sm:left-4">
                          <h3 className="text-base font-bold text-white min-[390px]:text-lg sm:text-2xl">
                            Grooming
                          </h3>
                          <p className="hidden text-sm text-gray-200 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:block">
                            Professional pet care
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => handleNavigate("/supplies")}
                      onMouseEnter={() => void prefetchSupplies()}
                      onFocus={() => void prefetchSupplies()}
                      className="group relative h-full w-full overflow-hidden rounded-xl text-left shadow-lg transition duration-300 active:-translate-y-1 active:shadow-xl sm:rounded-lg sm:shadow-xl sm:transition-none sm:active:translate-y-0 sm:active:shadow-xl"
                    >
                      <img
                        src="/imgs/pet supplies.jpg"
                        alt="Pet Supplies"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 via-black/35 to-transparent sm:h-32">
                        <div className="absolute bottom-2 left-2.5 sm:bottom-2 sm:left-4">
                          <h3 className="text-base font-bold text-white min-[390px]:text-lg sm:text-2xl">
                            Pet Supplies
                          </h3>
                          <p className="hidden text-sm text-gray-200 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:block">
                            Quality products
                          </p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavigate("/daycare")}
                      className="group relative h-full w-full overflow-hidden rounded-xl text-left shadow-lg transition duration-300 active:-translate-y-1 active:shadow-xl sm:rounded-lg sm:shadow-xl sm:transition-none sm:active:translate-y-0 sm:active:shadow-xl"
                    >
                      <img
                        src="/imgs/pet daycare.jpg"
                        alt="Pet Daycare"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 via-black/35 to-transparent sm:h-32">
                        <div className="absolute bottom-2 left-2.5 sm:bottom-2 sm:left-4">
                          <h3 className="text-base font-bold text-white min-[390px]:text-lg sm:text-2xl">
                            Pet Daycare
                          </h3>
                          <p className="hidden text-sm text-gray-200 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:block">
                            Safe and fun
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About — one story, one photo */}
        <section id="about" className="bg-white py-10 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="mx-auto grid max-w-6xl items-center gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
              {/* Image first on mobile; left column on desktop */}
              <div className="overflow-hidden rounded-2xl">
                <img
                  src="/imgs/about-pet-shop.jpg"
                  alt="AH HAO Pet Shop — caring for dogs and cats"
                  className="aspect-[5/4] w-full object-cover object-center"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 min-[390px]:text-[1.75rem] sm:text-4xl">
                  A neighbourhood pet shop that feels like home
                </h2>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-gray-600 sm:mt-4 sm:text-lg">
                  Based in Bukit Jalil, AH HAO Pet Shop helps you find a healthy
                  pet, and we are here to take good care of the one you already
                  love.
                </p>
                <div className="mt-5 grid gap-2 sm:mt-8 sm:gap-2.5">
                  {(
                    [
                      {
                        title: "Passionate care",
                        text: "Every pet is treated like family.",
                      },
                      {
                        title: "Professional service",
                        text: "Experienced team you can trust.",
                      },
                      {
                        title: "Community first",
                        text: "Built around local pet owners.",
                      },
                    ] as const
                  ).map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl bg-gray-50 px-4 py-3 sm:px-5 sm:py-4"
                    >
                      <p className="text-[15px] font-medium text-gray-900 sm:text-base">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services — text cards (hero already has image shortcuts) */}
        <section id="services" className="bg-gray-50 py-10 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <h2 className="mb-5 text-center text-2xl font-bold tracking-tight text-gray-900 min-[390px]:text-[1.75rem] sm:mb-10 sm:text-4xl">
              Our Services
            </h2>
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
              <button
                type="button"
                onClick={() => handleNavigate("/all-pets")}
                onMouseEnter={() => void prefetchShopPets()}
                onFocus={() => void prefetchShopPets()}
                className="rounded-2xl bg-white p-5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md sm:p-6"
              >
                <Dog className="mb-4 h-8 w-8 text-rose-600" />
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  Quality Dogs & Cats
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 sm:text-base">
                  Healthy and adorable puppies and kittens from reputable
                  breeders.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate("/grooming-appointment")}
                onMouseEnter={() => void prefetchGroomingServices()}
                onFocus={() => void prefetchGroomingServices()}
                className="rounded-2xl bg-white p-5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md sm:p-6"
              >
                <Scissors className="mb-4 h-8 w-8 text-rose-600" />
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  Premium Grooming
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 sm:text-base">
                  Professional grooming for dogs and cats — bathing, haircuts,
                  and nail care.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate("/daycare")}
                className="rounded-2xl bg-white p-5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md sm:p-6"
              >
                <Home className="mb-4 h-8 w-8 text-rose-600" />
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  Pet Daycare
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 sm:text-base">
                  Comfortable boarding with attentive care and supervised play.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate("/supplies")}
                onMouseEnter={() => void prefetchSupplies()}
                onFocus={() => void prefetchSupplies()}
                className="rounded-2xl bg-white p-5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md sm:p-6"
              >
                <ShoppingBag className="mb-4 h-8 w-8 text-rose-600" />
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  Pet Supplies
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 sm:text-base">
                  Food, toys, accessories, and grooming products for everyday
                  care.
                </p>
              </button>
            </div>
          </div>
        </section>

        {/* Premium Grooming Section */}
        <section
          id="premium-grooming"
          className="overflow-hidden bg-gradient-to-br from-rose-50 via-white to-rose-50 py-10 sm:py-24"
        >
          <div className="container mx-auto px-4 sm:px-6">
            <div className="relative">
              <div className="flex flex-col items-center lg:grid lg:grid-cols-2 lg:gap-16">
                {/* Text — below image on mobile; left on desktop */}
                <div className="order-2 w-full lg:order-1 lg:pr-8">
                  <h2 className="mb-3 text-2xl font-bold text-gray-900 min-[390px]:text-[1.75rem] sm:mb-6 sm:text-4xl">
                    Premium Grooming
                  </h2>
                  <p className="mb-4 text-[15px] leading-relaxed text-gray-600 sm:mb-8 sm:text-lg">
                    From basic baths to luxury spa treatments, we offer
                    professional grooming services for all breeds.
                  </p>
                  <p className="mb-5 text-lg font-semibold text-gray-900 sm:mb-8 sm:text-xl">
                    Starting from RM60
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleNavigate("/grooming-appointment", false, true)
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-8 py-3 text-base font-medium text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-rose-700 hover:shadow-xl sm:w-auto sm:text-lg"
                  >
                    Book appointment
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
                {/* Image — above title on mobile; right on desktop */}
                <div className="relative order-1 mb-6 w-full lg:order-2 lg:mb-0">
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl shadow-xl sm:shadow-2xl">
                    <img
                      src="/imgs/premium-pet-grooming.jpg"
                      alt="Premium Pet Grooming"
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pet Daycare Section */}
        <section
          id="pet-daycare"
          className="overflow-hidden bg-gradient-to-br from-stone-50 via-white to-rose-50 py-10 sm:py-24"
        >
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-center lg:gap-10">
              <div className="relative order-1 lg:order-1 lg:mb-0">
                <div className="aspect-[4/3] overflow-hidden rounded-2xl shadow-lg">
                  <img
                    src="/imgs/homepage-daycare.jpg"
                    alt="Pet hotel boarding suites"
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              </div>
              <div className="order-2 lg:order-2 lg:pl-2">
                <h2 className="mb-3 text-2xl font-bold text-gray-900 min-[390px]:text-[1.75rem] sm:mb-6 sm:text-4xl">
                  Pet Daycare
                </h2>
                <p className="mb-4 text-[15px] leading-relaxed text-gray-600 sm:mb-6 sm:text-lg">
                  Comfortable dog and cat hotel services with 24/7 care and
                  attention. Your pets can play and socialize with other dogs
                  and cats in our supervised play areas.
                </p>
                <p className="mb-5 text-lg font-semibold text-gray-900 sm:mb-8 sm:text-xl">
                  From RM70 / day
                </p>
                <button
                  type="button"
                  onClick={() => handleNavigate("/daycare")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-8 py-3 text-base font-medium text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-rose-700 hover:shadow-xl sm:w-auto sm:text-lg"
                >
                  Explore Daycare
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Pets Section */}
        <section id="our-pets" className="bg-gray-50 py-10 md:py-16">
          <div className="container mx-auto px-0 md:px-6">
            {/* —— Mobile: title → toggle → horizontal cards → CTA —— */}
            <div className="md:hidden">
              <div className="px-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Meet Our Pets
                </h2>
                <p className="mt-1.5 text-sm text-gray-500">
                  Fully vaccinated · ready for forever homes
                </p>
                <div
                  className="mt-4 flex justify-center"
                  role="group"
                  aria-label="Pet type"
                >
                  <div className="relative grid grid-cols-2 rounded-full bg-stone-100 p-1">
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                        selectedPetType === "cat"
                          ? "translate-x-full"
                          : "translate-x-0"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setMobilePetSlide("dog");
                        setSelectedPetType("dog");
                      }}
                      className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-300 ${
                        selectedPetType === "dog"
                          ? "text-gray-900"
                          : "text-gray-500"
                      }`}
                    >
                      <Dog className="h-3.5 w-3.5" />
                      Dogs
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobilePetSlide("cat");
                        setSelectedPetType("cat");
                      }}
                      className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-300 ${
                        selectedPetType === "cat"
                          ? "text-gray-900"
                          : "text-gray-500"
                      }`}
                    >
                      <Cat className="h-3.5 w-3.5" />
                      Cats
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div
                  key={selectedPetType}
                  className={`flex w-max gap-3 px-6 ${
                    mobilePetSlide === "cat"
                      ? "pet-strip-from-right"
                      : mobilePetSlide === "dog"
                        ? "pet-strip-from-left"
                        : ""
                  }`}
                >
                  {mobilePets
                    .filter((p) => p.type === selectedPetType)
                    .slice(0, 8)
                    .map((pet) => (
                      <MobilePetPeekCard key={pet.petId} pet={pet} />
                    ))}
                  {mobilePets.filter((p) => p.type === selectedPetType)
                    .length === 0 && (
                    <p className="px-1 py-8 text-sm text-gray-400">
                      No pets listed right now.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 px-6">
                <button
                  type="button"
                  onClick={() =>
                    navigate("/all-pets", {
                      state: { initialType: selectedPetType },
                    })
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-base font-medium text-white shadow-md transition hover:bg-rose-700"
                >
                  See All Pets
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* —— Desktop: unchanged —— */}
            <div className="hidden md:block">
              <div className="mx-auto mb-8 max-w-xl text-center">
                <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                  Meet Our Pets
                </h2>
                <p className="mt-3 text-base leading-relaxed text-gray-600 sm:text-lg">
                  Looking for a new furry companion? Meet our adorable friends —{" "}
                  <span className="sm:whitespace-nowrap">
                    all fully vaccinated and ready for forever homes.
                  </span>
                </p>
              </div>

              <div
                className="mb-4 flex justify-center"
                role="group"
                aria-label="Jump to pet type"
              >
                <div className="relative grid grid-cols-2 rounded-full bg-stone-100 p-1">
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                      selectedPetType === "cat"
                        ? "translate-x-full"
                        : "translate-x-0"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handlePetTypeChange("dog")}
                    className={`relative z-10 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                      selectedPetType === "dog"
                        ? "text-gray-900"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <Dog className="h-4 w-4" />
                    Dogs
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePetTypeChange("cat")}
                    className={`relative z-10 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                      selectedPetType === "cat"
                        ? "text-gray-900"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <Cat className="h-4 w-4" />
                    Cats
                  </button>
                </div>
              </div>

              <PetList />
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="bg-white py-10 md:py-16">
          <div className="container mx-auto px-4 sm:px-6">
            <h2 className="mb-6 text-center text-2xl font-bold text-gray-800 min-[390px]:text-[1.75rem] sm:text-4xl md:mb-12">
              Contact Us
            </h2>
            <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 md:grid-cols-2 md:gap-12">
              {/* Left: plain contact info (previous layout) */}
              <div className="space-y-5 sm:space-y-8">
                <div className="flex items-center">
                  <Phone className="mr-4 h-6 w-6 flex-shrink-0 text-rose-600" />
                  <div>
                    <h3 className="text-lg font-semibold">Phone</h3>
                    <a
                      href="tel:+60102568641"
                      className="text-gray-600 transition hover:text-rose-600 hover:underline"
                    >
                      +6010-2568641
                    </a>
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="mr-4 h-6 w-6 flex-shrink-0 text-rose-600" />
                  <div>
                    <h3 className="text-lg font-semibold">Email</h3>
                    <a
                      href="mailto:ahhaopetshop@gmail.com"
                      className="text-gray-600 transition hover:text-rose-600 hover:underline"
                    >
                      ahhaopetshop@gmail.com
                    </a>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="mr-4 h-6 w-6 flex-shrink-0 text-rose-600" />
                  <div>
                    <h3 className="text-lg font-semibold">Hours</h3>
                    <p className="text-gray-600">Mon-Sun 10AM-10PM</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Share2 className="mr-4 h-6 w-6 flex-shrink-0 text-rose-600" />
                  <div className="flex items-center gap-2.5">
                    <a
                      href="https://wa.me/60102568641?text=Hi%20AH%20HAO%20Pet%20Shop"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-icon-btn inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#25D366] text-white"
                      aria-label="Chat on WhatsApp"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="currentColor"
                        aria-hidden
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </a>
                    <a
                      href="https://web.facebook.com/jie.hao.14"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-icon-btn inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#1877F2] text-white"
                      aria-label="Visit our Facebook page"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="currentColor"
                        aria-hidden
                      >
                        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
                      </svg>
                    </a>
                    <a
                      href="https://www.instagram.com/jiehao_08/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-icon-btn inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white"
                      aria-label="Visit our Instagram page"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <rect x="3" y="3" width="18" height="18" rx="5" />
                        <circle cx="12" cy="12" r="4" />
                        <circle
                          cx="17.5"
                          cy="6.5"
                          r="1.2"
                          fill="currentColor"
                          stroke="none"
                        />
                      </svg>
                    </a>
                  </div>
                </div>
                <div>
                  <div className="mb-4 flex items-start">
                    <MapPin className="mr-4 mt-1 h-6 w-6 flex-shrink-0 text-rose-600" />
                    <div>
                      <h3 className="text-lg font-semibold">Address</h3>
                      <p className="text-gray-600">{address}</p>
                    </div>
                  </div>
                  <div className="h-52 w-full overflow-hidden rounded-xl shadow-md sm:h-64 sm:rounded-lg">
                    <iframe
                      title="AH HAO PET SHOP Location"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      src={`https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodeURIComponent(address)}`}
                    />
                  </div>
                </div>
              </div>

              {/* Right: form card */}
              <div className="flex h-full flex-col rounded-2xl border border-gray-100 bg-gray-50 p-6 shadow-md sm:p-8">
                {formStatus === "success" ? (
                  <div className="flex flex-1 flex-col items-center justify-center px-2 py-8 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 ring-1 ring-rose-100">
                      <Check
                        className="h-7 w-7 text-rose-600"
                        strokeWidth={2.25}
                      />
                    </div>
                    <h3 className="mt-4 text-xl font-bold tracking-tight text-gray-900">
                      Message sent
                    </h3>
                    <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-600">
                      We received your enquiry and will get back to you soon.
                    </p>
                    <button
                      type="button"
                      onClick={() => setFormStatus("idle")}
                      className="mt-6 text-sm font-semibold text-rose-600 transition hover:text-rose-700"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form
                    noValidate
                    onSubmit={handleSubmit}
                    className="flex h-full flex-col gap-4"
                  >
                    {formStatus === "error" && (
                      <div
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        role="alert"
                      >
                        Unable to send your message. Please try again, or reach
                        us on WhatsApp.
                      </div>
                    )}
                    <div>
                      <label
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                        htmlFor="name"
                      >
                        Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 ${enquiryErrors.name ? "border-red-300" : "border-gray-200"}`}
                        id="name"
                        name="name"
                        type="text"
                        value={enquiry.name}
                        placeholder="Your name"
                        onChange={(e) => {
                          setEnquiry((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }));
                          if (enquiryErrors.name)
                            setEnquiryErrors((er) => ({
                              ...er,
                              name: undefined,
                            }));
                        }}
                      />
                      {enquiryErrors.name && (
                        <p className="mt-1 text-sm text-red-600">
                          {enquiryErrors.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                        htmlFor="email"
                      >
                        Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 ${enquiryErrors.email ? "border-red-300" : "border-gray-200"}`}
                        id="email"
                        name="email"
                        type="email"
                        value={enquiry.email}
                        placeholder="you@email.com"
                        onChange={(e) => {
                          setEnquiry((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }));
                          if (enquiryErrors.email)
                            setEnquiryErrors((er) => ({
                              ...er,
                              email: undefined,
                            }));
                        }}
                      />
                      {enquiryErrors.email && (
                        <p className="mt-1 text-sm text-red-600">
                          {enquiryErrors.email}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="phone"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Contact No <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={enquiry.phone}
                        placeholder="0123456789"
                        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 ${enquiryErrors.phone ? "border-red-300" : "border-gray-200"}`}
                        onChange={(e) => {
                          setEnquiry((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }));
                          if (enquiryErrors.phone)
                            setEnquiryErrors((er) => ({
                              ...er,
                              phone: undefined,
                            }));
                        }}
                      />
                      {enquiryErrors.phone && (
                        <p className="mt-1 text-sm text-red-600">
                          {enquiryErrors.phone}
                        </p>
                      )}
                    </div>
                    <div className="flex min-h-[8rem] flex-1 flex-col">
                      <label
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                        htmlFor="message"
                      >
                        Message <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        className={`min-h-[8rem] w-full flex-1 resize-none rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 ${enquiryErrors.message ? "border-red-300" : "border-gray-200"}`}
                        id="message"
                        name="message"
                        value={enquiry.message}
                        placeholder="How can we help? e.g. grooming, daycare, or supplies"
                        onChange={(e) => {
                          setEnquiry((prev) => ({
                            ...prev,
                            message: e.target.value,
                          }));
                          if (enquiryErrors.message)
                            setEnquiryErrors((er) => ({
                              ...er,
                              message: undefined,
                            }));
                        }}
                      />
                      {enquiryErrors.message && (
                        <p className="mt-1 text-sm text-red-600">
                          {enquiryErrors.message}
                        </p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={formStatus === "sending"}
                      className="mt-auto w-full rounded-xl bg-rose-600 py-3 px-4 font-bold text-white transition duration-300 hover:bg-rose-700 disabled:opacity-50"
                    >
                      {formStatus === "sending" ? "Sending..." : "Send Message"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        <SiteFooter homeSections />
      </div>
      <ChatDogHouse phoneNumber="60102568641" />
    </div>
  );
};

export default MainApp;
