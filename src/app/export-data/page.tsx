
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/hooks/useAppContext';
import type { ExportEntity, ExportEntityField, ExportConfig } from '@/config/exportEntities';
import { objectsToCsv } from '@/lib/csvUtils'; // Ensure this is imported
import { Send, AlertTriangle, Loader2, CheckCircle, DownloadCloud } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { isValid, parseISO } from 'date-fns';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidDateString = (dateStr: string): boolean => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const commonFormatMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (commonFormatMatch) {
    const month = parseInt(commonFormatMatch[1], 10);
    const day = parseInt(commonFormatMatch[2], 10);
    const year = parseInt(commonFormatMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const parsed = new Date(year, month - 1, day);
      return isValid(parsed) && parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
    }
  }
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const parsed = new Date(dateStr + "T00:00:00Z");
    return isValid(parsed) && parsed.toISOString().startsWith(dateStr);
  }
  const parsedISO = parseISO(dateStr);
  return isValid(parsedISO) && dateStr.includes('T');
};

const AUTH_TOKEN_STORAGE_KEY = 'datawiseAuthToken'; // This should be renamed to dataBridgeAuthToken or similar if you rename globally
const NOT_MAPPED_VALUE = "__NOT_MAPPED_PLACEHOLDER__";

export default function ExportDataPage() {
  const {
    data: appData,
    showToast,
    isLoading: appContextIsLoading,
    setIsLoading: setAppContextIsLoading,
    columns: appColumns,
    isAuthenticated,
    isAuthLoading,
    fileName: originalFileName,
  } = useAppContext();
  const router = useRouter();

  const [exportConfig, setExportConfig] = useState<ExportConfig | null>(null);
  const [isFetchingConfig, setIsFetchingConfig] = useState(true);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const [isDataValid, setIsDataValid] = useState(false);
  
  const [isExporting, setIsExporting] = useState(false);

  const isLoading = appContextIsLoading || isFetchingConfig || isValidating || isExporting;

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const fetchEntitiesConfig = useCallback(async () => {
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
      setExportConfig({ baseUrl: '', entities: [] });
      setSelectedEntityId('');
    } finally {
      setIsFetchingConfig(false);
    }
  }, [showToast, selectedEntityId]);

  useEffect(() => {
    if (isAuthenticated) {
        fetchEntitiesConfig();
    }
  }, [fetchEntitiesConfig, isAuthenticated]);

   useEffect(() => {
    if (selectedEntityId && exportConfig?.entities.length) {
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
      setHasValidated(false);
      setIsDataValid(false);
    } else if (!selectedEntityId) {
      setFieldMappings({});
      setValidationMessages([]);
      setHasValidated(false);
      setIsDataValid(false);
    }
   }, [selectedEntityId, appColumns, exportConfig]);

  const handleMappingChange = (targetFieldName: string, sourceColumnName: string) => {
    setFieldMappings(prev => ({ 
      ...prev, 
      [targetFieldName]: sourceColumnName === NOT_MAPPED_VALUE ? '' : sourceColumnName 
    }));
    setHasValidated(false); // Mappings changed, require re-validation
    setIsDataValid(false);
    setValidationMessages([]);
  };

  const validateSingleRow = useCallback((row: Record<string, any>, rowIndex: number, entityFields: ExportEntityField[]): string[] => {
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
              } catch (e) { /* ignore invalid regex in config for now */ }
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
              if (targetField.minValue !== undefined && numValue < targetField.minValue) errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): min value ${targetField.minValue}, got ${numValue}.`);
              if (targetField.maxValue !== undefined && numValue > targetField.maxValue) errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): max value ${targetField.maxValue}, got ${numValue}.`);
            }
            break;
          case 'boolean':
            if (!['true', 'false', '1', '0', ''].includes(stringValue.toLowerCase())) errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): should be boolean (true/false, 1/0). Found "${stringValue}".`);
            break;
          case 'date':
            if (!isValidDateString(stringValue)) errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): not a valid date. Examples: YYYY-MM-DD, MM/DD/YYYY. Found "${stringValue}".`);
            break;
        }
      }
    });
    return errors;
  }, [fieldMappings]);

  const handleValidateData = useCallback(async () => {
    if (!selectedEntityId || !exportConfig) {
      showToast({ title: 'Setup Required', description: 'Please select a target entity and ensure configuration is loaded.', variant: 'destructive' });
      return;
    }
    const selectedEntity = exportConfig.entities.find(e => e.id === selectedEntityId);
    if (!selectedEntity) {
      showToast({ title: 'Entity Not Found', description: 'Configuration for selected entity is missing.', variant: 'destructive' });
      return;
    }

    setIsValidating(true);
    setAppContextIsLoading(true);
    setValidationMessages([]);

    let allValidationErrors: string[] = [];
    await new Promise(resolve => setTimeout(resolve, 0)); 

    appData.forEach((row, index) => {
      if (allValidationErrors.length < 200) { // Limit displayed errors
        const rowErrors = validateSingleRow(row, index, selectedEntity.fields);
        allValidationErrors = [...allValidationErrors, ...rowErrors];
      }
    });
    
    setHasValidated(true);
    setValidationMessages(allValidationErrors);
    
    if (allValidationErrors.length === 0) {
      setIsDataValid(true);
      showToast({ title: 'Validation Successful', description: 'Data is valid and ready for export.', variant: 'default' });
    } else {
      setIsDataValid(false);
      showToast({
        title: 'Validation Failed',
        description: `${allValidationErrors.length} error(s) found. Please review the errors.`,
        variant: 'destructive',
        duration: 7000,
      });
    }
    setIsValidating(false);
    setAppContextIsLoading(false);
  }, [appData, exportConfig, fieldMappings, selectedEntityId, showToast, validateSingleRow, setAppContextIsLoading]);

  const transformDataForExport = useCallback(() => {
    if (!selectedEntityId || !exportConfig || !appColumns.length) return [];
    const selectedEntity = exportConfig.entities.find(e => e.id === selectedEntityId);
    if (!selectedEntity) return [];

    return appData.map(row => {
      const transformedRow: Record<string, any> = {};
      selectedEntity.fields.forEach(targetField => {
        const sourceColumnName = fieldMappings[targetField.name];
        if (sourceColumnName && appColumns.includes(sourceColumnName)) {
           let valueToTransform = row[sourceColumnName];
           const stringValue = (valueToTransform === null || valueToTransform === undefined) ? '' : String(valueToTransform).trim();
           if (targetField.type === 'boolean') valueToTransform = stringValue.toLowerCase() === 'true' || stringValue === '1';
           else if (targetField.type === 'number' && stringValue !== '') valueToTransform = isNaN(parseFloat(stringValue)) ? null : parseFloat(stringValue);
           else if (targetField.type === 'date' && stringValue !== '') {
             const commonFormatMatch = stringValue.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
             if (commonFormatMatch) {
                const d = new Date(parseInt(commonFormatMatch[3]), parseInt(commonFormatMatch[1]) - 1, parseInt(commonFormatMatch[2]));
                if(isValid(d)) valueToTransform = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                else valueToTransform = stringValue;
             } else if (stringValue.match(/^\d{4}-\d{2}-\d{2}$/)) valueToTransform = stringValue;
             else if (isValid(parseISO(stringValue)) && stringValue.includes('T')) valueToTransform = stringValue.split('T')[0];
             else valueToTransform = stringValue;
           } else if (stringValue === '' && !targetField.required) valueToTransform = null; 
           else valueToTransform = stringValue; 
           transformedRow[targetField.name] = valueToTransform;
        } else if (targetField.required) {
          transformedRow[targetField.name] = null; // Or some default, though validation should catch unmapped requireds
        }
      });
      // Only include fields defined in the target entity for the export
      const finalRowForExport: Record<string, any> = {};
      selectedEntity.fields.forEach(tf => {
        finalRowForExport[tf.name] = transformedRow[tf.name];
      });
      return finalRowForExport;
    });
  }, [appData, appColumns, exportConfig, fieldMappings, selectedEntityId]);


  const handleExportToApi = async () => {
    if (!isDataValid || !hasValidated) {
      showToast({ title: 'Validation Required', description: 'Please validate the data successfully before exporting to API.', variant: 'destructive' });
      return;
    }
    if (!selectedEntityId || !exportConfig) return;
    const selectedEntity = exportConfig.entities.find(e => e.id === selectedEntityId);
    if (!selectedEntity) return;

    setIsExporting(true);
    setAppContextIsLoading(true);

    const payload = transformDataForExport();

    const authToken = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) : null;
    const requestHeaders: HeadersInit = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/plain, */*' };
    if (authToken) requestHeaders['Authorization'] = `Bearer ${authToken}`;
    else showToast({ title: 'Auth Token Missing', description: 'Exporting to API without authentication token.', variant: 'destructive' });
    
    const baseUrl = exportConfig.baseUrl || ''; 
    const fullApiUrl = (baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl) + (selectedEntity.url.startsWith('/') ? selectedEntity.url : '/' + selectedEntity.url);

    try {
      console.log(`Simulating API export to: ${fullApiUrl}`);
      console.log('Request Headers:', JSON.parse(JSON.stringify(requestHeaders)));
      console.log('Export Payload for API:', JSON.stringify(payload, null, 2));
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      showToast({ title: 'API Export "Simulated"', description: `Data for "${selectedEntity.name}" prepared for API. Check browser console.` });
    } catch (error: any) {
      setValidationMessages([`API Export Error: ${error.message || 'An unknown error occurred.'}`]);
      showToast({ title: 'API Export Error', description: 'Error during API export. See details on page.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
      setAppContextIsLoading(false);
    }
  };

  const handleExportToCsv = () => {
    if (!isDataValid || !hasValidated) {
      showToast({ title: 'Validation Required', description: 'Please validate the data successfully before exporting as CSV.', variant: 'destructive' });
      return;
    }
    if (!selectedEntityId || !exportConfig) return;
    const selectedEntity = exportConfig.entities.find(e => e.id === selectedEntityId);
    if (!selectedEntity) return;

    setIsExporting(true); // Reuse isExporting state
    setAppContextIsLoading(true);

    try {
      const dataToExport = transformDataForExport();
      const headersForCsv = selectedEntity.fields.map(f => f.name);
      const csvString = objectsToCsv(headersForCsv, dataToExport);

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const exportFileName = originalFileName ? `${originalFileName.split('.')[0]}_${selectedEntity.name.replace(/\s+/g, '_')}.csv` : `${selectedEntity.name.replace(/\s+/g, '_')}_export.csv`;
      link.setAttribute('download', exportFileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast({ title: 'CSV Exported', description: `Data for "${selectedEntity.name}" downloaded as ${exportFileName}.` });
    } catch (error: any) {
      console.error('Error exporting to CSV:', error);
      showToast({ title: 'CSV Export Error', description: 'Failed to generate CSV file.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
      setAppContextIsLoading(false);
    }
  };


  const selectedEntityConfig = exportConfig?.entities.find(e => e.id === selectedEntityId);
  const noEntitiesConfigured = !exportConfig || exportConfig.entities.length === 0;
  const noDataLoaded = appData.length === 0;

  if (isAuthLoading && !isAuthenticated) {
    return (
      <AppLayout pageTitle="Loading Export Data...">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Export Data">
        <div className="flex flex-col h-full p-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Export Configuration</CardTitle>
                    <CardDescription>
                        Select the target API entity and map your current data columns to the API's expected fields.
                        Ensure entities are configured on the <Link href="/setup" className="underline text-primary hover:text-primary/80">Setup page</Link>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <Label htmlFor="entity-select" className="md:text-right">Target API Entity</Label>
                        <div className="md:col-span-2">
                            <Select 
                                value={selectedEntityId} 
                                onValueChange={setSelectedEntityId} 
                                disabled={isLoading || isFetchingConfig || noEntitiesConfigured}
                            >
                                <SelectTrigger id="entity-select">
                                    <SelectValue placeholder={noEntitiesConfigured ? "No entities configured" : "Select an entity"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {noEntitiesConfigured && <SelectItem value="no-config" disabled>No entities configured in Setup</SelectItem>}
                                    {exportConfig?.entities.map((entity) => (<SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                            {noEntitiesConfigured && !isFetchingConfig && (
                                <p className="text-xs text-destructive mt-1">
                                    Please configure target entities on the <Link href="/setup" className="underline">Setup page</Link> first.
                                </p>
                            )}
                        </div>
                    </div>

                    {selectedEntityConfig && (
                        <div>
                            <h4 className="text-md font-semibold mb-3 text-center md:text-left">Map Columns for "{selectedEntityConfig.name}"</h4>
                            <ScrollArea className="max-h-72 border rounded-md p-4">
                                <div className="space-y-3">
                                    {selectedEntityConfig.fields.map(targetField => (
                                        <div key={targetField.name} className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 items-center">
                                            <Label htmlFor={`map-${targetField.name}`} className="text-sm md:text-right truncate" title={`${targetField.name} (${targetField.type || 'any'})`}>
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
                            <p className="text-xs text-muted-foreground mt-2"><span className="text-destructive">*</span> Target API field is required and must be mapped.</p>
                        </div>
                    )}
                    {!selectedEntityConfig && exportConfig?.entities.length > 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Select an entity to configure field mappings.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Data Validation</CardTitle>
                    <CardDescription>
                       Validate your mapped data against the target entity's rules before exporting.
                       This step is required before any Export button is enabled.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Button 
                        onClick={handleValidateData} 
                        disabled={isLoading || !selectedEntityConfig || noDataLoaded} 
                        className="w-full md:w-auto"
                    >
                        {isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (hasValidated ? <CheckCircle className="mr-2 h-4 w-4"/> : null)}
                        {isValidating ? 'Validating...' : (hasValidated ? 'Re-validate Data' : 'Validate Data')}
                    </Button>
                    {noDataLoaded && !isLoading && <p className="text-sm text-orange-600 mt-2">No data loaded to validate. Please upload a file first.</p>}
                </CardContent>
                {hasValidated && validationMessages.length > 0 && (
                    <CardFooter className="flex-col items-start gap-2">
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Validation Errors ({validationMessages.length} found)</AlertTitle>
                            <ScrollArea className="max-h-60 mt-2">
                                <AlertDescription>
                                    <ul className="list-disc pl-5 text-xs space-y-1">
                                        {validationMessages.slice(0, 50).map((msg, index) => (<li key={index}>{msg}</li>))}
                                        {validationMessages.length > 50 && <li>...and {validationMessages.length - 50} more errors.</li>}
                                    </ul>
                                </AlertDescription>
                            </ScrollArea>
                        </Alert>
                    </CardFooter>
                )}
                 {hasValidated && validationMessages.length === 0 && (
                    <CardFooter>
                        <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-900/30">
                            <CheckCircle className="h-4 w-4 text-green-700 dark:text-green-400" />
                            <AlertTitle className="text-green-800 dark:text-green-300">Validation Successful</AlertTitle>
                            <AlertDescription className="text-green-700 dark:text-green-500">
                                Your data meets all requirements for the selected entity.
                            </AlertDescription>
                        </Alert>
                    </CardFooter>
                )}
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Export Actions</CardTitle>
                    <CardDescription>
                        Once data is successfully validated, you can export it to the target API or download it as a CSV file.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4">
                    <Button 
                        onClick={handleExportToApi} 
                        disabled={isLoading || !hasValidated || !isDataValid || !selectedEntityConfig}
                        className="w-full sm:w-auto"
                    >
                        {isExporting && appContextIsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                        Export to API
                    </Button>
                    <Button 
                        onClick={handleExportToCsv} 
                        variant="outline"
                        disabled={isLoading || !hasValidated || !isDataValid || !selectedEntityConfig}
                        className="w-full sm:w-auto"
                    >
                        {isExporting && appContextIsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <DownloadCloud className="mr-2 h-4 w-4" />}
                        Download as CSV
                    </Button>
                </CardContent>
                 <CardFooter>
                    <p className="text-xs text-muted-foreground">
                        Export buttons are enabled after successful validation.
                        API export is currently simulated; check browser console for payload.
                    </p>
                </CardFooter>
            </Card>
        </div>
    </AppLayout>
  );
}
