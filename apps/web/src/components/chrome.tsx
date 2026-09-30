"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./wallet";

export function Mark({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/mark.svg"
      width={size}
      height={size}
      alt=""
      className="rounded-md"
    />
  );
}

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <Link href="/" className="group flex items-center gap-2 text-[15px] font-bold tracking-tight">
      <Mark size={size} />
      <span>
        viber <span className="text-muted">reborn</span>
      </span>
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
    <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-6 px-4 sm:h-16 sm:px-8 lg:px-12">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden gap-1 text-sm md:flex">
            {nav.slice(0, 3).map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-md px-3 py-1.5 transition-colors duration-150 ${isActive(path, n.href) ? "text-fg" : "text-muted hover:text-fg"}`}
              >
                {n.label === "Positions" ? "Portfolio" : n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 px-2 font-mono text-xs text-muted sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-yes" />
            devnet
          </span>
          <Link href="/create" className="hidden rounded-lg bg-flame px-3.5 py-1.5 text-sm font-semibold text-ink transition-opacity duration-150 hover:opacity-90 md:block">
            New market
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
    <nav className="fixed inset-x-0 bottom-0 z-20 grid h-[72px] grid-cols-4 border-t border-line bg-card/95 px-2 backdrop-blur pb-[env(safe-area-inset-bottom)] text-[11px] font-medium md:hidden">
      {nav.map((n) => {
        const active = isActive(path, n.href);
        return (
          <Link key={n.href} href={n.href} className={`flex flex-col items-center justify-center gap-1 ${active ? "text-fg" : "text-muted"}`}>
            <span className={`flex h-[30px] items-center justify-center rounded-md ${active ? "text-flame" : ""}`}>
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
