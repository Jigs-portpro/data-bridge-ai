
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
import { isValid, parseISO } from 'date-fns'; // For date validation

const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidDateString = (dateStr: string): boolean => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const parsedDate = parseISO(dateStr); // Tries to parse ISO 8601, common for machine-readable dates
  if (isValid(parsedDate)) {
    // Check if the original string was just a year or year-month, which parseISO might accept
    // but might not be what user intends for a full date.
    // This basic check assumes YYYY-MM-DD or similar ISO-like formats are preferred.
    // For more flexible date parsing, a more robust library or specific format checks might be needed.
    return dateStr.length >= 8 && dateStr.includes('-'); // Basic sanity check
  }
  return false;
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
      // setFieldMappings({}); // Reset mappings when dialog opens - handled by selectedEntityId effect
    }
     if (activeDialog !== 'export') {
      setValidationMessages([]); // Clear messages when dialog is not for export or closed
    }
  }, [activeDialog]);

  // Effect to initialize/reset mappings when selectedEntityId changes
  useEffect(() => {
    if (activeDialog === 'export' && selectedEntityId) {
      const entityConfig = exportEntities.find(e => e.id === selectedEntityId);
      const initialMappings: Record<string, string> = {};
      if (entityConfig) {
        entityConfig.fields.forEach(targetField => {
          // Attempt to pre-select a source column if its name (target API name) matches a source column name
          const matchingSourceColumn = appColumns.find(sc => 
            sc.toLowerCase().replace(/[\s_]+/g, '') === targetField.name.toLowerCase().replace(/[\s_]+/g, '')
          );
          if (matchingSourceColumn) {
            initialMappings[targetField.name] = matchingSourceColumn;
          } else {
            initialMappings[targetField.name] = ''; // Default to unmapped
          }
        });
      }
      setFieldMappings(initialMappings);
      setValidationMessages([]); // Clear validation messages when entity or mappings change
    }
  }, [selectedEntityId, appColumns, activeDialog]);


  const handleMappingChange = (targetFieldName: string, sourceColumnName: string) => {
    setFieldMappings(prev => ({ ...prev, [targetFieldName]: sourceColumnName }));
    setValidationMessages([]); // Clear validation messages when mappings change
  };

  const validateRow = useCallback((row: Record<string, any>, rowIndex: number, entityFields: ExportEntityField[]): string[] => {
    const errors: string[] = [];
    entityFields.forEach(targetField => {
      const sourceColumnName = fieldMappings[targetField.name]; // targetField.name is the API field name
      
      // If a target field is required but not mapped to a source column, it's an error.
      if (targetField.required && !sourceColumnName) {
        errors.push(`Row ${rowIndex + 1}, Target Field "${targetField.name}": is required by API but not mapped to a source column.`);
        return; // No further validation if not mapped and required
      }
      
      // If not mapped and not required, skip further validation for this field
      if (!sourceColumnName) {
        return;
      }
      
      const value = row[sourceColumnName];

      // Required check (only if mapped)
      if (targetField.required && (value === undefined || value === null || String(value).trim() === '')) {
        errors.push(`Row ${rowIndex + 1}, Field "${targetField.name}" (from source "${sourceColumnName}"): is required by API but source data is empty or missing.`);
      }

      // Type check (only if value exists and type is specified)
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        const stringValue = String(value);
        switch (targetField.type) {
          case 'string':
            // Usually CSV/Excel data is stringy, specific string checks (e.g. length) could be added here
            break;
          case 'number':
            if (isNaN(Number(value))) {
              errors.push(`Row ${rowIndex + 1}, Field "${targetField.name}" (from "${sourceColumnName}"): should be a number (found "${stringValue}").`);
            }
            break;
          case 'boolean':
            if (stringValue.toLowerCase() !== 'true' && stringValue.toLowerCase() !== 'false' && stringValue !== '1' && stringValue !== '0') {
              errors.push(`Row ${rowIndex + 1}, Field "${targetField.name}" (from "${sourceColumnName}"): should be a boolean (e.g., true/false, 1/0). Found "${stringValue}".`);
            }
            break;
          case 'email':
            if (!isValidEmail(stringValue)) {
              errors.push(`Row ${rowIndex + 1}, Field "${targetField.name}" (from "${sourceColumnName}"): is not a valid email address (found "${stringValue}").`);
            }
            break;
          case 'date':
            if (!isValidDateString(stringValue)) {
              errors.push(`Row ${rowIndex + 1}, Field "${targetField.name}" (from "${sourceColumnName}"): is not a valid date (e.g. YYYY-MM-DD). Found "${stringValue}".`);
            }
            break;
        }
      }
    });
    return errors;
  }, [fieldMappings]);


  const handleExportData = async () => {
    if (!selectedEntityId) {
      showToast({ title: 'Select Target Entity', description: 'Please select a target entity to export to.', variant: 'destructive' });
      return;
    }
    if (appData.length === 0) {
      showToast({ title: 'No Data', description: 'There is no data to export.', variant: 'destructive' });
      return;
    }

    const selectedEntity = exportEntities.find(e => e.id === selectedEntityId);
    if (!selectedEntity) {
      showToast({ title: 'Target Entity Not Found', description: 'Configuration for the selected target entity is missing.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setValidationMessages([]); 

    let allValidationErrors: string[] = [];
    appData.forEach((row, index) => {
      // Limit to first 100 errors to avoid overwhelming the UI/browser
      if (allValidationErrors.length < 100) {
        const rowErrors = validateRow(row, index, selectedEntity.fields);
        allValidationErrors = [...allValidationErrors, ...rowErrors];
      }
    });

    if (allValidationErrors.length > 0) {
      const errorCount = allValidationErrors.length;
      const displayErrors = allValidationErrors.slice(0, 20); // Show first 20 errors
      if (errorCount > 20) {
        displayErrors.push(`...and ${errorCount - 20} more error(s). Please check your data and mappings.`);
      }
      setValidationMessages(displayErrors);
      showToast({
        title: 'Validation Failed',
        description: `Please check mappings and data. ${errorCount} error(s) found. See dialog for details.`,
        variant: 'destructive',
        duration: 5000,
      });
      setIsLoading(false);
      return;
    }

    // Prepare payload using fieldMappings
    const payload = appData.map(row => {
      const transformedRow: Record<string, any> = {};
      selectedEntity.fields.forEach(targetField => {
        const sourceColumnName = fieldMappings[targetField.name]; // targetField.name is the API field name
        if (sourceColumnName && appColumns.includes(sourceColumnName)) {
           let valueToTransform = row[sourceColumnName];
           // Basic type coercion for boolean and number based on target type
           if (targetField.type === 'boolean') {
              valueToTransform = String(valueToTransform).toLowerCase() === 'true' || String(valueToTransform) === '1';
           } else if (targetField.type === 'number' && valueToTransform !== '' && valueToTransform !== null && !isNaN(Number(valueToTransform))) {
              valueToTransform = Number(valueToTransform);
           }
           // Dates are kept as strings, assuming API handles ISO-like date strings
           transformedRow[targetField.name] = valueToTransform;
        } else if (targetField.required) {
          // This case should ideally be caught by the validation above (required field not mapped)
          // If it reaches here, it implies a logic flaw or an unmapped required field somehow passed validation.
          // Depending on API, might send null, undefined, or skip. For safety, log and potentially skip.
          console.warn(`Required target field "${targetField.name}" is unmapped or its source column "${sourceColumnName}" is missing post-validation.`);
          transformedRow[targetField.name] = null; // Or some default, or omit
        }
        // If not required and not mapped, it's simply omitted from the payload.
      });
      return transformedRow;
    });

    try {
      console.log(`Simulating export to: ${selectedEntity.url}`);
      console.log('Export Payload:', JSON.stringify(payload, null, 2));
      
      // // UNCOMMENT TO MAKE ACTUAL FETCH CALL:
      // const response = await fetch(selectedEntity.url, {
      //   method: 'POST', // Assuming POST, could be configurable
      //   headers: {
      //     'Content-Type': 'application/json',
      //     // Add any other necessary headers like Authorization
      //   },
      //   body: JSON.stringify(payload),
      // });

      // if (!response.ok) {
      //   let errorData = 'Could not retrieve error details.';
      //   try {
      //     errorData = await response.text();
      //   } catch (e) { /* ignore */ }
      //   throw new Error(`API Error: ${response.status} ${response.statusText}. Response: ${errorData.substring(0, 200)}`);
      // }
      // const responseData = await response.json(); // Or .text() if API response isn't JSON

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

      showToast({ title: 'Export "Simulated" Successfully', description: `Data for "${selectedEntity.name}" prepared. Check browser console for payload. Actual API call is commented out.` });
      // showToast({ title: 'Data Exported Successfully', description: `Data for "${selectedEntity.name}" sent to ${selectedEntity.url}. Response: ${JSON.stringify(responseData)}` });
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
    <Dialog open={activeDialog === 'export'} onOpenChange={(isOpen) => { if (!isOpen) closeDialog(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center"><Send className="mr-2 h-5 w-5 text-primary"/>Export Data</DialogTitle>
          <DialogDescription>
            Select a target entity, map your source data columns to the target API fields, and export.
            Ensure source data matches the type requirements of the target API fields.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="entity-select" className="text-right col-span-1">
              Target Entity
            </Label>
            <Select
              value={selectedEntityId}
              onValueChange={(value) => {
                setSelectedEntityId(value);
                // Mappings and validation messages will be reset/cleared by useEffect hooks
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
            <div className="border rounded-md p-4">
              <h4 className="text-md font-semibold mb-3">Map Source Columns to "{selectedEntityConfig.name}" Target API Fields:</h4>
              <ScrollArea className="max-h-60"> 
                <div className="space-y-3 pr-3">
                  {selectedEntityConfig.fields.map(targetField => (
                    <div key={targetField.name} className="grid grid-cols-2 gap-x-4 gap-y-1 items-center">
                      <Label htmlFor={`map-${targetField.name}`} className="text-sm text-right truncate">
                        {targetField.name}
                        {targetField.required ? <span className="text-destructive ml-1">*</span> : ''}
                        <span className="text-xs text-muted-foreground ml-1">({targetField.type || 'any'})</span>
                      </Label>
                      <Select
                        value={fieldMappings[targetField.name] || ''}
                        onValueChange={(sourceCol) => handleMappingChange(targetField.name, sourceCol)}
                        disabled={isLoading}
                      >
                        <SelectTrigger id={`map-${targetField.name}`} className="text-sm h-9">
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
               <p className="text-xs text-muted-foreground mt-2"><span className="text-destructive">*</span> Target API field is required.</p>
            </div>
          )}
        </div>

        {validationMessages.length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Validation Errors Found</AlertTitle>
            <ScrollArea className="max-h-40 mt-2">
              <AlertDescription>
                <ul className="list-disc pl-5 text-xs space-y-1">
                  {validationMessages.map((msg, index) => (
                    <li key={index}>{msg}</li>
                  ))}
                </ul>
              </AlertDescription>
            </ScrollArea>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { closeDialog(); }} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleExportData} 
            disabled={isLoading || !selectedEntityId || appData.length === 0 || Object.values(fieldMappings).every(val => val === '') && selectedEntityConfig && selectedEntityConfig.fields.some(f => f.required)}
          >
            {isLoading ? 'Processing...' : 'Export Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
