import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const title = "Renda Signal — Funded requests for anyone on X";
  const description = "Send a public, funded request to anyone on X. Polygon USDT stays protected until acceptance and delivery.";
  return { title, description, icons: { icon: "/favicon.svg" }, openGraph: { title, description, type: "website", images: [{ url: `${origin}/og.png`, width: 1200, height: 630 }] }, twitter: { card: "summary_large_image", title, description, images: [`${origin}/og.png`] } };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className={`${geist.variable} ${mono.variable}`}>{children}</body></html>;
}
