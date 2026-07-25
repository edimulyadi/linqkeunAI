import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "linqkeunAI — 20 Karyawan AI untuk Bisnis Anda",
  description:
    "Platform AI karyawan untuk konten, marketing, layanan pelanggan, dan operasional bisnis Anda.",
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
