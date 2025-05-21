"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth";
import { useNotification } from "@/contexts/notification";
import { Button } from "@/components/ui/button";
import {
  BookMarked,
  LogIn,
  LogOut,
  Bell,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { usePathname } from "next/navigation";
import type { Notification } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

export function SiteHeader() {
  const { currentUser, isAuthenticated, logout, isLoading } = useAuth();
  const { notificationVersion } = useNotification();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isFetchingNotifications, setIsFetchingNotifications] = useState(false);
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !currentUser) {
      setNotifications([]);
      return;
    }
    setIsFetchingNotifications(true);
    try {
      console.log("Fetching notifications for", currentUser.id);
      const response = await fetch(
        `/api/notifications?userId=${encodeURIComponent(currentUser.id)}`
      );
      if (response.ok) {
        const data: Notification[] = await response.json();
        console.log("Fetched notifications:", data);
        // Ensure timestamp is a Date object for formatDistanceToNow
        setNotifications(
          data.map((n) => ({ ...n, timestamp: new Date(n.timestamp) }))
        );
      } else {
        setNotifications([]);
        console.error("Failed to fetch notifications", await response.text());
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
    } finally {
      setIsFetchingNotifications(false);
    }
  }, [currentUser, isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
    // Periodically refresh notifications, e.g., every minute
    const intervalId = setInterval(fetchNotifications, 60000);
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  // Refresh notifications when notificationVersion changes
  useEffect(() => {
    if (notificationVersion > 0) {
      fetchNotifications();
    }
  }, [notificationVersion, fetchNotifications]);

  const markAsRead = async (notificationId?: number) => {
    if (!currentUser) return;
    const endpoint = `/api/notifications/mark-read`;
    const body = notificationId
      ? { notificationId }
      : { userId: currentUser.id, markAll: true };

    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        fetchNotifications(); // Refresh notifications list
      } else {
        console.error("Failed to mark notification(s) as read");
      }
    } catch (error) {
      console.error("Error marking notification(s) as read:", error);
    }
  };

  const unreadNotificationsCount = notifications.filter(
    (n) => !n.isRead
  ).length;

  if (pathname === "/login") {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-end">
        <div className="flex items-center space-x-4">
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted"></div>
          ) : isAuthenticated && currentUser ? (
            <>
              {currentUser.role === "reader" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5" />
                      {unreadNotificationsCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-1 -right-1 h-4 w-4 min-w-fit p-0.5 text-xs flex items-center justify-center"
                        >
                          {unreadNotificationsCount}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 md:w-96">
                    <DropdownMenuLabel className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold">
                          {showOnlyUnread ? "Unread" : "All"} Notifications
                        </span>
                        <Badge variant="secondary" className="ml-2">
                          {showOnlyUnread
                            ? unreadNotificationsCount
                            : notifications.length}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-auto text-xs"
                          onClick={() => fetchNotifications()}
                          title="Refresh notifications"
                        >
                          Refresh
                        </Button>
                        {unreadNotificationsCount > 0 && (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-xs"
                            onClick={() => markAsRead()}
                          >
                            Mark all read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-auto text-xs"
                          onClick={() => setShowOnlyUnread(!showOnlyUnread)}
                        >
                          {showOnlyUnread ? "Show all" : "Show unread"}
                        </Button>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <ScrollArea className="h-[300px]">
                      {notifications.length === 0 ? (
                        <DropdownMenuItem disabled className="justify-center">
                          No notifications yet.
                        </DropdownMenuItem>
                      ) : showOnlyUnread && unreadNotificationsCount === 0 ? (
                        <DropdownMenuItem disabled className="justify-center">
                          No unread notifications.
                        </DropdownMenuItem>
                      ) : (
                        (showOnlyUnread
                          ? notifications.filter((n) => !n.isRead)
                          : notifications
                        ).map((notification) => (
                          <DropdownMenuItem
                            key={notification.id}
                            className={`flex items-start space-x-2 ${
                              notification.isRead
                                ? "opacity-75"
                                : "bg-accent/10"
                            }`}
                            onSelect={(e) => {
                              e.preventDefault(); // Prevent menu from closing immediately
                              if (!notification.isRead)
                                markAsRead(notification.id);
                            }}
                          >
                            {notification.type === "overdue" && (
                              <XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                            )}
                            {notification.type === "new_borrow" && (
                              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm leading-tight whitespace-normal">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(notification.timestamp, {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                            {!notification.isRead ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-1 h-auto text-xs self-center"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent item onSelect
                                  markAsRead(notification.id);
                                }}
                              >
                                Mark read
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground self-center px-1">
                                Read
                              </span>
                            )}
                          </DropdownMenuItem>
                        ))
                      )}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <span className="text-sm text-muted-foreground hidden md:inline">
                Welcome, {currentUser.id}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
