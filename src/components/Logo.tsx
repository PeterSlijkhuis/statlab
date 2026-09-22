import { useId } from 'react';

/** Three bars of a histogram under a fitted curve: the course in one mark. */
export default function Logo({ size = 22 }: { size?: number }) {
  // Each instance needs its own gradient id: the first copy of a shared id can
  // sit in a hidden topbar, and a hidden gradient paints nothing.
  const gradient = `logo-gradient-${useId().replace(/:/g, '')}`;
  return (
    <svg className="logo" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill={`url(#${gradient})`} />
      <rect x="5.5" y="12" width="3" height="6.5" rx="1" fill="#fff" opacity="0.85" />
      <rect x="10.5" y="8" width="3" height="10.5" rx="1" fill="#fff" />
      <rect x="15.5" y="10.5" width="3" height="8" rx="1" fill="#fff" opacity="0.85" />
      <path d="M4.5 13.5C8 4 16 4 19.5 12" fill="none" stroke="#fde68a" strokeWidth="1.6" strokeLinecap="round" />
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="24" y2="24">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
    </svg>
  );
}
