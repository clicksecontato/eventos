'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TipoServico } from '@/types';
import { TagIcon } from '@heroicons/react/24/outline';

interface EventoServicosSectionProps {
  tiposServico: TipoServico[];
  selectedIds: Set<string>;
  onToggle: (tipoId: string) => void;
  onSelecionarTodos: () => void;
  totalSelecionado: number;
  loading: boolean;
  onCreateTipo: (nome: string) => Promise<void>;
  criandoTipo: boolean;
  errorMessage?: string | null;
}

const EventoServicosSection: React.FC<EventoServicosSectionProps> = ({
  tiposServico,
  selectedIds,
  onToggle,
  onSelecionarTodos,
  totalSelecionado,
  loading,
  onCreateTipo,
  criandoTipo,
  errorMessage
}) => {
  const [novoServicoNome, setNovoServicoNome] = useState('');

  const handleCriarNovoServico = async () => {
    if (!novoServicoNome.trim()) {
      return;
    }

    try {
      await onCreateTipo(novoServicoNome.trim());
      setNovoServicoNome('');
    } catch (error) {
      // Erro silencioso
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = async (event) => {
    if (event.key === 'Enter' && novoServicoNome.trim()) {
      event.preventDefault();
      await handleCriarNovoServico();
    }
  };

  const allSelected = tiposServico.length > 0 && selectedIds.size === tiposServico.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TagIcon className="h-5 w-5" />
          Serviços do Evento
        </CardTitle>
        <CardDescription>
          Selecione os serviços que farão parte deste evento e crie novos tipos quando necessário.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border border-border rounded-lg bg-surface">
          <div className="flex items-center gap-2 mb-3">
            <TagIcon className="h-4 w-4 text-accent" />
            <label className="text-sm font-medium text-text-primary">
              Criar novo tipo de serviço
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Digite o nome do novo serviço"
              value={novoServicoNome}
              onChange={(event) => setNovoServicoNome(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={criandoTipo}
              className="flex-1"
            />
            <Button
              onClick={handleCriarNovoServico}
              disabled={!novoServicoNome.trim() || criandoTipo}
              size="sm"
            >
              {criandoTipo ? 'Criando...' : 'Criar'}
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="text-sm text-error">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-text-secondary">
            Carregando tipos de serviço...
          </div>
        ) : tiposServico.length === 0 ? (
          <div className="text-sm text-text-secondary">
            Nenhum tipo de serviço cadastrado. Crie um novo tipo para começar.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <span className="text-sm font-medium text-text-primary">
                {totalSelecionado} de {tiposServico.length} selecionados
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onSelecionarTodos}
              >
                {allSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
            </div>
            <div className="space-y-2">
              {tiposServico.map((tipo) => (
                <label
                  key={tipo.id}
                  className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-surface-hover cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-accent border-border rounded focus:ring-accent focus:ring-2"
                    checked={selectedIds.has(tipo.id)}
                    onChange={() => onToggle(tipo.id)}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text-primary">
                      {tipo.nome}
                    </div>
                    {tipo.descricao && (
                      <div className="text-xs text-text-secondary mt-0.5">
                        {tipo.descricao}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EventoServicosSection;

