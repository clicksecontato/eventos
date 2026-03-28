'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { DevAuthBootstrap } from '@/components/providers/DevAuthBootstrap';

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider>
      <DevAuthBootstrap />
      {children}
    </NextAuthSessionProvider>
  );
}
