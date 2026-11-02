import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Clock,
  MapPin,
  Home,
  PawPrint,
  Heart,
  User,
} from "lucide-react";
import Toast, { ToastState } from "../components/Toast";
import SiteFooter from "../components/SiteFooter";
import { getDashboardPath, useAuth } from "../contexts/AuthContext";

const PHONE_DISPLAY = "+6010-2568641";
const PHONE_TEL = "+60102568641";
const WHATSAPP_URL =
  "https://wa.me/60102568641?text=" +
  encodeURIComponent("Hi AH HAO Pet Shop, I'd like to ask about pet daycare.");
const ADDRESS =
  "2, Persiaran Jalil 8, Bukit Jalil, 57000 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur (Pavilion Bukit Jalil)";

const GALLERY = [
  {
    src: "/imgs/daycare-play.jpg",
    alt: "Indoor pet playground with pool area",
    label: "Pet playground",
  },
  {
    src: "/imgs/daycare-cats.jpg",
    alt: "Individual cat boarding units",
    label: "Cat boarding",
  },
  {
    src: "/imgs/daycare-social.jpg",
    alt: "Pet shop interior",
    label: "Shop interior",
  },
  {
    src: "/imgs/daycare-rest.jpg",
    alt: "Clean individual boarding suites",
    label: "Private suites",
  },
  {
    src: "/imgs/daycare-care.jpg",
    alt: "Staff caring for a boarding pet",
    label: "Personal care",
  },
] as const;

const HIGHLIGHTS = [
  {
    icon: Home,
    title: "Private suites",
    body: "Dogs and cats board separately in clean individual units with bedding and water.",
  },
  {
    icon: PawPrint,
    title: "Playground & shop",
    body: "Indoor pet playground, plus our familiar shop environment right next door.",
  },
  {
    icon: Heart,
    title: "From RM 70 / day",
    body: "Starting from RM 70 per day. Long-term stays from RM 50 per day.",
  },
] as const;

const DaycarePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const openWhatsApp = useCallback(() => {
    setToast({ message: "Opening WhatsApp…", type: "success" });
    window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer");
  }, []);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.body.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <Toast toast={toast} onClose={clearToast} />

      {/* Header — matches Grooming page */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="shrink-0 rounded-lg p-2 text-gray-500 transition hover:bg-rose-50 hover:text-gray-800"
              aria-label="Back to Home"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <img
              src="/imgs/AH%20HAO%20PET%20SHOP%20LOGO.png"
              alt="AH HAO PET SHOP"
              className="h-8 w-auto object-contain sm:h-9"
            />
          </div>
          <button
            type="button"
            onClick={() =>
              user ? navigate("/member-dashboard") : navigate("/login")
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

      {/* Hero — fills first viewport below sticky header (h-14 / sm:h-16) */}
      <section className="relative h-[calc(100svh-3.5rem)] min-h-[26rem] overflow-hidden min-[390px]:min-h-[28rem] min-[430px]:min-h-[30rem] sm:h-[calc(100svh-4rem)] sm:min-h-[32rem]">
        <img
          src="/imgs/daycare-hero.jpg"
          alt="Daycare boarding suites"
          fetchPriority="high"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover sm:transition-transform sm:duration-[2.2s] sm:ease-out ${
            visible ? "sm:scale-100" : "sm:scale-105"
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div
          className={`relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-8 pt-20 transition-all duration-700 min-[390px]:pb-10 sm:px-6 sm:pb-16 sm:pt-24 lg:px-8 ${
            visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <h1 className="max-w-xl text-[1.75rem] font-bold leading-tight text-white min-[390px]:text-3xl sm:text-4xl md:text-5xl">
            Daycare Services
          </h1>
          <p className="mt-2.5 max-w-lg text-[15px] text-white/90 sm:mt-3 sm:text-lg">
            Clean private suites, a pet playground, and a friendly shop team —
            walk in anytime during open hours.
          </p>
          <p className="mt-2.5 text-base font-semibold text-white sm:mt-3 sm:text-xl">
            From RM 70 / day
          </p>
          <div className="mt-5 flex flex-col gap-2.5 sm:mt-7 sm:flex-row sm:items-center sm:gap-3">
            <a
              href={`tel:${PHONE_TEL}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-transparent bg-white px-5 text-sm font-semibold text-rose-600 shadow-lg transition hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-xl sm:h-12 sm:px-6"
            >
              <Phone className="h-4 w-4" />
              Call to reserve a spot
            </a>
            <button
              type="button"
              onClick={openWhatsApp}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-white/70 bg-white/15 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-[#25D366]/80 hover:bg-[#25D366]/25 hover:shadow-lg active:bg-[#25D366]/40 sm:h-12 sm:bg-white/10 sm:px-6 sm:backdrop-blur-sm"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp us
            </button>
          </div>
        </div>
      </section>

      {/* Walk-in — image above on mobile */}
      <section className="bg-gradient-to-br from-rose-50 via-white to-rose-50 py-10 sm:py-20">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
            <div className="order-2 lg:order-1 lg:mb-0">
              <h2 className="text-2xl font-bold text-gray-900 min-[390px]:text-[1.75rem] sm:text-4xl">
                Walk-in only
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-gray-600 sm:mt-4 sm:text-lg">
                Drop by during business hours, or call ahead if you’d like us to
                hold a spot — especially on busy weekends and holidays. Pure
                daycare is walk-in only; grooming stays on its own appointment
                page.
              </p>

              <ul className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
                <li className="flex gap-3">
                  <Clock className="mt-1 h-4 w-4 shrink-0 text-rose-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Working Hours</p>
                    <p className="text-sm text-gray-600 sm:text-base">
                      Mon–Sun, 10:00 AM – 10:00 PM
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Phone className="mt-1 h-4 w-4 shrink-0 text-rose-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Phone Number</p>
                    <a
                      href={`tel:${PHONE_TEL}`}
                      className="text-sm text-gray-600 underline-offset-2 hover:underline sm:text-base"
                    >
                      {PHONE_DISPLAY}
                    </a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-rose-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Location</p>
                    <p className="text-sm leading-snug text-gray-600 sm:text-base">
                      {ADDRESS}
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="order-1 overflow-hidden rounded-2xl shadow-xl lg:order-2 sm:shadow-2xl">
              <img
                src="/imgs/daycare-rest.jpg"
                alt="Clean individual boarding suites"
                className="aspect-[4/3] w-full object-cover sm:transition sm:duration-500 sm:hover:scale-105"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="bg-white pt-14 pb-8 sm:pt-20 sm:pb-10">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              A comfortable day for your pet
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-gray-600">
              Each pet has a clean private suite, a playground for playtime, and
              our team nearby throughout the day.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl bg-gradient-to-br from-rose-50 to-white p-6 shadow-lg ring-1 ring-rose-100 sm:transition sm:duration-300 sm:hover:-translate-y-1 sm:hover:shadow-xl"
              >
                <Icon className="mb-4 h-7 w-7 text-rose-600" />
                <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-gray-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="bg-gradient-to-b from-white to-rose-50/60 pt-6 pb-14 sm:pt-8 sm:pb-20">
        <div className="container mx-auto max-w-7xl px-6">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Inside our space
          </h2>
          <p className="mt-3 max-w-lg text-lg text-gray-600">
            A peek at the rooms your pet will spend the day in.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            {GALLERY.map((shot, i) => (
              <figure
                key={shot.src}
                className={`group relative overflow-hidden rounded-2xl shadow-lg sm:shadow-xl ${
                  i === 0
                    ? "aspect-[4/3] sm:col-span-2 sm:aspect-[21/9]"
                    : "aspect-[4/3]"
                }`}
              >
                <img
                  src={shot.src}
                  alt={shot.alt}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover sm:transition sm:duration-500 sm:group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent px-4 py-4">
                  <figcaption className="text-lg font-semibold text-white">
                    {shot.label}
                  </figcaption>
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden">
        <img
          src="/imgs/daycare-social.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/55 to-black/45" />
        <div className="relative mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to drop by?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-white/90 sm:text-lg">
            Walk in during open hours, or call first so we can prepare a spot
            for your pet.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={`tel:${PHONE_TEL}`}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-transparent bg-rose-600 px-7 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-rose-700 sm:w-auto"
            >
              <Phone className="h-4 w-4" />
              {PHONE_DISPLAY}
            </a>
            <button
              type="button"
              onClick={openWhatsApp}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-white bg-white px-7 text-sm font-semibold text-gray-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-xl sm:w-auto"
            >
              <MessageCircle className="h-4 w-4 text-[#25D366]" />
              Chat on WhatsApp
            </button>
          </div>
        </div>
      </section>

      <SiteFooter compact />
    </div>
  );
};

export default DaycarePage;
