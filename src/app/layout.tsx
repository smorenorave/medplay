import type { Metadata } from "next";
import "./globals.css";
import SessionGuard from "@/components/SessionGuard";

export const metadata: Metadata = {
  title: "MEDPLAY VENTAS",
  description: "Admin ventas medplay",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <SessionGuard />
        {children}
      </body>
    </html>
  );
}
