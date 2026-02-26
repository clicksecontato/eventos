'use client';

import { useEffect, useState } from 'react';
import { usePlano } from '@/lib/hooks/usePlano';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Lock } from 'lucide-react';

interface PlanoBloqueioProps {
  funcionalidade?: string;
  limite?: 'eventos' | 'clientes';
  mensagem?: string;
  children?: React.ReactNode;
  mostrarBotaoAtualizar?: boolean;
}

export default function PlanoBloqueio({
  funcionalidade,
  limite,
  mensagem,
  children,
  mostrarBotaoAtualizar = true
}: PlanoBloqueioProps) {
  const { statusPlano, temPermissao, podeCriar, loading } = usePlano();
  const [bloqueado, setBloqueado] = useState(false);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [detalhesLimite, setDetalhesLimite] = useState<{ limite?: number; usado?: number; restante?: number } | null>(null);

  useEffect(() => {
    const verificarBloqueio = async () => {
      if (loading) return;

      // Verificar funcionalidade
      if (funcionalidade) {
        const temPerm = await temPermissao(funcionalidade);
        if (!temPerm) {
          setBloqueado(true);
          setMotivo(mensagem || `Esta funcionalidade não está disponível no seu plano atual`);
          return;
        }
      }

      // Verificar limite
      if (limite) {
        const resultado = await podeCriar(limite);
        if (!resultado.pode) {
          setBloqueado(true);
          setMotivo(resultado.motivo || `Limite de ${limite} atingido`);
          setDetalhesLimite({
            limite: resultado.limite,
            usado: resultado.usado,
            restante: resultado.restante
          });
          return;
        }
      }

      setBloqueado(false);
    };

    verificarBloqueio();
  }, [funcionalidade, limite, mensagem, temPermissao, podeCriar, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-text-secondary">Carregando...</div>
      </div>
    );
  }

  if (!bloqueado) {
    return <>{children}</>;
  }

  return (
    <div className="w-full">
      <Card className="border-warning-border bg-warning-bg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-warning-text" />
            <CardTitle className="text-warning-text">Acesso Bloqueado</CardTitle>
          </div>
          <CardDescription className="text-warning-text/80">
            {motivo}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {detalhesLimite && detalhesLimite.limite !== undefined && (
            <div className="mb-4 rounded-lg bg-surface p-4">
              <div className="text-sm text-text-secondary mb-2">
                Limite de uso:
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-lg font-semibold text-text-primary">
                    {detalhesLimite.usado}
                  </span>
                  <span className="text-text-secondary"> / {detalhesLimite.limite}</span>
                </div>
                {detalhesLimite.restante !== undefined && (
                  <div className="text-sm text-text-secondary">
                    {detalhesLimite.restante} restante{detalhesLimite.restante !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <div className="mt-2 w-full bg-border rounded-full h-2">
                <div
                  className="bg-warning-text h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, ((detalhesLimite.usado || 0) / detalhesLimite.limite) * 100)}%`
                  }}
                />
              </div>
            </div>
          )}

          {statusPlano?.plano && (
            <div className="mb-4 text-sm text-text-secondary">
              Plano atual: <span className="font-semibold text-text-primary">{statusPlano.plano.nome}</span>
            </div>
          )}

          {mostrarBotaoAtualizar && (
            <Button
              onClick={() => window.location.href = '/assinatura'}
              className="w-full"
              variant="default"
            >
              Ver Planos Disponíveis
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

