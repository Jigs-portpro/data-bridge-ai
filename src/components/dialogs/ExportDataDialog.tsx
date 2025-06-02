
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
import type { ExportEntity, ExportEntityField, ExportConfig } from '@/config/exportEntities';
import { Send, AlertTriangle, Loader2 } from 'lucide-react';
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
  
  // MM/DD/YYYY or MM-DD-YYYY
  const commonFormatMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (commonFormatMatch) {
    const month = parseInt(commonFormatMatch[1], 10);
    const day = parseInt(commonFormatMatch[2], 10);
    const year = parseInt(commonFormatMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const parsed = new Date(year, month -1, day); // Month is 0-indexed
        return isValid(parsed) && parsed.getFullYear() === year && parsed.getMonth() === month -1 && parsed.getDate() === day;
    }
  }
  // Try YYYY-MM-DD last before generic parseISO because parseISO is too lenient with partials
   if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) { 
     const parsed = new Date(dateStr + "T00:00:00Z"); // Assume UTC if no timezone to avoid off-by-one day issues
     return isValid(parsed) && parsed.toISOString().startsWith(dateStr);
  }
  // Fallback to parseISO for full ISO strings or other complex cases only if other checks fail
  const parsedISO = parseISO(dateStr);
  return isValid(parsedISO) && dateStr.includes('T'); // Stricter check for ISO if it reaches here
};

const AUTH_TOKEN_STORAGE_KEY = 'datawiseAuthToken';
const NOT_MAPPED_VALUE = "__NOT_MAPPED_PLACEHOLDER__";


