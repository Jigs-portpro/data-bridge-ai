
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
import { isValid, parseISO } from 'date-fns';

const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidDateString = (dateStr: string): boolean => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  // Try to parse common date formats or ISO
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/) || dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) || dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
     const parsed = new Date(dateStr);
     return isValid(parsed);
  }
  const parsedISO = parseISO(dateStr);
  if (isValid(parsedISO)) {
    return dateStr.length >= 8 && (dateStr.includes('-') || dateStr.includes('/'));
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
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (exportEntities.length > 0 && activeDialog === 'export') {
      setSelectedEntityId(exportEntities[0].id);
    }
     if (activeDialog !== 'export') {
      setValidationMessages([]);
    }
  }, [activeDialog]);

  useEffect(() => {
    if (activeDialog === 'export' && selectedEntityId) {
      const entityConfig = exportEntities.find(e => e.id === selectedEntityId);
      const initialMappings: Record<string, string> = {};
      if (entityConfig) {
        entityConfig.fields.forEach(targetField => {
          const matchingSourceColumn = appColumns.find(sc => 
            sc.toLowerCase().replace(/[\s_]+/g, '') === targetField.name.toLowerCase().replace(/[\s_]+/g, '')
          );
          initialMappings[targetField.name] = matchingSourceColumn || '';
        });
      }
      setFieldMappings(initialMappings);
      setValidationMessages([]);
    }
  }, [selectedEntityId, appColumns, activeDialog]);

  const handleMappingChange = (targetFieldName: string, sourceColumnName: string) => {
    setFieldMappings(prev => ({ ...prev, [targetFieldName]: sourceColumnName }));
    setValidationMessages([]);
  };

  const validateRow = useCallback((row: Record<string, any>, rowIndex: number, entityFields: ExportEntityField[]): string[] => {
    const errors: string[] = [];
    entityFields.forEach(targetField => {
      const sourceColumnName = fieldMappings[targetField.name];
      
      if (targetField.required && !sourceColumnName) {
        errors.push(`Row ${rowIndex + 1}, Target "${targetField.name}": required by API but not mapped.`);
        return;
      }
      if (!sourceColumnName) return; // Not mapped, not required
      
      const value = row[sourceColumnName];
      const stringValue = (value === null || value === undefined) ? '' : String(value).trim();

      if (targetField.required && stringValue === '') {
        errors.push(`Row ${rowIndex + 1}, Field "${targetField.name}" (from "${sourceColumnName}"): required by API but source data is empty.`);
      }

      if (stringValue !== '') { // Perform type and rule validation only if there's a value
        switch (targetField.type) {
          case 'string':
          case 'email': // email specific checks below
            if (targetField.minLength !== undefined && stringValue.length < targetField.minLength) {
              errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): min length ${targetField.minLength}, got ${stringValue.length}.`);
            }
            if (targetField.maxLength !== undefined && stringValue.length > targetField.maxLength) {
              errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): max length ${targetField.maxLength}, got ${stringValue.length}.`);
            }
            if (targetField.pattern) {
              try {
                const regex = new RegExp(targetField.pattern);
                if (!regex.test(stringValue)) {
                  errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): does not match pattern "${targetField.pattern}". Value: "${stringValue.substring(0,50)}"`);
                }
              } catch (e) {
                errors.push(`Row ${rowIndex + 1}, "${targetField.name}": Invalid regex pattern "${targetField.pattern}" in config.`);
              }
            }
            if (targetField.type === 'email' && !isValidEmail(stringValue)) {
              errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): not a valid email. Value: "${stringValue}"`);
            }
            break;
          case 'number':
            const numValue = parseFloat(stringValue);
            if (isNaN(numValue)) {
              errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): should be a number. Found "${stringValue}".`);
            } else {
              if (targetField.minValue !== undefined && numValue < targetField.minValue) {
                errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): min value ${targetField.minValue}, got ${numValue}.`);
              }
              if (targetField.maxValue !== undefined && numValue > targetField.maxValue) {
                errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): max value ${targetField.maxValue}, got ${numValue}.`);
              }
            }
            break;
          case 'boolean':
            if (!['true', 'false', '1', '0', ''].includes(stringValue.toLowerCase())) { // Allow empty string for non-required boolean
              errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): should be boolean (true/false, 1/0). Found "${stringValue}".`);
            }
            break;
          case 'date':
            if (!isValidDateString(stringValue)) {
              errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): not a valid date (e.g. YYYY-MM-DD). Found "${stringValue}".`);
            }
            break;
        }
      }
    });
    return errors;
  }, [fieldMappings]);


  const handleExportData = async () => {
    if (!selectedEntityId) {
      showToast({ title: 'Select Target Entity', description: 'Please select a target entity.', variant: 'destructive' });
      return;
    }
    if (appData.length === 0) {
      showToast({ title: 'No Data', description: 'There is no data to export.', variant: 'destructive' });
      return;
    }

    const selectedEntity = exportEntities.find(e => e.id === selectedEntityId);
    if (!selectedEntity) {
      showToast({ title: 'Target Entity Not Found', description: 'Config for selected entity is missing.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setValidationMessages([]); 

    let allValidationErrors: string[] = [];
    appData.forEach((row, index) => {
      if (allValidationErrors.length < 100) {
        const rowErrors = validateRow(row, index, selectedEntity.fields);
        allValidationErrors = [...allValidationErrors, ...rowErrors];
      }
    });

    if (allValidationErrors.length > 0) {
      const errorCount = allValidationErrors.length;
      const displayErrors = allValidationErrors.slice(0, 20);
      if (errorCount > 20) {
        displayErrors.push(`...and ${errorCount - 20} more error(s).`);
      }
      setValidationMessages(displayErrors);
      showToast({
        title: 'Validation Failed',
        description: `${errorCount} error(s) found. See dialog for details.`,
        variant: 'destructive',
        duration: 7000,
      });
      setIsLoading(false);
      return;
    }

    const payload = appData.map(row => {
      const transformedRow: Record<string, any> = {};
      selectedEntity.fields.forEach(targetField => {
        const sourceColumnName = fieldMappings[targetField.name];
        if (sourceColumnName && appColumns.includes(sourceColumnName)) {
           let valueToTransform = row[sourceColumnName];
           const stringValue = (valueToTransform === null || valueToTransform === undefined) ? '' : String(valueToTransform).trim();

           if (targetField.type === 'boolean') {
              valueToTransform = stringValue.toLowerCase() === 'true' || stringValue === '1';
           } else if (targetField.type === 'number' && stringValue !== '') {
              const num = parseFloat(stringValue);
              valueToTransform = isNaN(num) ? null : num; // Send null if not a valid number
           } else if (targetField.type === 'date' && stringValue !== '') {
             // Assuming API expects date as string (e.g., ISO). Add specific formatting if needed.
             valueToTransform = stringValue;
           } else if (stringValue === '' && !targetField.required) {
             // For non-required fields, if source is empty, send null or omit. Let's send null.
             valueToTransform = null;
           } else {
             valueToTransform = stringValue; // Default to string
           }
           transformedRow[targetField.name] = valueToTransform;
        } else if (targetField.required) {
          // This should have been caught by validation.
          // If it reaches here, implies an issue or an unmapped required field.
          transformedRow[targetField.name] = null; 
        }
      });
      return transformedRow;
    });

    try {
      console.log(`Simulating export to: ${selectedEntity.url}`);
      console.log('Export Payload:', JSON.stringify(payload, null, 2));
      
      await new Promise(resolve => setTimeout(resolve, 1000)); 

      showToast({ title: 'Export "Simulated" Successfully', description: `Data for "${selectedEntity.name}" prepared. Check browser console for payload.` });
    } catch (error: any) {
      console.error('Error exporting data:', error);
      setValidationMessages([`Export Error: ${error.message || 'An unknown error occurred.'}`]);
      showToast({ title: 'Export Error', description: 'An error occurred. See dialog for details.', variant: 'destructive' });
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
            Select target entity, map source columns to target API fields, and export. Data will be validated against target field rules.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="entity-select" className="text-right col-span-1">Target Entity</Label>
            <Select value={selectedEntityId} onValueChange={setSelectedEntityId} disabled={isLoading}>
              <SelectTrigger id="entity-select" className="col-span-3"><SelectValue placeholder="Select an entity" /></SelectTrigger>
              <SelectContent>{exportEntities.map((entity) => (<SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>

          {selectedEntityConfig && (
            <div className="border rounded-md p-4">
              <h4 className="text-md font-semibold mb-3">Map Source Columns to "{selectedEntityConfig.name}" Target API Fields:</h4>
              <ScrollArea className="max-h-60"> 
                <div className="space-y-3 pr-3">
                  {selectedEntityConfig.fields.map(targetField => (
                    <div key={targetField.name} className="grid grid-cols-2 gap-x-4 gap-y-1 items-center">
                      <Label htmlFor={`map-${targetField.name}`} className="text-sm text-right truncate" title={`${targetField.name} (${targetField.type || 'any'})${targetField.required ? '*' : ''}`}>
                        {targetField.name}
                        {targetField.required ? <span className="text-destructive ml-1">*</span> : ''}
                        <span className="text-xs text-muted-foreground ml-1">({targetField.type || 'any'})</span>
                      </Label>
                      <Select value={fieldMappings[targetField.name] || ''} onValueChange={(sourceCol) => handleMappingChange(targetField.name, sourceCol)} disabled={isLoading}>
                        <SelectTrigger id={`map-${targetField.name}`} className="text-sm h-9"><SelectValue placeholder="Select source column" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">-- Not Mapped --</SelectItem>
                          {appColumns.map(col => (<SelectItem key={col} value={col}>{col}</SelectItem>))}
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
          <Button variant="outline" onClick={closeDialog} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleExportData} disabled={isLoading || !selectedEntityId || appData.length === 0 || (selectedEntityConfig?.fields.some(f => f.required && !fieldMappings[f.name]) ?? true)}>
            {isLoading ? 'Processing...' : 'Export Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
