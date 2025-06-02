
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
import { exportEntities, type ExportEntity } from '@/config/exportEntities';
import { Send } from 'lucide-react';

export function ExportDataDialog() {
  const {
    data,
    activeDialog,
    closeDialog,
    showToast,
    isLoading,
    setIsLoading,
  } = useAppContext();
  const [selectedEntityUrl, setSelectedEntityUrl] = useState<string>('');

  useEffect(() => {
    if (exportEntities.length > 0 && activeDialog === 'export') {
      setSelectedEntityUrl(exportEntities[0].url); // Default to the first entity
    }
  }, [activeDialog]);

  const handleExportData = async () => {
    if (!selectedEntityUrl) {
      showToast({ title: 'Select Entity', description: 'Please select an entity to export to.', variant: 'destructive' });
      return;
    }
    if (data.length === 0) {
      showToast({ title: 'No Data', description: 'There is no data to export.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(selectedEntityUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to export data: ${response.status} ${response.statusText}. Server response: ${errorData}`);
      }

      showToast({ title: 'Export Successful', description: `Data successfully sent to ${selectedEntityUrl}.` });
      // closeDialog(); // Optionally close dialog on success
    } catch (error: any) {
      console.error('Error exporting data:', error);
      showToast({ title: 'Export Error', description: error.message || 'An unknown error occurred during export.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={activeDialog === 'export'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center"><Send className="mr-2 h-5 w-5 text-primary"/>Export Data</DialogTitle>
          <DialogDescription>
            Select an entity to export the current table data to. The data will be sent as JSON.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="entity-select" className="text-right">
              Entity
            </Label>
            <Select
              value={selectedEntityUrl}
              onValueChange={setSelectedEntityUrl}
              disabled={isLoading}
            >
              <SelectTrigger id="entity-select" className="col-span-3">
                <SelectValue placeholder="Select an entity" />
              </SelectTrigger>
              <SelectContent>
                {exportEntities.map((entity) => (
                  <SelectItem key={entity.url} value={entity.url}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleExportData} disabled={isLoading || !selectedEntityUrl || data.length === 0}>
            {isLoading ? 'Exporting...' : 'Export to Selected Entity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
