import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SISTEPARD — Sistema Electoral de Partidos RD",
  description: "Plataforma digital para la gestión electoral interna de partidos políticos en República Dominicana.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={font.variable}>
      <body className="font-[family-name:var(--font-jakarta)] bg-bg text-text antialiased">
        {children}
      </body>
    </html>
  );
}
