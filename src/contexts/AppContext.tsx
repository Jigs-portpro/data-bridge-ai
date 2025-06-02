"use client";

import type React from 'react';
import { createContext, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { ToastProps } from '@/components/ui/toast';

type AppContextType = {
  data: Record<string, any>[];
  setData: (data: Record<string, any>[]) => void;
  columns: string[];
  setColumns: (columns: string[]) => void;
  fileName: string | null;
  setFileName: (name: string | null) => void;
  activeDialog: string | null;
  openDialog: (dialogName: string) => void;
  closeDialog: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  showToast: (options: { title: string; description?: string; variant?: ToastProps['variant'] }) => void;
  chatHistory: { role: 'user' | 'assistant'; content: string }[];
  addChatMessage: (message: { role: 'user' | 'assistant'; content: string }) => void;
  clearChatHistory: () => void;
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setDataState] = useState<Record<string, any>[]>([]);
  const [columns, setColumnsState] = useState<string[]>([]);
  const [fileName, setFileNameState] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [isLoading, setIsLoadingState] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const { toast } = useToast();

  const setData = useCallback((newData: Record<string, any>[]) => {
    setDataState(newData);
    if (newData.length > 0) {
      setColumnsState(Object.keys(newData[0]));
    } else {
      setColumnsState([]);
    }
  }, []);
  
  const setColumns = useCallback((newColumns: string[]) => {
    setColumnsState(newColumns);
  }, []);

  const setFileName = useCallback((name: string | null) => {
    setFileNameState(name);
  }, []);

  const openDialog = useCallback((dialogName: string) => {
    setActiveDialog(dialogName);
  }, []);

  const closeDialog = useCallback(() => {
    setActiveDialog(null);
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    setIsLoadingState(loading);
  }, []);

  const showToast = useCallback(
    (options: { title: string; description?: string; variant?: ToastProps['variant'] }) => {
      toast(options);
    },
    [toast]
  );

  const addChatMessage = useCallback((message: { role: 'user' | 'assistant'; content: string }) => {
    setChatHistory(prev => [...prev, message]);
  }, []);

  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        data,
        setData,
        columns,
        setColumns,
        fileName,
        setFileName,
        activeDialog,
        openDialog,
        closeDialog,
        isLoading,
        setIsLoading,
        showToast,
        chatHistory,
        addChatMessage,
        clearChatHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
