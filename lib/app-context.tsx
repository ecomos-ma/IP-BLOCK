'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Store } from './types';
import { apiCall } from './api';

interface AppContextType {
  session: string | null;
  setSession: (s: string | null) => void;
  stores: Store[];
  setStores: React.Dispatch<React.SetStateAction<Store[]>>;
  selectedStoreId: string;
  setSelectedStoreId: (id: string) => void;
  currentStore: Store | null;
  isDemo: boolean;
  supabaseClient: SupabaseClient | null;
  refreshStores: () => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const isDemo = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

  const supabaseClient = useMemo<SupabaseClient | null>(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createClient(url, key) : null;
  }, []);

  const [session, setSession] = useState<string | null>(isDemo ? 'demo' : null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isDemo) {
      setSession('demo');
      setLoading(false);
      return;
    }

    if (!supabaseClient) {
      setLoading(false);
      return;
    }

    supabaseClient.auth.getSession().then(({ data }) => {
      setSession(data.session?.access_token || null);
      setLoading(false);
    });

    const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, current) => {
      setSession(current?.access_token || null);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, [supabaseClient, isDemo]);

  const refreshStores = async () => {
    if (!session && !isDemo) return;
    try {
      const data = await apiCall<{ stores: Store[] }>('/api/stores', 'GET', undefined, session);
      setStores(data.stores);
      if (data.stores.length > 0 && !selectedStoreId) {
        setSelectedStoreId(data.stores[0].id);
      }
    } catch {
      // Ignore error
    }
  };

  useEffect(() => {
    if (session) {
      refreshStores();
    } else {
      setStores([]);
    }
  }, [session]);

  const currentStore = useMemo(() => {
    return stores.find(s => s.id === selectedStoreId) || stores[0] || null;
  }, [stores, selectedStoreId]);

  return (
    <AppContext.Provider
      value={{
        session,
        setSession,
        stores,
        setStores,
        selectedStoreId,
        setSelectedStoreId,
        currentStore,
        isDemo,
        supabaseClient,
        refreshStores,
        loading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
