import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { getDashboardPath, useAuth } from "../contexts/AuthContext";

interface NavigationProps {
  onSectionClick: (section: string) => void;
}

const navLinkClass =
  "text-gray-700 hover:text-rose-600 bg-transparent border-none font-medium text-base sm:text-lg tracking-wide";

const dropdownItemClass =
  "block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-rose-50 hover:text-rose-700";

const Navigation: React.FC<NavigationProps> = ({ onSectionClick }) => {
  const { user, isIntentionalLogin } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [menuTop, setMenuTop] = useState(0);
  const navRef = useRef<HTMLElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wasLoggedOut = sessionStorage.getItem("userLoggedOut") === "true";

    if (wasLoggedOut) {
      sessionStorage.removeItem("userLoggedOut");
      setIsLoggedIn(false);
    } else if (user && isIntentionalLogin) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, [user, isIntentionalLogin]);

  useEffect(() => {
    if (!servicesOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        servicesRef.current &&
        !servicesRef.current.contains(e.target as Node)
      ) {
        setServicesOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setServicesOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [servicesOpen]);

  useEffect(() => {
    const update = () =>
      setMenuTop(navRef.current?.getBoundingClientRect().bottom ?? 0);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [isMenuOpen]);

  const handleMemberClick = () => {
    navigate("/member-dashboard");
    setIsMenuOpen(false);
  };

  const handleSignIn = () => {
    navigate("/login");
    setIsMenuOpen(false);
  };

  const handleMenuClick = (section: string) => {
    onSectionClick(section);
    setIsMenuOpen(false);
    setServicesOpen(false);
    setMobileServicesOpen(false);
  };

  const goGrooming = () => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    navigate("/grooming-appointment");
    setIsMenuOpen(false);
    setServicesOpen(false);
    setMobileServicesOpen(false);
  };

  const goDaycare = () => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    navigate("/daycare");
    setIsMenuOpen(false);
    setServicesOpen(false);
    setMobileServicesOpen(false);
  };

  const goSupplies = () => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    navigate("/supplies");
    setIsMenuOpen(false);
    setServicesOpen(false);
    setMobileServicesOpen(false);
  };

  return (
    <nav
      ref={navRef}
      className={`fixed w-full bg-white pt-safe shadow-md ${isMenuOpen ? "z-[60]" : "z-50"}`}
    >
      <div className="container mx-auto px-4 py-2.5 sm:px-6 sm:py-3">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center transition-opacity duration-300 hover:opacity-95"
          >
            <img
              src="/imgs/AH%20HAO%20PET%20SHOP%20LOGO.png"
              alt="AH HAO PET SHOP Logo"
              className="h-11 w-auto object-contain min-[390px]:h-12 sm:h-16"
            />
          </Link>

          <div className="flex items-center md:hidden">
            {isLoggedIn && (
              <button
                type="button"
                onClick={handleMemberClick}
                className="flex h-10 w-10 items-center justify-center text-gray-800 transition-colors hover:text-rose-600"
                aria-label={user?.role === "admin" ? "Admin" : "Member"}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  className="-translate-y-0.5"
                >
                  <circle
                    cx="12"
                    cy="10"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M19 21C19 17.134 15.866 14 12 14C8.13401 14 5 17.134 5 21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex h-10 w-10 items-center justify-center text-gray-800"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              <span className="relative block h-6 w-6">
                <span
                  className={`absolute left-0 right-0 h-0.5 rounded-full bg-current transition-all duration-300 ease-out motion-reduce:transition-none ${
                    isMenuOpen
                      ? "top-1/2 -translate-y-1/2 rotate-45"
                      : "top-[5px]"
                  }`}
                />
                <span
                  className={`absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-current transition-all duration-300 ease-out motion-reduce:transition-none ${
                    isMenuOpen ? "scale-x-0 opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute left-0 right-0 h-0.5 rounded-full bg-current transition-all duration-300 ease-out motion-reduce:transition-none ${
                    isMenuOpen
                      ? "top-1/2 -translate-y-1/2 -rotate-45"
                      : "bottom-[5px]"
                  }`}
                />
              </span>
            </button>
          </div>

          {/* Desktop: fewer top-level items; services live in dropdown */}
          <div className="hidden items-center gap-6 lg:gap-8 md:flex">
            <button
              type="button"
              onClick={() => onSectionClick("home")}
              className={navLinkClass}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => onSectionClick("about")}
              className={navLinkClass}
            >
              About Us
            </button>

            <div
              ref={servicesRef}
              className="relative"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <button
                type="button"
                onClick={() => setServicesOpen((open) => !open)}
                className={`${navLinkClass} inline-flex items-center gap-1`}
                aria-expanded={servicesOpen}
                aria-haspopup="menu"
              >
                Services
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${servicesOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div
                role="menu"
                className={`absolute left-1/2 top-full z-20 w-52 -translate-x-1/2 pt-2 transition ${
                  servicesOpen
                    ? "pointer-events-auto visible opacity-100"
                    : "pointer-events-none invisible opacity-0"
                }`}
              >
                <div className="rounded-xl border border-rose-100/80 bg-white p-1.5 shadow-lg shadow-rose-100/40">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleMenuClick("services")}
                    className={dropdownItemClass}
                  >
                    All Services
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={goGrooming}
                    className={dropdownItemClass}
                  >
                    Grooming
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={goDaycare}
                    className={dropdownItemClass}
                  >
                    Daycare
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={goSupplies}
                    className={dropdownItemClass}
                  >
                    Supplies
                  </button>
                </div>
              </div>
            </div>

            <div className="relative group">
              <button
                type="button"
                onClick={() => onSectionClick("our-pets")}
                className={navLinkClass}
              >
                Our Pets
              </button>
              <div className="pointer-events-none absolute left-1/2 mt-2 w-72 -translate-x-1/2 rounded-lg bg-white p-3 opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100">
                <div className="text-center text-sm text-gray-600">
                  <p className="mb-1 font-medium text-rose-600">
                    ✓ Health Certification Guaranteed
                  </p>
                  <p>All pets are fully vaccinated</p>
                  <p>Regular veterinary check-ups for health assurance</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSectionClick("contact")}
              className={navLinkClass}
            >
              Contact Us
            </button>

            <div className="flex items-center">
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleMemberClick}
                  className="flex items-center justify-center text-gray-800 transition-colors duration-300 hover:text-rose-600"
                  title={
                    user?.role === "admin"
                      ? "Admin Dashboard"
                      : "Member Dashboard"
                  }
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="12"
                      cy="10"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M19 21C19 17.134 15.866 14 12 14C8.13401 14 5 17.134 5 21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="rounded-lg border-2 border-rose-600 px-4 py-2 text-base font-semibold text-rose-600 transition-colors duration-300 hover:bg-rose-50 sm:text-lg"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden">
        <button
          type="button"
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 motion-reduce:transition-none ${
            isMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          style={{ top: menuTop }}
          aria-label="Close menu"
          tabIndex={isMenuOpen ? 0 : -1}
          onClick={() => {
            setIsMenuOpen(false);
            setMobileServicesOpen(false);
          }}
        />
        <div
          className={`fixed bottom-0 right-0 z-40 flex w-[min(15.5rem,58vw)] flex-col overflow-hidden border-l border-gray-100/80 bg-white shadow-[-8px_0_30px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out motion-reduce:transition-none ${
            isMenuOpen
              ? "translate-x-0"
              : "pointer-events-none translate-x-full"
          }`}
          style={{ top: menuTop }}
          aria-hidden={!isMenuOpen}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
              Menu
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="flex flex-col gap-0.5">
              {(
                [
                  { label: "Home", action: () => handleMenuClick("home") },
                  { label: "About Us", action: () => handleMenuClick("about") },
                ] as const
              ).map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="rounded-xl px-3 py-3 text-left text-[15px] font-medium text-gray-800 transition active:bg-rose-50 active:text-rose-700"
                >
                  {item.label}
                </button>
              ))}

              <div>
                <button
                  type="button"
                  onClick={() => setMobileServicesOpen((open) => !open)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-[15px] font-medium transition ${
                    mobileServicesOpen
                      ? "bg-rose-50 text-rose-700"
                      : "text-gray-800 active:bg-rose-50 active:text-rose-700"
                  }`}
                  aria-expanded={mobileServicesOpen}
                >
                  Services
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                      mobileServicesOpen ? "rotate-180 text-rose-500" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    mobileServicesOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="ml-2 mt-0.5 space-y-0.5 border-l border-rose-100 py-1 pl-3">
                      {(
                        [
                          {
                            label: "All Services",
                            action: () => handleMenuClick("services"),
                          },
                          { label: "Grooming", action: goGrooming },
                          { label: "Daycare", action: goDaycare },
                          { label: "Supplies", action: goSupplies },
                        ] as const
                      ).map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={item.action}
                          className="block w-full rounded-lg px-2.5 py-2.5 text-left text-sm font-medium text-gray-600 transition active:bg-rose-50 active:text-rose-700"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {(
                [
                  {
                    label: "Our Pets",
                    action: () => handleMenuClick("our-pets"),
                  },
                  {
                    label: "Contact Us",
                    action: () => handleMenuClick("contact"),
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="rounded-xl px-3 py-3 text-left text-[15px] font-medium text-gray-800 transition active:bg-rose-50 active:text-rose-700"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {!isLoggedIn && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-[15px] font-medium text-gray-800 transition active:bg-gray-50"
                >
                  Sign In
                  <span className="text-gray-400" aria-hidden>
                    →
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
