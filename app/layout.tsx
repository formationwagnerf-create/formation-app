import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Formation professionnelle",
  description: "Plateforme de réservation de formations professionnelles",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
