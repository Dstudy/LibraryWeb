"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ReaderTable } from "@/components/reader-table";
import { ReaderForm } from "@/components/reader-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search as SearchIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { useAuth } from "@/contexts/auth";
import { useRouter } from "next/navigation";
import type { Reader } from "@/app/api/readers/route";

export default function ReadersPage() {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReader, setEditingReader] = useState<Reader | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [readerToDeleteId, setReaderToDeleteId] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authIsLoading, currentUser } = useAuth();
  const router = useRouter();

  // Fetch readers data
  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsDataLoading(true);
      const response = await fetch("/api/readers");

      if (response.ok) {
        const data = await response.json();
        setReaders(data);
      } else {
        console.error("Failed to fetch readers:", response.statusText);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch readers. Please try again.",
        });
        setReaders([]);
      }
    } catch (error) {
      console.error("Error fetching readers:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while fetching readers.",
      });
      setReaders([]);
    } finally {
      setIsDataLoading(false);
    }
  }, [isAuthenticated, toast]);

  // Load data on component mount and check permissions
  useEffect(() => {
    if (authIsLoading) return;

    if (!isAuthenticated) {
      router.push("/login");
    } else if (currentUser?.role !== "librarian") {
      // Redirect non-librarian users to the home page
      toast({
        variant: "destructive",
        title: "Không có quyền truy cập",
        description: "Bạn không có quyền truy cập trang quản lý bạn đọc.",
      });
      router.push("/");
    } else {
      fetchData();
    }
  }, [
    isAuthenticated,
    authIsLoading,
    router,
    fetchData,
    currentUser?.role,
    toast,
  ]);

  // Filter readers based on search term
  const filteredReaders = readers.filter((reader) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      reader.id.toLowerCase().includes(searchLower) ||
      reader.name.toLowerCase().includes(searchLower) ||
      (reader.phone && reader.phone.toLowerCase().includes(searchLower)) ||
      (reader.address && reader.address.toLowerCase().includes(searchLower))
    );
  });

  // Handle adding a new reader
  const handleAddReader = () => {
    if (currentUser?.role !== "librarian") {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "You do not have permission to add readers.",
      });
      return;
    }
    setEditingReader(null);
    setIsFormOpen(true);
  };

  // Handle editing a reader
  const handleEditReader = (reader: Reader) => {
    if (currentUser?.role !== "librarian") {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "You do not have permission to edit readers.",
      });
      return;
    }
    setEditingReader(reader);
    setIsFormOpen(true);
  };

  // Handle deleting a reader
  const handleDeleteReader = (readerId: string) => {
    if (currentUser?.role !== "librarian") {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "You do not have permission to delete readers.",
      });
      return;
    }
    setReaderToDeleteId(readerId);
    setIsDeleteDialogOpen(true);
  };

  // Handle form submission (add/edit)
  const handleFormSubmit = async (formData: any) => {
    try {
      const method = editingReader ? "PUT" : "POST";
      const response = await fetch("/api/readers", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsFormOpen(false);
        fetchData();
        toast({
          title: `Reader ${editingReader ? "Updated" : "Added"}`,
          description: `Reader has been successfully ${
            editingReader ? "updated" : "added"
          }.`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save reader");
      }
    } catch (error: any) {
      console.error("Error saving reader:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message || "Failed to save reader. Please try again.",
      });
    }
  };

  // Handle reader deletion confirmation
  const handleDeleteConfirm = async () => {
    if (!readerToDeleteId) return;

    try {
      const response = await fetch(`/api/readers?id=${readerToDeleteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setIsDeleteDialogOpen(false);
        fetchData();
        toast({
          title: "Reader Deleted",
          description: "Reader has been successfully deleted.",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete reader");
      }
    } catch (error: any) {
      console.error("Error deleting reader:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message || "Failed to delete reader. Please try again.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary">
          Quản lý bạn đọc
        </h1>
      </header>

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="mt-4">
              <div className="relative w-full sm:w-64">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Tìm kiếm bạn đọc..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                  aria-label="Search readers"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              {currentUser?.role === "librarian" && (
                <Button
                  onClick={handleAddReader}
                  className="bg-primary hover:bg-primary/90"
                >
                  <PlusCircle className="mr-2 h-5 w-5" /> Thêm bạn đọc
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isDataLoading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-muted-foreground">Loading readers...</p>
            </div>
          ) : (
            <ReaderTable
              readers={filteredReaders}
              onEdit={handleEditReader}
              onDelete={handleDeleteReader}
              userRole={currentUser?.role}
            />
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Reader Dialog */}
      {isFormOpen && (
        <Dialog
          open={isFormOpen}
          onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingReader(null);
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl text-primary">
                {editingReader ? "Edit Reader" : "Add New Reader"}
              </DialogTitle>
              <DialogDescription>
                {editingReader
                  ? "Update the reader's information."
                  : "Fill in the details to add a new reader."}
              </DialogDescription>
            </DialogHeader>
            <ReaderForm
              initialData={editingReader}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingReader(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>Chắc chưa?.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
