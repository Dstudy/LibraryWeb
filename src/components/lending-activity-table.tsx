"use client";

import type { LendingRecord } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, isPast } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw } from "lucide-react";
import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface LendingActivityTableProps {
  records: LendingRecord[];
  onRecordUpdate: () => void; // Callback to refresh data after an update
  userRole?: "librarian" | "reader";
}

export function LendingActivityTable({
  records,
  onRecordUpdate,
  userRole,
}: LendingActivityTableProps) {
  const { toast } = useToast();
  const [processingRecordId, setProcessingRecordId] = useState<number | null>(
    null
  );

  const handleReturnBook = async (recordId: number) => {
    if (userRole !== "librarian") return;
    setProcessingRecordId(recordId);
    const toastId = toast({ title: "Processing return..." });
    try {
      const response = await fetch(`/api/lending/records/${recordId}/return`, {
        method: "PUT",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to return book.");
      }

      toastId.update({
        id: toastId.id,
        title: "Success",
        description: "Book marked as returned.",
      });
      onRecordUpdate(); // Refresh records
    } catch (error: any) {
      console.error("Error returning book:", error);
      toastId.update({
        id: toastId.id,
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not process return.",
      });
    } finally {
      setProcessingRecordId(null);
    }
  };

  // Helper functions for determining record status
  const isRecordReturned = (record: LendingRecord): boolean => {
    return !!record.returnDate;
  };

  const isRecordOverdue = (record: LendingRecord): boolean => {
    // If the record has been returned, it's not overdue
    if (isRecordReturned(record)) return false;

    try {
      // Parse the due date
      const dueDate = new Date(record.dueDate);

      // Check if the date is valid
      if (isNaN(dueDate.getTime())) return false;

      // Compare with current date
      const now = new Date();
      return dueDate < now;
    } catch (error) {
      console.error("Error checking if record is overdue:", error);
      return false;
    }
  };

  const isRecordActive = (record: LendingRecord): boolean => {
    // If the record has been returned, it's not active
    if (isRecordReturned(record)) return false;

    // If it's not overdue, it's active
    return !isRecordOverdue(record);
  };

  const getStatusBadge = (record: LendingRecord) => {
    if (isRecordReturned(record)) {
      return <Badge variant="secondary">Returned</Badge>;
    } else if (isRecordOverdue(record)) {
      return <Badge variant="destructive">Overdue</Badge>;
    } else {
      return (
        <Badge
          variant="default"
          style={{ backgroundColor: "#033b93" }}
          className="hover:bg-primary/90"
        >
          Active
        </Badge>
      );
    }
  };

  return (
    <div className="rounded-lg border shadow-sm overflow-x-auto w-full">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="min-w-[10rem]">Tên sách</TableHead>
            <TableHead className="min-w-[12rem]">Tên bạn đọc</TableHead>
            <TableHead className="min-w-[8rem] whitespace-nowrap">
              Ngày mượn
            </TableHead>
            <TableHead className="min-w-[8rem] whitespace-nowrap">
              Ngày hạn
            </TableHead>
            <TableHead className="min-w-[8rem] whitespace-nowrap">
              Ngày trả
            </TableHead>
            <TableHead className="min-w-[6rem]">Status</TableHead>
            {userRole === "librarian" && (
              <TableHead className="text-right min-w-[8rem]"></TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={userRole === "librarian" ? 7 : 6}
                className="h-24 text-center text-muted-foreground"
              >
                Chưa có lượt mượn nào.
              </TableCell>
            </TableRow>
          ) : (
            records.map((record) => (
              <TableRow
                key={record.id}
                className="hover:bg-accent/10 transition-colors"
              >
                <TableCell>{record.bookName}</TableCell>
                <TableCell>{record.readerName || record.readerId}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(record.borrowDate), "MMM dd, yyyy")}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(record.dueDate), "MMM dd, yyyy")}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {record.returnDate
                    ? format(new Date(record.returnDate), "MMM dd, yyyy")
                    : "N/A"}
                </TableCell>
                <TableCell>{getStatusBadge(record)}</TableCell>
                {userRole === "librarian" && (
                  <TableCell className="text-right whitespace-nowrap">
                    {!record.returnDate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReturnBook(record.id)}
                        disabled={processingRecordId === record.id}
                      >
                        {processingRecordId === record.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-2 h-4 w-4" />
                        )}
                        Return Book
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
