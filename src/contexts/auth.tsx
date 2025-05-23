"use client";

import type { User, Notification, LendingRecord } from "@/lib/types";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useNotification } from "@/contexts/notification";

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { refreshNotifications } = useNotification();

  // Function to check for overdue books and create notifications
  const checkForOverdueBooks = async (userId: string) => {
    try {
      // Fetch lending records for the user
      const response = await fetch(
        `/api/lending/records?readerId=${encodeURIComponent(userId)}`
      );

      if (!response.ok) {
        console.error("Không thể lấy thông tin mượn trả:", response.statusText);
        return;
      }

      const records: LendingRecord[] = await response.json();

      // Filter for overdue books (not returned and past due date)
      const overdueRecords = records.filter((record) => {
        if (record.returnDate) return false; // Already returned

        const dueDate = new Date(record.dueDate);
        const now = new Date();
        return dueDate < now; // Overdue if due date is in the past
      });

      if (overdueRecords.length > 0) {
        // Create notifications for each overdue book
        for (const record of overdueRecords) {
          await createOverdueNotification(userId, record);
        }

        // Show a toast notification
        if (overdueRecords.length === 1) {
          toast({
            title: "Sách quá hạn",
            description: `Bạn có 1 cuốn sách quá hạn cần trả: "${overdueRecords[0].bookName}"`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sách quá hạn",
            description: `Bạn có ${overdueRecords.length} cuốn sách quá hạn cần trả`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra sách quá hạn:", error);
    }
  };

  // Function to create a notification for an overdue book
  const createOverdueNotification = async (
    userId: string,
    record: LendingRecord
  ) => {
    try {
      // Check if a similar notification already exists
      const checkResponse = await fetch(
        `/api/notifications?userId=${encodeURIComponent(userId)}`
      );
      if (checkResponse.ok) {
        const notifications: Notification[] = await checkResponse.json();

        // Look for an existing unread notification for this book
        const existingNotification = notifications.find(
          (n) =>
            !n.isRead &&
            n.type === "overdue" &&
            n.message.includes(record.bookName)
        );

        if (existingNotification) {
          return;
        }
      }

      // Format the due date
      const dueDate = new Date(record.dueDate);
      const formattedDueDate = dueDate.toLocaleDateString("vi-VN");

      // Create a new notification
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          message: `Sách "${record.bookName}" đã quá hạn trả (hạn trả: ${formattedDueDate})`,
          type: "overdue",
          isRead: false,
        }),
      });

      // Refresh notifications in the header if the function exists
      if (refreshNotifications) {
        refreshNotifications();
      }
    } catch (error) {
      console.error("Lỗi khi tạo thông báo sách quá hạn:", error);
    }
  };

  useEffect(() => {
    // Check for saved user in localStorage on initial load
    try {
      const savedUser = localStorage.getItem("currentUser");
      if (savedUser) {
        const user = JSON.parse(savedUser) as User;
        setCurrentUser(user);

        // If it's a reader, check for overdue books
        if (user.role === "reader") {
          checkForOverdueBooks(user.id);
        }
      }
    } catch (error) {
      console.error(
        "Không thể đọc thông tin người dùng từ localStorage",
        error
      );
      localStorage.removeItem("currentUser");
    }
    setIsLoading(false);
  }, []);

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        const user: User = data.user;
        setCurrentUser(user);
        try {
          localStorage.setItem("currentUser", JSON.stringify(user));
        } catch (error) {
          console.error(
            "Không thể lưu thông tin người dùng vào localStorage",
            error
          );
        }
        setIsLoading(false);
        router.push("/");
        toast({
          title: "Đăng nhập thành công",
          description: `Chào mừng trở lại, ${user.name}!`,
        });

        // If it's a reader, check for overdue books
        if (user.role === "reader") {
          checkForOverdueBooks(user.id);
        }

        return true;
      } else {
        setCurrentUser(null);
        setIsLoading(false);
        toast({
          variant: "destructive",
          title: "Đăng nhập thất bại",
          description: "Mã số hoặc ngày sinh không hợp lệ.",
        });
        return false;
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      setCurrentUser(null);
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Đăng nhập thất bại",
        description:
          "Đã xảy ra lỗi trong quá trình đăng nhập. Vui lòng thử lại.",
      });
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem("currentUser");
    } catch (error) {
      console.error(
        "Không thể xóa thông tin người dùng khỏi localStorage",
        error
      );
    }
    router.push("/login");
    toast({
      title: "Đã đăng xuất",
      description: "Bạn đã đăng xuất thành công.",
    });
  };

  const isAuthenticated = !!currentUser;

  // Handle redirection for protected routes
  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/login") {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  return (
    <AuthContext.Provider
      value={{ currentUser, isAuthenticated, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth phải được sử dụng trong AuthProvider");
  }
  return context;
}
