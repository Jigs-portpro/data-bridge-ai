
"use client";

import type React from 'react';
import { createContext, useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { ToastProps } from '@/components/ui/toast';
import { useRouter, usePathname } from 'next/navigation';

const AUTH_TOKEN_STORAGE_KEY = 'datawiseAuthToken';
const AUTH_COMPANY_STORAGE_KEY = 'datawiseAuthCompany';

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
  isAuthenticated: boolean;
  login: (username: string, pass: string) => boolean; // This is for app login, not API token
  logout: () => void;
  isAuthLoading: boolean;
  currentCompanyName: string | null;
  setCurrentCompanyName: (name: string | null) => void;
  storeApiToken: (token: string, companyName?: string | null) => void;
  clearApiToken: () => void;
  getApiToken: () => string | null;
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

// Hardcoded credentials for app login
const HARDCODED_USERNAME = "admin";
const HARDCODED_PASSWORD = "password";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setDataState] = useState<Record<string, any>[]>([]);
  const [columns, setColumnsState] = useState<string[]>([]);
  const [fileName, setFileNameState] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [isLoadingState, setIsLoadingStateInner] = useState<boolean>(false); // Renamed to avoid conflict
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isAuthenticated, setIsAuthenticatedState] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [currentCompanyName, setCurrentCompanyNameState] = useState<string | null>(null);


  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();


  useEffect(() => {
    // App authentication check (e.g. from localStorage if implemented for app-level auth)
    // For now, we assume if they reach here, they passed /login or auth is not primary concern yet
    // This is distinct from API token auth
    const appAuth = localStorage.getItem('appIsAuthenticated'); // Example for future app auth
    if (appAuth === 'true') {
      setIsAuthenticatedState(true);
    }
    setIsAuthLoading(false); // App auth loading done

    // Load API token and company name from local storage
    const storedToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    const storedCompany = localStorage.getItem(AUTH_COMPANY_STORAGE_KEY);
    if (storedToken) {
      // If there's an API token, we consider the user "authenticated" in the sense of having API access configured
      // This might be different from app login authentication.
      // For now, let's keep them linked: if app is authenticated, can configure API.
    }
    if (storedCompany) {
      setCurrentCompanyNameState(storedCompany);
    }
  }, []);


  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated && pathname !== '/login') {
        router.push('/login');
      } else if (isAuthenticated && pathname === '/login') {
        router.push('/');
      }
    }
  }, [isAuthenticated, isAuthLoading, pathname, router]);

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
    setIsLoadingStateInner(loading);
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

  // App Login
  const login = useCallback((username: string, pass: string): boolean => {
    if (username === HARDCODED_USERNAME && pass === HARDCODED_PASSWORD) {
      setIsAuthenticatedState(true);
      localStorage.setItem('appIsAuthenticated', 'true'); // Example for app auth persistence
      router.push('/');
      return true;
    }
    showToast({ title: 'Login Failed', description: 'Invalid username or password.', variant: 'destructive' });
    return false;
  }, [router, showToast]);

  // App Logout
  const logout = useCallback(() => {
    setIsAuthenticatedState(false);
    localStorage.removeItem('appIsAuthenticated');
    // Clearing API token on app logout as well for this example
    clearApiToken(); 
    setChatHistory([]);
    setDataState([]);
    setColumnsState([]);
    setFileNameState(null);
    router.push('/login');
  }, [router]);

  // API Token and Company Name Management
  const setCurrentCompanyName = useCallback((name: string | null) => {
    setCurrentCompanyNameState(name);
    if (name) {
      localStorage.setItem(AUTH_COMPANY_STORAGE_KEY, name);
    } else {
      localStorage.removeItem(AUTH_COMPANY_STORAGE_KEY);
    }
  }, []);

  const storeApiToken = useCallback((token: string, companyName?: string | null) => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    if (companyName) {
      setCurrentCompanyName(companyName);
    } else {
       // If companyName is not provided but we are storing a token,
       // we should clear any old company name to avoid staleness.
      setCurrentCompanyName(null);
    }
  }, [setCurrentCompanyName]);

  const clearApiToken = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setCurrentCompanyName(null); // Also clears company from localStorage
  }, [setCurrentCompanyName]);
  
  const getApiToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    }
    return null;
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
        isLoading: isLoadingState, // Use renamed state
        setIsLoading,
        showToast,
        chatHistory,
        addChatMessage,
        clearChatHistory,
        isAuthenticated,
        login,
        logout,
        isAuthLoading,
        currentCompanyName,
        setCurrentCompanyName,
        storeApiToken,
        clearApiToken,
        getApiToken,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
