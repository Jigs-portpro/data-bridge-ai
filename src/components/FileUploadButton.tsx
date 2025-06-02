"use client";

import type React from 'react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import { parseCSV } from '@/lib/csvUtils';
import * as XLSX from 'xlsx';

export function FileUploadButton() {
  const { setData, setFileName, showToast, setIsLoading, clearChatHistory } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validCsvType = 'text/csv';
      const validXlsType = 'application/vnd.ms-excel';
      const validXlsxType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      if (![validCsvType, validXlsType, validXlsxType].includes(file.type)) {
        showToast({
          title: 'Invalid File Type',
          description: 'Please upload a CSV or Excel file (.csv, .xls, .xlsx).',
          variant: 'destructive',
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        return;
      }

      setIsLoading(true);
      setFileName(file.name);
      clearChatHistory();

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const fileContent = e.target?.result;
          let parsedRows: Record<string, any>[] = [];

          if (file.type === validCsvType) {
            parsedRows = parseCSV(fileContent as string).rows;
          } else if (file.type === validXlsType || file.type === validXlsxType) {
            const workbook = XLSX.read(fileContent, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            parsedRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);
          }
          
          setData(parsedRows);
          showToast({
            title: 'File Uploaded',
            description: `${file.name} processed successfully.`,
          });
        } catch (error) {
          console.error('Error parsing file:', error);
          showToast({
            title: 'Error Parsing File',
            description: 'Could not process the file. Please check its format.',
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

      if (file.type === validCsvType) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    }
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
        accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        data-ai-hint="file input"
      />
      <Button onClick={handleClick} variant="outline">
        <UploadCloud className="mr-2 h-4 w-4" />
        Upload File
      </Button>
    </>
  );
}
