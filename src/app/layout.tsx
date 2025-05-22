import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/auth"; // Import AuthProvider
import { SiteHeader } from "@/components/site-header"; // Import SiteHeader
import { NotificationProvider } from "@/contexts/notification"; // Import NotificationProvider
import { MainSidebar } from "@/components/main-sidebar"; // Import MainSidebar
import { SidebarInset } from "@/components/ui/sidebar"; // Import SidebarInset
import { Nunito } from "next/font/google"; // Import Nunito font
import { ChunkErrorBoundary } from "@/components/chunk-error-boundary"; // Import ChunkErrorBoundary

// Initialize Nunito font with Latin subset
const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Quản lý thư viện",
  description: "Quản lý sách và mượn trả.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={nunito.variable}>
      <body className="antialiased min-h-screen bg-background font-nunito">
        <NotificationProvider>
          <AuthProvider>
            <ChunkErrorBoundary>
              <div className="relative flex min-h-screen">
                <MainSidebar />
                <SidebarInset className="w-full">
                  <SiteHeader />
                  <div className="flex-1 w-full p-4 md:p-8">{children}</div>
                </SidebarInset>
              </div>
            </ChunkErrorBoundary>
            <Toaster />
          </AuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
