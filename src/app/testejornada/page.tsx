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
            Use em ambiente de desenvolvimento caso precise restaurar testes de integração legada.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
