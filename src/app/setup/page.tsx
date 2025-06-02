
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
import { Trash2, PlusCircle, Download, Settings, ChevronsUpDown } from 'lucide-react';
import { exportEntities as initialEntitiesConfig, type ExportEntity, type ExportEntityField } from '@/config/exportEntities';
import { useAppContext } from '@/hooks/useAppContext';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

// Local types for component state, extending the config types with internal IDs for React
interface SetupExportEntityField extends ExportEntityField {
  internalId: string; // React key and internal tracking
}

interface SetupExportEntity extends Omit<ExportEntity, 'fields'> {
  internalId: string; // React key and internal tracking
  id: string; // Ensure id is part of SetupExportEntity, as it's user-editable
  fields: SetupExportEntityField[];
}


const fieldTypes: ExportEntityField['type'][] = ['string', 'number', 'boolean', 'email'];

export default function SetupPage() {
  const { isAuthenticated, isAuthLoading, showToast } = useAppContext();
  const router = useRouter();
  const [entities, setEntities] = useState<SetupExportEntity[]>([]);
  const [generatedJson, setGeneratedJson] = useState<string>('');
  const [isLoadingState, setIsLoadingState] = useState(true);

  useEffect(() => {
    // Deep copy initial config to avoid mutating the imported constant
    const initialSetupEntities: SetupExportEntity[] = JSON.parse(JSON.stringify(initialEntitiesConfig)).map((entityConf: ExportEntity, entityIdx: number) => ({
      ...entityConf,
      internalId: `entity-${Date.now()}-${entityIdx}`,
      fields: entityConf.fields.map((fieldConf: ExportEntityField, fieldIdx: number) => ({
        ...fieldConf,
        internalId: `field-${Date.now()}-${entityIdx}-${fieldIdx}`,
      })),
    }));
    setEntities(initialSetupEntities);
    setIsLoadingState(false);
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const handleAddEntity = useCallback(() => {
    setEntities(prev => {
      const newIndex = prev.length;
      const newInternalId = `entity-${Date.now()}-${newIndex}`;
      return [
        ...prev,
        {
          internalId: newInternalId,
          id: `newEntity${newIndex + 1}`,
          name: `New Entity ${newIndex + 1}`,
          url: 'https://api.example.com/new',
          fields: [],
        },
      ];
    });
  }, []);

  const handleRemoveEntity = useCallback((entityInternalId: string) => {
    setEntities(prev => prev.filter(e => e.internalId !== entityInternalId));
  }, []);

  const handleEntityChange = useCallback((entityInternalId: string, key: keyof Omit<SetupExportEntity, 'fields' | 'internalId'>, value: any) => {
    setEntities(prev =>
      prev.map(e => (e.internalId === entityInternalId ? { ...e, [key]: value } : e))
    );
  }, []);

  const handleAddField = useCallback((entityInternalId: string) => {
    setEntities(prev =>
      prev.map(e => {
        if (e.internalId === entityInternalId) {
          const newFieldIndex = e.fields.length;
          return {
            ...e,
            fields: [
              ...e.fields,
              {
                internalId: `field-${Date.now()}-${e.id}-${newFieldIndex}`,
                name: `newApiField${newFieldIndex + 1}`, // This is the target API field name
                required: false,
                type: 'string',
              },
            ],
          };
        }
        return e;
      })
    );
  }, []);

  const handleRemoveField = useCallback((entityInternalId: string, fieldInternalId: string) => {
    setEntities(prev =>
      prev.map(e => {
        if (e.internalId === entityInternalId) {
          return { ...e, fields: e.fields.filter(f => f.internalId !== fieldInternalId) };
        }
        return e;
      })
    );
  }, []);

  const handleFieldChange = useCallback((entityInternalId: string, fieldInternalId: string, key: keyof Omit<SetupExportEntityField, 'internalId'>, value: any) => {
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
  }, []);

  const handleGenerateJson = useCallback(() => {
    try {
      // Strip internalId before generating JSON
      const entitiesForExport: ExportEntity[] = entities.map(({ internalId, fields, ...entityRest }) => ({
        ...entityRest,
        id: entityRest.id,
        fields: fields.map(({ internalId: fieldInternalId, ...fieldRest }) => fieldRest),
      }));
      const jsonString = JSON.stringify(entitiesForExport, null, 2);
      setGeneratedJson(jsonString);
      showToast({ title: 'JSON Generated', description: 'Copy the JSON and update src/config/exportEntities.ts' });
    } catch (error) {
      showToast({ title: 'Error Generating JSON', description: `Could not serialize: ${error instanceof Error ? error.message : String(error)}`, variant: 'destructive' });
    }
  }, [entities, showToast]);

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
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold font-headline text-primary">Entity Configuration Setup</h1>
          </div>
          <Button onClick={handleAddEntity} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Entity
          </Button>
        </div>
        <CardDescription className="flex-shrink-0">
          Configure target entities for data export. Define their API endpoints and field schemas.
          After changes, click "Generate JSON" and manually update <code>src/config/exportEntities.ts</code>.
        </CardDescription>
        <Separator className="flex-shrink-0" />

        {entities.length === 0 && (
          <p className="text-muted-foreground text-center py-8 flex-shrink-0">No entities. Click "Add New Entity" to start.</p>
        )}
        
        <ScrollArea className="flex-grow min-h-0"> {/* Outer ScrollArea for the list of accordions */}
          <Accordion type="multiple" className="w-full space-y-4 pr-3">
            {entities.map((entity) => (
              <AccordionItem value={entity.internalId} key={entity.internalId} className="border rounded-lg bg-card shadow">
                <AccordionTrigger className="px-6 py-4 hover:no-underline group">
                  <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                          <ChevronsUpDown className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-lg font-semibold text-primary">{entity.name || "Untitled Entity"}</span>
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label={`Remove entity ${entity.name || "Untitled Entity"}`}
                        onClick={(e) => {
                           e.stopPropagation(); // Prevent accordion from toggling
                           handleRemoveEntity(entity.internalId);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveEntity(entity.internalId);
                          }
                        }}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive focus:outline-none focus:ring-2 focus:ring-destructive/50 focus:ring-offset-1 focus:ring-offset-card"
                      >
                        <Trash2 className="h-4 w-4" />
                      </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2 border-t">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`entity-id-${entity.internalId}`}>Entity ID (Config Key)</Label>
                        <Input
                          id={`entity-id-${entity.internalId}`}
                          value={entity.id}
                          onChange={e => handleEntityChange(entity.internalId, 'id', e.target.value)}
                          placeholder="e.g., tmsCustomer (unique)"
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
                      <h4 className="text-md font-semibold">Target API Fields</h4>
                      <Button variant="outline" size="sm" onClick={() => handleAddField(entity.internalId)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Field
                      </Button>
                    </div>

                    {entity.fields.length === 0 && <p className="text-sm text-muted-foreground">No fields defined for this target entity.</p>}
                    
                    <ScrollArea className="max-h-96"> {/* ScrollArea for the fields list */}
                      <div className="space-y-4 pr-3">
                      {entity.fields.map((field) => (
                        <Card key={field.internalId} className="p-4 bg-background/50">
                          <div className="space-y-3">
                              <div className="flex justify-end">
                                  <Button variant="ghost" size="icon" onClick={() => handleRemoveField(entity.internalId, field.internalId)} className="text-destructive hover:bg-destructive/10 h-7 w-7">
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              </div>
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <Label htmlFor={`field-name-${field.internalId}`}>Field Name (Target API)</Label>
                                <Input
                                  id={`field-name-${field.internalId}`}
                                  value={field.name}
                                  onChange={e => handleFieldChange(entity.internalId, field.internalId, 'name', e.target.value)}
                                  placeholder="e.g., customer_api_id"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                              <div>
                                  <Label htmlFor={`field-type-${field.internalId}`}>Data Type</Label>
                                  <Select
                                    value={field.type || 'string'}
                                    onValueChange={(value: ExportEntityField['type']) => handleFieldChange(entity.internalId, field.internalId, 'type', value)}
                                  >
                                  <SelectTrigger id={`field-type-${field.internalId}`}>
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
                                  id={`field-required-${field.internalId}`}
                                  checked={field.required || false}
                                  onCheckedChange={(checked) => handleFieldChange(entity.internalId, field.internalId, 'required', !!checked)}
                                />
                                <Label htmlFor={`field-required-${field.internalId}`}>Required Field</Label>
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
        </ScrollArea>

        {entities.length > 0 && (
          <div className="flex-shrink-0 pt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Download className="mr-2 h-5 w-5"/>Generated JSON Configuration</CardTitle>
                <CardDescription>
                  Click to generate JSON. Copy and replace content of <code>src/config/exportEntities.ts</code>. Ensure variable name is <code>export const exportEntities: ExportEntity[] = ...</code>
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
                    rows={10} // Reduced rows for potentially less space needed if page scrolls
                    className="mt-4 font-code text-xs bg-muted/50"
                    aria-label="Generated JSON configuration"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
