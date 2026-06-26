import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Property Finder But Better",
  description: "A results-first Dubai property finder with 3D context.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
