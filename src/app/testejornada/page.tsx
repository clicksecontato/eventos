'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Página desativada para produção.
 * Para reativar: descomente o bloco "CÓDIGO ORIGINAL" abaixo, remova este stub
 * e restaure o export default do componente TesteJornadaPage.
 */
export default function TesteJornadaPage() {
  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Teste da jornada (desativada)</CardTitle>
          <CardDescription>
            Esta página foi desativada para produção. Para reativar no futuro, descomente o código original comentado neste arquivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use em ambiente de desenvolvimento ou restaure o código para testar o webhook PURCHASE_APPROVED e o e-mail de primeiro acesso.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/*
=== CÓDIGO ORIGINAL - descomente e remova o stub acima para reativar ===

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const EMAIL_TESTE = 'devmichaellourenco@gmail.com';

function buildPayloadPURCHASE_APPROVED() {
  const now = Date.now();
  const dateNextCharge = now + 30 * 24 * 60 * 60 * 1000;

  return {
    id: `test-journey-${now}`,
    creation_date: now,
    event: 'PURCHASE_APPROVED',
    version: '2.0.0',
    data: {
      product: {
        id: 6644384,
        ucode: '51fd3955-e2a0-447b-9f1b-0e0f5a5caf55c',
        name: 'CLICKSEHUB',
        warranty_date: new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19) + 'Z',
        has_co_production: false,
        is_physical_product: false,
      },
      affiliates: [{ affiliate_code: '', name: '' }],
      buyer: {
        email: EMAIL_TESTE,
        name: 'Teste Jornada',
        first_name: 'Teste',
        last_name: 'Jornada',
        address: { city: '', country: 'Brasil', country_iso: 'BR', zipcode: '', address: '', complement: '' },
        document: '',
        document_type: '',
      },
      producer: {
        name: 'Michael Gomes da Cunha Lourenço',
        document: '33762021848',
        legal_nature: 'Pessoa Física',
      },
      commissions: [
        { value: 0, source: 'MARKETPLACE', currency_value: 'BRL' },
        { value: 0, source: 'PRODUCER', currency_value: 'BRL' },
      ],
      purchase: {
        approved_date: now,
        full_price: { value: 0, currency_value: 'BRL' },
        price: { value: 0, currency_value: 'BRL' },
        checkout_country: { name: 'Brasil', iso: 'BR' },
        order_bump: { is_order_bump: false },
        original_offer_price: { value: 0, currency_value: 'BRL' },
        order_date: now,
        status: 'APPROVED',
        transaction: `HP-TEST-${now}`,
        payment: { installments_number: 1, type: 'CREDIT_CARD' },
        offer: {
          code: '8i552qn2',
          description: 'Sistema completo de gestão para empresas de eventos.',
        },
        invoice_by: 'HOTMART',
        subscription_anticipation_purchase: false,
        date_next_charge: dateNextCharge,
        recurrence_number: 1,
        is_funnel: false,
        business_model: 'I',
      },
      subscription: {
        status: 'ACTIVE',
        plan: { id: 1196829, name: 'BÁSICO' },
        subscriber: { code: `TEST-JOURNEY-${now}` },
      },
    },
  };
}

export default function TesteJornadaPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  const handleDisparar = async () => {
    setLoading(true);
    setResult(null);
    const payload = buildPayloadPURCHASE_APPROVED();

    try {
      const res = await fetch('/api/webhooks/hotmart/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setResult({ success: true, message: data.message });
      } else {
        setResult({ success: false, error: data.error || data.message || `HTTP ${res.status}` });
      }
    } catch (e: any) {
      setResult({ success: false, error: e?.message || 'Erro ao chamar webhook' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Testar jornada PURCHASE_APPROVED</CardTitle>
          <CardDescription>
            Dispara o webhook da Hotmart com PURCHASE_APPROVED. O payload usa a data do momento do clique.
            E-mail de teste: <strong>{EMAIL_TESTE}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleDisparar}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Disparando webhook...' : 'Disparar PURCHASE_APPROVED'}
          </Button>

          {result && (
            <div
              className={`p-4 rounded-lg ${
                result.success ? 'bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200' : 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200'
              }`}
            >
              {result.success ? (
                <>
                  <p className="font-medium">Webhook processado com sucesso</p>
                  <p className="text-sm mt-1">{result.message}</p>
                  <p className="text-sm mt-2 opacity-90">
                    Verifique o e-mail <strong>{EMAIL_TESTE}</strong> para o e-mail de boas-vindas com o link para definir a senha.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">Erro</p>
                  <p className="text-sm mt-1">{result.error}</p>
                </>
              )}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Endpoint: <code className="bg-muted px-1 rounded">POST /api/webhooks/hotmart/sandbox</code>. Plano: BÁSICO (1196829).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

*/
