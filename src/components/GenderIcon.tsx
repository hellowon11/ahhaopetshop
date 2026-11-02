import React from "react";

export const isFemale = (gender?: string) =>
  (gender || "").toLowerCase().startsWith("f");
export const isMale = (gender?: string) =>
  (gender || "").toLowerCase().startsWith("m");

/** Classic ♂ / ♀ marks */
const GenderIcon: React.FC<{ gender?: string; className?: string }> = ({
  gender,
  className = "h-3.5 w-3.5",
}) => {
  if (isFemale(gender)) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
        <circle
          cx="12"
          cy="9"
          r="5.25"
          stroke="currentColor"
          strokeWidth="2.2"
        />
        <path
          d="M12 14.25V21M9.5 18.25h5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (isMale(gender)) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
        <circle
          cx="10"
          cy="14"
          r="5.25"
          stroke="currentColor"
          strokeWidth="2.2"
        />
        <path
          d="M14.5 9.5L20 4M20 4h-5.25M20 4v5.25"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return null;
};

export const GenderBadge: React.FC<{ gender?: string; className?: string }> = ({
  gender,
  className = "",
}) => {
  const female = isFemale(gender);
  const male = isMale(gender);
  if (!female && !male) return null;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${
        female ? "text-rose-500" : "text-sky-500"
      } ${className}`}
      title={female ? "Female" : "Male"}
      aria-label={female ? "Female" : "Male"}
    >
      <GenderIcon gender={gender} className="h-4 w-4" />
    </span>
  );
};

export default GenderIcon;
