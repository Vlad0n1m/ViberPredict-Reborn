import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { BottomNav, Header } from "@/components/chrome";
import { WalletProviders } from "@/components/wallet";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

export const metadata: Metadata = {
  title: "Viber Predict Reborn",
  description: "Reborn from scratch: prediction markets on Solana devnet. Call it, stake SOL, take the pool.",
};

export const viewport: Viewport = {
  themeColor: "#f4f2ec",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <WalletProviders>
          <Header />
          <div className="flex flex-1 flex-col pb-24 md:pb-12">{children}</div>
          <BottomNav />
        </WalletProviders>
      </body>
    </html>
  );
}
