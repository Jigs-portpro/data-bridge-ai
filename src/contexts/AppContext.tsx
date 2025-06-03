
"use client";

import type React from 'react';
import { createContext, useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { ToastProps } from '@/components/ui/toast';
import { useRouter, usePathname } from 'next/navigation';

const AUTH_TOKEN_STORAGE_KEY = 'datawiseAuthToken';
const AUTH_COMPANY_STORAGE_KEY = 'datawiseAuthCompany';
const AI_PROVIDER_STORAGE_KEY = 'datawiseAiProvider';
const AI_MODEL_NAME_STORAGE_KEY = 'datawiseAiModelName';

// Define default provider and model (ensure this provider has its key in .env for it to work)
const DEFAULT_AI_PROVIDER = 'googleai';
const DEFAULT_AI_MODEL_NAME = 'gemini-1.5-flash';


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
  login: (username: string, pass: string) => boolean;
  logout: () => void;
  isAuthLoading: boolean;
  currentCompanyName: string | null;
  setCurrentCompanyName: (name: string | null) => void;
  storeApiToken: (token: string, companyName?: string | null) => void;
  clearApiToken: () => void;
  getApiToken: () => string | null;
  selectedAiProvider: string | null;
  setSelectedAiProvider: (provider: string | null) => void;
  selectedAiModelName: string | null;
  setSelectedAiModelName: (modelName: string | null) => void;
  getEnvKeys: () => Record<string, boolean>;
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

const HARDCODED_USERNAME = "admin";
const HARDCODED_PASSWORD = "password";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setDataState] = useState<Record<string, any>[]>([]);
  const [columns, setColumnsState] = useState<string[]>([]);
  const [fileName, setFileNameState] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [isLoadingState, setIsLoadingStateInner] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isAuthenticated, setIsAuthenticatedState] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [currentCompanyName, setCurrentCompanyNameState] = useState<string | null>(null);
  const [selectedAiProvider, setSelectedAiProviderState] = useState<string | null>(null);
  const [selectedAiModelName, setSelectedAiModelNameState] = useState<string | null>(null);
  const [envKeys, setEnvKeys] = useState<Record<string, boolean>>({});


  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const fetchEnvKeys = useCallback(async () => {
    try {
      const response = await fetch('/api/env-check'); // You'll need to create this API route
      if (response.ok) {
        const keys = await response.json();
        setEnvKeys(keys);
        
        // Initialize AI provider and model from localStorage or defaults
        const storedProvider = typeof window !== 'undefined' ? localStorage.getItem(AI_PROVIDER_STORAGE_KEY) : null;
        const storedModel = typeof window !== 'undefined' ? localStorage.getItem(AI_MODEL_NAME_STORAGE_KEY) : null;

        if (storedProvider && storedModel && keys[storedProvider.toUpperCase() + '_API_KEY']) {
          setSelectedAiProviderState(storedProvider);
          setSelectedAiModelNameState(storedModel);
        } else if (keys.GOOGLE_API_KEY) { // Default to Google if its key exists and nothing valid stored
          setSelectedAiProviderState(DEFAULT_AI_PROVIDER);
          setSelectedAiModelNameState(DEFAULT_AI_MODEL_NAME);
          if (typeof window !== 'undefined') {
            localStorage.setItem(AI_PROVIDER_STORAGE_KEY, DEFAULT_AI_PROVIDER);
            localStorage.setItem(AI_MODEL_NAME_STORAGE_KEY, DEFAULT_AI_MODEL_NAME);
          }
        } else if (keys.OPENAI_API_KEY) { // Fallback to OpenAI
            setSelectedAiProviderState('openai');
            setSelectedAiModelNameState('gpt-4o-mini'); // A common OpenAI default
            if (typeof window !== 'undefined') {
              localStorage.setItem(AI_PROVIDER_STORAGE_KEY, 'openai');
              localStorage.setItem(AI_MODEL_NAME_STORAGE_KEY, 'gpt-4o-mini');
            }
        } else if (keys.ANTHROPIC_API_KEY) { // Fallback to Anthropic
            setSelectedAiProviderState('anthropic');
            setSelectedAiModelNameState('claude-3-haiku-20240307'); // A common Anthropic default
            if (typeof window !== 'undefined') {
              localStorage.setItem(AI_PROVIDER_STORAGE_KEY, 'anthropic');
              localStorage.setItem(AI_MODEL_NAME_STORAGE_KEY, 'claude-3-haiku-20240307');
            }
        } else {
            // No API keys found, or stored selection is invalid
            setSelectedAiProviderState(null);
            setSelectedAiModelNameState(null);
        }

      } else {
        console.error('Failed to fetch env key status');
         setSelectedAiProviderState(null); // Fallback if API fails
         setSelectedAiModelNameState(null);
      }
    } catch (error) {
      console.error('Error fetching env key status:', error);
       setSelectedAiProviderState(null);
       setSelectedAiModelNameState(null);
    }
  }, []);


  useEffect(() => {
    const appAuth = typeof window !== 'undefined' ? localStorage.getItem('appIsAuthenticated') : null;
    if (appAuth === 'true') {
      setIsAuthenticatedState(true);
    }
    setIsAuthLoading(false);

    const storedCompany = typeof window !== 'undefined' ? localStorage.getItem(AUTH_COMPANY_STORAGE_KEY) : null;
    if (storedCompany) {
      setCurrentCompanyNameState(storedCompany);
    }
    fetchEnvKeys(); 
  }, [fetchEnvKeys]);


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
      const newKeys = Object.keys(newData[0]);
      setColumnsState(prevCols => {
        const combined = new Set([...prevCols, ...newKeys]);
        return Array.from(combined);
      });
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

  const login = useCallback((username: string, pass: string): boolean => {
    if (username === HARDCODED_USERNAME && pass === HARDCODED_PASSWORD) {
      setIsAuthenticatedState(true);
      if (typeof window !== 'undefined') localStorage.setItem('appIsAuthenticated', 'true');
      router.push('/');
      return true;
    }
    showToast({ title: 'Login Failed', description: 'Invalid username or password.', variant: 'destructive' });
    return false;
  }, [router, showToast]);

  const setCurrentCompanyName = useCallback((name: string | null) => {
    setCurrentCompanyNameState(name);
    if (typeof window !== 'undefined') {
        if (name) {
        localStorage.setItem(AUTH_COMPANY_STORAGE_KEY, name);
        } else {
        localStorage.removeItem(AUTH_COMPANY_STORAGE_KEY);
        }
    }
  }, []);

  const clearApiToken = useCallback(() => {
    if (typeof window !== 'undefined') localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setCurrentCompanyName(null); 
  }, [setCurrentCompanyName]);
  
  const logout = useCallback(() => {
    setIsAuthenticatedState(false);
    if (typeof window !== 'undefined') localStorage.removeItem('appIsAuthenticated');
    clearApiToken(); 
    setChatHistory([]);
    setDataState([]);
    setColumnsState([]);
    setFileNameState(null);
    router.push('/login');
  }, [router, clearApiToken, showToast]); // Keep clearApiToken if it's stable and this doesn't fix. Try removing first.
  // Corrected line: removed clearApiToken from dependency array as it's stable.
  // const logout = useCallback(() => {
  //   setIsAuthenticatedState(false);
  //   if (typeof window !== 'undefined') localStorage.removeItem('appIsAuthenticated');
  //   clearApiToken(); 
  //   setChatHistory([]);
  //   setDataState([]);
  //   setColumnsState([]);
  //   setFileNameState(null);
  //   router.push('/login');
  // }, [router, showToast]); // Removed clearApiToken

  const storeApiToken = useCallback((token: string, companyName?: string | null) => {
    if (typeof window !== 'undefined') localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    if (companyName) {
      setCurrentCompanyName(companyName);
    } else {
      setCurrentCompanyName(null);
    }
  }, [setCurrentCompanyName]);

  const getApiToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    }
    return null;
  }, []);

  const setSelectedAiProvider = useCallback((provider: string | null) => {
    setSelectedAiProviderState(provider);
    if (typeof window !== 'undefined') {
        if (provider) {
        localStorage.setItem(AI_PROVIDER_STORAGE_KEY, provider);
        } else {
        localStorage.removeItem(AI_PROVIDER_STORAGE_KEY);
        }
    }
  }, []);

  const setSelectedAiModelName = useCallback((modelName: string | null) => {
    setSelectedAiModelNameState(modelName);
    if (typeof window !== 'undefined') {
        if (modelName) {
        localStorage.setItem(AI_MODEL_NAME_STORAGE_KEY, modelName);
        } else {
        localStorage.removeItem(AI_MODEL_NAME_STORAGE_KEY);
        }
    }
  }, []);
  
  const getEnvKeys = useCallback(() => envKeys, [envKeys]);


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
        isLoading: isLoadingState,
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
        selectedAiProvider,
        setSelectedAiProvider,
        selectedAiModelName,
        setSelectedAiModelName,
        getEnvKeys,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
