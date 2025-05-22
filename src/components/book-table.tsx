"use client";

import type { Book, SortConfig, SortableBookFields } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  ArrowDown,
  FilePenLine,
  Trash2,
  ChevronsUpDown,
} from "lucide-react";
import { format } from "date-fns";
import React from "react";
import { cn } from "@/lib/utils";

interface BookTableProps {
  books: Book[];
  onEdit: (book: Book) => void;
  onDelete: (bookId: number) => void;
  sortConfig: SortConfig;
  requestSort: (key: SortableBookFields) => void;
  userRole?: "librarian" | "reader";
}

const columnHeadersBase: {
  key: SortableBookFields;
  label: string;
  className?: string;
}[] = [
  // Include ID column
  { key: "id", label: "ID", className: "whitespace-nowrap min-w-[4rem]" },
  { key: "name", label: "Tên", className: "min-w-[12rem]" },
  { key: "type", label: "Thể loại", className: "min-w-[8rem]" },
  { key: "author", label: "Tác giả", className: "min-w-[10rem]" },
  { key: "publisher", label: "Nhà XB", className: "min-w-[10rem]" },
  {
    key: "publishYear",
    label: "Year",
    className: "text-right whitespace-nowrap min-w-[4rem]",
  },
  {
    key: "importDate",
    label: "Ngày nhập",
    className: "whitespace-nowrap min-w-[8rem]",
  },
];

export function BookTable({
  books,
  onEdit,
  onDelete,
  sortConfig,
  requestSort,
  userRole,
}: BookTableProps) {
  const getSortIcon = (key: SortableBookFields) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === "ascending" ? (
      <ArrowUp className="ml-2 h-4 w-4 text-accent" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4 text-accent" />
    );
  };

  const columnHeaders = [
    ...columnHeadersBase,
    {
      key: "quantity",
      label: "Tổng SL",
      className: "text-right whitespace-nowrap min-w-[5rem]",
    },
    {
      key: "borrowedCount",
      label: "SL đã mượn",
      className: "text-right whitespace-nowrap min-w-[5rem]",
    },
    // Available quantity is derived, not directly sortable from a single field in this setup.
    // Sorting by it would require client-side calculation before sort or backend support.
    // For now, we'll display it without making it a primary sort key through `requestSort`.
    // { key: 'availableQuantity', label: 'Available', className: "text-right whitespace-nowrap min-w-[5rem]" },
  ];

  return (
    <div className="rounded-lg border shadow-sm overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {columnHeaders.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  "cursor-pointer hover:bg-muted transition-colors",
                  column.className
                )}
                onClick={() => requestSort(column.key)}
              >
                <div className="flex items-center">
                  {column.label}
                  {getSortIcon(column.key)}
                </div>
              </TableHead>
            ))}
            <TableHead className="text-right whitespace-nowrap min-w-[5rem]">
              SL còn
            </TableHead>
            {userRole === "librarian" && (
              <TableHead className="text-right min-w-[7.5rem] whitespace-nowrap"></TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {books.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={
                  userRole === "librarian"
                    ? columnHeaders.length + 2
                    : columnHeaders.length + 1
                }
                className="h-24 text-center text-muted-foreground"
              >
                No books found.
              </TableCell>
            </TableRow>
          ) : (
            books.map((book) => {
              const availableQuantity =
                (book.quantity || 0) - (book.borrowedCount || 0);
              return (
                <TableRow
                  key={book.id}
                  className="hover:bg-accent/10 transition-colors"
                >
                  <TableCell className="font-medium whitespace-nowrap">
                    {book.id}
                  </TableCell>
                  <TableCell>{book.name}</TableCell>
                  <TableCell>{book.type}</TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>{book.publisher}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {book.publishYear}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(book.importDate), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {book.quantity}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {book.borrowedCount || 0}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap font-semibold">
                    {availableQuantity}
                  </TableCell>
                  {userRole === "librarian" ? (
                    <TableCell className="text-right whitespace-nowrap space-x-1 md:space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(book)}
                        aria-label="Edit book"
                      >
                        <FilePenLine className="h-5 w-5 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(book.id!)}
                        aria-label="Delete book"
                      >
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </Button>
                    </TableCell>
                  ) : // For readers, this cell is not needed if actions column is the last one.
                  // If 'Available' is last, then an empty cell might not be needed if colspan is handled.
                  // Adjusted colSpan above for no books found.
                  null}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
