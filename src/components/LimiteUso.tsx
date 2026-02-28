'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface LimiteUsoProps {
  tipo: 'eventos' | 'clientes' | 'usuarios' | 'armazenamento';
  usado: number;
  limite?: number;
  periodo?: 'mes' | 'total';
  unidade?: string;
}

export default function LimiteUso({ tipo, usado, limite, periodo = 'total', unidade }: LimiteUsoProps) {
  // Se não há limite, não mostrar nada
  if (!limite || limite === 0) {
    return null;
  }

  const porcentagem = Math.min((usado / limite) * 100, 100);
  const estaPertoDoLimite = porcentagem >= 80;
  const limiteAtingido = usado >= limite;

  // Definir cores baseado no status
  let corBarra = 'bg-primary';
  let corTexto = 'text-text-primary';
  let bgCard = 'bg-surface';
  let mensagemStatus = '';

  if (limiteAtingido) {
    corBarra = 'bg-error-text';
    corTexto = 'text-error-text';
    bgCard = 'bg-error-bg/20';
    mensagemStatus = 'Limite atingido';
  } else if (estaPertoDoLimite) {
    corBarra = 'bg-warning-text';
    corTexto = 'text-warning-text';
    bgCard = 'bg-warning-bg/20';
    mensagemStatus = 'Próximo do limite';
  }

  // Labels e ícones
  const labels: Record<string, { nome: string; icone: string }> = {
    eventos: { nome: 'Eventos', icone: '📅' },
    clientes: { nome: 'Clientes', icone: '👥' },
    usuarios: { nome: 'Usuários', icone: '👤' },
    armazenamento: { nome: 'Armazenamento', icone: '💾' }
  };

  const { nome, icone } = labels[tipo] || { nome: tipo, icone: '📊' };

  // Formatar valor
  const formatarValor = (valor: number): string => {
    if (tipo === 'armazenamento') {
      if (valor < 1024) return `${valor} B`;
      if (valor < 1024 * 1024) return `${(valor / 1024).toFixed(2)} KB`;
      if (valor < 1024 * 1024 * 1024) return `${(valor / (1024 * 1024)).toFixed(2)} MB`;
      return `${(valor / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return valor.toLocaleString('pt-BR');
  };

  const restante = Math.max(0, limite - usado);
  const textoPeriodo = periodo === 'mes' ? 'do mês' : 'total';

  return (
    <Card className={`${bgCard} transition-colors`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icone}</span>
            <CardTitle className="text-base font-semibold text-text-primary">
              {nome} {textoPeriodo}
            </CardTitle>
          </div>
          {mensagemStatus && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${corTexto} ${bgCard} border ${corBarra} border-opacity-30`}>
              {mensagemStatus}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Valores */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-text-primary">
              {formatarValor(usado)}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              de {formatarValor(limite)} {unidade || ''}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-semibold ${corTexto}`}>
              {porcentagem.toFixed(1)}%
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {restante > 0 ? `${formatarValor(restante)} restante${restante !== 1 ? 's' : ''}` : 'Sem limite restante'}
            </p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="relative w-full bg-border rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${corBarra}`}
            style={{ width: `${porcentagem}%` }}
          />
          {/* Indicador de 80% */}
          {!limiteAtingido && (
            <div
              className="absolute top-0 w-0.5 h-full bg-warning-text opacity-50"
              style={{ left: '80%' }}
            />
          )}
        </div>

        {/* Aviso se próximo do limite */}
        {estaPertoDoLimite && !limiteAtingido && (
          <p className="text-xs text-warning-text mt-2">
            ⚠️ Você está usando {porcentagem.toFixed(0)}% do seu limite. Se necessário, solicite ajuste ao administrador.
          </p>
        )}

        {/* Aviso se limite atingido */}
        {limiteAtingido && (
          <p className="text-xs text-error-text mt-2">
            ❌ Limite atingido. Solicite ao administrador a ampliação do seu acesso.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

