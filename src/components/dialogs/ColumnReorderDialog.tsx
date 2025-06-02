"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/hooks/useAppContext';
import { intelligentColumnReordering, type IntelligentColumnReorderingOutput } from '@/ai/flows/intelligent-column-reordering';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shuffle, CheckCircle } from 'lucide-react';

export function ColumnReorderDialog() {
  const {
    data,
    columns,
    setColumns, // We need to update columns in context
    setData, // And re-map data if necessary to reflect new column order
    activeDialog,
    closeDialog,
    showToast,
    isLoading,
    setIsLoading,
  } = useAppContext();
  const [reorderResult, setReorderResult] = useState<IntelligentColumnReorderingOutput | null>(null);

  const handleReorderColumns = async () => {
    setIsLoading(true);
    setReorderResult(null);
    try {
      // Use a sample of data for the AI, e.g., first 5 rows or up to 1000 cells
      const sampleData = data.slice(0, 5); 
      const result = await intelligentColumnReordering({ columnNames: columns, sampleData });
      setReorderResult(result);
    } catch (error) {
      console.error('Error reordering columns:', error);
      showToast({ title: 'Error', description: 'Failed to reorder columns.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const applyReordering = () => {
    if (!reorderResult) return;
    setIsLoading(true);
    try {
      const newColumns = reorderResult.reorderedColumnNames;
      // Update columns in context
      setColumns(newColumns);

      // Re-map data to ensure it aligns with the new column order if needed.
      // However, if DataTable component simply iterates over `columns` from context
      // to pick properties from `data` objects, re-mapping `data` objects might not be strictly necessary
      // as long as the `data` objects still contain all original keys.
      // For safety and explicitness, one might re-create data objects:
      // const reorderedData = data.map(row => {
      //   const newRow: Record<string, any> = {};
      //   newColumns.forEach(col => newRow[col] = row[col]);
      //   return newRow;
      // });
      // setData(reorderedData); 
      // For now, assuming DataTable is flexible enough, just updating columns.
      // If issues arise, uncomment and test data re-mapping.

      showToast({ title: 'Columns Reordered', description: 'Columns have been intelligently reordered.' });
      // closeDialog(); // Optionally close
    } catch (error) {
        console.error('Error applying column reorder:', error);
        showToast({ title: 'Apply Error', description: 'Failed to apply new column order.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };


  return (
    <Dialog open={activeDialog === 'reorder'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center"><Shuffle className="mr-2 h-5 w-5 text-primary"/>Intelligent Column Reordering</DialogTitle>
          <DialogDescription>
            Let AI analyze your column titles and content to suggest a more logical sequence.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {!reorderResult && (
            <Button onClick={handleReorderColumns} disabled={isLoading} className="w-full">
              {isLoading ? 'Analyzing...' : 'Suggest Column Order'}
            </Button>
          )}
        </div>

        {reorderResult && (
          <div className="space-y-4">
            <Alert>
              <Shuffle className="h-4 w-4" />
              <AlertTitle className="font-headline">Suggested Order & Reasoning</AlertTitle>
              <AlertDescription>
                <p className="font-medium">New Order:</p>
                <p className="text-sm text-muted-foreground">{reorderResult.reorderedColumnNames.join(', ')}</p>
                <p className="font-medium mt-2">Reasoning:</p>
                <p className="text-sm text-muted-foreground">{reorderResult.reasoning}</p>
              </AlertDescription>
            </Alert>
            <Button onClick={applyReordering} disabled={isLoading} className="w-full">
              <CheckCircle className="mr-2 h-4 w-4" /> Apply This Order
            </Button>
             <Button onClick={handleReorderColumns} disabled={isLoading} variant="outline" className="w-full">
              Re-analyze
            </Button>
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
