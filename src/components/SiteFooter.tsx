import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

const ADDRESS = "Pavilion Bukit Jalil — Persiaran Jalil 8, 57000 KL";
const PHONE_DISPLAY = "+6010-2568641";
const PHONE_TEL = "+60102568641";
const EMAIL = "ahhaopetshop@gmail.com";
const WHATSAPP_URL =
  "https://wa.me/60102568641?text=" + encodeURIComponent("Hi AH HAO Pet Shop");
const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(
    "2, Persiaran Jalil 8, Bukit Jalil, 57000 Kuala Lumpur (Pavilion Bukit Jalil)",
  );
const YEAR = new Date().getFullYear();

type SiteFooterProps = {
  homeSections?: boolean;
  /** One-line bar for standalone pages. Home keeps the full footer. */
  compact?: boolean;
};

const socialLinkClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition focus-visible:outline-none";

function SocialLinks() {
  return (
    <div className="flex gap-1.5">
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${socialLinkClass} hover:bg-[#25D366] hover:text-white focus-visible:bg-[#25D366] focus-visible:text-white`}
        aria-label="WhatsApp"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="currentColor"
          aria-hidden
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
      <a
        href="https://web.facebook.com/jie.hao.14"
        target="_blank"
        rel="noopener noreferrer"
        className={`${socialLinkClass} hover:bg-[#1877F2] hover:text-white focus-visible:bg-[#1877F2] focus-visible:text-white`}
        aria-label="Facebook"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
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
        className={`${socialLinkClass} hover:bg-gradient-to-br hover:from-[#f58529] hover:via-[#dd2a7b] hover:to-[#8134af] hover:text-white focus-visible:bg-gradient-to-br focus-visible:from-[#f58529] focus-visible:via-[#dd2a7b] focus-visible:to-[#8134af] focus-visible:text-white`}
        aria-label="Instagram"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      </a>
    </div>
  );
}

const headingClass =
  "mb-2.5 text-xs font-semibold uppercase tracking-wider text-stone-800";
const linkClass = "text-[13px] text-stone-500 transition hover:text-rose-600";

const SiteFooter: React.FC<SiteFooterProps> = ({
  homeSections = false,
  compact = false,
}) => {
  const navigate = useNavigate();

  if (compact) {
    return (
      <footer className="bg-transparent">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 pb-safe sm:px-6">
          <p className="text-[11px] text-stone-400">© {YEAR} AH HAO PET SHOP</p>
          <SocialLinks />
        </div>
      </footer>
    );
  }

  const goHomeSection = (id: string) => {
    if (homeSections) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    navigate("/", { state: { scrollTo: id } });
  };

  return (
    <footer className="border-t border-stone-200 bg-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-7 pb-safe sm:px-6 sm:py-8 lg:px-8">
        <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-12 sm:gap-x-6 lg:gap-x-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-12 lg:col-span-4">
            <div className="inline-flex items-center gap-2.5">
              <img
                src="/imgs/AH%20HAO%20PET%20SHOP%20LOGO.png"
                alt="AH HAO PET SHOP"
                className="h-9 w-9 rounded-lg object-contain select-none pointer-events-none"
                draggable={false}
              />
              <span className="text-sm font-bold tracking-tight text-stone-900">
                AH HAO PET SHOP
              </span>
            </div>
            <p className="mt-2.5 max-w-sm text-[13px] leading-snug text-stone-500">
              Healthy pets for sale, plus grooming, daycare and supplies — a
              neighbourhood pet shop in Bukit Jalil.
            </p>
            <div className="mt-3">
              <SocialLinks />
            </div>
          </div>

          {/* Links — nudged slightly right of brand */}
          <div className="sm:col-span-4 lg:col-span-2 lg:col-start-6">
            <h3 className={headingClass}>Links</h3>
            <ul className="space-y-1.5">
              <li>
                <button
                  type="button"
                  onClick={() => goHomeSection("home")}
                  className={linkClass}
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => goHomeSection("about")}
                  className={linkClass}
                >
                  About
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => goHomeSection("contact")}
                  className={linkClass}
                >
                  Contact
                </button>
              </li>
              <li>
                <Link to="/login" className={linkClass}>
                  Login
                </Link>
              </li>
            </ul>
          </div>

          <div className="sm:col-span-4 lg:col-span-2 lg:col-start-8">
            <h3 className={headingClass}>Services</h3>
            <ul className="space-y-1.5">
              <li>
                <Link to="/grooming-appointment" className={linkClass}>
                  Grooming
                </Link>
              </li>
              <li>
                <Link to="/daycare" className={linkClass}>
                  Daycare
                </Link>
              </li>
              <li>
                <Link to="/supplies" className={linkClass}>
                  Pet Supplies
                </Link>
              </li>
              <li>
                <Link to="/all-pets" className={linkClass}>
                  Our Pets
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-3 lg:col-start-10">
            <h3 className={headingClass}>Contact</h3>
            <ul className="space-y-2 text-[13px] text-stone-500">
              <li className="flex gap-2">
                <MapPin
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400"
                  strokeWidth={1.75}
                />
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-rose-600"
                >
                  {ADDRESS}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone
                  className="h-3.5 w-3.5 shrink-0 text-stone-400"
                  strokeWidth={1.75}
                />
                <a href={`tel:${PHONE_TEL}`} className="hover:text-rose-600">
                  {PHONE_DISPLAY}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail
                  className="h-3.5 w-3.5 shrink-0 text-stone-400"
                  strokeWidth={1.75}
                />
                <a
                  href={`mailto:${EMAIL}`}
                  className="truncate hover:text-rose-600"
                >
                  {EMAIL}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Clock
                  className="h-3.5 w-3.5 shrink-0 text-stone-400"
                  strokeWidth={1.75}
                />
                <span>Mon–Sun 10AM–10PM</span>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-7 border-t border-stone-200/80 pt-4 text-[11px] text-stone-400">
          © {YEAR} AH HAO PET SHOP
        </p>
      </div>
    </footer>
  );
};

export default SiteFooter;
