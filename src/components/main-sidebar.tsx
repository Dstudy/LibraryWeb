"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, Library, ArrowRightLeft, Users } from "lucide-react";
import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";

export function MainSidebar() {
  const pathname = usePathname();

  // Don't show sidebar on login page
  if (pathname === "/login") {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center justify-between p-2">
            <Link href="/" className="flex items-center space-x-2">
              <BookMarked className="h-7 w-7 text-white" />
              <span className="font-bold text-xl text-white">Thư viện</span>
            </Link>
            <SidebarTrigger />
          </div>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/" || pathname.startsWith("/books")}
                tooltip="Books"
              >
                <Link href="/">
                  <Library className="h-6 w-6 text-white" />
                  <span>Sách</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/lending")}
                tooltip="Lending"
              >
                <Link href="/lending">
                  <ArrowRightLeft className="h-6 w-6 text-white" />
                  <span>Mượn trả</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/readers")}
                tooltip="Readers"
              >
                <Link href="/readers">
                  <Users className="h-6 w-6 text-white" />
                  <span>Bạn đọc</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}
