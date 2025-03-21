import type { Metadata } from "next";
import { Outfit } from 'next/font/google';
import "./globals.css";

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: "MangaSketch - AI-Powered Drawing Guide",
  description: "Learn to draw manga-style characters with AI guidance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.className}>
      <body className="font-outfit">
        {children}
      </body>
    </html>
  );
}
