import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { FirebaseAuthProvider } from "@/components/providers/FirebaseAuthProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ToastProvider } from "@/components/ui/toast";
import { SecureErrorHandler } from "@/components/SecureErrorHandler";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clicksehub - Gestão para Empresas de Cabine de Fotos",
  description: "Sistema completo para gerenciar seu negócio de totens fotográficos. Controle eventos, clientes, pagamentos e serviços de forma simples e organizada.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        <SecureErrorHandler />
        <ThemeProvider>
          <SidebarProvider>
            <SessionProvider>
              <FirebaseAuthProvider>
                <ToastProvider>
                  {children}
                </ToastProvider>
              </FirebaseAuthProvider>
            </SessionProvider>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
