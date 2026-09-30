import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Unbounded } from "next/font/google";
import { BottomNav, Header, Ticker } from "@/components/chrome";
import { WalletProviders } from "@/components/wallet";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["500", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Viber Reborn — back to business",
  description: "Reborn from scratch: prediction markets on Solana devnet. Call it, stake SOL, take the pool.",
};

export const viewport: Viewport = {
  themeColor: "#0c0a09",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${jetbrains.variable} ${unbounded.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <WalletProviders>
          <Ticker />
          <Header />
          <div className="flex flex-1 flex-col pb-24 md:pb-12">{children}</div>
          <BottomNav />
        </WalletProviders>
      </body>
    </html>
  );
}
