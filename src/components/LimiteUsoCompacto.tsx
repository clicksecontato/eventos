'use client';

import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { CalendarIcon, ExclamationTriangleIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface LimiteUsoCompactoProps {
  usado: number;
  limite: number;
  tipo?: 'eventos' | 'clientes' | 'usuarios' | 'armazenamento';
  periodo?: 'mes' | 'total';
  onExpandir?: () => void;
}

export default function LimiteUsoCompacto({ 
  usado, 
  limite, 
  tipo = 'eventos',
  periodo = 'mes',
  onExpandir 
}: LimiteUsoCompactoProps) {
  if (!limite || limite === 0) {
    return null;
  }

  const porcentagem = Math.min((usado / limite) * 100, 100);
  const estaPertoDoLimite = porcentagem >= 80;
  const limiteAtingido = usado >= limite;
  const restante = Math.max(0, limite - usado);

  // Cores baseado no status
  let corBarra = 'bg-primary';
  let corTexto = 'text-text-secondary';
  let corIndicador = 'text-primary';
  let mostraAlerta = false;

  if (limiteAtingido) {
    corBarra = 'bg-error-text';
    corTexto = 'text-error-text';
    corIndicador = 'text-error-text';
    mostraAlerta = true;
  } else if (estaPertoDoLimite) {
    corBarra = 'bg-warning-text';
    corTexto = 'text-warning-text';
    corIndicador = 'text-warning-text';
    mostraAlerta = true;
  }

  // Ícones e labels por tipo
  const getIconAndLabel = () => {
    switch (tipo) {
      case 'clientes':
        return { icon: UserGroupIcon, label: 'clientes' };
      case 'eventos':
      default:
        return { icon: CalendarIcon, label: 'eventos' };
    }
  };

  const { icon: IconComponent, label } = getIconAndLabel();
  const textoPeriodo = periodo === 'mes' ? 'do mês' : 'total';
  const tooltipText = limiteAtingido
    ? `Limite atingido: ${usado}/${limite} ${label} ${textoPeriodo}. Atualize seu plano para continuar.`
    : estaPertoDoLimite
    ? `Próximo do limite: ${usado}/${limite} ${label} ${textoPeriodo}. ${restante} restante${restante !== 1 ? 's' : ''}.`
    : `${usado}/${limite} ${label} ${textoPeriodo}. ${restante} restante${restante !== 1 ? 's' : ''}.`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer hover:shadow-sm ${
              mostraAlerta 
                ? 'bg-warning-bg/30 border-warning-border' 
                : 'bg-surface border-border hover:bg-surface-hover'
            }`}
            onClick={onExpandir}
          >
            {mostraAlerta && (
              <ExclamationTriangleIcon className={`h-4 w-4 ${corIndicador} flex-shrink-0`} />
            )}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <IconComponent className={`h-4 w-4 ${corIndicador} flex-shrink-0`} />
              <span className={`text-sm font-medium whitespace-nowrap ${corTexto}`}>
                {usado}/{limite}
              </span>
              <div className="flex-1 min-w-[60px] max-w-[100px] h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${corBarra}`}
                  style={{ width: `${porcentagem}%` }}
                />
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold capitalize">{label} {textoPeriodo}</p>
            <p className="text-xs">{tooltipText}</p>
            {mostraAlerta && (
              <p className="text-xs text-warning-text mt-1">
                {limiteAtingido 
                  ? `Atualize seu plano para continuar criando ${label}.`
                  : 'Considere fazer upgrade do plano.'}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

