
"use client";

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useAppContext } from '@/hooks/useAppContext';
import { KeyRound, Loader2, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const AUTH_TOKEN_STORAGE_KEY = 'datawiseAuthToken';

export default function AuthTokenPage() {
  const { showToast, isLoading, setIsLoading, isAuthenticated, isAuthLoading } = useAppContext();
  const [email, setEmail] = useState('jthurston@centraltransport.com'); // Pre-fill from cURL
  const [password, setPassword] = useState(''); // Pre-fill from cURL
  const [storedToken, setStoredToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setStoredToken(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('https://api.axle.network/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
        },
        body: JSON.stringify({
          email,
          password,
          role: 'carrier',
          deviceType: 'WEB',
          flushPreviousSessions: true,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || `API Error: ${response.status}`);
      }
      
      const token = responseData.token || responseData.data?.token;

      if (token) {
        if (typeof window !== 'undefined') {
            localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
        }
        setStoredToken(token);
        showToast({ title: 'Success', description: 'Authentication token obtained and stored.' });
      } else {
        throw new Error('Token not found in API response.');
      }
    } catch (error) {
      console.error('Error obtaining token:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to obtain token.';
      showToast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      }
      setStoredToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearToken = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
    setStoredToken(null);
    showToast({ title: 'Token Cleared', description: 'Authentication token removed from local storage.' });
  };
  
  if (isAuthLoading || !isAuthenticated) {
     return (
      <AppLayout pageTitle="Loading Auth Token...">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }
  
  const pageTitleString = "API Authentication Token";

  return (
    <AppLayout pageTitle={pageTitleString}>
      <div className="space-y-6">
         {/* Page-specific sub-header, if needed, below AppLayout's global header */}
         <div className="flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-muted-foreground" />
            <span className="text-lg font-semibold">Configure API Access</span>
         </div>
        <CardDescription>
          Use this page to obtain a bearer token from the API. The token will be stored in your browser's local storage and used for "Export Data" API calls.
        </CardDescription>
        
        {/* Separator is now handled by AppLayout after its global header elements */}

        <Card className="w-full max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Login to API</CardTitle>
            <CardDescription>Enter your API credentials to get a bearer token.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="johndoe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="Enter API password (can be empty as per cURL)"
                />
                 <p className="text-xs text-muted-foreground">Leave empty if your API password is an empty string.</p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Get/Refresh Token
              </Button>
            </form>
          </CardContent>
        </Card>

        {storedToken && (
          <Card className="w-full max-w-lg mx-auto mt-6">
            <CardHeader>
              <CardTitle>Stored Token</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-green-600">A token is currently stored in local storage.</p>
              <Input
                type="text"
                value={storedToken ? `Bearer ${storedToken.substring(0, 20)}...` : 'No token stored'}
                readOnly
                className="font-mono text-xs"
              />
               <Button onClick={handleClearToken} variant="outline" className="w-full" disabled={isLoading}>
                <Trash2 className="mr-2 h-4 w-4" /> Clear Stored Token
              </Button>
            </CardContent>
          </Card>
        )}
         {!storedToken && !isLoading && (
            <p className="text-center text-muted-foreground mt-6">No token is currently stored. Use the form above to obtain one.</p>
        )}
      </div>
    </AppLayout>
  );
}
