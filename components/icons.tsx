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
