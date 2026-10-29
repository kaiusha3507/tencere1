import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BackHandler } from 'react-native';

/**
 * Uygulamanın küçük ve bağımlılıksız gezinme katmanı: alt sekmeler + üstte
 * açılan detay ekranları. Android geri tuşu desteklenir.
 */
export type TabId = 'kesfet' | 'tarifler' | 'liste' | 'kaydedilenler' | 'ayarlar';

export type Route = { name: 'recipe'; id: string; servings?: number };

interface NavState {
  tab: TabId;
  stack: Route[];
  setTab: (t: TabId) => void;
  push: (r: Route) => void;
  pop: () => void;
}

const NavContext = createContext<NavState | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTabState] = useState<TabId>('kesfet');
  const [stack, setStack] = useState<Route[]>([]);

  const setTab = useCallback((t: TabId) => {
    setStack([]);
    setTabState(t);
  }, []);
  const push = useCallback((r: Route) => setStack((s) => [...s, r]), []);
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 0) {
        pop();
        return true;
      }
      if (tab !== 'kesfet') {
        setTabState('kesfet');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, tab, pop]);

  const value = useMemo(() => ({ tab, stack, setTab, push, pop }), [tab, stack, setTab, push, pop]);
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavState {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav NavigationProvider içinde kullanılmalı');
  return ctx;
}
