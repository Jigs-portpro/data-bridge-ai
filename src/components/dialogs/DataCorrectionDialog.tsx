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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppContext } from '@/hooks/useAppContext';
import { suggestDataCorrections, type SuggestDataCorrectionsOutput } from '@/ai/flows/data-correction-suggestions';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wand2 } from 'lucide-react';

export function DataCorrectionDialog() {
  const {
    data,
    columns,
    setData,
    activeDialog,
    closeDialog,
    showToast,
    isLoading,
    setIsLoading,
  } = useAppContext();
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [suggestions, setSuggestions] = useState<SuggestDataCorrectionsOutput | null>(null);

  useEffect(() => {
    if (columns.length > 0) {
      setSelectedColumn(columns[0]);
    }
  }, [columns, activeDialog]);

  const handleSuggestCorrections = async () => {
    if (!selectedColumn) {
      showToast({ title: 'Select a column', description: 'Please select a column to get suggestions.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setSuggestions(null);
    try {
      const columnData = data.map(row => String(row[selectedColumn] ?? ''));
      const result = await suggestDataCorrections({ columnName: selectedColumn, data: columnData });
      setSuggestions(result);
    } catch (error) {
      console.error('Error getting data correction suggestions:', error);
      showToast({ title: 'Error', description: 'Failed to get correction suggestions.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCorrections = () => {
    if (!suggestions || !selectedColumn) return;
    setIsLoading(true);
    try {
      const newData = data.map((row, index) => ({
        ...row,
        [selectedColumn]: suggestions.correctedData[index] ?? row[selectedColumn],
      }));
      setData(newData);
      showToast({ title: 'Corrections Applied', description: `Corrections applied to column "${selectedColumn}".` });
      setSuggestions(null); // Clear suggestions after applying
      // closeDialog(); // Optionally close dialog
    } catch (error) {
      console.error('Error applying corrections:', error);
      showToast({ title: 'Error', description: 'Failed to apply corrections.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={activeDialog === 'correction'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center"><Wand2 className="mr-2 h-5 w-5 text-primary" />Data Correction Suggestions</DialogTitle>
          <DialogDescription>
            Select a column to get AI-powered suggestions for casing, formatting, and other corrections.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="column-select" className="text-right">
              Column
            </Label>
            <Select value={selectedColumn} onValueChange={setSelectedColumn} disabled={isLoading}>
              <SelectTrigger id="column-select" className="col-span-3">
                <SelectValue placeholder="Select a column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSuggestCorrections} disabled={isLoading || !selectedColumn}>
            {isLoading ? 'Getting Suggestions...' : 'Get Suggestions'}
          </Button>
        </div>

        {suggestions && (
          <div className="mt-4 space-y-4">
            <Alert>
              <Wand2 className="h-4 w-4" />
              <AlertTitle className="font-headline">Correction Details</AlertTitle>
              <AlertDescription>
                <p className="font-medium">Explanation:</p>
                <p className="text-sm text-muted-foreground">{suggestions.explanation}</p>
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-4 max-h-60">
              <div>
                <Label>Original Data ({selectedColumn})</Label>
                <ScrollArea className="h-40 rounded-md border p-2 bg-muted/50">
                  {data.map(row => String(row[selectedColumn] ?? '')).map((val, idx) => (
                    <div key={`orig-${idx}`} className="text-sm truncate">{val}</div>
                  ))}
                </ScrollArea>
              </div>
              <div>
                <Label>Suggested Corrections</Label>
                <ScrollArea className="h-40 rounded-md border p-2 bg-accent/10">
                   {suggestions.correctedData.map((val, idx) => (
                    <div key={`sugg-${idx}`} className="text-sm truncate text-accent-foreground font-medium">{val}</div>
                  ))}
                </ScrollArea>
              </div>
            </div>
             <Button onClick={handleApplyCorrections} disabled={isLoading} className="w-full">
              Apply These Corrections
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
