'use client';

import React from 'react';
import { ServicoEvento } from '@/types';

interface ServicosBadgesProps {
  servicos: ServicoEvento[];
  className?: string;
}

/**
 * Componente para exibir os tipos de serviços de um evento como badges/chips
 * Exibe todos os nomes dos tipos de serviços sem truncar
 * Otimizado com memoização para evitar re-renders desnecessários
 */
const ServicosBadges = React.memo(function ServicosBadges({ servicos, className = '' }: ServicosBadgesProps) {
  // Filtrar apenas serviços não removidos e extrair nomes únicos
  const nomesServicos = React.useMemo(() => {
    const nomes = servicos
      .filter(servico => !servico.removido && servico.tipoServico?.nome)
      .map(servico => servico.tipoServico!.nome);
    
    // Remover duplicatas mantendo a ordem
    return Array.from(new Set(nomes));
  }, [servicos]);


  if (nomesServicos.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {nomesServicos.map((nome, index) => (
        <span
          key={`${nome}-${index}`}
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20"
        >
          {nome}
        </span>
      ))}
    </div>
  );
});

export default ServicosBadges;

