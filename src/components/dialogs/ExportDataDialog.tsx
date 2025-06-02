
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
    data: appData, 
    activeDialog,
    closeDialog,
    showToast,
    isLoading,
    setIsLoading,
    columns: appColumns, 
  } = useAppContext();
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [validationMessages, setValidationMessages] = useState<string[]>([]);

  // State for column mappings: { targetFieldName: sourceColumnName }
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (exportEntities.length > 0 && activeDialog === 'export') {
      setSelectedEntityId(exportEntities[0].id);
      setValidationMessages([]);
      setFieldMappings({}); // Reset mappings when dialog opens or entity changes
    }
  }, [activeDialog]);

  // Effect to initialize/reset mappings when selectedEntityId changes
  useEffect(() => {
    if (activeDialog === 'export' && selectedEntityId) {
      const entityConfig = exportEntities.find(e => e.id === selectedEntityId);
      const initialMappings: Record<string, string> = {};
      if (entityConfig) {
        entityConfig.fields.forEach(targetField => {
          // Attempt to pre-select a source column if its name matches the target field name
          if (appColumns.includes(targetField.name)) {
            initialMappings[targetField.name] = targetField.name;
          } else {
            initialMappings[targetField.name] = ''; // Default to unmapped
          }
        });
      }
      setFieldMappings(initialMappings);
    }
  }, [selectedEntityId, appColumns, activeDialog]);


  const handleMappingChange = (targetFieldName: string, sourceColumnName: string) => {
    setFieldMappings(prev => ({ ...prev, [targetFieldName]: sourceColumnName }));
  };

  const validateRow = useCallback((row: Record<string, any>, rowIndex: number, entityFields: ExportEntityField[]): string[] => {
    const errors: string[] = [];
    entityFields.forEach(targetField => {
      const sourceColumnName = fieldMappings[targetField.name];
      // If a target field is required but not mapped, it's an error.
      if (targetField.required && !sourceColumnName) {
        errors.push(`Row ${rowIndex + 1}, Target Field "${targetField.name}": is required but not mapped to a source column.`);
        return; // No further validation if not mapped and required
      }
      
      // If mapped, get value from source data
      const value = sourceColumnName ? row[sourceColumnName] : undefined;

      // Required check (only if mapped)
      if (sourceColumnName && targetField.required && (value === undefined || value === null || String(value).trim() === '')) {
        errors.push(`Row ${rowIndex + 1}, Mapped Field "${targetField.name}" (from "${sourceColumnName}"): is required but empty or missing.`);
      }

      // Type check (only if value exists and type is specified)
      if (sourceColumnName && value !== undefined && value !== null && String(value).trim() !== '' && targetField.type) {
        switch (targetField.type) {
          case 'string':
            // Usually CSV/Excel data is stringy, so specific string checks might be more about content
            break;
          case 'number':
            if (isNaN(Number(value))) {
              errors.push(`Row ${rowIndex + 1}, Mapped Field "${targetField.name}" (from "${sourceColumnName}"): should be a number (found "${value}").`);
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean' && String(value).toLowerCase() !== 'true' && String(value).toLowerCase() !== 'false') {
              errors.push(`Row ${rowIndex + 1}, Mapped Field "${targetField.name}" (from "${sourceColumnName}"): should be a boolean (true/false).`);
            }
            break;
          case 'email':
            if (typeof value !== 'string' || !isValidEmail(String(value))) {
              errors.push(`Row ${rowIndex + 1}, Mapped Field "${targetField.name}" (from "${sourceColumnName}"): is not a valid email address.`);
            }
            break;
        }
      }
    });
    return errors;
  }, [fieldMappings]);


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
    setValidationMessages([]); 

    let allValidationErrors: string[] = [];
    appData.forEach((row, index) => {
      const rowErrors = validateRow(row, index, selectedEntity.fields);
      allValidationErrors = [...allValidationErrors, ...rowErrors];
    });

    if (allValidationErrors.length > 0) {
      setValidationMessages(allValidationErrors.slice(0, 20)); // Show more errors
      showToast({
        title: 'Validation Failed',
        description: `Please check mappings and data. ${allValidationErrors.length} error(s) found. See dialog for details.`,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Prepare payload using fieldMappings
    const payload = appData.map(row => {
      const transformedRow: Record<string, any> = {};
      selectedEntity.fields.forEach(targetField => {
        const sourceColumnName = fieldMappings[targetField.name];
        if (sourceColumnName && appColumns.includes(sourceColumnName)) { // Ensure source column exists
           transformedRow[targetField.name] = row[sourceColumnName]; // targetField.name is the API field name
        } else if (targetField.required) {
          // This should have been caught by validation if a required field is unmapped or source column missing
          console.warn(`Required target field "${targetField.name}" is unmapped or its source column "${sourceColumnName}" is missing.`);
          // Potentially set to null or skip, based on API requirements for missing required fields after mapping attempt
        }
      });
      return transformedRow;
    });

    try {
      // For now, just log the payload and simulate success
      console.log('Export Payload:', JSON.stringify(payload, null, 2));
      console.log('Target URL:', selectedEntity.url);
      // const response = await fetch(selectedEntity.url, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(payload),
      // });

      // if (!response.ok) {
      //   const errorData = await response.text();
      //   throw new Error(`Failed to export data: ${response.status} ${response.statusText}. Server response: ${errorData}`);
      // }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay


      showToast({ title: 'Export Simulated', description: `Data for ${selectedEntity.name} prepared. Check console for payload.` });
      // closeDialog(); 
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
      <DialogContent className="sm:max-w-2xl"> {/* Increased width for mapping UI */}
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center"><Send className="mr-2 h-5 w-5 text-primary"/>Export Data</DialogTitle>
          <DialogDescription>
            Select a target entity, map your source columns to the target fields, and export the data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="entity-select" className="text-right col-span-1">
              Target Entity
            </Label>
            <Select
              value={selectedEntityId}
              onValueChange={(value) => {
                setSelectedEntityId(value);
                setValidationMessages([]); 
                // Mappings will be reset by the useEffect hook for selectedEntityId
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
            <div className="mt-4 border rounded-md p-4">
              <h4 className="text-md font-semibold mb-2">Map Source Columns to "{selectedEntityConfig.name}" Target Fields:</h4>
              <ScrollArea className="max-h-60"> {/* Max height for mapping section */}
                <div className="space-y-3 pr-2">
                  {selectedEntityConfig.fields.map(targetField => (
                    <div key={targetField.name} className="grid grid-cols-2 gap-x-4 gap-y-1 items-center">
                      <Label htmlFor={`map-${targetField.name}`} className="text-sm text-right truncate">
                        {targetField.name}
                        {targetField.required ? <span className="text-destructive">*</span> : ''}
                        <span className="text-xs text-muted-foreground ml-1">({targetField.type || 'any'})</span>
                      </Label>
                      <Select
                        value={fieldMappings[targetField.name] || ''}
                        onValueChange={(sourceCol) => handleMappingChange(targetField.name, sourceCol)}
                        disabled={isLoading}
                      >
                        <SelectTrigger id={`map-${targetField.name}`}>
                          <SelectValue placeholder="Select source column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">-- Not Mapped --</SelectItem>
                          {appColumns.map(col => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </ScrollArea>
               <p className="text-xs text-destructive mt-2">* target field is required</p>
            </div>
          )}
        </div>

        {validationMessages.length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Validation Errors</AlertTitle>
            <ScrollArea className="max-h-40"> {/* Increased height for errors */}
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
            {isLoading ? 'Processing...' : 'Export Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
