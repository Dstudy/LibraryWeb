"use client";

import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
    setValue,
  } = useForm<BorrowBookFormData>({
    resolver: zodResolver(borrowBookSchema),
  });

  useEffect(() => {
    if (isOpen) {
      fetchAvailableBooks();
      reset({ bookId: "", userID: "" });
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

  const onSubmit = async (data: BorrowBookFormData) => {
    setIsSubmitting(true);
    const toastId = toast({ title: "Processing borrow request..." });
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
          title: "Error",
          description: "Please select a book",
        });
        throw new Error("Please select a book");
      }

      // Check if the book ID is "no-books" (the disabled option)
      if (data.bookId === "no-books") {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No books are available for borrowing",
        });
        throw new Error("No books are available for borrowing");
      }

      // Find the selected book in the available books
      const selectedBook = availableBooks.find(
        (book) => String(book.id) === data.bookId
      );
      console.log("Selected book:", selectedBook);

      if (!selectedBook) {
        console.error("Selected book not found in available books");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select a valid book from the list",
        });
        throw new Error("Book not found in available books");
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
        throw new Error(errorData.message || "Failed to borrow book.");
      }

      toastId.update({
        id: toastId.id,
        title: "Success",
        description: "Book borrowed successfully.",
      });
      onSuccess(); // Trigger refresh on parent
      onOpenChange(false); // Close dialog
    } catch (error: any) {
      console.error("Error borrowing book:", error);
      toastId.update({
        id: toastId.id,
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not process borrow request.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Borrow a Book</DialogTitle>
          <DialogDescription>
            Select a book and enter the reader's ID to lend a book.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="bookId">Book</Label>
            {isLoadingBooks ? (
              <div className="flex items-center justify-center h-10 rounded-md border border-input bg-background">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select
                onValueChange={(value) => {
                  console.log("Book selected:", value, "Type:", typeof value);
                  // Make sure we're setting a string value
                  setValue("bookId", String(value));
                }}
                // Don't use register with Select as it can cause issues
              >
                <SelectTrigger
                  id="bookId"
                  className={errors.bookId ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select a book" />
                </SelectTrigger>
                <SelectContent>
                  {availableBooks.length > 0 ? (
                    availableBooks.map((book) => (
                      <SelectItem key={book.id} value={String(book.id)}>
                        {book.name} (Available:{" "}
                        {(book.quantity || 0) - (book.borrowedCount || 0)})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-books" disabled>
                      No books available for borrowing
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
            {errors.bookId && (
              <p className="text-sm text-destructive mt-1">
                {errors.bookId.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="userID">Reader ID</Label>
            <Input
              id="userID"
              type="text"
              placeholder="Enter reader ID"
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
              disabled={isSubmitting || isLoadingBooks}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Borrow Book
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
