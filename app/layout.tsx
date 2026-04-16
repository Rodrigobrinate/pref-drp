import type { Metadata, Viewport } from "next";
import { Inter, Public_Sans } from "next/font/google";

import "@/app/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
});

export const metadata: Metadata = {
  title: "Nomos | Avaliação de Desempenho",
  description: "Sistema institucional de avaliação de desempenho com ciclos anuais.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${publicSans.variable}`}>{children}</body>
    </html>
  );
}
