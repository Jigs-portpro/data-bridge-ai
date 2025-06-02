"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/hooks/useAppContext';
import { generateAnomalyReport, type AnomalyReportOutput } from '@/ai/flows/anomaly-report';
import { objectsToCsv } from '@/lib/csvUtils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Siren } from 'lucide-react';

export function AnomalyReportDialog() {
  const {
    data,
    columns,
    activeDialog,
    closeDialog,
    showToast,
    isLoading,
    setIsLoading,
  } = useAppContext();
  const [report, setReport] = useState<AnomalyReportOutput | null>(null);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setReport(null);
    try {
      const csvData = objectsToCsv(columns, data);
      const result = await generateAnomalyReport({ data: csvData, columnNames: columns });
      setReport(result);
    } catch (error) {
      console.error('Error generating anomaly report:', error);
      showToast({ title: 'Error', description: 'Failed to generate anomaly report.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={activeDialog === 'anomaly'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center"><Siren className="mr-2 h-5 w-5 text-primary"/>Anomaly Report</DialogTitle>
          <DialogDescription>
            Generate a report highlighting potential data anomalies based on statistical analysis.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
           {!report && (
            <Button onClick={handleGenerateReport} disabled={isLoading} className="w-full">
                {isLoading ? 'Generating Report...' : 'Generate Anomaly Report'}
            </Button>
           )}
        </div>

        {report && (
          <div className="space-y-4">
            <Alert>
                <Siren className="h-4 w-4" />
                <AlertTitle className="font-headline">Anomaly Report Details</AlertTitle>
                <ScrollArea className="h-60 mt-2">
                    <AlertDescription className="whitespace-pre-wrap text-sm">
                        {report.report}
                    </AlertDescription>
                </ScrollArea>
            </Alert>
            <Button onClick={handleGenerateReport} disabled={isLoading} variant="outline" className="w-full">
                {isLoading ? 'Generating Report...' : 'Re-generate Report'}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog} disabled={isLoading}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
