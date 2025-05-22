"use client";

import React, { ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ChunkErrorBoundaryProps {
  children: ReactNode;
}

interface ChunkErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ChunkErrorBoundary extends React.Component<
  ChunkErrorBoundaryProps,
  ChunkErrorBoundaryState
> {
  constructor(props: ChunkErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ChunkErrorBoundaryState {
    // Check if this is a chunk load error
    const isChunkLoadError =
      error.message.includes("ChunkLoadError") ||
      error.message.includes("Loading chunk") ||
      error.message.includes("Loading CSS chunk") ||
      error.message.includes("Failed to fetch dynamically imported module");

    // Only update state for chunk load errors
    if (isChunkLoadError) {
      return { hasError: true, error };
    }

    // For other errors, let them propagate
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to console
    console.error("Chunk loading error:", error);
    console.error("Component stack:", errorInfo.componentStack);
  }

  handleRefresh = (): void => {
    // Clear cache and reload the page
    if (typeof window !== "undefined") {
      // Clear localStorage cache if needed
      // localStorage.clear();
      
      // Force reload from server, not from cache
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">Đã xảy ra lỗi khi tải trang</h2>
          <p className="text-muted-foreground mb-6">
            Ứng dụng gặp sự cố khi tải một số tài nguyên cần thiết. Vui lòng thử làm mới trang.
          </p>
          <Button 
            onClick={this.handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới trang
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ChunkErrorBoundary };
