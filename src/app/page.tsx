
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/hooks/useAppContext';
import { AppLayout } from '@/components/AppLayout';
import { Loader2 } from 'lucide-react';
import { FileUploadButton } from '@/components/FileUploadButton';
import { DataTable } from '@/components/DataTable';
import { ChatPane } from '@/components/ChatPane';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';


export default function Home() {
  const { isAuthenticated, isAuthLoading, openDialog, data } = useAppContext();
  const router = useRouter();
  const isDataLoaded = data.length > 0;

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);


  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
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
    </AppLayout>
  );
}
