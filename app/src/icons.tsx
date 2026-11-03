type P = { size?: number };
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const CheckIcon = ({ size = 14 }: P) => (
  <svg {...base(size)} strokeWidth={3}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const StarIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.7l5.9-.9z" /></svg>
);
export const SunIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></svg>
);
export const BoardsIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}><rect x="3.5" y="4" width="17" height="4.5" rx="1.5" /><rect x="3.5" y="10.75" width="17" height="4.5" rx="1.5" /><rect x="3.5" y="17.5" width="11" height="2.5" rx="1.25" /></svg>
);
export const PlusIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="M12 5v14M5 12h14" /></svg>
);
export const ChevronIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="M9 6l6 6-6 6" /></svg>
);
export const ReturnIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="M19 5v7a3 3 0 0 1-3 3H6" /><path d="M10 11l-4 4 4 4" /></svg>
);
export const CloseIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const FlagIcon = ({ size = 14 }: P) => (
  <svg {...base(size)}><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></svg>
);
export const SchoolIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M2.5 9L12 4.5 21.5 9 12 13.5z" /><path d="M6.5 11v5c1.6 1.6 3.5 2.4 5.5 2.4s3.9-.8 5.5-2.4v-5" /><path d="M21.5 9v5" /></svg>
);
