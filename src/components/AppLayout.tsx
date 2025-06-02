
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
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const { activeDialog, openDialog, data } = useAppContext();
  const isDataLoaded = data.length > 0;

  // Default dashboard content if no children are provided
  const defaultDashboardContent = (
    <>
      {/* Header Section */}
      <div className="flex-shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="hidden md:flex" />
            <h1 className="text-3xl font-bold font-headline text-primary">DataWise Dashboard</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
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
      </div>

      <Separator className="flex-shrink-0" />

      {/* DataTable Section - Takes remaining space and scrolls internally */}
      <div className="flex-grow min-h-0">
        <DataTable />
      </div>

      {/* ChatPane Section - Fixed Size at the bottom */}
      <div className="flex-shrink-0">
        <ChatPane />
      </div>
    </>
  );

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-background">
        <DataToolsSidebar />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          <main className="container mx-auto p-4 md:p-6 lg:p-8 flex flex-col flex-grow min-h-0 space-y-6">
            {children || defaultDashboardContent}
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
