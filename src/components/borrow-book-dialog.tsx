"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Book } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const borrowBookSchema = z.object({
  bookId: z.string().min(1, "Please select a book."),
  userID: z.string().min(1, "Reader ID is required."),
});

type BorrowBookFormData = z.infer<typeof borrowBookSchema>;

interface BorrowBookDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void; // Callback after successful borrow
}

export function BorrowBookDialog({
  isOpen,
  onOpenChange,
  onSuccess,
}: BorrowBookDialogProps) {
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<BorrowBookFormData>({
    resolver: zodResolver(borrowBookSchema),
  });

  useEffect(() => {
    if (isOpen) {
      fetchAvailableBooks();
      reset({ bookId: "", userID: "" });
      setSearchTerm("");
      setSelectedBookId(null);
    }
  }, [isOpen, reset]);

  const fetchAvailableBooks = async () => {
    setIsLoadingBooks(true);
    try {
      const response = await fetch("/api/books");
      if (!response.ok) throw new Error("Failed to fetch books");
      const allBooks: Book[] = await response.json();
      // Filter for books that are actually available (quantity > borrowedCount)
      const booksForBorrow = allBooks.filter(
        (book) => (book.quantity || 0) - (book.borrowedCount || 0) > 0
      );
      const formattedBooks = booksForBorrow.map((b) => ({
        ...b,
        importDate: new Date(b.importDate),
      }));

      console.log("Available books:", formattedBooks);
      setAvailableBooks(formattedBooks);
    } catch (error) {
      console.error("Error fetching available books:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch available books.",
      });
      setAvailableBooks([]);
    } finally {
      setIsLoadingBooks(false);
    }
  };

  // Filter books based on search term
  const filteredBooks = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    return availableBooks.filter((book) => {
      // Search by ID (exact match or starts with)
      const idMatch = book.id
        ? String(book.id).toLowerCase().includes(lowerSearchTerm)
        : false;

      // Search by name (partial match)
      const nameMatch = book.name.toLowerCase().includes(lowerSearchTerm);

      return idMatch || nameMatch;
    });
  }, [availableBooks, searchTerm]);

  // Handle book selection
  const handleSelectBook = (book: Book) => {
    setSelectedBookId(String(book.id));
    setValue("bookId", String(book.id));
  };

  const onSubmit = async (data: BorrowBookFormData) => {
    setIsSubmitting(true);
    const toastId = toast({ title: "Đang xử lý yêu cầu mượn sách..." });
    try {
      // Debug log to check values before sending
      console.log("Submitting form with data:", {
        bookId: data.bookId,
        userID: data.userID,
      });

      // Validate that bookId is not empty and is a valid string
      console.log(
        "Validating bookId:",
        data.bookId,
        "Type:",
        typeof data.bookId
      );

      if (!data.bookId || data.bookId === "") {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Vui lòng chọn một cuốn sách",
        });
        throw new Error("Vui lòng chọn một cuốn sách");
      }

      // Find the selected book in the available books
      const selectedBook = availableBooks.find(
        (book) => String(book.id) === data.bookId
      );
      console.log("Selected book:", selectedBook);

      if (!selectedBook) {
        console.error(
          "Không tìm thấy sách đã chọn trong danh sách sách khả dụng"
        );
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Vui lòng chọn một cuốn sách hợp lệ từ danh sách",
        });
        throw new Error("Không tìm thấy sách trong danh sách sách khả dụng");
      }

      // Use the book ID directly from the selected book
      console.log(
        "Selected book ID:",
        selectedBook.id,
        "Type:",
        typeof selectedBook.id
      );

      // Try to convert the book ID to a number if it's a string
      let bookIdForRequest;
      if (
        typeof selectedBook.id === "string" &&
        selectedBook.id.startsWith("S")
      ) {
        // If it's a string ID like 'S001', send it as is
        bookIdForRequest = selectedBook.id;
      } else {
        // Otherwise, try to convert it to a number
        bookIdForRequest =
          typeof selectedBook.id === "number"
            ? selectedBook.id
            : parseInt(String(selectedBook.id), 10);
      }

      console.log(
        "Book ID for request:",
        bookIdForRequest,
        "Type:",
        typeof bookIdForRequest
      );

      const requestBody = {
        bookId: bookIdForRequest,
        userID: data.userID,
      };

      console.log("Request body:", JSON.stringify(requestBody));

      const response = await fetch("/api/lending/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Check if this is a borrowing limit error
        if (errorData.errorCode === "BORROW_LIMIT_REACHED") {
          throw new Error(errorData.message || "Đã đạt giới hạn mượn sách.");
        }

        throw new Error(errorData.message || "Không thể mượn sách.");
      }

      toastId.update({
        id: toastId.id,
        title: "Thành công",
        description: "Mượn sách thành công.",
      });
      onSuccess(); // Trigger refresh on parent
      onOpenChange(false); // Close dialog
    } catch (error: any) {
      console.error("Lỗi khi mượn sách:", error);
      toastId.update({
        id: toastId.id,
        variant: "destructive",
        title: "Lỗi",
        description: error.message || "Không thể xử lý yêu cầu mượn sách.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mượn sách</DialogTitle>
          <DialogDescription>
            Tìm kiếm sách theo ID hoặc tên và nhập mã số bạn đọc để mượn sách.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="bookSearch">Tìm kiếm sách</Label>
            <div className="relative" ref={searchInputRef}>
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="bookSearch"
                type="text"
                placeholder="Nhập ID hoặc tên sách để tìm kiếm..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(e.target.value.trim() !== "");
                }}
                onFocus={() => {
                  if (searchTerm.trim() !== "") {
                    setIsDropdownOpen(true);
                  }
                }}
                className="pl-8"
                disabled={isLoadingBooks}
              />

              {/* Dropdown results */}
              {isDropdownOpen &&
                searchTerm.trim() !== "" &&
                !isLoadingBooks && (
                  <div className="absolute z-50 w-full mt-1 bg-popover rounded-md border shadow-md max-h-[300px] overflow-y-auto">
                    {filteredBooks.length === 0 ? (
                      <div className="p-2 text-sm text-center text-muted-foreground">
                        Không tìm thấy sách phù hợp.
                      </div>
                    ) : (
                      <div className="py-1">
                        {filteredBooks.map((book) => {
                          const availableQuantity =
                            (book.quantity || 0) - (book.borrowedCount || 0);
                          const isSelected = selectedBookId === String(book.id);

                          return (
                            <div
                              key={book.id}
                              className={cn(
                                "flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                                isSelected && "bg-primary/10"
                              )}
                              onClick={() => {
                                handleSelectBook(book);
                                setIsDropdownOpen(false);
                                setSearchTerm(`${book.id} - ${book.name}`);
                              }}
                            >
                              <div className="flex-1">
                                <div className="font-medium">
                                  {book.id} - {book.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {book.author} • Còn lại: {availableQuantity}
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>

          {isLoadingBooks ? (
            <div className="flex items-center justify-center h-10 rounded-md border border-input bg-background">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Hidden input to store the selected book ID */}
              <input type="hidden" {...register("bookId")} />

              {selectedBookId && (
                <div className="p-3 rounded-md bg-primary/10 border border-primary/20">
                  <p className="text-sm font-medium">
                    Sách đã chọn:{" "}
                    {
                      availableBooks.find(
                        (b) => String(b.id) === selectedBookId
                      )?.name
                    }
                  </p>
                </div>
              )}

              {errors.bookId && (
                <p className="text-sm text-destructive mt-1">
                  {errors.bookId.message}
                </p>
              )}
            </>
          )}

          <div>
            <Label htmlFor="userID">Mã số bạn đọc</Label>
            <Input
              id="userID"
              type="text"
              placeholder="Nhập mã số bạn đọc"
              {...register("userID")}
              className={errors.userID ? "border-destructive" : ""}
            />
            {errors.userID && (
              <p className="text-sm text-destructive mt-1">
                {errors.userID.message}
              </p>
            )}
          </div>

          <DialogFooter className="sm:justify-start pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingBooks || !selectedBookId}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Mượn sách
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Hủy
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
