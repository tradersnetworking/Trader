/** Kuber-style sidebar / menu SVG icons */

function Svg({ children, className = "h-5 w-5", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      {children}
    </svg>
  );
}

const ICONS = {
  dashboard: (p) => (
    <Svg {...p}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Svg>
  ),
  home: (p) => (
    <Svg {...p}>
      <path d="M4 10.5L12 4l8 6.5" />
      <path d="M5.5 10v9.5H10v-6h4v6h4.5V10" />
    </Svg>
  ),
  plans: (p) => (
    <Svg {...p}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  ),
  investments: (p) => (
    <Svg {...p}>
      <path d="M3 3v18h18" />
      <path d="M7 16l4-6 4 3 5-8" />
    </Svg>
  ),
  transactions: (p) => (
    <Svg {...p}>
      <path d="M7 10h10M7 14h6" />
      <path d="M12 3v3M12 18v3" />
      <rect x="3" y="5" width="18" height="14" rx="2" />
    </Svg>
  ),
  wallet: (p) => (
    <Svg {...p}>
      <path d="M19 7V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-2" />
      <path d="M17 12h4v4h-4a2 2 0 110-4z" />
    </Svg>
  ),
  deposit: (p) => (
    <Svg {...p}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 15h2M10 15h4" />
    </Svg>
  ),
  withdraw: (p) => (
    <Svg {...p}>
      <path d="M3 21h18M5 21V7l7-4 7 4v14" />
      <path d="M9 13h6M9 17h6" />
    </Svg>
  ),
  kyc: (p) => (
    <Svg {...p}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="10" cy="10" r="2" />
      <path d="M14 16s-1.5-2-4-2-4 2-4 2" />
      <path d="M16 8h4M16 12h3" />
    </Svg>
  ),
  agreements: (p) => (
    <Svg {...p}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h4" />
    </Svg>
  ),
  ledger: (p) => (
    <Svg {...p}>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </Svg>
  ),
  profile: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </Svg>
  ),
  payments: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
      <path d="M8 12h8" />
    </Svg>
  ),
  calendar: (p) => (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Svg>
  ),
  payouts: (p) => (
    <Svg {...p}>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </Svg>
  ),
  investors: (p) => (
    <Svg {...p}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </Svg>
  ),
  gateways: (p) => (
    <Svg {...p}>
      <path d="M12 22v-5M8 17H4a2 2 0 01-2-2V9a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2h-4" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  ),
  settings: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </Svg>
  ),
  staff: (p) => (
    <Svg {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Svg>
  ),
  menu: (p) => (
    <Svg {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Svg>
  ),
  more: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
    </Svg>
  ),
  bell: (p) => (
    <Svg {...p}>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </Svg>
  ),
  app: (p) => (
    <Svg {...p}>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M12 18h.01" />
    </Svg>
  ),
  referral: (p) => (
    <Svg {...p}>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 11l-2 2 2 2M18 13h4" />
    </Svg>
  ),
  support: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </Svg>
  ),
};

export function NavIcon({ name, className = "h-5 w-5", ...props }) {
  const Icon = ICONS[name] || ICONS.dashboard;
  return <Icon className={className} {...props} />;
}

export default NavIcon;
