"use client";

import * as React from "react"; // Added React import
import type { Book } from "@/lib/types";
import { bookSchema } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Label component is not directly used here, FormLabel is used instead.
// import { Label } from '@/components/ui/label';
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { z } from "zod";

interface BookFormProps {
  onSubmit: (data: Omit<Book, "id">) => void; // id is handled by the backend
  initialData?: Book | null;
  onCancel: () => void;
}

// Create a schema variant for the form that doesn't require ID
const bookFormSchema = bookSchema.omit({ id: true });
type BookFormData = z.infer<typeof bookFormSchema>;

export function BookForm({ onSubmit, initialData, onCancel }: BookFormProps) {
  const form = useForm<BookFormData>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: initialData
      ? {
          type: initialData.type,
          name: initialData.name,
          quantity: initialData.quantity,
          author: initialData.author,
          publisher: initialData.publisher,
          publishYear: initialData.publishYear,
          importDate: new Date(initialData.importDate), // Ensure it's a Date object
        }
      : {
          type: "",
          name: "",
          quantity: 0,
          author: "",
          publisher: "",
          publishYear: new Date().getFullYear(),
          importDate: new Date(),
        },
  });

  // useEffect to reset form when initialData changes (e.g. closing and reopening for a new book)
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        type: initialData.type,
        name: initialData.name,
        quantity: initialData.quantity,
        author: initialData.author,
        publisher: initialData.publisher,
        publishYear: initialData.publishYear,
        importDate: new Date(initialData.importDate),
      });
    } else {
      form.reset({
        type: "",
        name: "",
        quantity: 0,
        author: "",
        publisher: "",
        publishYear: new Date().getFullYear(),
        importDate: new Date(),
      });
    }
  }, [initialData, form]);

  const handleSubmit = (values: BookFormData) => {
    onSubmit(values);
    // Form reset is handled by the parent component after successful submission or by useEffect
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6 p-1"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Book Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Fiction, Science" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    {...field}
                    onChange={(event) => field.onChange(+event.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="publishYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Publish Year</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="YYYY"
                    {...field}
                    onChange={(event) => field.onChange(+event.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="author"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Author</FormLabel>
              <FormControl>
                <Input placeholder="Author Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="publisher"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Publisher</FormLabel>
              <FormControl>
                <Input placeholder="Publisher Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="importDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Import Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(new Date(field.value), "PPP") // Ensure field.value is treated as Date
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined} // Ensure selected is a Date object
                    onSelect={(date) => field.onChange(date || new Date())}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90">
            {initialData ? "Cập nhật" : "Thêm sách"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
