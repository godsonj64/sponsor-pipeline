type P = { className?: string };

export function Logo({ className = "h-4 w-4" }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF9D5C" />
          <stop offset="50%" stopColor="#FF4FA3" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path
        fill="url(#lg)"
        d="M12 1.6c.5 0 .9.4.9.9v5.8l4.1-4.1a.9.9 0 1 1 1.3 1.3l-4.1 4.1h5.8a.9.9 0 1 1 0 1.8h-5.8l4.1 4.1a.9.9 0 1 1-1.3 1.3l-4.1-4.1v5.8a.9.9 0 1 1-1.8 0v-5.8l-4.1 4.1a.9.9 0 0 1-1.3-1.3l4.1-4.1H4a.9.9 0 1 1 0-1.8h5.8L5.7 5.5a.9.9 0 0 1 1.3-1.3l4.1 4.1V2.5c0-.5.4-.9.9-.9Z"
      />
    </svg>
  );
}

export function Play({ className = "h-3 w-3" }: P) {
  return (
    <svg viewBox="0 0 12 12" className={className} fill="currentColor" aria-hidden>
      <path d="M3.4 1.9c0-.5.5-.8.9-.5l5.2 3.6c.4.3.4.9 0 1.2L4.3 9.8a.6.6 0 0 1-.9-.5V1.9Z" />
    </svg>
  );
}

export function Pause({ className = "h-3 w-3" }: P) {
  return (
    <svg viewBox="0 0 12 12" className={className} fill="currentColor" aria-hidden>
      <rect x="2.5" y="2" width="2.6" height="8" rx="1" />
      <rect x="6.9" y="2" width="2.6" height="8" rx="1" />
    </svg>
  );
}

export function Chevron({ className = "h-3 w-3" }: P) {
  return (
    <svg viewBox="0 0 12 12" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="m3.5 4.75 2.5 2.5 2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowRight({ className = "h-3 w-3" }: P) {
  return (
    <svg viewBox="0 0 12 12" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M2 6h8m0 0L6.8 2.8M10 6 6.8 9.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Globe({ className = "h-3.5 w-3.5" }: P) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8h12M8 2c1.7 1.7 2.6 3.8 2.6 6S9.7 12.3 8 14C6.3 12.3 5.4 10.2 5.4 8S6.3 3.7 8 2Z" />
    </svg>
  );
}

export function Spinner({ className = "h-3 w-3" }: P) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden style={{ animation: "spin-slow .7s linear infinite" }}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity=".25" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Trash({ className = "h-3.5 w-3.5" }: P) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      <path d="M3 4.5h10M6.5 4.5V3.2c0-.4.3-.7.7-.7h1.6c.4 0 .7.3.7.7v1.3M4.4 4.5l.5 8c0 .5.4.9.9.9h4.4c.5 0 .9-.4.9-.9l.5-8" strokeLinecap="round" />
    </svg>
  );
}

export function Download({ className = "h-3.5 w-3.5" }: P) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      <path d="M8 2.5v7.5m0 0L5.2 7.2M8 10l2.8-2.8M3 12.5h10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
