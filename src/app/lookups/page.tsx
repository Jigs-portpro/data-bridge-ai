
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useAppContext } from '@/hooks/useAppContext';
import { DownloadCloud, Trash2, Loader2, Eye, DatabaseZap, Info, RefreshCw, FileJson } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';

interface LookupSourceDisplay {
  id: string; // This is the lookupId to be used in exportEntities.json
  name: string;
  fetchAction: () => Promise<void>;
  clearAction: () => void;
  getData: () => any[] | null;
  getLastFetched: () => Date | null;
  isFetchingData: boolean; // Specific loading state for this source
}

export default function LookupsPage() {
  const appContext = useAppContext();
  const { 
    chassisOwnersData, 
    fetchAndStoreChassisOwners, 
    clearChassisOwnersData, 
    isLoading: appIsLoading, // Global loading state
    isAuthenticated,
    isAuthLoading,
    chassisOwnersLastFetched
  } = appContext;

  const [dataForViewing, setDataForViewing] = useState<{ name: string; data: any[]; columns: string[] } | null>(null);
  const [isFetchingSpecific, setIsFetchingSpecific] = useState<Record<string, boolean>>({});


  // Define lookup sources - this would be expanded for more lookups
  const lookupSources: LookupSourceDisplay[] = [
    {
      id: 'chassisOwners', // The ID to use in exportEntities.json
      name: 'Chassis Owners',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, chassisOwners: true }));
        await fetchAndStoreChassisOwners();
        setIsFetchingSpecific(prev => ({ ...prev, chassisOwners: false }));
      },
      clearAction: clearChassisOwnersData,
      getData: () => chassisOwnersData,
      getLastFetched: () => chassisOwnersLastFetched,
      isFetchingData: isFetchingSpecific['chassisOwners'] || (appIsLoading && chassisOwnersData === null),
    },
    // Example for another lookup in the future:
    // {
    //   id: 'productCategories',
    //   name: 'Product Categories',
    //   fetchAction: async () => { /* fetch product categories */ },
    //   clearAction: () => { /* clear product categories */ },
    //   getData: () => appContext.productCategoriesData,
    //   getLastFetched: () => appContext.productCategoriesLastFetched,
    //   isFetchingData: isFetchingSpecific['productCategories'],
    // },
  ];

  const handleViewData = (source: LookupSourceDisplay) => {
    const data = source.getData();
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      setDataForViewing({ name: source.name, data, columns });
    } else {
      setDataForViewing(null);
      appContext.showToast({ title: "No Data", description: `No data cached for ${source.name}. Fetch it first.`, variant: "default" });
    }
  };
  
  useEffect(() => {
    // If viewed data source is cleared, also clear the viewer
    if (dataForViewing) {
      const currentSource = lookupSources.find(ls => ls.name === dataForViewing.name);
      if (currentSource && (!currentSource.getData() || currentSource.getData()?.length === 0)) {
        setDataForViewing(null);
      }
    }
  }, [chassisOwnersData, dataForViewing]); // Add other lookup data states here if they affect viewing

  if (isAuthLoading || !isAuthenticated) {
    return (
      <AppLayout pageTitle="Loading Lookups...">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Manage Lookup Data">
      <div className="space-y-6 p-1">
        <Alert>
          <DatabaseZap className="h-4 w-4" />
          <AlertTitle>Lookup Data Sources</AlertTitle>
          <AlertDescription className="space-y-1">
            <p>
              Fetch and cache frequently used lookup data from external APIs. This data can be used for validation during the "Export Data" process.
              Data is cached in your browser session.
            </p>
            <p className="flex items-center text-xs">
              <FileJson className="h-3 w-3 mr-1.5 text-muted-foreground"/>
              Use the <strong className="mx-1">Lookup ID</strong> shown in the table below when configuring 
              <code className="bg-muted text-muted-foreground px-1 py-0.5 rounded-sm text-xs mx-1">lookupValidation</code> 
              in your <code className="bg-muted text-muted-foreground px-1 py-0.5 rounded-sm text-xs ml-1">exportEntities.json</code> file.
            </p>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Available Lookup Datasets</CardTitle>
            <CardDescription>Manage and view cached lookup data.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Lookup ID</TableHead>
                    <TableHead className="text-center">Status / Last Fetched</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lookupSources.map((source) => {
                    const data = source.getData();
                    const lastFetched = source.getLastFetched();
                    const isDataPresent = data && data.length > 0;
                    return (
                      <TableRow key={source.id}>
                        <TableCell className="font-medium">{source.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded-sm">{source.id}</code>
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {source.isFetchingData ? (
                            <span className="flex items-center justify-center text-muted-foreground">
                              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Fetching...
                            </span>
                          ) : isDataPresent && lastFetched ? (
                            <>
                              {data?.length} records
                              <br />
                              {format(lastFetched, "MMM d, yyyy HH:mm:ss")}
                            </>
                          ) : (
                            "Not Cached"
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                           <Button variant="link" size="sm" className="h-auto p-1 text-xs" onClick={() => source.fetchAction()} disabled={source.isFetchingData || appIsLoading}>
                            {isDataPresent ? <RefreshCw className="mr-1 h-3 w-3"/> : <DownloadCloud className="mr-1 h-3 w-3"/>}
                            {isDataPresent ? 'Refresh' : 'Fetch'}
                          </Button>
                          <Button variant="link" size="sm" className="h-auto p-1 text-xs" onClick={() => handleViewData(source)} disabled={source.isFetchingData || !isDataPresent}>
                            <Eye className="mr-1 h-3 w-3"/>View
                          </Button>
                          <Button variant="link" size="sm" className="h-auto p-1 text-xs text-destructive" onClick={() => { source.clearAction(); setDataForViewing(null);}} disabled={source.isFetchingData || !isDataPresent}>
                            <Trash2 className="mr-1 h-3 w-3"/>Clear
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>

        {dataForViewing && (
          <Card>
            <CardHeader>
              <CardTitle>Cached Data Viewer: {dataForViewing.name}</CardTitle>
              <CardDescription>
                Displaying {dataForViewing.data.length} cached records. Columns are dynamically generated.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataForViewing.data.length > 0 ? (
                <ScrollArea className="rounded-md border shadow-sm w-full bg-card max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {dataForViewing.columns.map((col) => (
                          <TableHead key={col} className="font-semibold whitespace-nowrap">{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataForViewing.data.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {dataForViewing.columns.map((col) => (
                            <TableCell key={`${rowIndex}-${col}`} className="whitespace-nowrap text-xs">
                              {typeof row[col] === 'boolean' ? String(row[col]) : (row[col] ?? '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 border rounded-lg bg-muted/30 text-center p-6">
                  <Info className="h-8 w-8 text-muted-foreground mb-2"/>
                  <p className="text-sm text-muted-foreground">No data to display for {dataForViewing.name}.</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
                 <Button variant="outline" size="sm" onClick={() => setDataForViewing(null)}>Close Viewer</Button>
            </CardFooter>
          </Card>
        )}
         {!dataForViewing && !appIsLoading && (
             <div className="text-center py-4 text-sm text-muted-foreground">
                Click "View" on a lookup source to see its cached data here.
             </div>
        )}
      </div>
    </AppLayout>
  );
}

