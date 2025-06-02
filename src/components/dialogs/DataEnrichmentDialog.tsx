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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppContext } from '@/hooks/useAppContext';
import { dataEnrichment } from '@/ai/flows/data-enrichment';
import { objectsToCsv, parseCSV } from '@/lib/csvUtils';
import { Sparkles } from 'lucide-react';

export function DataEnrichmentDialog() {
  const {
    data,
    columns,
    setData,
    activeDialog,
    closeDialog,
    showToast,
    isLoading,
    setIsLoading,
  } = useAppContext();
  const [enrichmentInstructions, setEnrichmentInstructions] = useState('');

  const handleEnrichData = async () => {
    if (!enrichmentInstructions.trim()) {
      showToast({ title: 'Instructions Needed', description: 'Please provide enrichment instructions.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const csvData = objectsToCsv(columns, data);
      const result = await dataEnrichment({ data: csvData, enrichmentInstructions });
      
      const parsedEnrichedData = parseCSV(result.enrichedData);
      setData(parsedEnrichedData.rows); // This will also update columns via context setter

      showToast({ title: 'Data Enriched', description: 'Data has been enriched successfully.' });
      // closeDialog(); // Optionally close dialog
    } catch (error) {
      console.error('Error enriching data:', error);
      showToast({ title: 'Error', description: 'Failed to enrich data.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={activeDialog === 'enrichment'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary"/>AI Data Enrichment</DialogTitle>
          <DialogDescription>
            Provide instructions to enrich your data. For example, "Add a new column 'Category' based on 'Product Name', or 'Standardize country names in the Country column'."
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="enrichment-instructions">Enrichment Instructions</Label>
            <Textarea
              id="enrichment-instructions"
              placeholder="e.g., Add a column 'Sentiment' based on 'Review Text'."
              value={enrichmentInstructions}
              onChange={(e) => setEnrichmentInstructions(e.target.value)}
              rows={5}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleEnrichData} disabled={isLoading || !enrichmentInstructions.trim()}>
            {isLoading ? 'Enriching...' : 'Enrich Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
