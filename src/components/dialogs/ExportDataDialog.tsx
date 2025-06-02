
"use client";

import { useState, useEffect, useCallback } from 'react';
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
import { exportEntities, type ExportEntity, type ExportEntityField } from '@/config/exportEntities';
import { Send, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export function ExportDataDialog() {
  const {
    data: appData, // Renamed to avoid conflict with local data variable
    activeDialog,
    closeDialog,
    showToast,
    isLoading,
    setIsLoading,
    columns: appColumns, // Get columns from context
  } = useAppContext();
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [validationMessages, setValidationMessages] = useState<string[]>([]);

  useEffect(() => {
    if (exportEntities.length > 0 && activeDialog === 'export') {
      setSelectedEntityId(exportEntities[0].id); // Default to the first entity's ID
      setValidationMessages([]); // Clear previous messages
    }
  }, [activeDialog]);

  const validateRow = useCallback((row: Record<string, any>, rowIndex: number, entityFields: ExportEntityField[]): string[] => {
    const errors: string[] = [];
    entityFields.forEach(field => {
      const value = row[field.name]; // Value from the uploaded data using the field name in config

      // Required check
      if (field.required && (value === undefined || value === null || String(value).trim() === '')) {
        errors.push(`Row ${rowIndex + 1}, Field "${field.name}": is required.`);
      }

      // Type check (only if value exists and type is specified)
      if (value !== undefined && value !== null && String(value).trim() !== '' && field.type) {
        switch (field.type) {
          case 'string':
            if (typeof value !== 'string') {
              // errors.push(`Row ${rowIndex + 1}, Field "${field.name}": should be a string (found ${typeof value}).`);
              // Forgiving with types from CSV/Excel, actual string content check is more useful (e.g. length)
            }
            break;
          case 'number':
            if (isNaN(Number(value))) {
              errors.push(`Row ${rowIndex + 1}, Field "${field.name}": should be a number (found "${value}").`);
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean' && String(value).toLowerCase() !== 'true' && String(value).toLowerCase() !== 'false') {
              errors.push(`Row ${rowIndex + 1}, Field "${field.name}": should be a boolean (true/false).`);
            }
            break;
          case 'email':
            if (typeof value !== 'string' || !isValidEmail(String(value))) {
              errors.push(`Row ${rowIndex + 1}, Field "${field.name}": is not a valid email address.`);
            }
            break;
        }
      }
      // Add more specific validation rules here (minLength, pattern, etc.) if implemented in ExportEntityField
    });
    return errors;
  }, []);


  const handleExportData = async () => {
    if (!selectedEntityId) {
      showToast({ title: 'Select Entity', description: 'Please select an entity to export to.', variant: 'destructive' });
      return;
    }
    if (appData.length === 0) {
      showToast({ title: 'No Data', description: 'There is no data to export.', variant: 'destructive' });
      return;
    }

    const selectedEntity = exportEntities.find(e => e.id === selectedEntityId);
    if (!selectedEntity) {
      showToast({ title: 'Entity Not Found', description: 'Configuration for the selected entity is missing.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setValidationMessages([]); // Clear previous messages

    // Perform validation
    let allValidationErrors: string[] = [];
    appData.forEach((row, index) => {
      const rowErrors = validateRow(row, index, selectedEntity.fields);
      allValidationErrors = [...allValidationErrors, ...rowErrors];
    });

    if (allValidationErrors.length > 0) {
      setValidationMessages(allValidationErrors.slice(0, 10)); // Show first 10 errors
      showToast({
        title: 'Validation Failed',
        description: `Please check the data. ${allValidationErrors.length} error(s) found. See dialog for details.`,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Prepare payload with API name mapping
    const payload = appData.map(row => {
      const transformedRow: Record<string, any> = {};
      selectedEntity.fields.forEach(field => {
        // Only include fields defined in the entity config
        if (appColumns.includes(field.name)) { // Check if the source column exists in the uploaded data
           const apiFieldName = field.apiName || field.name;
           transformedRow[apiFieldName] = row[field.name];
        } else if (field.required) {
          // This case should be caught by validation, but as a safeguard:
          console.warn(`Required field "${field.name}" not found in source data columns for entity "${selectedEntity.name}".`);
        }
      });
      return transformedRow;
    });

    try {
      const response = await fetch(selectedEntity.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to export data: ${response.status} ${response.statusText}. Server response: ${errorData}`);
      }

      showToast({ title: 'Export Successful', description: `Data successfully sent to ${selectedEntity.name}.` });
      // closeDialog(); // Optionally close dialog on success
    } catch (error: any) {
      console.error('Error exporting data:', error);
      setValidationMessages([`Export Error: ${error.message || 'An unknown error occurred during export.'}`]);
      showToast({ title: 'Export Error', description: 'An error occurred during export. See dialog for details.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedEntityConfig = exportEntities.find(e => e.id === selectedEntityId);

  return (
    <Dialog open={activeDialog === 'export'} onOpenChange={(isOpen) => { if (!isOpen) closeDialog(); setValidationMessages([]); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center"><Send className="mr-2 h-5 w-5 text-primary"/>Export Data</DialogTitle>
          <DialogDescription>
            Select an entity to export the current table data to. Data will be validated and sent as JSON.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="entity-select" className="text-right">
              Entity
            </Label>
            <Select
              value={selectedEntityId}
              onValueChange={(value) => {
                setSelectedEntityId(value);
                setValidationMessages([]); // Clear errors when changing entity
              }}
              disabled={isLoading}
            >
              <SelectTrigger id="entity-select" className="col-span-3">
                <SelectValue placeholder="Select an entity" />
              </SelectTrigger>
              <SelectContent>
                {exportEntities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEntityConfig && (
            <div className="mt-2 text-xs text-muted-foreground col-span-4">
              <p className="font-medium">Fields for {selectedEntityConfig.name}:</p>
              <ul className="list-disc pl-5">
                {selectedEntityConfig.fields.map(f => (
                  <li key={f.name}>
                    {f.name} {f.required ? <span className="text-destructive">*</span> : ''}
                    (API: {f.apiName || f.name}, Type: {f.type || 'any'})
                  </li>
                ))}
              </ul>
               <p className="text-destructive mt-1">* required field</p>
            </div>
          )}
        </div>

        {validationMessages.length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Validation Errors</AlertTitle>
            <ScrollArea className="h-32">
              <AlertDescription>
                <ul className="list-disc pl-5 text-xs">
                  {validationMessages.map((msg, index) => (
                    <li key={index}>{msg}</li>
                  ))}
                </ul>
              </AlertDescription>
            </ScrollArea>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { closeDialog(); setValidationMessages([]); }} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleExportData} disabled={isLoading || !selectedEntityId || appData.length === 0}>
            {isLoading ? 'Exporting...' : 'Export to Selected Entity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

