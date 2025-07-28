import type { Metadata } from "next";
import { M_PLUS_2, Montserrat } from "next/font/google";
import "./globals.css";
import "./lib/envSetup";

const m_plus_2 = M_PLUS_2({
  variable: "--font-m-plus-2",
  display: "swap",
  preload: false,
});

const montserrat = Montserrat({
  variable: "--font-montserrat", 
  display: "swap",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Realtime API Agents",
  description: "A demo app from OpenAI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${m_plus_2.variable} ${montserrat.variable} antialiased`}>{children}</body>
    </html>
  );
}
