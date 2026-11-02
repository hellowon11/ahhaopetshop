import React, { useEffect, useState } from "react";

interface ChatDogHouseProps {
  phoneNumber: string;
}

/**
 * Floating WhatsApp entry — cute doghouse with WA badge.
 * Bone tip, blink, run-out, press-squish. One tap opens chat.
 */
const ChatDogHouse: React.FC<ChatDogHouseProps> = ({ phoneNumber }) => {
  const [tipOpen, setTipOpen] = useState(false);
  const [squishing, setSquishing] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setTipOpen(true), 900);
    const hide = window.setTimeout(() => setTipOpen(false), 4500);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(hide);
    };
  }, []);

  const playSquish = () => {
    setSquishing(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setSquishing(true));
    });
  };

  const openWhatsApp = () => {
    const message =
      "Hi AH HAO Pet Shop, I'd like to ask a question. Can you help me?";
    window.open(
      `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="pointer-events-none fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 z-50 sm:bottom-6 sm:right-6">
      <div className="pointer-events-auto relative flex flex-col items-end gap-1.5">
        {/* Classic cartoon bone tip */}
        <div
          className={`relative origin-bottom-right transition duration-300 ${
            tipOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-1 scale-95 opacity-0"
          }`}
          role="status"
        >
          <svg
            viewBox="0 0 176 72"
            className="h-12 w-auto drop-shadow-[0_8px_16px_rgba(251,113,133,0.25)] sm:h-[3.25rem]"
            aria-hidden
          >
            <defs>
              <linearGradient id="boneFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fffefb" />
                <stop offset="55%" stopColor="#fff7ed" />
                <stop offset="100%" stopColor="#ffedd5" />
              </linearGradient>
            </defs>

            {/* Pink outline layer (behind) */}
            <g fill="#fda4af">
              <circle cx="26" cy="24" r="17.2" />
              <circle cx="26" cy="44" r="17.2" />
              <circle cx="150" cy="24" r="17.2" />
              <circle cx="150" cy="44" r="17.2" />
              <rect x="26" y="25" width="124" height="18" rx="9" />
              <path d="M112 50 L122 64 L100 54 Z" />
            </g>

            {/* Cream bone fill */}
            <g fill="url(#boneFill)">
              <circle cx="26" cy="24" r="15.2" />
              <circle cx="26" cy="44" r="15.2" />
              <circle cx="150" cy="24" r="15.2" />
              <circle cx="150" cy="44" r="15.2" />
              <rect x="26" y="27" width="124" height="14" rx="7" />
              <path d="M111 51 L120 61.5 L102 54 Z" />
            </g>

            {/* Soft highlights */}
            <ellipse cx="26" cy="18" rx="7" ry="4" fill="#fff" opacity="0.65" />
            <ellipse cx="150" cy="18" rx="7" ry="4" fill="#fff" opacity="0.65" />
            <ellipse cx="70" cy="31" rx="26" ry="3.5" fill="#fff" opacity="0.55" />

            {/* Cute heart dots on knobs */}
            <g fill="#fb7185" opacity="0.85">
              <path d="M21.2 20.2c0-1.3 1.1-1.9 1.9-1.3.8-.6 1.9 0 1.9 1.3 0 1.4-1.9 2.8-1.9 2.8s-1.9-1.4-1.9-2.8z" />
              <path d="M145.2 20.2c0-1.3 1.1-1.9 1.9-1.3.8-.6 1.9 0 1.9 1.3 0 1.4-1.9 2.8-1.9 2.8s-1.9-1.4-1.9-2.8z" />
            </g>

            <text
              x="88"
              y="38.5"
              textAnchor="middle"
              fill="#be185d"
              fontSize="13"
              fontWeight="700"
              fontFamily="Outfit, system-ui, sans-serif"
              letterSpacing="0.4"
            >
              Chat!
            </text>
          </svg>
        </div>

        <button
          type="button"
          onClick={openWhatsApp}
          onPointerDown={playSquish}
          onMouseEnter={() => setTipOpen(true)}
          onMouseLeave={() => setTipOpen(false)}
          onFocus={() => setTipOpen(true)}
          onBlur={() => setTipOpen(false)}
          aria-label="Chat with AH HAO Pet Shop on WhatsApp"
          className="doghouse-fab group relative isolate flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full outline-none transition duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#25D366]/70 focus-visible:ring-offset-2 sm:h-[5.25rem] sm:w-[5.25rem]"
        >
          <span
            className="doghouse-ring pointer-events-none absolute inset-[-2px] rounded-full bg-[#25D366]/15"
            aria-hidden
          />

          <span
            className={`doghouse-squish relative z-[1] flex h-full w-full items-center justify-center ${
              squishing ? "is-squishing" : ""
            }`}
            onAnimationEnd={() => setSquishing(false)}
          >
          <span
            className="absolute inset-0 rounded-full bg-white/55 shadow-[0_8px_22px_rgba(15,23,42,0.10)] ring-1 ring-white/80 backdrop-blur-[2px] transition duration-300 group-hover:bg-white/75 group-hover:shadow-[0_12px_28px_rgba(37,211,102,0.18)]"
            aria-hidden
          />

          <svg
            viewBox="0 0 120 120"
            className="doghouse-bob relative z-[1] h-[3.75rem] w-[3.75rem] sm:h-[4.15rem] sm:w-[4.15rem]"
            aria-hidden
          >
            <ellipse
              cx="60"
              cy="102"
              rx="28"
              ry="5"
              fill="#fda4af"
              opacity="0.28"
            />

            <path d="M22 54 L60 18 L98 54 Z" fill="#fb7185" />
            <path d="M28 54 L60 24 L92 54 Z" fill="#fda4af" />
            <path d="M56 22 L64 22 L60 16 Z" fill="#e11d48" />

            <rect x="30" y="52" width="60" height="42" rx="6" fill="#fff7ed" />
            <rect
              x="30"
              y="52"
              width="60"
              height="42"
              rx="6"
              fill="url(#houseShade)"
            />

            <path d="M48 94 V68 a12 12 0 0 1 24 0 V94 Z" fill="#9f1239" />
            <path d="M50 94 V69 a10 10 0 0 1 20 0 V94 Z" fill="#4c0519" />

            {/* Puppy — occasionally dashes out the door */}
            <g className="doghouse-puppy">
              {/* Tiny body + paws (more visible when out) */}
              <ellipse
                className="doghouse-puppy-body"
                cx="60"
                cy="90"
                rx="8"
                ry="5"
                fill="#fbbf24"
              />
              <ellipse cx="54" cy="94" rx="2.2" ry="1.6" fill="#f59e0b" />
              <ellipse cx="66" cy="94" rx="2.2" ry="1.6" fill="#f59e0b" />

              <path d="M52 72 L48 62 L56 68 Z" fill="#fbbf24" />
              <path d="M68 72 L72 62 L64 68 Z" fill="#fbbf24" />
              <path d="M52.5 71 L50 65 L55.5 68.5 Z" fill="#f59e0b" />
              <path d="M67.5 71 L70 65 L64.5 68.5 Z" fill="#f59e0b" />
              <ellipse cx="60" cy="78" rx="11" ry="10" fill="#fcd34d" />
              <ellipse cx="60" cy="82" rx="6" ry="4.5" fill="#fef3c7" />

              {/* Eyes — blink */}
              <g transform="translate(55.5 76)">
                <ellipse
                  className="doghouse-blink"
                  cx="0"
                  cy="0"
                  rx="1.65"
                  ry="1.65"
                  fill="#1f2937"
                />
                <circle cx="0.4" cy="-0.4" r="0.45" fill="#fff" />
              </g>
              <g transform="translate(64.5 76)">
                <ellipse
                  className="doghouse-blink doghouse-blink-delay"
                  cx="0"
                  cy="0"
                  rx="1.65"
                  ry="1.65"
                  fill="#1f2937"
                />
                <circle cx="0.4" cy="-0.4" r="0.45" fill="#fff" />
              </g>

              <ellipse cx="60" cy="81" rx="1.8" ry="1.3" fill="#1f2937" />
              <path
                d="M57 84 Q60 86.5 63 84"
                stroke="#1f2937"
                strokeWidth="1"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="53.5" cy="80.5" r="1.8" fill="#fb7185" opacity="0.55" />
              <circle cx="66.5" cy="80.5" r="1.8" fill="#fb7185" opacity="0.55" />
            </g>

            <rect x="78" y="60" width="10" height="10" rx="2" fill="#bae6fd" />
            <path d="M83 60 V70 M78 65 H88" stroke="#fff" strokeWidth="1" />

            <g fill="#fb7185" opacity="0.55">
              <circle cx="38" cy="78" r="2.1" />
              <circle cx="35.2" cy="74.8" r="1.2" />
              <circle cx="38.2" cy="73.6" r="1.2" />
              <circle cx="41" cy="74.8" r="1.2" />
            </g>

            <defs>
              <linearGradient id="houseShade" x1="30" y1="52" x2="90" y2="94">
                <stop offset="0%" stopColor="#fff7ed" />
                <stop offset="100%" stopColor="#ffedd5" />
              </linearGradient>
            </defs>
          </svg>

          <span className="doghouse-badge absolute -bottom-0.5 -right-0.5 z-[2] flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md ring-2 ring-white sm:h-8 sm:w-8">
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 sm:h-4 sm:w-4"
              fill="currentColor"
              aria-hidden
            >
              <path d="M20.5 3.5A11 11 0 0 0 2.1 17.2L1 23l5.9-1.1A11 11 0 1 0 20.5 3.5zm-8.6 17a9.1 9.1 0 0 1-4.6-1.3l-.3-.2-3.4.6.6-3.3-.2-.3a9.1 9.1 0 1 1 7.9 4.5zm5-6.8c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.5.3-.4c.1-.2 0-.4 0-.5l-.9-2.1c-.2-.6-.5-.5-.6-.5h-.5c-.2 0-.5.1-.7.4s-1 1-1 2.4 1 2.8 1.2 3 .2.3 2.1 3.2 2.7 1.9 3.2 2.1 1.1.2 1.6.1 1.4-.6 1.6-1.1.2-1 .1-1.1-.2-.2-.5-.3z" />
            </svg>
          </span>
          </span>
        </button>
      </div>
    </div>
  );
};

export default ChatDogHouse;
