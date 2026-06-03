// Security note: Sign-in is email-only with no proof of ownership. Any person who knows a
// volunteer's email can sign in as them. This is an intentional simplicity tradeoff for an
// internal volunteer app with non-sensitive data.

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { API_BASE } from '@/constants/api';
import * as SplashScreen from 'expo-splash-screen';

const STORAGE_KEY = '@swcpc_reimb_session';

export interface Session {
  contactId: string;
  email: string;
  firstName?: string;
}

interface BudgetData {
  year: number;
  spent: number;
  remaining: number;
}

interface SessionContextValue {
  session: Session | null;
  isHydrating: boolean; // true while AsyncStorage read is in-flight
  signIn: (s: Session) => Promise<void>;
  signOut: () => Promise<void>;
  budget: BudgetData | null;
  budgetLoading: boolean;
  refreshBudget: () => Promise<void>;
  canApprove: boolean;
  canComplete: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);

  useEffect(() => {
    // Keep splash screen visible until session is loaded
    SplashScreen.preventAutoHideAsync().catch(() => {});

    AsyncStorage.getItem(STORAGE_KEY)
      .then(json => {
        if (json) {
          try {
            setSession(JSON.parse(json) as Session);
          } catch {
            // ignore invalid stored data
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsHydrating(false);
        SplashScreen.hideAsync().catch(() => {});
      });
  }, []);

  const refreshBudget = useCallback(async () => {
    if (!session?.contactId) return;
    setBudgetLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reimbursements/budget/${session.contactId}`);
      if (res.ok) {
        setBudget(await res.json());
      }
    } catch {
      // ignore — budget is informational, not required
    } finally {
      setBudgetLoading(false);
    }
  }, [session?.contactId]);

  // Fetch budget when session changes
  useEffect(() => {
    if (session) {
      refreshBudget();
    } else {
      setBudget(null);
    }
  }, [session?.contactId]);

  const canApprove = useMemo(
    () => ['president@corridorpark.org', 'communications@corridorpark.org']
          .includes(session?.email?.toLowerCase() ?? ''),
    [session?.email]
  );

  const canComplete = useMemo(
    () => ['treasurer@corridorpark.org', 'communications@corridorpark.org']
          .includes(session?.email?.toLowerCase() ?? ''),
    [session?.email]
  );

  const signIn = async (s: Session) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSession(s);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setBudget(null);
    router.replace('/sign-in');
  };

  return (
    <SessionContext.Provider value={{ session, isHydrating, signIn, signOut, budget, budgetLoading, refreshBudget, canApprove, canComplete }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
