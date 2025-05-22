"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import type {
  Book,
  SortConfig,
  SortableBookFields,
  Notification,
} from "@/lib/types";
import { BookTable } from "@/components/book-table";
import { BookForm } from "@/components/book-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search as SearchIcon, Library } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth";
import { useNotification } from "@/contexts/notification";
import { useRouter, usePathname } from "next/navigation";

export default function BiblioManagerPage() {
  const { isAuthenticated, isLoading: authIsLoading, currentUser } = useAuth();
  const { refreshNotifications } = useNotification();
  const router = useRouter();
  const pathname = usePathname();

  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bookToDeleteId, setBookToDeleteId] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const { toast } = useToast();
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Check if a similar notification already exists
  const checkForExistingNotification = async (
    message: string,
    type: Notification["type"]
  ): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const response = await fetch(
        `/api/notifications?userId=${encodeURIComponent(currentUser.id)}`
      );
      if (response.ok) {
        const notifications: Notification[] = await response.json();
        // Check for similar unread notifications with the same type and message
        return notifications.some(
          (n) => !n.isRead && n.type === type && n.message === message
        );
      }
    } catch (error) {
      console.error("Error checking for existing notifications:", error);
    }
    return false;
  };

  const createNotification = async (
    message: string,
    type: Notification["type"],
    skipDuplicateCheck: boolean = false
  ) => {
    if (!currentUser) return;
    try {
      // Check if a similar notification already exists (unless skipDuplicateCheck is true)
      if (!skipDuplicateCheck) {
        const exists = await checkForExistingNotification(message, type);
        if (exists) {
          return;
        }
      }

      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          message,
          type,
          isRead: false,
        }),
      });
      console.log(`Created new ${type} notification`);

      // Refresh notifications in the header
      refreshNotifications();
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  };

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !currentUser) {
      setIsDataLoading(false);
      return;
    }

    setIsDataLoading(true);
    try {
      const booksResponse = await fetch("/api/books");

      if (!booksResponse.ok) {
        throw new Error("Failed to fetch books");
      }
      const booksData = await booksResponse.json();
      const booksWithDateObjects = booksData.map((book: any) => ({
        ...book,
        importDate: new Date(book.importDate),
      }));
      setBooks(booksWithDateObjects);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch data from the server.",
      });
    } finally {
      setIsDataLoading(false);
    }
  }, [toast, isAuthenticated, currentUser]);

  useEffect(() => {
    if (authIsLoading) return;

    if (!isAuthenticated) {
      router.push("/login");
    } else {
      fetchData();
    }
  }, [isAuthenticated, authIsLoading, router, fetchData]);

  const handleAddBook = () => {
    if (currentUser?.role !== "librarian") {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "You do not have permission to add books.",
      });
      return;
    }
    setEditingBook(null);
    setIsFormOpen(true);
  };

  const handleEditBook = (book: Book) => {
    if (currentUser?.role !== "librarian") {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "You do not have permission to edit books.",
      });
      return;
    }
    setEditingBook(book);
    setIsFormOpen(true);
  };

  const handleDeleteBook = (id: number) => {
    if (currentUser?.role !== "librarian") {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "You do not have permission to delete books.",
      });
      return;
    }
    setBookToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteBook = async () => {
    if (currentUser?.role !== "librarian") {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "You do not have permission to delete books.",
      });
      setIsDeleteDialogOpen(false);
      setBookToDeleteId(null);
      return;
    }
    if (bookToDeleteId !== null) {
      const toastId = toast({
        title: "Deleting book...",
        description: "Please wait.",
      });
      try {
        const response = await fetch(`/api/books/${bookToDeleteId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: "Failed to delete book" }));
          throw new Error(errorData.message || "Failed to delete book");
        }
        toastId.update({
          id: toastId.id,
          title: "Success",
          description: "Book deleted successfully.",
        });
        fetchData();
      } catch (error: any) {
        console.error("Error deleting book:", error);
        toastId.update({
          id: toastId.id,
          variant: "destructive",
          title: "Error",
          description: error.message || "Could not delete book.",
        });
      }
    }
    setIsDeleteDialogOpen(false);
    setBookToDeleteId(null);
  };

  const handleFormSubmit = async (data: Omit<Book, "id">) => {
    if (currentUser?.role !== "librarian") {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "You do not have permission to save books.",
      });
      setIsFormOpen(false);
      setEditingBook(null);
      return;
    }
    const toastId = toast({
      title: editingBook ? "Updating book..." : "Adding book...",
      description: "Please wait.",
    });
    try {
      let response;
      const payload = {
        ...data,
        importDate:
          data.importDate instanceof Date
            ? data.importDate.toISOString()
            : new Date(data.importDate).toISOString(),
      };

      if (editingBook && editingBook.id) {
        response = await fetch(`/api/books/${editingBook.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response || !response.ok) {
        const errorData = await response?.json().catch(() => ({
          message: editingBook ? "Failed to update book" : "Failed to add book",
        }));
        throw new Error(
          errorData.message ||
            (editingBook ? "Failed to update book" : "Failed to add book")
        );
      }

      toastId.update({
        id: toastId.id,
        title: "Success",
        description: `Book ${editingBook ? "updated" : "added"} successfully.`,
      });
      setIsFormOpen(false);
      setEditingBook(null);
      fetchData();
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toastId.update({
        id: toastId.id,
        variant: "destructive",
        title: "Error",
        description:
          error.message || `Could not ${editingBook ? "update" : "add"} book.`,
      });
    }
  };

  const requestSort = (key: SortableBookFields) => {
    let direction: "ascending" | "descending" = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedBooks = useMemo(() => {
    let sortableBooks = [...books];
    if (sortConfig !== null) {
      sortableBooks.sort((a, b) => {
        const valA = a[sortConfig.key as keyof Book];
        const valB = b[sortConfig.key as keyof Book];

        if (valA === undefined || valB === undefined) return 0;

        let comparison = 0;
        if (typeof valA === "number" && typeof valB === "number") {
          comparison = valA - valB;
        } else if (valA instanceof Date && valB instanceof Date) {
          comparison = valA.getTime() - valB.getTime();
        } else {
          comparison = String(valA)
            .toLowerCase()
            .localeCompare(String(valB).toLowerCase());
        }

        return sortConfig.direction === "ascending"
          ? comparison
          : comparison * -1;
      });
    }
    return sortableBooks;
  }, [books, sortConfig]);

  const filteredBooks = useMemo(() => {
    return sortedBooks.filter((book) => {
      const lowerSearchTerm = searchTerm.toLowerCase();
      return (
        book.name.toLowerCase().includes(lowerSearchTerm) ||
        book.author.toLowerCase().includes(lowerSearchTerm) ||
        book.publisher.toLowerCase().includes(lowerSearchTerm)
      );
    });
  }, [sortedBooks, searchTerm]);

  if (authIsLoading || (!isAuthenticated && pathname !== "/login")) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  if (!isAuthenticated && !authIsLoading && pathname !== "/login") {
    return null;
  }

  return (
    <div className="space-y-8">
      <header className="text-center">
        {currentUser?.role === "reader" && (
          <h1 className="text-3xl sm:text-4xl font-bold text-primary">
            Tra cứu sách
          </h1>
        )}
        {currentUser?.role === "librarian" && (
          <h1 className="text-3xl sm:text-4xl font-bold text-primary">
            Quản lý sách
          </h1>
        )}

        {currentUser?.role === "reader" && (
          <div className="mt-2 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const message =
                    "Test notification - " + new Date().toLocaleTimeString();
                  // Create a test notification and force a toast to appear
                  await createNotification(message, "overdue", true);
                  toast({
                    title: "Test Notification",
                    description: message + " (check notification bell)",
                    duration: 5000,
                  });
                } catch (error) {
                  console.error("Error creating test notification:", error);
                }
              }}
            >
              Test Notification
            </Button>
          </div>
        )}
      </header>

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="relative w-full md:max-w-sm pt-4">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pt-1" />
              <Input
                type="search"
                placeholder="Tìm kiếm theo tên, tác giả, NXB..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
                aria-label="Search books"
              />
            </div>
            {currentUser?.role === "librarian" && (
              <Button
                onClick={handleAddBook}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <PlusCircle className="mr-2 h-5 w-5" /> Thêm sách mới
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isDataLoading && books.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-muted-foreground">Loading books...</p>
            </div>
          ) : (
            <BookTable
              books={filteredBooks}
              onEdit={handleEditBook}
              onDelete={handleDeleteBook}
              sortConfig={sortConfig}
              requestSort={requestSort}
              userRole={currentUser?.role}
            />
          )}
        </CardContent>
      </Card>

      {currentUser?.role === "librarian" && isFormOpen && (
        <Dialog
          open={isFormOpen}
          onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingBook(null);
          }}
        >
          <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl text-primary">
                {editingBook ? "Sửa sách" : "Thêm sách mới"}
              </DialogTitle>
            </DialogHeader>
            <BookForm
              onSubmit={handleFormSubmit}
              initialData={editingBook}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingBook(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {currentUser?.role === "librarian" && isDeleteDialogOpen && (
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Bạn có chắc không?</AlertDialogTitle>
              <AlertDialogDescription>
                Hành động này không thể quay lại. Sách sẽ bị xóa vĩnh viễn khỏi
                cơ sở dữ liệu.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setBookToDeleteId(null)}>
                Thoát
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteBook}
                className="bg-destructive hover:bg-destructive/90"
              >
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
