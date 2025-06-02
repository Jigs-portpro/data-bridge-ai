"use client";

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
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';

export function AppLayout() {
  const { activeDialog } = useAppContext();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-background">
        <DataToolsSidebar />
        <SidebarInset className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <main className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold font-headline text-primary">DataWise Dashboard</h1>
                <FileUploadButton />
              </div>
              <DataTable />
              <ChatPane />
            </main>
          </ScrollArea>
        </SidebarInset>
      </div>

      {activeDialog === 'correction' && <DataCorrectionDialog />}
      {activeDialog === 'enrichment' && <DataEnrichmentDialog />}
      {activeDialog === 'reorder' && <ColumnReorderDialog />}
      {activeDialog === 'anomaly' && <AnomalyReportDialog />}
      {activeDialog === 'duplicate' && <DuplicateDetectionDialog />}
    </SidebarProvider>
  );
}
