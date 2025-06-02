
"use client";

import type React from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { DataToolsSidebar } from '@/components/DataToolsSidebar';
import { FileUploadButton } from '@/components/FileUploadButton';
import { DataTable } from '@/components/DataTable';
import { ChatPane } from '@/components/ChatPane';
import { DataCorrectionDialog } from '@/components/dialogs/DataCorrectionDialog';
import { DataEnrichmentDialog } from '@/components/dialogs/DataEnrichmentDialog';
import { ColumnReorderDialog } from '@/components/dialogs/ColumnReorderDialog';
import { AnomalyReportDialog } from '@/components/dialogs/AnomalyReportDialog';
import { DuplicateDetectionDialog } from '@/components/dialogs/DuplicateDetectionDialog';
import { ExportDataDialog } from '@/components/dialogs/ExportDataDialog';
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Send, Menu } from 'lucide-react'; // Added Menu for mobile trigger if needed

export function AppLayout({ children, pageTitle }: { children?: React.ReactNode; pageTitle: string }) {
  const { activeDialog, openDialog, data, isAuthenticated } = useAppContext();
  const isDataLoaded = data.length > 0;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-background">
        <DataToolsSidebar />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          <main className="container mx-auto p-4 md:p-6 lg:p-8 flex flex-col flex-grow min-h-0">
            {/* Global Header: Trigger | Page Title | Global Actions */}
            {isAuthenticated && (
              <div className="flex-shrink-0"> {/* Header wrapper */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  {/* Left: SidebarTrigger and Page Title */}
                  <div className="flex items-center gap-2 min-w-0"> {/* Added min-w-0 for truncate */}
                    <SidebarTrigger /> {/* This trigger handles both desktop and mobile */}
                    <h1 className="text-xl sm:text-2xl font-bold font-headline text-primary truncate" title={pageTitle}>
                      {pageTitle}
                    </h1>
                  </div>
                  {/* Right: Global Actions */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 self-start sm:self-auto"> {/* Adjusted alignment for mobile */}
                    <FileUploadButton />
                    <Button
                      variant="outline"
                      onClick={() => openDialog('export')}
                      disabled={!isDataLoaded}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Export Data
                    </Button>
                  </div>
                </div>
                <Separator className="my-4 sm:my-6" /> {/* Adjusted spacing */}
              </div>
            )}

            {/* Page Content */}
            <div className="flex-grow min-h-0 flex flex-col">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>

      {activeDialog === 'correction' && <DataCorrectionDialog />}
      {activeDialog === 'enrichment' && <DataEnrichmentDialog />}
      {activeDialog === 'reorder' && <ColumnReorderDialog />}
      {activeDialog === 'anomaly' && <AnomalyReportDialog />}
      {activeDialog === 'duplicate' && <DuplicateDetectionDialog />}
      {activeDialog === 'export' && <ExportDataDialog />}
    </SidebarProvider>
  );
}
