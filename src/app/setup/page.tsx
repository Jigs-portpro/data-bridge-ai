
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Trash2, PlusCircle, Download, Settings, ChevronsUpDown, Loader2 } from 'lucide-react';
import type { ExportEntity, ExportEntityField } from '@/config/exportEntities'; // Only import types
import { useAppContext } from '@/hooks/useAppContext';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';


interface SetupExportEntityField extends ExportEntityField {
  internalId: string;
}

interface SetupExportEntity extends Omit<ExportEntity, 'fields'> {
  internalId: string;
  id: string;
  fields: SetupExportEntityField[];
}

const fieldTypes: ExportEntityField['type'][] = ['string', 'number', 'boolean', 'email', 'date'];

export default function SetupPage() {
  const { showToast, isAuthenticated, isAuthLoading } = useAppContext();
  const router = useRouter();
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
      const data: ExportEntity[] = await response.json();
      setEntities(data.map(e => ({
        ...e,
        internalId: e.id || `entity-${Math.random().toString(36).substr(2, 9)}`,
        fields: e.fields.map(f => ({
          ...f,
          internalId: `field-${Math.random().toString(36).substr(2, 9)}-${e.id}-${f.name}`
        }))
      })));
    } catch (error) {
      console.error('Failed to load entities config:', error);
      showToast({ title: 'Error', description: 'Could not load entity configurations.', variant: 'destructive' });
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
    // Convert SetupExportEntity back to ExportEntity for saving (remove internalId)
    const entitiesToSave: ExportEntity[] = entities.map(({ internalId, fields, ...rest }) => ({
      ...rest,
      fields: fields.map(({ internalId: fieldInternalId, ...fieldRest }) => fieldRest)
    }));

    try {
      const response = await fetch('/api/export-entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entitiesToSave, null, 2),
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
    const newEntityId = `new-entity-${entities.length + 1}-${Math.random().toString(36).substr(2, 5)}`;
    setEntities([
      ...entities,
      {
        internalId: newEntityId,
        id: `entity${entities.length + 1}`,
        name: `New Entity ${entities.length + 1}`,
        url: 'https://api.example.com/your-endpoint',
        fields: [],
      },
    ]);
  };

  const handleRemoveEntity = (internalId: string) => {
    setEntities(entities.filter((e) => e.internalId !== internalId));
  };

  const handleEntityChange = (internalId: string, field: keyof SetupExportEntity, value: any) => {
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
                  internalId: `field-${Math.random().toString(36).substr(2, 9)}-${e.id}-new`,
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
                               ? (value === '' ? undefined : Number(value))
                               : (value === '' && (prop === 'pattern')) // allow empty pattern to become undefined
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
      <div className="flex flex-col h-full space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-muted-foreground" />
            <span className="text-lg font-semibold">Manage API Export Targets</span>
          </div>
          <Button onClick={handleAddEntity} variant="outline" size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Target Entity
          </Button>
        </div>
        <CardDescription>
          Define the target entities for data export. Configure their API endpoints, field names, types, and validation rules.
          Your configurations are saved to `exportEntities.json` in the project root when you click "Save Configuration".
        </CardDescription>
        
        <Separator />

        {entities.length === 0 && !isFetching && (
          <Card className="text-center p-6">
            <CardTitle>No Entities Configured</CardTitle>
            <CardDescription>Click "Add New Target Entity" to get started.</CardDescription>
          </Card>
        )}

        <ScrollArea className="flex-grow pr-3"> {/* Outer ScrollArea for entities list */}
          <Accordion type="multiple" className="w-full space-y-4">
            {entities.map((entity) => (
              <AccordionItem key={entity.internalId} value={entity.internalId} className="border rounded-lg shadow-sm bg-card">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full">
                    <Input
                        value={entity.name}
                        onChange={(e) => { e.stopPropagation(); handleEntityChange(entity.internalId, 'name', e.target.value);}}
                        onClick={(e) => e.stopPropagation()} // Prevent accordion toggle
                        className="text-lg font-semibold mr-4 h-9 flex-grow"
                        placeholder="Entity Display Name"
                      />
                    <div role="button" onClick={(e) => { e.stopPropagation(); handleRemoveEntity(entity.internalId); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-0">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`entity-id-${entity.internalId}`}>Unique Entity ID (for system use)</Label>
                      <Input
                        id={`entity-id-${entity.internalId}`}
                        value={entity.id}
                        onChange={(e) => handleEntityChange(entity.internalId, 'id', e.target.value)}
                        placeholder="e.g., tmsCustomer, productList"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`entity-url-${entity.internalId}`}>API Endpoint URL</Label>
                      <Input
                        id={`entity-url-${entity.internalId}`}
                        value={entity.url}
                        onChange={(e) => handleEntityChange(entity.internalId, 'url', e.target.value)}
                        placeholder="https://api.example.com/your-endpoint"
                        className="mt-1"
                      />
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Target API Fields</h4>
                      <Button onClick={() => handleAddField(entity.internalId)} size="sm" variant="outline">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Field
                      </Button>
                    </div>
                    <ScrollArea className="max-h-96 border rounded-md"> {/* Inner ScrollArea for fields list */}
                      <div className="p-4 space-y-4">
                        {entity.fields.length === 0 && <p className="text-sm text-muted-foreground">No fields defined for this entity.</p>}
                        {entity.fields.map((field) => (
                          <Card key={field.internalId} className="p-4 bg-muted/30">
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <Input
                                  value={field.name}
                                  onChange={(e) => handleFieldChange(entity.internalId, field.internalId, 'name', e.target.value)}
                                  placeholder="Target API Field Name"
                                  className="font-medium flex-grow"
                                />
                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 ml-2 flex-shrink-0" onClick={() => handleRemoveField(entity.internalId, field.internalId)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor={`field-type-${field.internalId}`}>Data Type</Label>
                                  <Select
                                    value={field.type}
                                    onValueChange={(value) => handleFieldChange(entity.internalId, field.internalId, 'type', value)}
                                  >
                                    <SelectTrigger id={`field-type-${field.internalId}`} className="mt-1">
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {fieldTypes.map((type) => (
                                        <SelectItem key={type} value={type || ''}>
                                          {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Any'}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-end pb-1.5">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`field-required-${field.internalId}`}
                                      checked={!!field.required}
                                      onCheckedChange={(checked) => handleFieldChange(entity.internalId, field.internalId, 'required', !!checked)}
                                    />
                                    <Label htmlFor={`field-required-${field.internalId}`} className="font-normal">Required by API</Label>
                                  </div>
                                </div>
                              </div>

                              {(field.type === 'string' || field.type === 'email') && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                  <div>
                                    <Label htmlFor={`field-minlength-${field.internalId}`}>Min Length</Label>
                                    <Input
                                      id={`field-minlength-${field.internalId}`}
                                      type="number"
                                      placeholder="e.g., 2"
                                      value={field.minLength ?? ''}
                                      onChange={(e) => handleFieldChange(entity.internalId, field.internalId, 'minLength', e.target.value)}
                                      className="mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`field-maxlength-${field.internalId}`}>Max Length</Label>
                                    <Input
                                      id={`field-maxlength-${field.internalId}`}
                                      type="number"
                                      placeholder="e.g., 100"
                                      value={field.maxLength ?? ''}
                                      onChange={(e) => handleFieldChange(entity.internalId, field.internalId, 'maxLength', e.target.value)}
                                      className="mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`field-pattern-${field.internalId}`}>Pattern (Regex)</Label>
                                    <Input
                                      id={`field-pattern-${field.internalId}`}
                                      placeholder="e.g., ^[A-Za-z]+$"
                                      value={field.pattern ?? ''}
                                      onChange={(e) => handleFieldChange(entity.internalId, field.internalId, 'pattern', e.target.value)}
                                      className="mt-1"
                                    />
                                  </div>
                                </div>
                              )}
                              {field.type === 'number' && (
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                  <div>
                                    <Label htmlFor={`field-minvalue-${field.internalId}`}>Min Value</Label>
                                    <Input
                                      id={`field-minvalue-${field.internalId}`}
                                      type="number"
                                      placeholder="e.g., 0"
                                      value={field.minValue ?? ''}
                                      onChange={(e) => handleFieldChange(entity.internalId, field.internalId, 'minValue', e.target.value)}
                                      className="mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`field-maxvalue-${field.internalId}`}>Max Value</Label>
                                    <Input
                                      id={`field-maxvalue-${field.internalId}`}
                                      type="number"
                                      placeholder="e.g., 1000"
                                      value={field.maxValue ?? ''}
                                      onChange={(e) => handleFieldChange(entity.internalId, field.internalId, 'maxValue', e.target.value)}
                                      className="mt-1"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
        
        {entities.length > 0 && (
          <div className="flex-shrink-0 pt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Download className="mr-2 h-5 w-5"/>Save Configuration to File</CardTitle>
                <CardDescription>
                  Click the button below to save your current entity configuration to the server (`exportEntities.json`).
                  This file acts as your current database for entity definitions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleSaveConfig} className="w-full" disabled={isSaving}>
                   {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving to exportEntities.json...</> : 'Save Configuration to File'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
