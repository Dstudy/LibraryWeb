"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!authIsLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, authIsLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      // Toast is handled by login function for incorrect credentials
      return;
    }
    setIsSubmitting(true);
    await login(username, password);
    setIsSubmitting(false);
  };

  if (authIsLoading || (!authIsLoading && isAuthenticated)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">
            Đăng nhập BiblioManager
          </CardTitle>
          <CardDescription>
            Truy cập hệ thống quản lý thư viện của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Mã số bạn đọc/thủ thư</Label>
              <Input
                id="username"
                type="text"
                placeholder="Nhập mã số của bạn"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Ngày sinh (DDMMYYYY)</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="DDMMYYYY"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-base pr-10"
                  maxLength={8}
                  pattern="[0-9]{8}"
                  title="Vui lòng nhập ngày sinh theo định dạng DDMMYYYY"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "Ẩn ngày sinh" : "Hiển thị ngày sinh"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-lg py-6"
              disabled={isSubmitting || authIsLoading}
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" /> Đăng nhập
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col text-center text-sm text-muted-foreground space-y-1">
          <p>Đăng nhập bằng mã số và ngày sinh (định dạng DDMMYYYY)</p>
          <p>Ví dụ: Mã số thủ thư / 01012000</p>
          <p>Ví dụ: Mã số bạn đọc / 15051995</p>
        </CardFooter>
      </Card>
    </div>
  );
}
