
"use client";

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useAppContext } from '@/hooks/useAppContext';
import { ListChecks, Trash2, Loader2, DatabaseZap, Info } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LookupsPage() {
  const { 
    chassisOwnersData, 
    fetchAndStoreChassisOwners, 
    clearChassisOwnersData, 
    isLoading: appIsLoading,
    isAuthenticated,
    isAuthLoading,
    showToast
  } = useAppContext();

  const [dynamicColumns, setDynamicColumns] = useState<string[]>([]);

  useEffect(() => {
    if (chassisOwnersData && chassisOwnersData.length > 0) {
      setDynamicColumns(Object.keys(chassisOwnersData[0]));
    } else {
      setDynamicColumns([]);
    }
  }, [chassisOwnersData]);

  const handleFetch = async () => {
    await fetchAndStoreChassisOwners();
  };

  const handleClear = () => {
    clearChassisOwnersData();
  };

  if (isAuthLoading || !isAuthenticated) {
    return (
      <AppLayout pageTitle="Loading Lookups...">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const isDataPresent = chassisOwnersData && chassisOwnersData.length > 0;

  return (
    <AppLayout pageTitle="Manage Lookup Data">
      <div className="space-y-6 p-1">
        <Alert>
          <DatabaseZap className="h-4 w-4" />
          <AlertTitle>Lookup Data Management</AlertTitle>
          <AlertDescription>
            Fetch and cache frequently used lookup data from external APIs to improve performance and reduce redundant calls. 
            Currently, only "Chassis Owners" lookup is supported. Data is cached in your browser session.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Chassis Owners Lookup</CardTitle>
            <CardDescription>
              Fetch or clear cached data for Chassis Owners from the Axle Network API.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleFetch} disabled={appIsLoading}>
              {appIsLoading && chassisOwnersData === null ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ListChecks className="mr-2 h-4 w-4" />}
              {isDataPresent ? 'Refresh Chassis Owners' : 'Fetch Chassis Owners'}
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={appIsLoading || !isDataPresent}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Cached Chassis Owners
            </Button>
          </CardContent>
          {appIsLoading && chassisOwnersData === null && ( // Show loader only during initial fetch
            <CardFooter>
                <div className="flex items-center text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching data, please wait...
                </div>
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cached Chassis Owners Data</CardTitle>
            <CardDescription>
              {isDataPresent 
                ? `Displaying ${chassisOwnersData.length} cached records. Columns are dynamically generated.` 
                : "No Chassis Owners data currently cached. Use the button above to fetch it."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isDataPresent ? (
              <ScrollArea className="rounded-md border shadow-sm w-full bg-card max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {dynamicColumns.map((col) => (
                        <TableHead key={col} className="font-semibold whitespace-nowrap">{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chassisOwnersData.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {dynamicColumns.map((col) => (
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
              !appIsLoading && ( // Don't show "no data" if it's currently loading for the first time
                <div className="flex flex-col items-center justify-center h-40 border rounded-lg bg-muted/30 text-center p-6">
                  <Info className="h-8 w-8 text-muted-foreground mb-2"/>
                  <p className="text-sm text-muted-foreground">No data to display.</p>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