export function ExportDataDialog() {
  const {
    data: appData,
    activeDialog,
    closeDialog,
    showToast,
    isLoading: appContextIsLoading,
    setIsLoading: setAppContextIsLoading,
    columns: appColumns,
  } = useAppContext();

  const [exportConfig, setExportConfig] = useState<ExportConfig | null>(null);
  const [isFetchingConfig, setIsFetchingConfig] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);

  const isLoading = appContextIsLoading || isFetchingConfig || isExporting;

  const fetchEntitiesConfig = useCallback(async () => {
    if (activeDialog !== 'export') return;
    setIsFetchingConfig(true);
    try {
      const response = await fetch('/api/export-entities');
      if (!response.ok) throw new Error('Failed to fetch entities configuration');
      const config: ExportConfig = await response.json();
      setExportConfig(config);
      if (config.entities.length > 0 && !selectedEntityId) {
        setSelectedEntityId(config.entities[0].id);
      } else if (config.entities.length > 0 && selectedEntityId && !config.entities.find(e => e.id === selectedEntityId)) {
        setSelectedEntityId(config.entities[0].id);
      } else if (config.entities.length === 0) {
        setSelectedEntityId('');
      }
    } catch (error) {
      console.error("Error fetching entities config:", error);
      showToast({ title: "Config Error", description: "Could not load export entities configuration.", variant: "destructive" });
      setExportConfig({ baseUrl: '', entities: [] }); // Ensure exportConfig is not null
      setSelectedEntityId('');
    } finally {
      setIsFetchingConfig(false);
    }
  }, [activeDialog, showToast, selectedEntityId]);

  useEffect(() => {
    fetchEntitiesConfig();
  }, [fetchEntitiesConfig]);

  useEffect(() => {
    if (activeDialog !== 'export') {
      setValidationMessages([]);
    }
  }, [activeDialog]);

   useEffect(() => {
    if (activeDialog === 'export' && selectedEntityId && exportConfig?.entities.length) {
      const entityConfig = exportConfig.entities.find(e => e.id === selectedEntityId);
      const initialMappings: Record<string, string> = {};
      if (entityConfig) {
        entityConfig.fields.forEach(targetField => {
          const targetFieldNameNormalized = targetField.name.toLowerCase().replace(/[\s_]+/g, '');
          const matchingSourceColumn = appColumns.find(sc =>
            sc.toLowerCase().replace(/[\s_]+/g, '') === targetFieldNameNormalized
          );
          initialMappings[targetField.name] = matchingSourceColumn || '';
        });
      }
      setFieldMappings(initialMappings);
      setValidationMessages([]);
    } else if (activeDialog === 'export' && !selectedEntityId) {
      setFieldMappings({});
      setValidationMessages([]);
    }
   }, [selectedEntityId, appColumns, activeDialog, exportConfig]);

  const handleMappingChange = (targetFieldName: string, sourceColumnName: string) => {
    setFieldMappings(prev => ({ 
      ...prev, 
      [targetFieldName]: sourceColumnName === NOT_MAPPED_VALUE ? '' : sourceColumnName 
    }));
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
      if (!sourceColumnName) return;

      const value = row[sourceColumnName];
      const stringValue = (value === null || value === undefined) ? '' : String(value).trim();

      if (targetField.required && stringValue === '') {
        errors.push(`Row ${rowIndex + 1}, Field "${targetField.name}" (from "${sourceColumnName}"): required by API but source data is empty.`);
      }

      if (stringValue !== '') {
        switch (targetField.type) {
          case 'string':
          case 'email':
            if (targetField.minLength !== undefined && stringValue.length < targetField.minLength) {
              errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): min length ${targetField.minLength}, got ${stringValue.length}. Value: "${stringValue.substring(0,50)}"`);
            }
            if (targetField.maxLength !== undefined && stringValue.length > targetField.maxLength) {
              errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): max length ${targetField.maxLength}, got ${stringValue.length}. Value: "${stringValue.substring(0,50)}"`);
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
            if (!['true', 'false', '1', '0', ''].includes(stringValue.toLowerCase())) {
              errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): should be boolean (true/false, 1/0). Found "${stringValue}".`);
            }
            break;
          case 'date':
            if (!isValidDateString(stringValue)) {
              errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): not a valid date. Examples: YYYY-MM-DD, MM/DD/YYYY. Found "${stringValue}".`);
            }
            break;
        }
      }
    });
    return errors;
  }, [fieldMappings]);

  const handleExportData = async () => {
    if (!selectedEntityId || !exportConfig) {
      showToast({ title: 'Select Target Entity', description: 'Please select a target entity.', variant: 'destructive' });
      return;
    }
    if (appData.length === 0) {
      showToast({ title: 'No Data', description: 'There is no data to export.', variant: 'destructive' });
      return;
    }

    const selectedEntity = exportConfig.entities.find(e => e.id === selectedEntityId);
    if (!selectedEntity) {
      showToast({ title: 'Target Entity Not Found', description: 'Config for selected entity is missing.', variant: 'destructive' });
      return;
    }

    setIsExporting(true);
    setAppContextIsLoading(true);
    setValidationMessages([]);

    let allValidationErrors: string[] = [];
    appData.forEach((row, index) => {
      if (allValidationErrors.length < 100) { // Limit number of errors to process/display for performance
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
      setIsExporting(false);
      setAppContextIsLoading(false);
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
              valueToTransform = isNaN(num) ? null : num;
           } else if (targetField.type === 'date' && stringValue !== '') {
             // Format date to YYYY-MM-DD if it's a valid common format, otherwise pass as is if parseISO liked it.
             // The API should ideally handle various date formats, but YYYY-MM-DD is safest.
             const commonFormatMatch = stringValue.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
             if (commonFormatMatch) {
                const month = parseInt(commonFormatMatch[1], 10);
                const day = parseInt(commonFormatMatch[2], 10);
                const year = parseInt(commonFormatMatch[3], 10);
                const d = new Date(year, month -1, day);
                if(isValid(d)) {
                    valueToTransform = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                } else {
                     valueToTransform = stringValue; // keep original if specific transform fails
                }
             } else if (stringValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                valueToTransform = stringValue; // Already in desired format
             } else if (isValid(parseISO(stringValue)) && stringValue.includes('T')) { // ISO string with time
                valueToTransform = stringValue.split('T')[0]; // Extract YYYY-MM-DD part
             } else {
                valueToTransform = stringValue; // fallback
             }

           } else if (stringValue === '' && !targetField.required) {
             valueToTransform = null; 
           } else {
             valueToTransform = stringValue; 
           }
           transformedRow[targetField.name] = valueToTransform;
        } else if (targetField.required) {
          transformedRow[targetField.name] = null;
        }
      });
      return transformedRow;
    });

    let authToken: string | null = null;
    if (typeof window !== 'undefined') {
        authToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    }

    const requestHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
    };
    if (authToken) {
        requestHeaders['Authorization'] = `Bearer ${authToken}`;
    } else {
        console.warn("No auth token found in local storage. Proceeding without Authorization header.");
        showToast({ title: 'Auth Token Missing', description: 'No API auth token found. Exporting without authentication.', variant: 'destructive' });
    }
    
    const baseUrl = exportConfig.baseUrl || 'https://api.example.com/v1'; 
    const fullApiUrl = (baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl) +
                       (selectedEntity.url.startsWith('/') ? selectedEntity.url : '/' + selectedEntity.url);

    try {
      console.log(`Simulating export to: ${fullApiUrl}`);
      console.log('Request Headers:', JSON.parse(JSON.stringify(requestHeaders))); // Clean display of headers
      console.log('Export Payload:', JSON.stringify(payload, null, 2));

      // const response = await fetch(fullApiUrl, {
      //   method: 'POST',
      //   headers: requestHeaders,
      //   body: JSON.stringify(payload),
      // });
      // if (!response.ok) {
      //   const errorData = await response.json().catch(() => ({ message: `API Error: ${response.status}` }));
      //   throw new Error(errorData.message || `API Error: ${response.status}`);
      // }
      // const responseData = await response.json();

      await new Promise(resolve => setTimeout(resolve, 1000)); 

      showToast({ title: 'Export "Simulated" Successfully', description: `Data for "${selectedEntity.name}" prepared. Check browser console.` });
    } catch (error: any) {
      console.error('Error exporting data:', error);
      setValidationMessages([`Export Error: ${error.message || 'An unknown error occurred during export.'}`]);
      showToast({ title: 'Export Error', description: 'An error occurred during the export process. See dialog for details.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
      setAppContextIsLoading(false);
    }
  };

  const selectedEntityConfig = exportConfig?.entities.find(e => e.id === selectedEntityId);
  const isExportDisabled = isLoading ||
                           !selectedEntityId ||
                           !exportConfig ||
                           exportConfig.entities.length === 0 ||
                           appData.length === 0 ||
                           (selectedEntityConfig?.fields.some(f => f.required && (!fieldMappings[f.name] || fieldMappings[f.name] === '')) ?? true);

  const handleDialogClose = () => {
    if (!isLoading) {
      closeDialog();
    }
  };

   if (isFetchingConfig && activeDialog === 'export') {
     return (
      <Dialog open={true} onOpenChange={(isOpen) => { if (!isOpen) handleDialogClose(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline flex items-center">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary"/>Loading Configuration...
            </DialogTitle>
            <DialogDescription>
              Fetching export entity configurations. Please wait.
            </DialogDescription>
          </DialogHeader>
          <div className="h-60 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
           <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={activeDialog === 'export'} onOpenChange={(isOpen) => { if (!isOpen) handleDialogClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center"><Send className="mr-2 h-5 w-5 text-primary"/>Export Data</DialogTitle>
          <DialogDescription>
            Select target entity, map source columns to target API fields, and export. Data will be validated against rules defined in Setup.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="entity-select" className="text-right col-span-1">Target Entity</Label>
            <Select value={selectedEntityId} onValueChange={setSelectedEntityId} disabled={isLoading || !exportConfig?.entities.length}>
              <SelectTrigger id="entity-select" className="col-span-3">
                <SelectValue placeholder={!exportConfig || exportConfig.entities.length === 0 ? "No entities configured" : "Select an entity"} />
              </SelectTrigger>
              <SelectContent>
                {(!exportConfig || exportConfig.entities.length === 0) && <SelectItem value="no-entities" disabled>No entities configured</SelectItem>}
                {exportConfig?.entities.map((entity) => (<SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>))}
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
                      <Label htmlFor={`map-${targetField.name}`} className="text-sm text-right truncate" title={`${targetField.name} (${targetField.type || 'any'})${targetField.required ? '*' : ''}`}>
                        {targetField.name}
                        {targetField.required ? <span className="text-destructive ml-1">*</span> : ''}
                        <span className="text-xs text-muted-foreground ml-1">({targetField.type || 'any'})</span>
                      </Label>
                      <Select 
                        value={fieldMappings[targetField.name] || NOT_MAPPED_VALUE} 
                        onValueChange={(sourceCol) => handleMappingChange(targetField.name, sourceCol)} 
                        disabled={isLoading}
                      >
                        <SelectTrigger id={`map-${targetField.name}`} className="text-sm h-9"><SelectValue placeholder="Select source column" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NOT_MAPPED_VALUE}>-- Not Mapped --</SelectItem>
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
          {!selectedEntityConfig && exportConfig?.entities.length && (
             <p className="text-sm text-muted-foreground text-center">Select an entity to configure field mappings.</p>
          )}
          {(!exportConfig || exportConfig.entities.length === 0) && !isFetchingConfig && (
             <p className="text-sm text-destructive text-center">No export entities are configured. Please add them on the Setup page.</p>
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
          <Button variant="outline" onClick={handleDialogClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleExportData} disabled={isExportDisabled || isLoading}>
            {isExporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Processing...</> : 'Export Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


    