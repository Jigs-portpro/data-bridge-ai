"use client";

import type React from 'react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import { parseCSV } from '@/lib/csvUtils';

export function FileUploadButton() {
  const { setData, setFileName, showToast, setIsLoading, clearChatHistory } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv') {
        showToast({
          title: 'Invalid File Type',
          description: 'Please upload a CSV file.',
          variant: 'destructive',
        });
        return;
      }

      setIsLoading(true);
      setFileName(file.name);
      clearChatHistory(); // Clear chat when new file is loaded

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = parseCSV(text);
          setData(parsed.rows);
          showToast({
            title: 'File Uploaded',
            description: `${file.name} processed successfully.`,
          });
        } catch (error) {
          console.error('Error parsing CSV:', error);
          showToast({
            title: 'Error Parsing CSV',
            description: 'Could not process the CSV file. Please check its format.',
            variant: 'destructive',
          });
          setData([]);
          setFileName(null);
        } finally {
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        showToast({
          title: 'File Read Error',
          description: 'Could not read the file.',
          variant: 'destructive',
        });
        setIsLoading(false);
      };
      reader.readAsText(file);
    }
    // Reset file input to allow re-uploading the same file
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        className="hidden"
        data-ai-hint="file input"
      />
      <Button onClick={handleClick} variant="outline">
        <UploadCloud className="mr-2 h-4 w-4" />
        Upload CSV
      </Button>
    </>
  );
}
