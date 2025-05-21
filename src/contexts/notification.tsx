"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface NotificationContextType {
  refreshNotifications: () => void;
  notificationVersion: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notificationVersion, setNotificationVersion] = useState(0);

  const refreshNotifications = useCallback(() => {
    setNotificationVersion((prev) => prev + 1);
  }, []);

  return (
    <NotificationContext.Provider
      value={{ refreshNotifications, notificationVersion }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
}
