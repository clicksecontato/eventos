'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Layout from '@/components/Layout';
import { useCurrentUser } from '@/hooks/useAuth';

import { dataService } from '@/lib/data-service';
import { TipoEvento } from '@/types';
import {
  CalendarDaysIcon,
  CheckIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import PlanOverlay from '@/components/PlanOverlay';
import { useToast } from '@/components/ui/toast';
import { handlePlanoError } from '@/lib/utils/plano-errors';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function TiposEventoPage() {
  const router = useRouter();
  const { userId } = useCurrentUser();
  const [tiposEvento, setTiposEvento] = useState<TipoEvento[]>([]);
  const [tiposInativos, setTiposInativos] = useState<TipoEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarFormNovo, setMostrarFormNovo] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'ativos' | 'inativos'>('ativos');
  const [tipoParaExcluir, setTipoParaExcluir] = useState<TipoEvento | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { showToast } = useToast();
  const [novoTipo, setNovoTipo] = useState({
    nome: '',
    descricao: ''
  });
  const [editandoTipo, setEditandoTipo] = useState({
    nome: '',
    descricao: '',
    ativo: true
  });

  useEffect(() => {
    const carregarTiposEvento = async () => {
      if (!userId) {
        return;
      }

      try {
        const tipos = await dataService.getTiposEventoAtivos(userId);
        setTiposEvento(tipos);
        const inativos = await dataService.getTiposEventoInativos(userId);
        setTiposInativos(inativos);
      } catch (error) {
        // Erro silencioso
      } finally {
        setLoading(false);
      }
    };

    carregarTiposEvento();
  }, [userId]);

  const recarregarTipos = async () => {
    if (!userId) return;
    try {
      const tipos = await dataService.getTiposEventoAtivos(userId);
      setTiposEvento(tipos);
      const inativos = await dataService.getTiposEventoInativos(userId);
      setTiposInativos(inativos);
    } catch (error) {
      // Erro silencioso
    }
  };

  const tiposExibidos = abaAtiva === 'ativos' ? tiposEvento : tiposInativos;
  const tiposFiltrados = tiposExibidos.filter(tipo =>
    tipo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tipo.descricao || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCriarTipo = async () => {
    if (!userId || !novoTipo.nome.trim()) return;

    try {
      const novo = await dataService.createTipoEvento(
        {
          nome: novoTipo.nome.trim(),
          descricao: novoTipo.descricao.trim(),
          ativo: true
        },
        userId
      );
      showToast('Tipo de evento criado com sucesso!', 'success');
      await recarregarTipos();
      setNovoTipo({ nome: '', descricao: '' });
      setMostrarFormNovo(false);
    } catch (error: any) {
      // Tratar erros de plano
      const erroTratado = handlePlanoError(error, showToast, () => router.push('/planos'));
      
      if (!erroTratado) {
        showToast(error.message || 'Erro ao criar tipo de evento. Tente novamente.', 'error');
      }
    }
  };

  const handleAtualizarTipo = async (tipo: TipoEvento) => {
    if (!userId || !editandoTipo.nome.trim()) return;

    try {
      const atualizado = await dataService.updateTipoEvento(
        tipo.id,
        {
          nome: editandoTipo.nome.trim(),
          descricao: editandoTipo.descricao.trim(),
          ativo: editandoTipo.ativo
        },
        userId
      );
      showToast('Tipo de evento atualizado com sucesso!', 'success');
      await recarregarTipos();
      setEditandoId(null);
    } catch (error) {
      // Erro silencioso
    }
  };

  const handleExcluirTipo = (tipo: TipoEvento) => {
    setTipoParaExcluir(tipo);
    setShowDeleteDialog(true);
  };

  const confirmarExclusao = async () => {
    if (!tipoParaExcluir || !userId) return;

    try {
      await dataService.deleteTipoEvento(tipoParaExcluir.id, userId);
      showToast('Tipo de evento inativado com sucesso!', 'success');
      await recarregarTipos();
      setTipoParaExcluir(null);
    } catch (error) {
      showToast('Erro ao inativar tipo de evento', 'error');
    }
  };

  const handleReativar = async (tipo: TipoEvento) => {
    if (!userId) return;

    try {
      await dataService.reativarTipoEvento(tipo.id, userId);
      showToast('Tipo de evento reativado com sucesso!', 'success');
      await recarregarTipos();
    } catch (error) {
      showToast('Erro ao reativar tipo de evento', 'error');
    }
  };

  const iniciarEdicao = (tipo: TipoEvento) => {
    setEditandoId(tipo.id);
    setEditandoTipo({
      nome: tipo.nome,
      descricao: tipo.descricao || '',
      ativo: tipo.ativo
    });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setEditandoTipo({ nome: '', descricao: '', ativo: true });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Carregando tipos de evento...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PlanOverlay>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <CalendarDaysIcon className="h-6 w-6" />
              Tipos de Evento
            </h1>
            <p className="text-text-secondary">Gerencie as categorias dos seus eventos</p>
          </div>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setMostrarFormNovo(true)}
                  className="btn-add"
                  size="icon"
                >
                  <PlusIcon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-medium">
                <p>Novo tipo de evento</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Abas */}
        <Card>
          <CardContent className="p-0">
            <div className="flex gap-2 p-2">
              <button
                onClick={() => setAbaAtiva('ativos')}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-all rounded-lg cursor-pointer ${
                  abaAtiva === 'ativos'
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                Ativos ({tiposEvento.length})
              </button>
              <button
                onClick={() => setAbaAtiva('inativos')}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-all rounded-lg cursor-pointer ${
                  abaAtiva === 'inativos'
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                Inativos ({tiposInativos.length})
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <Input
              label="Buscar"
              placeholder={`Buscar tipos de evento ${abaAtiva === 'ativos' ? 'ativos' : 'inativos'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardContent>
        </Card>

        {mostrarFormNovo && (
          <Card>
              <CardHeader>
                <CardTitle>Novo Tipo de Evento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Nome *"
                  placeholder="Ex: Casamento, 15 anos..."
                  value={novoTipo.nome}
                  onChange={(e) => setNovoTipo(prev => ({ ...prev, nome: e.target.value }))}
                />
                <Textarea
                  label="Descrição"
                  placeholder="Descrição opcional do tipo de evento"
                  value={novoTipo.descricao}
                  onChange={(e) => setNovoTipo(prev => ({ ...prev, descricao: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMostrarFormNovo(false);
                    setNovoTipo({ nome: '', descricao: '' });
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCriarTipo} disabled={!novoTipo.nome.trim()}>
                  Criar Tipo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {tiposFiltrados.map((tipo) => (
            <Card key={tipo.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                {editandoId === tipo.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <Input
                        label="Nome *"
                        value={editandoTipo.nome}
                        onChange={(e) => setEditandoTipo(prev => ({ ...prev, nome: e.target.value }))}
                      />
                      <Textarea
                        label="Descrição"
                        value={editandoTipo.descricao}
                        onChange={(e) => setEditandoTipo(prev => ({ ...prev, descricao: e.target.value }))}
                        rows={3}
                      />
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`ativo-${tipo.id}`}
                          checked={editandoTipo.ativo}
                          onChange={(e) => setEditandoTipo(prev => ({ ...prev, ativo: e.target.checked }))}
                          className="rounded border-border"
                        />
                        <label htmlFor={`ativo-${tipo.id}`} className="text-sm text-text-primary">
                          Tipo de evento ativo
                        </label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={cancelarEdicao}>
                        <XMarkIcon className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAtualizarTipo(tipo)}
                        disabled={!editandoTipo.nome.trim()}
                      >
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-text-primary">
                          {tipo.nome}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tipo.ativo ? 'bg-success-bg text-success-text' : 'bg-error-bg text-error-text'
                          }`}
                        >
                          {tipo.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      {tipo.descricao && (
                        <p className="text-text-secondary mb-2">{tipo.descricao}</p>
                      )}
                      <p className="text-sm text-text-muted">
                        Criado em {new Date(tipo.dataCadastro).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="action-edit"
                              size="icon"
                              onClick={() => iniciarEdicao(tipo)}
                            >
                              <PencilIcon className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="font-medium">
                            <p>Editar tipo de evento</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {abaAtiva === 'ativos' ? (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="action-delete"
                                size="icon"
                                onClick={() => handleExcluirTipo(tipo)}
                              >
                                <TrashIcon className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="font-medium">
                              <p>Inativar tipo de evento</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="action-view"
                                size="icon"
                                onClick={() => handleReativar(tipo)}
                              >
                                <ArrowPathIcon className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="font-medium">
                              <p>Reativar tipo de evento</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {tiposFiltrados.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <CalendarDaysIcon className="mx-auto h-12 w-12 text-text-muted" />
              <h3 className="mt-2 text-sm font-medium text-text-primary">
                {searchTerm 
                  ? 'Nenhum tipo encontrado' 
                  : abaAtiva === 'ativos' 
                    ? 'Nenhum tipo de evento ativo' 
                    : 'Nenhum tipo de evento inativo'}
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                {searchTerm
                  ? 'Tente ajustar o termo de busca.'
                  : abaAtiva === 'ativos'
                    ? 'Comece criando um novo tipo de evento.'
                    : 'Não há tipos inativos no momento.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Modal de Confirmação de Inativação */}
        <ConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="Inativar Tipo de Evento"
          description={
            tipoParaExcluir
              ? `Tem certeza que deseja inativar o tipo de evento "${tipoParaExcluir.nome}"? Ele não aparecerá em listas de seleção, mas continuará disponível para eventos existentes.`
              : 'Tem certeza que deseja inativar este tipo de evento?'
          }
          confirmText="Inativar"
          cancelText="Cancelar"
          variant="default"
          onConfirm={confirmarExclusao}
        />
      </div>
      </PlanOverlay>
    </Layout>
  );
}

