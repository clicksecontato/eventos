'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getInitialSidebarState, saveSidebarState } from '../utils/sidebarUtils';

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: React.ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  // Inicializar com valor do localStorage se disponível, senão false (expandido)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return getInitialSidebarState();
    }
    return false; // Default para SSR
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Garantir que o estado está sincronizado após montagem
    const initialState = getInitialSidebarState();
    setIsCollapsed(initialState);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      saveSidebarState(isCollapsed);
    }
  }, [isCollapsed, mounted]);

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };

  const setCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
  };

  // Sempre fornecer o contexto, mesmo durante hidratação
  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
};

