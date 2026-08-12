import type { ReactNode } from "react";

export function FireIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`fill-[#C1622E] dark:fill-[#E0916A] ${className ?? ""}`}>
      <path d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.176 7.547 7.547 0 01-1.705-1.715.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z" />
    </svg>
  );
}

// The Spotter mascot's face — eyes and smile only, pass a text-color class to set their color.
// Used standalone (its own <svg>) or nested inside a parent <svg viewBox="0 0 64 64"> that draws
// the head shape behind it, like the landing page's logo tile.
export function SmileyFaceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <circle cx="24" cy="29" r="3" className="fill-current" />
      <circle cx="40" cy="29" r="3" className="fill-current" />
      <path d="M21 38 Q32 48 43 38" className="fill-none stroke-current" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function DumbbellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 32" aria-hidden className={`fill-[#33465C] dark:fill-[#9AA6B0] ${className ?? ""}`}>
      <rect x="6" y="6" width="7" height="20" rx="3" />
      <rect x="14" y="9" width="5" height="14" rx="2" />
      <rect x="22" y="14" width="20" height="4" rx="2" />
      <rect x="45" y="9" width="5" height="14" rx="2" />
      <rect x="51" y="6" width="7" height="20" rx="3" />
    </svg>
  );
}

// The rest of these share SmileyFaceIcon's viewBox and fill-current/stroke-current
// convention so they can be swapped into the same coach-avatar slot at any color.
export function WinkFaceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <circle cx="24" cy="29" r="3" className="fill-current" />
      <path d="M36 30 Q40 26 44 30" className="fill-none stroke-current" strokeWidth="4" strokeLinecap="round" />
      <path d="M21 38 Q32 46 43 36" className="fill-none stroke-current" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function DeterminedFaceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <circle cx="24" cy="29" r="3" className="fill-current" />
      <circle cx="40" cy="29" r="3" className="fill-current" />
      <path d="M19 21 L29 24" className="stroke-current" strokeWidth="3" strokeLinecap="round" />
      <path d="M45 21 L35 24" className="stroke-current" strokeWidth="3" strokeLinecap="round" />
      <path d="M22 40 L42 40" className="stroke-current" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <path
        d="M32 10 L38 26 L56 26 L42 37 L47 54 L32 44 L17 54 L22 37 L8 26 L26 26 Z"
        className="fill-current"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <path
        d="M32 54 C10 38 4 24 14 16 C21 10 30 13 32 21 C34 13 43 10 50 16 C60 24 54 38 32 54 Z"
        className="fill-current"
      />
    </svg>
  );
}

export type CoachIconId = "smiley" | "wink" | "determined" | "star" | "heart";
export type IconComponent = (props: { className?: string }) => ReactNode;

export const COACH_ICONS: { id: CoachIconId; label: string; Icon: IconComponent }[] = [
  { id: "smiley", label: "Classic", Icon: SmileyFaceIcon },
  { id: "wink", label: "Wink", Icon: WinkFaceIcon },
  { id: "determined", label: "Determined", Icon: DeterminedFaceIcon },
  { id: "star", label: "Star", Icon: StarIcon },
  { id: "heart", label: "Heart", Icon: HeartIcon },
];
