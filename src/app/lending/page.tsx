"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { LendingRecord } from "@/lib/types";
import { LendingActivityTable } from "@/components/lending-activity-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, ArrowRightLeft, Search as SearchIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BorrowBookDialog } from "@/components/borrow-book-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LendingPage() {
  const [lendingRecords, setLendingRecords] = useState<LendingRecord[]>([]);
  const [isBorrowDialogOpen, setIsBorrowDialogOpen] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
      console.error("Lỗi khi tải dữ liệu mượn trả:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể tải dữ liệu mượn trả từ máy chủ.",
      });
    } finally {
      setIsDataLoading(false);
    }
  }, [toast, isAuthenticated, currentUser]);

  // Helper functions for record status determination
  const isRecordOverdue = useCallback((record: LendingRecord) => {
    // If the record has been returned, it's not overdue
    if (record.returnDate) return false;

    try {
      // Parse the due date
      const dueDate = new Date(record.dueDate);

      // Check if the date is valid
      if (isNaN(dueDate.getTime())) return false;

      // Compare with current date
      const now = new Date();
      return dueDate < now;
    } catch (error) {
      console.error("Lỗi khi kiểm tra sách quá hạn:", error);
      return false;
    }
  }, []);

  const isRecordActive = useCallback((record: LendingRecord) => {
    // If the record has been returned, it's not active
    if (record.returnDate) return false;

    try {
      // Parse the due date
      const dueDate = new Date(record.dueDate);

      // Check if the date is valid
      if (isNaN(dueDate.getTime())) return false;

      // Compare with current date - if due date is in the future, it's active
      const now = new Date();
      return dueDate >= now;
    } catch (error) {
      console.error("Lỗi khi kiểm tra sách đang mượn:", error);
      return false;
    }
  }, []);

  const isRecordReturned = useCallback((record: LendingRecord) => {
    return !!record.returnDate;
  }, []);

  // Filter records based on search term and status filter
  const filteredRecords = useMemo(() => {
    return lendingRecords.filter((record) => {
      // Apply search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        record.bookId.toString().toLowerCase().includes(searchLower) ||
        record.bookName.toLowerCase().includes(searchLower) ||
        record.readerId.toLowerCase().includes(searchLower) ||
        (record.readerName &&
          record.readerName.toLowerCase().includes(searchLower));

      // Apply status filter
      let matchesStatus = true;
      if (statusFilter === "borrowed") {
        // For "borrowed" status, we want books that are borrowed but not overdue
        matchesStatus = isRecordActive(record);
      } else if (statusFilter === "overdue") {
        // For "overdue" status, it must be overdue
        matchesStatus = isRecordOverdue(record);
      } else if (statusFilter === "returned") {
        // For "returned" status, it must have a return date
        matchesStatus = isRecordReturned(record);
      }

      return matchesSearch && matchesStatus;
    });
  }, [
    lendingRecords,
    searchTerm,
    statusFilter,
    isRecordActive,
    isRecordOverdue,
    isRecordReturned,
  ]);

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
        <p className="text-muted-foreground">Đang tải...</p>
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
            ? "Quản lý mượn trả"
            : "Lịch sử mượn sách"}
        </h1>
      </header>

      <Card className="shadow-xl w-full">
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* <CardTitle className="text-2xl flex items-center">
                <ArrowRightLeft className="mr-3 h-7 w-7 text-accent" />
                {currentUser?.role === "librarian"
                  ? "Hoạt động mượn trả"
                  : "Lịch sử mượn sách của tôi"}
              </CardTitle> */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                <div className="relative w-full sm:w-64">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Tìm kiếm theo tên bạn đọc, mã số hoặc tên sách..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                    aria-label="Tìm kiếm lịch sử mượn trả"
                  />
                </div>

                <Tabs
                  defaultValue="all"
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  className="w-full sm:w-auto"
                >
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="all">
                      Tất cả
                      {lendingRecords.length > 0 && (
                        <span className="ml-1 text-xs bg-primary/20 rounded-full px-2 py-0.5">
                          {lendingRecords.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="borrowed">
                      Đang mượn
                      {(() => {
                        // Count active records using the same function as the filter
                        const activeCount =
                          lendingRecords.filter(isRecordActive).length;

                        return activeCount > 0 ? (
                          <span className="ml-1 text-xs bg-primary/20 rounded-full px-2 py-0.5">
                            {activeCount}
                          </span>
                        ) : null;
                      })()}
                    </TabsTrigger>
                    <TabsTrigger value="overdue">
                      Quá hạn
                      {(() => {
                        // Count overdue records using the same function as the filter
                        const overdueCount =
                          lendingRecords.filter(isRecordOverdue).length;

                        return overdueCount > 0 ? (
                          <span className="ml-1 text-xs bg-destructive/20 rounded-full px-2 py-0.5 text-destructive">
                            {overdueCount}
                          </span>
                        ) : null;
                      })()}
                    </TabsTrigger>
                    <TabsTrigger value="returned">
                      Đã trả
                      {(() => {
                        // Count returned records using the same function as the filter
                        const returnedCount =
                          lendingRecords.filter(isRecordReturned).length;

                        return returnedCount > 0 ? (
                          <span className="ml-1 text-xs bg-primary/20 rounded-full px-2 py-0.5">
                            {returnedCount}
                          </span>
                        ) : null;
                      })()}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {currentUser?.role === "librarian" && (
                <Button
                  onClick={() => setIsBorrowDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <PlusCircle className="mr-2 h-5 w-5" /> Mượn sách
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isDataLoading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-muted-foreground">
                {currentUser?.role === "librarian"
                  ? "Đang tải dữ liệu mượn trả..."
                  : "Đang tải lịch sử mượn sách của bạn..."}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                {searchTerm && (
                  <span>
                    Kết quả tìm kiếm cho <strong>"{searchTerm}"</strong>:{" "}
                  </span>
                )}
                <span>
                  Hiển thị <strong>{filteredRecords.length}</strong> trong số{" "}
                  <strong>{lendingRecords.length}</strong> bản ghi
                  {statusFilter !== "all" && (
                    <span>
                      {" "}
                      (lọc theo{" "}
                      <strong>
                        {statusFilter === "borrowed"
                          ? "đang mượn"
                          : statusFilter === "overdue"
                          ? "quá hạn"
                          : statusFilter === "returned"
                          ? "đã trả"
                          : statusFilter}
                      </strong>
                      )
                    </span>
                  )}
                </span>
              </div>
              <LendingActivityTable
                key={`lending-table-${statusFilter}`}
                records={filteredRecords}
                onRecordUpdate={fetchData}
                userRole={currentUser?.role}
              />
            </>
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
