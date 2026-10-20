import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atelier",
  description: "An AI content studio for fashion brands: on-model product shots and reels, on your own Higgsfield balance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
