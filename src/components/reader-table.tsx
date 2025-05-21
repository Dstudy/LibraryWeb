"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, UserRound } from "lucide-react";
import { Reader } from "@/app/api/readers/route";
import { formatDate } from "@/lib/utils";

interface ReaderTableProps {
  readers: Reader[];
  onEdit: (reader: Reader) => void;
  onDelete: (readerId: string) => void;
  userRole: string | undefined;
}

export function ReaderTable({
  readers,
  onEdit,
  onDelete,
  userRole,
}: ReaderTableProps) {
  const isLibrarian = userRole === "librarian";

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Date of Birth</TableHead>
            <TableHead>Gender</TableHead>
            {isLibrarian && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {readers.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={isLibrarian ? 7 : 6}
                className="h-24 text-center"
              >
                No readers found.
              </TableCell>
            </TableRow>
          ) : (
            readers.map((reader) => (
              <TableRow key={reader.id}>
                <TableCell className="font-medium">{reader.id}</TableCell>
                <TableCell>{reader.name}</TableCell>
                <TableCell>{reader.phone || "-"}</TableCell>
                <TableCell>{reader.address || "-"}</TableCell>
                <TableCell>
                  {reader.dateOfBirth ? formatDate(new Date(reader.dateOfBirth)) : "-"}
                </TableCell>
                <TableCell>{reader.gender || "-"}</TableCell>
                {isLibrarian && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(reader)}
                      title="Edit reader"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(reader.id)}
                      title="Delete reader"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
