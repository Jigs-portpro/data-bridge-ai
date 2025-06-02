
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
import { Trash2, PlusCircle, Download, Settings, ChevronsUpDown, GripVertical } from 'lucide-react';
import { exportEntities as initialEntitiesConfig, type ExportEntity, type ExportEntityField } from '@/config/exportEntities';
import { useAppContext } from '@/hooks/useAppContext';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

const fieldTypes: ExportEntityField['type'][] = ['string', 'number', 'boolean', 'email'];

export default function SetupPage() {
  const { isAuthenticated, isAuthLoading, showToast } = useAppContext();
  const router = useRouter();
  const [entities, setEntities] = useState<ExportEntity[]>([]);
  const [generatedJson, setGeneratedJson] = useState<string>('');
  const [isLoadingState, setIsLoadingState] = useState(true); // For initial loading of config

  useEffect(() => {
    // Deep copy initial entities to avoid direct mutation
    // Add a unique internal ID for React keys during mapping if entities don't have one
    const entitiesWithInternalIds = JSON.parse(JSON.stringify(initialEntitiesConfig)).map((entity: ExportEntity, index: number) => ({
      ...entity,
      internalId: entity.id || `entity-${Date.now()}-${index}`, // Fallback if id isn't robust
      fields: entity.fields.map((field, fieldIndex) => ({
        ...field,
        internalId: `field-${Date.now()}-${index}-${fieldIndex}`
      }))
    }));
    setEntities(entitiesWithInternalIds);
    setIsLoadingState(false);
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const handleAddEntity = () => {
    setEntities(prev => [
      ...prev,
      {
        internalId: `entity-${Date.now()}`,
        id: `newEntity${prev.length + 1}`,
        name: `New Entity ${prev.length + 1}`,
        url: 'https://api.example.com/new',
        fields: [],
      } as ExportEntity & { internalId: string } // Cast to include internalId
    ]);
  };

  const handleRemoveEntity = (entityInternalId: string) => {
    setEntities(prev => prev.filter(e => e.internalId !== entityInternalId));
  };

  const handleEntityChange = (entityInternalId: string, key: keyof ExportEntity, value: any) => {
    setEntities(prev =>
      prev.map(e => (e.internalId === entityInternalId ? { ...e, [key]: value } : e))
    );
  };

  const handleAddField = (entityInternalId: string) => {
    setEntities(prev =>
      prev.map(e => {
        if (e.internalId === entityInternalId) {
          return {
            ...e,
            fields: [
              ...e.fields,
              {
                internalId: `field-${Date.now()}-${e.fields.length}`,
                name: `newField${e.fields.length + 1}`,
                apiName: `newField${e.fields.length + 1}`,
                required: false,
                type: 'string',
              } as ExportEntityField & { internalId: string } // Cast
            ],
          };
        }
        return e;
      })
    );
  };

  const handleRemoveField = (entityInternalId: string, fieldInternalId: string) => {
    setEntities(prev =>
      prev.map(e => {
        if (e.internalId === entityInternalId) {
          return { ...e, fields: e.fields.filter(f => f.internalId !== fieldInternalId) };
        }
        return e;
      })
    );
  };

  const handleFieldChange = (entityInternalId: string, fieldInternalId: string, key: keyof ExportEntityField, value: any) => {
    setEntities(prev =>
      prev.map(e => {
        if (e.internalId === entityInternalId) {
          return {
            ...e,
            fields: e.fields.map(f =>
              f.internalId === fieldInternalId ? { ...f, [key]: value } : f
            ),
          };
        }
        return e;
      })
    );
  };

  const handleGenerateJson = () => {
    try {
      // Create a new array excluding internalId from entities and fields
      const entitiesForExport = entities.map(({ internalId, fields, ...entityRest }) => ({
        ...entityRest,
        fields: fields.map(({ internalId: fieldInternalId, ...fieldRest }) => fieldRest)
      }));
      const jsonString = JSON.stringify(entitiesForExport, null, 2);
      setGeneratedJson(jsonString);
      showToast({ title: 'JSON Generated', description: 'Copy the JSON from the text area and update src/config/exportEntities.ts' });
    } catch (error) {
      showToast({ title: 'Error Generating JSON', description: `Could not serialize configuration: ${error instanceof Error ? error.message : String(error)}`, variant: 'destructive' });
    }
  };

  if (isAuthLoading || !isAuthenticated || isLoadingState) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold font-headline text-primary">Entity Configuration Setup</h1>
          </div>
          <Button onClick={handleAddEntity} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Entity
          </Button>
        </div>
        <CardDescription>
          Configure entities for data export. Define their API endpoints and field mappings.
          After making changes, click "Generate JSON" and manually update your <code>src/config/exportEntities.ts</code> file.
        </CardDescription>
        <Separator />

        {entities.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No entities configured yet. Click "Add New Entity" to start.</p>
        )}

        <Accordion type="multiple" className="w-full space-y-4">
          {entities.map((entity, entityIndex) => (
            <AccordionItem value={entity.internalId || entity.id} key={entity.internalId || entity.id} className="border rounded-lg bg-card shadow">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <ChevronsUpDown className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-lg font-semibold text-primary">{entity.name || "Untitled Entity"}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRemoveEntity(entity.internalId);}} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-2 border-t">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`entity-id-${entity.internalId}`}>Entity ID (Unique Key)</Label>
                      <Input
                        id={`entity-id-${entity.internalId}`}
                        value={entity.id}
                        onChange={e => handleEntityChange(entity.internalId, 'id', e.target.value)}
                        placeholder="e.g., tmsCustomer"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`entity-name-${entity.internalId}`}>Entity Name (Display)</Label>
                      <Input
                        id={`entity-name-${entity.internalId}`}
                        value={entity.name}
                        onChange={e => handleEntityChange(entity.internalId, 'name', e.target.value)}
                        placeholder="e.g., TMS Customer"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`entity-url-${entity.internalId}`}>API URL</Label>
                    <Input
                      id={`entity-url-${entity.internalId}`}
                      value={entity.url}
                      onChange={e => handleEntityChange(entity.internalId, 'url', e.target.value)}
                      placeholder="https://api.example.com/endpoint"
                    />
                  </div>

                  <Separator />
                  <div className="flex justify-between items-center">
                    <h4 className="text-md font-semibold">Fields Configuration</h4>
                    <Button variant="outline" size="sm" onClick={() => handleAddField(entity.internalId)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Field
                    </Button>
                  </div>

                  {entity.fields.length === 0 && <p className="text-sm text-muted-foreground">No fields defined for this entity.</p>}
                  
                  <ScrollArea className="max-h-96">
                    <div className="space-y-4 pr-3">
                    {entity.fields.map((field, fieldIndex) => (
                      <Card key={field.internalId || fieldIndex} className="p-4 bg-background/50">
                        <div className="space-y-3">
                            <div className="flex justify-end">
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveField(entity.internalId, field.internalId)} className="text-destructive hover:bg-destructive/10 h-7 w-7">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`field-name-${entity.internalId}-${field.internalId}`}>Field Name (Source)</Label>
                              <Input
                                id={`field-name-${entity.internalId}-${field.internalId}`}
                                value={field.name}
                                onChange={e => handleFieldChange(entity.internalId, field.internalId, 'name', e.target.value)}
                                placeholder="e.g., CustomerName"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`field-apiName-${entity.internalId}-${field.internalId}`}>API Name (Target)</Label>
                              <Input
                                id={`field-apiName-${entity.internalId}-${field.internalId}`}
                                value={field.apiName || ''}
                                onChange={e => handleFieldChange(entity.internalId, field.internalId, 'apiName', e.target.value)}
                                placeholder="e.g., customer_name (optional)"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                            <div>
                                <Label htmlFor={`field-type-${entity.internalId}-${field.internalId}`}>Data Type</Label>
                                <Select
                                value={field.type || 'string'}
                                onValueChange={(value: ExportEntityField['type']) => handleFieldChange(entity.internalId, field.internalId, 'type', value)}
                                >
                                <SelectTrigger id={`field-type-${entity.internalId}-${field.internalId}`}>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {fieldTypes.map(type => (
                                    <SelectItem key={type} value={type || 'string'}>
                                        {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'String'}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center space-x-2 pt-6">
                              <Checkbox
                                id={`field-required-${entity.internalId}-${field.internalId}`}
                                checked={field.required || false}
                                onCheckedChange={(checked) => handleFieldChange(entity.internalId, field.internalId, 'required', !!checked)}
                              />
                              <Label htmlFor={`field-required-${entity.internalId}-${field.internalId}`}>Required Field</Label>
                            </div>
                          </div>
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

        {entities.length > 0 && (
          <>
            <Separator />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Download className="mr-2 h-5 w-5"/>Generated JSON Configuration</CardTitle>
                <CardDescription>
                  Click the button below to generate the JSON. Copy the output and replace the content of your <code>src/config/exportEntities.ts</code> file.
                  Make sure the variable name in that file remains <code>export const exportEntities: ExportEntity[] = ...</code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleGenerateJson} className="w-full">
                  Generate JSON for Config File
                </Button>
                {generatedJson && (
                  <Textarea
                    value={generatedJson}
                    readOnly
                    rows={15}
                    className="mt-4 font-code text-xs bg-muted/50"
                    aria-label="Generated JSON configuration"
                  />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
