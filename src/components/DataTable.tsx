"use client";

import { useAppContext } from '@/hooks/useAppContext';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

export function DataTable() {
  const { data, columns, isLoading, fileName } = useAppContext();

  if (isLoading && data.length === 0) {
    return (
      <div className="space-y-4 p-4 border rounded-lg shadow-sm bg-card">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-lg shadow-sm bg-card text-center p-6">
        <p className="text-lg font-medium text-muted-foreground">No data to display.</p>
        <p className="text-sm text-muted-foreground">Upload a CSV file to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      {fileName && <h2 className="text-xl font-semibold font-headline">Preview: {fileName}</h2>}
      <ScrollArea className="rounded-md border shadow-sm w-full whitespace-nowrap bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col} className="font-semibold whitespace-nowrap">{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((col) => (
                  <TableCell key={`${rowIndex}-${col}`}>{String(row[col] ?? '')}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
