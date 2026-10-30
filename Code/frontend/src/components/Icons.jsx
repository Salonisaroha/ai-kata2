// Small inline SVG icon set; decorative (aria-hidden), meaning is always in adjacent text.
const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
};

export const CheckIcon = (props) => (
  <svg {...base} {...props}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const CrossIcon = (props) => (
  <svg {...base} {...props}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const AlertIcon = (props) => (
  <svg {...base} {...props}><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17.5v.01" /></svg>
);
export const ShieldIcon = (props) => (
  <svg {...base} strokeWidth={2} {...props}><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5L15.5 10" /></svg>
);
export const PlusIcon = (props) => (
  <svg {...base} {...props}><path d="M12 5v14M5 12h14" /></svg>
);
export const InboxIcon = (props) => (
  <svg {...base} width={40} height={40} strokeWidth={1.5} {...props}><path d="M3 13l3-8h12l3 8v6H3z" /><path d="M3 13h5l1 3h6l1-3h5" /></svg>
);
export const SunIcon = (props) => (
  <svg {...base} width={22} height={22} strokeWidth={2} {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const MoonIcon = (props) => (
  <svg {...base} width={22} height={22} strokeWidth={2} {...props}><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" /></svg>
);
