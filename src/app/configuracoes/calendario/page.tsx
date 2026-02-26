/* 
 * COMENTADO: Aguardando permissões diretas da Google para dados sensíveis
 * Esta funcionalidade será reativada no futuro após obtenção das permissões necessárias
 * 
 * Data de comentário: 2025-01-XX
 */

'use client';

import Layout from '@/components/Layout';

export default function GoogleCalendarConfigPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-text-primary mb-4">Google Calendar</h1>
          <p className="text-text-secondary">
            Esta funcionalidade está temporariamente desabilitada. Aguardando permissões diretas da Google para dados sensíveis.
          </p>
        </div>
      </div>
    </Layout>
  );
}

/*
 * TODO: Reativar quando tivermos permissões diretas da Google
 * 
 * Código original comentado abaixo:
 */

/*
'use client';

/**
 * Página de configuração do Google Calendar
 * 
 * Esta página é opcional e não quebra o sistema se não estiver configurada.
 */

/*
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { GoogleCalendarSyncStatus } from '@/types/google-calendar';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  LinkIcon,
  CalendarIcon,
  PlusIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// TODO: Reativar quando tivermos permissões diretas da Google
function GoogleCalendarConfigContent() {
  // ... todo o código original foi comentado ...
  // Ver arquivo de backup ou histórico do git para restaurar
}

export default function GoogleCalendarConfigPage() {
  return (
    <Layout>
      <Suspense fallback={<div>Carregando...</div>}>
        <GoogleCalendarConfigContent />
      </Suspense>
    </Layout>
  );
}
*/
