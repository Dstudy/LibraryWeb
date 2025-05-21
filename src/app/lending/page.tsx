"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { LendingRecord } from "@/lib/types";
import { LendingActivityTable } from "@/components/lending-activity-table";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BorrowBookDialog } from "@/components/borrow-book-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";
import { useRouter } from "next/navigation";

export default function LendingPage() {
  const [lendingRecords, setLendingRecords] = useState<LendingRecord[]>([]);
  const [isBorrowDialogOpen, setIsBorrowDialogOpen] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { toast } = useToast();
  const { isAuthenticated, authIsLoading, currentUser } = useAuth();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !currentUser) return;

    setIsDataLoading(true);
    try {
      let recordsPromise;

      if (currentUser.role === "librarian") {
        recordsPromise = fetch("/api/lending/records");
      } else if (currentUser.role === "reader") {
        recordsPromise = fetch(
          `/api/lending/records?readerId=${encodeURIComponent(currentUser.id)}`
        );
      } else {
        // If not a librarian or reader, don't fetch records
        setLendingRecords([]);
        setIsDataLoading(false);
        return;
      }

      const recordsResponse = await recordsPromise;

      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        // Convert string dates to Date objects for proper handling
        const recordsWithDateObjects = recordsData.map((record: any) => ({
          ...record,
          borrowDate: new Date(record.borrowDate),
          dueDate: new Date(record.dueDate),
          returnDate: record.returnDate ? new Date(record.returnDate) : null,
        }));
        setLendingRecords(recordsWithDateObjects);
      } else {
        setLendingRecords([]);
      }
    } catch (error) {
      console.error("Error fetching lending records:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch lending records from the server.",
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

  if (authIsLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated && !authIsLoading) {
    return null;
  }

  return (
    <div className="space-y-8 w-full py-8 max-w-full">
      <header className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary">
          {currentUser?.role === "librarian"
            ? "Lending Management"
            : "My Borrowing History"}
        </h1>
        <p className="text-muted-foreground">
          {currentUser?.role === "librarian"
            ? "Manage book lending activities"
            : "View your current and past borrowings"}
        </p>
      </header>

      <Card className="shadow-xl w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center">
              <ArrowRightLeft className="mr-3 h-7 w-7 text-accent" />
              {currentUser?.role === "librarian"
                ? "Lending Activity"
                : "My Borrowing History"}
            </CardTitle>
            {currentUser?.role === "librarian" && (
              <Button
                onClick={() => setIsBorrowDialogOpen(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <PlusCircle className="mr-2 h-5 w-5" /> Borrow Book
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isDataLoading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-muted-foreground">
                {currentUser?.role === "librarian"
                  ? "Loading lending records..."
                  : "Loading your borrowing history..."}
              </p>
            </div>
          ) : (
            <LendingActivityTable
              records={lendingRecords}
              onRecordUpdate={fetchData}
              userRole={currentUser?.role}
            />
          )}
        </CardContent>
      </Card>

      {currentUser?.role === "librarian" && (
        <BorrowBookDialog
          isOpen={isBorrowDialogOpen}
          onOpenChange={setIsBorrowDialogOpen}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
