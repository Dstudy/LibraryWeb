import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/auth"; // Import AuthProvider
import { SiteHeader } from "@/components/site-header"; // Import SiteHeader
import { NotificationProvider } from "@/contexts/notification"; // Import NotificationProvider
import { MainSidebar } from "@/components/main-sidebar"; // Import MainSidebar
import { SidebarInset } from "@/components/ui/sidebar"; // Import SidebarInset

export const metadata: Metadata = {
  title: "BiblioManager",
  description: "Manage your book collection easily.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background font-sans">
        <AuthProvider>
          <NotificationProvider>
            <div className="relative flex min-h-screen">
              <MainSidebar />
              <SidebarInset className="w-full">
                <SiteHeader />
                <div className="flex-1 w-full p-4 md:p-8">{children}</div>
              </SidebarInset>
            </div>
            <Toaster />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
