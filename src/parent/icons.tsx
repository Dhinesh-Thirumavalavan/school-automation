type IconProps = { className?: string };
const base = 'w-5 h-5';
const stroke = { strokeWidth: 1.8, stroke: 'currentColor', fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const HomeIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 10v9a1 1 0 0 0 1 1H9v-6h6v6h2.5a1 1 0 0 0 1-1v-9" />
  </svg>
);

export const InboxIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke}>
    <rect x="3.5" y="5" width="17" height="14" rx="2" />
    <path d="m4 6 8 6 8-6" />
  </svg>
);

export const WalletIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke}>
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M3 10h18" />
    <circle cx="16" cy="14.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const UserIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c1.2-4 4.2-6 7-6s5.8 2 7 6" />
  </svg>
);

export const ChevronLeftIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke}>
    <path d="M15 5 8 12l7 7" />
  </svg>
);

export const ChevronRightIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const BellIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke}>
    <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </svg>
);

export const BookIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5Z" />
    <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5Z" />
  </svg>
);

export const FlagIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke}>
    <path d="M6 3v18" />
    <path d="M6 4h11l-2.5 4L17 12H6" />
  </svg>
);

export const ExamIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke}>
    <path d="M6 3.5h9l3 3V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
    <path d="M15 3.5V7h3" />
    <path d="M8 12h8" />
    <path d="M8 15.5h8" />
    <path d="M8 8.5h3" />
  </svg>
);

export const ResultsIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke}>
    <path d="M4 19V5" />
    <path d="M4 19h16" />
    <rect x="7" y="12" width="3" height="7" />
    <rect x="12.5" y="8" width="3" height="11" />
    <rect x="18" y="14" width="3" height="5" />
  </svg>
);

export const LeaveIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke}>
    <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
    <path d="M3.5 9.5h17" />
    <path d="M8 3v3" />
    <path d="M16 3v3" />
    <path d="m9 15 2.2 2.2L15.5 13" />
  </svg>
);

export const ClockIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const SwapIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke}>
    <path d="m7 8 3-3 3 3" />
    <path d="M10 5v10" />
    <path d="m17 16-3 3-3-3" />
    <path d="M14 19V9" />
  </svg>
);

export const BusIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke}>
    <rect x="3.5" y="4.5" width="17" height="12" rx="2.5" />
    <path d="M3.5 10h17" />
    <path d="M7 16.5v2" />
    <path d="M17 16.5v2" />
    <circle cx="7.5" cy="19" r="1.3" />
    <circle cx="16.5" cy="19" r="1.3" />
  </svg>
);

export const LogOutIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke}>
    <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
    <path d="M14 16l4-4-4-4" />
    <path d="M18 12H9" />
  </svg>
);
