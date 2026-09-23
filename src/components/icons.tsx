import type { ReactNode } from 'react';

export type IconName =
  | 'grid'
  | 'swap'
  | 'wallet'
  | 'piggy'
  | 'target'
  | 'chart'
  | 'gear'
  | 'plus'
  | 'search'
  | 'close'
  | 'check'
  | 'pencil'
  | 'trash'
  | 'dots'
  | 'sparkle'
  | 'trend-up'
  | 'trend-down'
  | 'collapse'
  | 'filter'
  | 'repeat'
  | 'upload'
  | 'download'
  | 'info';

const PATHS: Record<IconName, ReactNode> = {
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  swap: (
    <>
      <path d="M7 5 3 9l4 4" />
      <path d="M3 9h13" />
      <path d="M17 19l4-4-4-4" />
      <path d="M21 15H8" />
    </>
  ),
  wallet: (
    <>
      <rect x="3.5" y="6" width="17" height="13" rx="2.5" />
      <path d="M3.5 10h17" />
      <circle cx="17" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  piggy: (
    <>
      <path d="M5 11a7 7 0 0 1 13.4-2.6c.9.3 1.6 1.1 1.6 2.1V13h1.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5H20a6.5 6.5 0 0 1-6 4v1.5a1 1 0 0 1-1 1H9.5a1 1 0 0 1-1-1V19A7 7 0 0 1 5 11Z" />
      <circle cx="15.5" cy="10" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  chart: (
    <>
      <path d="M5 20v-6M10.5 20V7M16 20v-9M20.5 20V4" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.82-.33 1.6 1.6 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.6 1.6 0 0 0-1.08-1.51 1.6 1.6 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.6 1.6 0 0 0 4.6 8.9a1.6 1.6 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9 4.6a1.6 1.6 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.6 1.6 0 0 0 1 1.51 1.6 1.6 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.33 1.82v.01A1.6 1.6 0 0 0 20.91 10H21a2 2 0 1 1 0 4h-.09a1.6 1.6 0 0 0-1.51 1Z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  pencil: (
    <>
      <path d="M14.5 5.5 18.5 9.5 8 20H4v-4L14.5 5.5Z" />
      <path d="M12 8l4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 13h8l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  dots: (
    <>
      <circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 4l1.8 4.7L18.5 10.5l-4.7 1.8L12 17l-1.8-4.7L5.5 10.5l4.7-1.8L12 4Z" />
      <path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" />
    </>
  ),
  'trend-up': (
    <>
      <path d="M3.5 17.5 9.5 11.5l3.5 3.5 7.5-8" />
      <path d="M15.5 7H20.5v5" />
    </>
  ),
  'trend-down': (
    <>
      <path d="M3.5 6.5l6 6 3.5-3.5 7.5 8" />
      <path d="M15.5 17H20.5v-5" />
    </>
  ),
  collapse: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M9.5 4v16M14.5 10.5 12 13l2.5 2.5" />
    </>
  ),
  filter: (
    <>
      <path d="M4 7h16M7 12h10M10 17h4" />
    </>
  ),
  repeat: (
    <>
      <path d="M4 10a8 8 0 0 1 13.6-4.6L20 8" />
      <path d="M20 8V3.5M20 8h-4.5" />
      <path d="M20 14a8 8 0 0 1-13.6 4.6L4 16" />
      <path d="M4 16v4.5M4 16h4.5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V5M12 5 7.5 9.5M12 5l4.5 4.5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  download: (
    <>
      <path d="M12 5v11M12 16l4.5-4.5M12 16l-4.5-4.5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 7.8v.4" />
    </>
  ),
};

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
