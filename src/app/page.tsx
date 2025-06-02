
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/hooks/useAppContext';
import { AppLayout } from '@/components/AppLayout';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, isAuthLoading } = useAppContext();
  const router = useRouter();

  // Redirection logic is now primarily handled by AppContext's useEffect
  // This component just ensures it shows loading or the app

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // This case should ideally be caught by AppContext redirect,
    // but as a fallback or for clarity:
    // router.push('/login'); // This can cause render loop if AppContext effect is also running
    return ( // Show loading or a minimal screen while redirect happens
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecting to login...</p>
        <Loader2 className="ml-2 h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return <AppLayout />;
}
