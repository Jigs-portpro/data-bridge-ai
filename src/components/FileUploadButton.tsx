
"use client";

import type React from 'react';
import { useRef } from 'react';
import { useRouter } from 'next/navigation'; // Added useRouter
import { Button } from '@/components/ui/button';
import { UploadCloud } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import { parseCSV, findActualDataStart } from '@/lib/csvUtils';
import * as XLSX from 'xlsx';

export function FileUploadButton() {
  const { setData, setFileName, showToast, setIsLoading, clearChatHistory } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter(); // Initialize router

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validCsvType = 'text/csv';
      const validXlsType = 'application/vnd.ms-excel';
      const validXlsxType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      if (![validCsvType, validXlsType, validXlsxType].includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
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
          let parsedDataRows: Record<string, any>[] = [];
          let finalHeaders: string[] = [];

          if (file.type === validCsvType || file.name.endsWith('.csv')) {
            const parsedResult = parseCSV(fileContent as string);
            parsedDataRows = parsedResult.rows;
            finalHeaders = parsedResult.headers;
          } else if (file.type === validXlsType || file.type === validXlsxType || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
            const workbook = XLSX.read(fileContent, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const allSheetRowsMixedTypes: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, blankrows: true });
            const allSheetRowsAsStrings: string[][] = allSheetRowsMixedTypes.map(row => 
              row.map(cell => (cell === null || cell === undefined) ? "" : String(cell).trim())
            );

            const { dataStartIndex, headers: detectedHeaders } = findActualDataStart(allSheetRowsAsStrings);
            finalHeaders = detectedHeaders;

            if (finalHeaders.length > 0) {
              const dataContentRows = allSheetRowsAsStrings.slice(dataStartIndex + 1);
              parsedDataRows = dataContentRows.map(rowArray => {
                const row: Record<string, any> = {};
                finalHeaders.forEach((header, index) => {
                  const originalRow = allSheetRowsMixedTypes[dataStartIndex + 1 + dataContentRows.indexOf(rowArray)];
                  row[header] = originalRow && originalRow[index] !== undefined ? originalRow[index] : rowArray[index] ?? '';
                });
                if(Object.values(row).every(val => val === '')) return null;
                return row;
              }).filter(row => row !== null) as Record<string, any>[];
            } else {
               parsedDataRows = [];
            }
          }
          
          if (finalHeaders.length === 0 && parsedDataRows.length === 0) {
            showToast({
              title: 'No Data Found',
              description: 'Could not find any structured data in the file.',
            });
             setData([]);
          } else {
            setData(parsedDataRows); 
             showToast({
              title: 'File Uploaded',
              description: `${file.name} processed successfully.`,
            });
            router.push('/'); // Navigate to home page
          }

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

      if (file.type === validCsvType || file.name.endsWith('.csv')) {
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
        accept=".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
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
