import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Linqkeun AI — ERP AI Co-Workers untuk Bisnis Anda",
  description:
    "ERP + AI Co-Workers + Automation Engine. Jalankan bisnis lebih cepat bersama CEO, Finance, HR, Marketing, dan Operations AI dalam satu platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
