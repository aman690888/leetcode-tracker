/**
 * app/layout.tsx
 */

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "tracker.sh — DSA Assignment Progress",
  description: "Track your DSA homework progress against your LeetCode submissions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
