"use client";

import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import { parseCSV } from '@/lib/csvUtils';

export function GoogleSheetInput() {
  const { setData, setFileName, showToast, setIsLoading, clearChatHistory, isLoading } = useAppContext();
  const [sheetUrl, setSheetUrl] = useState('');

  const extractSheetDetails = (url: string): { sheetId: string | null; gid: string | null } => {
    const sheetIdMatch = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = url.match(/[#&]gid=([0-9]+)/);
    return {
      sheetId: sheetIdMatch ? sheetIdMatch[1] : null,
      gid: gidMatch ? gidMatch[1] : '0', // Default to first sheet if GID not specified
    };
  };

  const handleLoadSheet = async () => {
    if (!sheetUrl.trim()) {
      showToast({ title: 'URL Required', description: 'Please enter a Google Sheet URL.', variant: 'destructive' });
      return;
    }

    const { sheetId, gid } = extractSheetDetails(sheetUrl);

    if (!sheetId) {
      showToast({ title: 'Invalid URL', description: 'Could not extract Sheet ID from the URL.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    clearChatHistory();
    
    // Make sure gid is not null before using it in the URL
    const effectiveGid = gid ?? '0';
    const csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${effectiveGid}`;

    try {
      const response = await fetch(csvExportUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet: ${response.statusText}`);
      }
      const csvText = await response.text();
      const parsed = parseCSV(csvText);
      
      setData(parsed.rows);
      // Try to derive a filename from the URL or use a generic one
      const urlParts = sheetUrl.split('/');
      const potentialName = urlParts.find(part => part === sheetId) ? `Sheet - ${sheetId.substring(0,10)}...` : 'Google Sheet';
      setFileName(potentialName);

      showToast({
        title: 'Google Sheet Loaded',
        description: 'Data from Google Sheet processed successfully.',
      });
    } catch (error) {
      console.error('Error loading Google Sheet:', error);
      showToast({
        title: 'Error Loading Sheet',
        description: 'Could not load or process the Google Sheet. Make sure it is public and the URL is correct.',
        variant: 'destructive',
      });
      setData([]);
      setFileName(null);
    } finally {
      setIsLoading(false);
      setSheetUrl(''); // Clear input after attempt
    }
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleLoadSheet();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="url"
        value={sheetUrl}
        onChange={(e) => setSheetUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Paste public Google Sheet URL"
        className="flex-grow"
        disabled={isLoading}
        data-ai-hint="google sheet url input"
      />
      <Button onClick={handleLoadSheet} disabled={isLoading || !sheetUrl.trim()} variant="outline">
        <Link className="mr-2 h-4 w-4" />
        Load Sheet
      </Button>
    </div>
  );
}
