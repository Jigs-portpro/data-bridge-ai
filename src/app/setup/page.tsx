
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Trash2, PlusCircle, Download, Settings, Loader2, GripVertical } from 'lucide-react';
import type { ExportEntity, ExportEntityField, ExportConfig } from '@/config/exportEntities';
import { useAppContext } from '@/hooks/useAppContext';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface SetupExportEntityField extends ExportEntityField {
  internalId: string;
}

interface SetupExportEntity extends Omit<ExportEntity, 'fields'> {
  internalId: string;
  id: string;
  fields: SetupExportEntityField[];
}

const fieldTypes: Required<ExportEntityField>['type'][] = ['string', 'number', 'boolean', 'email', 'date'];

export default function SetupPage() {
  const { showToast, isAuthenticated, isAuthLoading } = useAppContext();
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [entities, setEntities] = useState<SetupExportEntity[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const fetchConfig = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await fetch('/api/export-entities');
      if (!response.ok) throw new Error('Failed to fetch config');
      const config: ExportConfig = await response.json();
      setBaseUrl(config.baseUrl || '');
      setEntities(config.entities.map(e => ({
        ...e,
        id: e.id || `entity-${Math.random().toString(36).substring(2, 11)}`,
        internalId: `entity-internal-${e.id || 'new'}-${Math.random().toString(36).substring(2,9)}-${Date.now()}`,
        fields: e.fields.map(f => ({
          ...f,
          internalId: `field-internal-${Math.random().toString(36).substring(2, 9)}-${e.id || 'new'}-${f.name}-${Date.now()}`
        }))
      })));
    } catch (error) {
      console.error('Failed to load entities config:', error);
      showToast({ title: 'Error', description: 'Could not load entity configurations.', variant: 'destructive' });
      setBaseUrl('https://api.example.com/v1'); // Default fallback
      setEntities([]);
    } finally {
      setIsFetching(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchConfig();
    }
  }, [isAuthenticated, fetchConfig]);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    const entitiesToSave: ExportEntity[] = entities.map(({ internalId, fields, ...rest }) => ({
      ...rest,
      id: rest.id,
      fields: fields.map(({ internalId: fieldInternalId, ...fieldRest }) => {
        const cleanedField: ExportEntityField = { ...fieldRest };
        if (cleanedField.minLength === undefined || cleanedField.minLength === null || isNaN(Number(cleanedField.minLength))) delete cleanedField.minLength;
        if (cleanedField.maxLength === undefined || cleanedField.maxLength === null || isNaN(Number(cleanedField.maxLength))) delete cleanedField.maxLength;
        if (cleanedField.minValue === undefined || cleanedField.minValue === null || isNaN(Number(cleanedField.minValue))) delete cleanedField.minValue;
        if (cleanedField.maxValue === undefined || cleanedField.maxValue === null || isNaN(Number(cleanedField.maxValue))) delete cleanedField.maxValue;
        if (cleanedField.pattern === '' || cleanedField.pattern === undefined) delete cleanedField.pattern;
        return cleanedField;
      })
    }));

    const configToSave: ExportConfig = { baseUrl, entities: entitiesToSave };

    try {
      const response = await fetch('/api/export-entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSave, null, 2),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to save configuration.' }));
        throw new Error(errorData.message);
      }
      showToast({ title: 'Success', description: 'Configuration saved successfully to exportEntities.json.' });
    } catch (error: any) {
      console.error('Failed to save entities config:', error);
      showToast({ title: 'Error Saving', description: error.message || 'Could not save entity configurations.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEntity = () => {
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const newEntityInternalId = `entity-internal-${Date.now()}-${randomSuffix}`;
    const newEntityId = `new-entity-${entities.length + 1}-${randomSuffix}`;
    setEntities([
      ...entities,
      {
        internalId: newEntityInternalId,
        id: newEntityId,
        name: `New Entity ${entities.length + 1}`,
        url: '/new-endpoint',
        fields: [],
      },
    ]);
  };

  const handleRemoveEntity = (internalId: string) => {
    setEntities(entities.filter((e) => e.internalId !== internalId));
  };

  const handleEntityChange = (internalId: string, field: keyof Omit<SetupExportEntity, 'fields' | 'internalId'>, value: any) => {
    setEntities(
      entities.map((e) => (e.internalId === internalId ? { ...e, [field]: value } : e))
    );
  };

  const handleAddField = (entityInternalId: string) => {
    setEntities(
      entities.map((e) =>
        e.internalId === entityInternalId
          ? {
              ...e,
              fields: [
                ...e.fields,
                {
                  internalId: `field-internal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  name: `newField${e.fields.length + 1}`,
                  type: 'string',
                },
              ],
            }
          : e
      )
    );
  };

  const handleRemoveField = (entityInternalId: string, fieldInternalId: string) => {
    setEntities(
      entities.map((e) =>
        e.internalId === entityInternalId
          ? { ...e, fields: e.fields.filter((f) => f.internalId !== fieldInternalId) }
          : e
      )
    );
  };

  const handleFieldChange = (
    entityInternalId: string,
    fieldInternalId: string,
    prop: keyof SetupExportEntityField,
    value: any
  ) => {
    setEntities(
      entities.map((e) =>
        e.internalId === entityInternalId
          ? {
              ...e,
              fields: e.fields.map((f) =>
                f.internalId === fieldInternalId
                  ? {
                      ...f,
                      [prop]: (prop === 'minLength' || prop === 'maxLength' || prop === 'minValue' || prop === 'maxValue')
                               ? (value === '' || isNaN(Number(value)) ? undefined : Number(value))
                               : (prop === 'pattern' && value === '')
                                 ? undefined
                                 : value
                    }
                  : f
              ),
            }
          : e
      )
    );
  };

  if (isAuthLoading || !isAuthenticated || isFetching) {
    return (
      <AppLayout pageTitle="Loading Setup...">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const pageTitleString = "Configure Export Target Entities";

  return (
    <AppLayout pageTitle={pageTitleString}>
      <div className="flex flex-col h-full space-y-4 p-1">
        <Card className="flex-shrink-0">
          <CardHeader>
            <CardTitle className="flex items-center text-lg"><Settings className="mr-2 h-5 w-5"/>Global API Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="baseUrl" className="text-sm">Base API URL</Label>
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="e.g., https://api.example.com/v1"
                className="mt-1 h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">This URL will prefix all entity endpoint paths.</p>
            </div>
          </CardContent>
        </Card>

        <Separator className="flex-shrink-0"/>

        <div className="flex items-center justify-between flex-shrink-0">
            <h2 className="text-lg font-semibold">Target Entities</h2>
            <Button onClick={handleAddEntity} variant="outline" size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Entity
            </Button>
        </div>

        {entities.length === 0 && !isFetching && (
          <Card className="text-center p-6 mt-4 flex-shrink-0">
            <CardTitle className="text-base">No Entities Configured</CardTitle>
            <CardDescription className="text-sm">Click "Add New Entity" to get started.</CardDescription>
          </Card>
        )}

        <ScrollArea className="flex-grow min-h-0"> 
          <div className="space-y-3 pr-2">
            {entities.map((entity) => (
              <Card key={entity.internalId} className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between bg-muted/50 p-3">
                    <div className="flex items-center gap-2 flex-grow">
                         <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab flex-shrink-0" />
                         <Input
                            value={entity.name}
                            onChange={(e) => handleEntityChange(entity.internalId, 'name', e.target.value)}
                            className="text-md font-semibold h-9 flex-grow border-0 shadow-none focus-visible:ring-0 bg-transparent p-1"
                            placeholder="Entity Display Name"
                          />
                    </div>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 flex-shrink-0 h-8 w-8" onClick={() => handleRemoveEntity(entity.internalId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`entity-id-${entity.internalId}`} className="text-xs">Unique Entity ID</Label>
                      <Input
                        id={`entity-id-${entity.internalId}`}
                        value={entity.id}
                        onChange={(e) => handleEntityChange(entity.internalId, 'id', e.target.value)}
                        placeholder="e.g., tmsCustomer"
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`entity-url-${entity.internalId}`} className="text-xs">Endpoint Path</Label>
                      <Input
                        id={`entity-url-${entity.internalId}`}
                        value={entity.url}
                        onChange={(e) => handleEntityChange(entity.internalId, 'url', e.target.value)}
                        placeholder="e.g., /customers"
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                  </div>
                  <Separator/>
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-sm">Target API Fields</h4>
                    <Button onClick={() => handleAddField(entity.internalId)} size="sm" variant="outline" className="h-8 text-xs px-2 py-1">
                      <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Field
                    </Button>
                  </div>
                  <ScrollArea className="max-h-[300px] border rounded-md"> 
                    <div className="p-2 space-y-2">
                      {entity.fields.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No fields defined.</p>}
                      {entity.fields.map((field) => (
                        <Card key={field.internalId} className="p-2 bg-slate-50 dark:bg-slate-800/30 shadow-sm">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Input
                                value={field.name}
                                onChange={(e) => handleFieldChange(entity.internalId, field.internalId, 'name', e.target.value)}
                                placeholder="Target API Field Name"
                                className="font-medium flex-grow text-xs h-8 p-1.5"
                              />
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 ml-1.5 flex-shrink-0 h-7 w-7" onClick={() => handleRemoveField(entity.internalId, field.internalId)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 items-end">
                              <div>
                                <Label htmlFor={`field-type-${field.internalId}`} className="text-xs">Data Type</Label>
                                <Select
                                  value={field.type}
                                  onValueChange={(value) => handleFieldChange(entity.internalId, field.internalId, 'type', value)}
                                >
                                  <SelectTrigger id={`field-type-${field.internalId}`} className="mt-1 text-xs h-8">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fieldTypes.map((type) => (
                                      <SelectItem key={type} value={type || ''} className="text-xs">
                                        {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Any'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center space-x-1.5 pt-3 sm:pt-4">
                                  <Checkbox
                                    id={`field-required-${field.internalId}`}
                                    checked={!!field.required}
                                    onCheckedChange={(checked) => handleFieldChange(entity.internalId, field.internalId, 'required', !!checked)}
                                    className="h-3.5 w-3.5"
                                  />
                                  <Label htmlFor={`field-required-${field.internalId}`} className="font-normal text-xs">Required</Label>
                              </div>
                            </div>

                            {(field.type === 'string' || field.type === 'email') && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1.5">
                                <div>
                                  <Label htmlFor={`field-minlength-${field.internalId}`} className="text-xs">Min Len</Label>
                                  <Input
                                    id={`field-minlength-${field.internalId}`} type="number" placeholder="e.g., 2"
                                    value={field.minLength ?? ''}
                                    onChange={(e) => handleFieldChange(entity.internalId, field.internalId, 'minLength', e.target.value)}
                                    className="mt-1 text-xs h-8"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`field-maxlength-${field.internalId}`} className="text-xs">Max Len</Label>
                                  <Input
                                    id={`field-maxlength-${field.internalId}`} type="number" placeholder="e.g., 100"
                                    value={field.maxLength ?? ''}
                                    onChange={(e) => handleFieldChange(entity.internalId, field.internalId, 'maxLength', e.target.value)}
                                    className="mt-1 text-xs h-8"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`field-pattern-${field.internalId}`} className="text-xs">Pattern</Label>
                                  <Input
                                    id={`field-pattern-${field.internalId}`} placeholder="Regex"
                                    value={field.pattern ?? ''}
                                    onChange={(e) => handleFieldChange(entity.internalId, field.internalId, 'pattern', e.target.value)}
                                    className="mt-1 text-xs h-8"
                                  />
                                </div>
                              </div>
                            )}
                            {field.type === 'number' && (
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5">
                                <div>
                                  <Label htmlFor={`field-minvalue-${field.internalId}`} className="text-xs">Min Val</Label>
                                  <Input
                                    id={`field-minvalue-${field.internalId}`} type="number" placeholder="e.g., 0"
                                    value={field.minValue ?? ''}
                                    onChange={(e) => handleFieldChange(entity.internalId, field.internalId, 'minValue', e.target.value)}
                                    className="mt-1 text-xs h-8"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`field-maxvalue-${field.internalId}`} className="text-xs">Max Val</Label>
                                  <Input
                                    id={`field-maxvalue-${field.internalId}`} type="number" placeholder="e.g., 1000"
                                    value={field.maxValue ?? ''}
                                    onChange={(e) => handleFieldChange(entity.internalId, field.internalId, 'maxValue', e.target.value)}
                                    className="mt-1 text-xs h-8"
                                  />
                                </div>
                              </div>
                            )}
                             {field.type === 'date' && (
                                <div className="pt-1.5">
                                  <p className="text-xs text-muted-foreground">Date validation applied during export (e.g. YYYY-MM-DD, MM/DD/YYYY).</p>
                                </div>
                              )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="flex-shrink-0 pt-6">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="flex items-center text-md"><Download className="mr-2 h-4 w-4"/>Save Configuration to File</CardTitle>
              <CardDescription className="text-xs">
               Click to save Base API URL and entity configurations to <code>exportEntities.json</code>.
               This file is the source of truth for these settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Button onClick={handleSaveConfig} className="w-full h-9 text-sm" disabled={isSaving}>
                 {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Configuration to File'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}


    