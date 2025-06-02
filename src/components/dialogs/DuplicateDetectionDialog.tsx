"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppContext } from '@/hooks/useAppContext';
import { detectDuplicates, type DuplicateDetectionOutput } from '@/ai/flows/duplicate-detection';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CopyCheck, ListChecks } from 'lucide-react';

export function DuplicateDetectionDialog() {
  const {
    data,
    columns,
    activeDialog,
    closeDialog,
    showToast,
    isLoading,
    setIsLoading,
  } = useAppContext();
  const [selectedColumnsForDuplicates, setSelectedColumnsForDuplicates] = useState<string[]>([]);
  const [duplicatesResult, setDuplicatesResult] = useState<DuplicateDetectionOutput | null>(null);

  useEffect(() => {
    // Pre-select all columns by default when dialog opens or columns change
    if (activeDialog === 'duplicate') {
      setSelectedColumnsForDuplicates(columns);
    }
  }, [columns, activeDialog]);

  const handleToggleColumn = (columnName: string) => {
    setSelectedColumnsForDuplicates((prev) =>
      prev.includes(columnName)
        ? prev.filter((col) => col !== columnName)
        : [...prev, columnName]
    );
  };

  const handleDetectDuplicates = async () => {
    if (selectedColumnsForDuplicates.length === 0) {
      showToast({ title: 'Select Columns', description: 'Please select at least one column to check for duplicates.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setDuplicatesResult(null);
    try {
      // The AI flow expects `data` as an array of objects, which `appContext.data` already is.
      const result = await detectDuplicates({ data, columns: selectedColumnsForDuplicates });
      setDuplicatesResult(result);
      if (result.duplicates.length === 0) {
        showToast({ title: 'No Duplicates Found', description: 'No duplicate entries were found based on the selected columns.' });
      } else {
        showToast({ title: 'Duplicates Found', description: `${result.duplicates.length} set(s) of duplicates identified.` });
      }
    } catch (error) {
      console.error('Error detecting duplicates:', error);
      showToast({ title: 'Error', description: 'Failed to detect duplicates.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={activeDialog === 'duplicate'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center"><CopyCheck className="mr-2 h-5 w-5 text-primary"/>Duplicate Detection</DialogTitle>
          <DialogDescription>
            Select columns to check for duplicate entries. AI will use fuzzy matching.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div>
            <Label className="font-medium">Select columns to check:</Label>
            <ScrollArea className="h-40 mt-2 rounded-md border p-2">
              <div className="space-y-2">
                {columns.map((col) => (
                  <div key={col} className="flex items-center space-x-2">
                    <Checkbox
                      id={`col-${col}`}
                      checked={selectedColumnsForDuplicates.includes(col)}
                      onCheckedChange={() => handleToggleColumn(col)}
                      disabled={isLoading}
                    />
                    <Label htmlFor={`col-${col}`} className="text-sm font-normal">
                      {col}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <Button onClick={handleDetectDuplicates} disabled={isLoading || selectedColumnsForDuplicates.length === 0}>
            {isLoading ? 'Detecting...' : 'Detect Duplicates'}
          </Button>
        </div>

        {duplicatesResult && (
          <div className="mt-4">
            <Alert>
              <ListChecks className="h-4 w-4" />
              <AlertTitle className="font-headline">Detection Result</AlertTitle>
              {duplicatesResult.duplicates.length === 0 ? (
                <AlertDescription>No duplicates found based on the selected criteria.</AlertDescription>
              ) : (
                <AlertDescription>
                  Found {duplicatesResult.duplicates.length} set(s) of duplicate entries.
                  <ScrollArea className="h-32 mt-2">
                    <ul className="list-disc pl-5 text-sm">
                      {duplicatesResult.duplicates.map((group, index) => (
                        <li key={index}>Row indices: {group.join(', ')}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                  <p className="text-xs mt-2 text-muted-foreground">Consider reviewing these rows in your data table.</p>
                </AlertDescription>
              )}
            </Alert>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog} disabled={isLoading}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
