"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RebornBadge } from "./reborn";
import { WalletButton } from "./wallet";

export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="group-hover:rotate-[20deg] transition-transform duration-300">
      <defs>
        <clipPath id="mark-clip">
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>
      <g clipPath="url(#mark-clip)">
        <rect x="-20" y="-20" width="52" height="104" fill="#2459FF" transform="rotate(20 32 32)" />
        <rect x="32" y="-20" width="52" height="104" fill="#FF5A1F" transform="rotate(20 32 32)" />
      </g>
      <circle cx="32" cy="32" r="10" fill="#D7FF3D" stroke="#15161A" strokeWidth="4" />
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight sm:text-2xl">
      <Mark size={size} />
      viber predict
      <span className="hidden sm:inline-flex"><RebornBadge /></span>
    </Link>
  );
}

const nav = [
  { href: "/", label: "Markets", icon: <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /> },
  { href: "/create", label: "Create", icon: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></> },
  { href: "/portfolio", label: "Positions", icon: <><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M8 6V4h8v2" /></> },
  { href: "/settings", label: "Settings", icon: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></> },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" || path.startsWith("/market") : path.startsWith(href);
}

export function Header() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1344px] items-center justify-between gap-6 px-4 sm:h-[76px] sm:px-8 lg:px-12">
        <div className="flex items-center gap-10">
          <Logo />
          <nav className="hidden gap-1 text-[15px] font-medium md:flex">
            {nav.slice(0, 3).map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-full px-3.5 py-2 ${isActive(path, n.href) ? "bg-card" : "text-muted hover:text-ink"}`}
              >
                {n.label === "Positions" ? "Portfolio" : n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full bg-devnet px-3.5 py-2 text-sm font-semibold sm:flex">
            <span className="live-dot h-2 w-2 bg-ink" />
            Devnet
          </span>
          <Link href="/create" className="hidden rounded-full bg-lime px-4 py-2 text-sm font-semibold md:block">
            + Create
          </Link>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid h-[72px] grid-cols-4 bg-card px-2 pb-[env(safe-area-inset-bottom)] text-[11px] font-medium md:hidden">
      {nav.map((n) => {
        const active = isActive(path, n.href);
        return (
          <Link key={n.href} href={n.href} className={`flex flex-col items-center justify-center gap-1 ${active ? "text-ink" : "text-muted"}`}>
            <span className={`flex h-[30px] items-center justify-center rounded-full ${active ? "w-[52px] bg-lime" : ""}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                {n.icon}
              </svg>
            </span>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
