'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Layout from '@/components/Layout';
import { useCurrentUser } from '@/hooks/useAuth';

import { dataService } from '@/lib/data-service';
import { TipoCusto } from '@/types';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalculatorIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import PlanOverlay from '@/components/PlanOverlay';
import { useToast } from '@/components/ui/toast';
import { handlePlanoError } from '@/lib/utils/plano-errors';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function TiposCustosPage() {
  const router = useRouter();
  const { userId } = useCurrentUser();
  const [tiposCusto, setTiposCusto] = useState<TipoCusto[]>([]);
  const [tiposInativos, setTiposInativos] = useState<TipoCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<'ativos' | 'inativos'>('ativos');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [tipoParaExcluir, setTipoParaExcluir] = useState<TipoCusto | null>(null);
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
  const [mostrarFormNovo, setMostrarFormNovo] = useState(false);

  // Carregar tipos de custo
  useEffect(() => {
    const carregarTiposCusto = async () => {
      if (!userId) {
        return;
      }

      try {
        const tipos = await dataService.getTiposCustoAtivos(userId);
        const inativos = await dataService.getTiposCustoInativos(userId);
        setTiposCusto(tipos);
        setTiposInativos(inativos);
      } catch (error) {
        // Erro silencioso
      } finally {
        setLoading(false);
      }
    };

    carregarTiposCusto();
  }, [userId]);

  const recarregarTipos = async () => {
    if (!userId) return;
    try {
      const tipos = await dataService.getTiposCustoAtivos(userId);
      const inativos = await dataService.getTiposCustoInativos(userId);
      setTiposCusto(tipos);
      setTiposInativos(inativos);
    } catch (error) {
      // Erro silencioso
    }
  };

  // Filtrar tipos de custo
  const tiposExibidos = abaAtiva === 'ativos' ? tiposCusto : tiposInativos;
  const tiposFiltrados = tiposExibidos.filter(tipo =>
    tipo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tipo.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNovoTipo = async () => {
    if (!userId || !novoTipo.nome.trim()) return;

    try {
      await dataService.createTipoCusto({
        nome: novoTipo.nome.trim(),
        descricao: novoTipo.descricao.trim() || '',
        ativo: true
      }, userId);
      
      showToast('Tipo de custo criado com sucesso!', 'success');
      await recarregarTipos();
      setNovoTipo({ nome: '', descricao: '' });
      setMostrarFormNovo(false);
    } catch (error: any) {
      // Tratar erros de plano
      const erroTratado = handlePlanoError(error, showToast, () => router.push('/planos'));
      
      if (!erroTratado) {
        showToast(error.message || 'Erro ao criar tipo de custo. Tente novamente.', 'error');
      }
    }
  };

  const handleEditarTipo = async (tipo: TipoCusto) => {
    if (!userId || !editandoTipo.nome.trim()) return;

    try {
      await dataService.updateTipoCusto(tipo.id, {
        nome: editandoTipo.nome.trim(),
        descricao: editandoTipo.descricao.trim() || '',
        ativo: editandoTipo.ativo
      }, userId);
      
      showToast('Tipo de custo atualizado com sucesso!', 'success');
      await recarregarTipos();
      setEditandoId(null);
    } catch (error) {
      // Erro silencioso
    }
  };

  const handleExcluirTipo = (tipo: TipoCusto) => {
    setTipoParaExcluir(tipo);
    setShowDeleteDialog(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!tipoParaExcluir || !userId) return;

    try {
      await dataService.deleteTipoCusto(tipoParaExcluir.id, userId);
      showToast('Tipo de custo inativado com sucesso!', 'success');
      await recarregarTipos();
      setTipoParaExcluir(null);
    } catch (error) {
      showToast('Erro ao inativar tipo de custo', 'error');
    }
  };

  const handleReativar = async (tipo: TipoCusto) => {
    if (!userId) return;

    try {
      await dataService.reativarTipoCusto(tipo.id, userId);
      showToast('Tipo de custo reativado com sucesso!', 'success');
      await recarregarTipos();
    } catch (error) {
      showToast('Erro ao reativar tipo de custo', 'error');
    }
  };

  const iniciarEdicao = (tipo: TipoCusto) => {
    setEditandoId(tipo.id);
    setEditandoTipo({
      nome: tipo.nome,
      descricao: tipo.descricao,
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
          <div className="text-text-secondary">Carregando tipos de custo...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PlanOverlay>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <CalculatorIcon className="h-6 w-6" />
              Tipos de Custo
            </h1>
            <p className="text-text-secondary">
              Gerencie os tipos de custo para eventos
            </p>
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
                <p>Novo tipo de custo</p>
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
                Ativos ({tiposCusto.length})
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

        {/* Busca */}
        <Card>
          <CardContent className="p-6">
            <Input
              label="Buscar"
              placeholder={`Buscar tipos de custo ${abaAtiva === 'ativos' ? 'ativos' : 'inativos'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Formulário Novo Tipo - No TOPO */}
        {mostrarFormNovo && (
          <Card>
              <CardHeader>
                <CardTitle>Novo Tipo de Custo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <Input
                    label="Nome *"
                    placeholder="Ex: TOTEM, PROMOTER, MOTORISTA..."
                    value={novoTipo.nome}
                    onChange={(e) => setNovoTipo(prev => ({ ...prev, nome: e.target.value }))}
                  />
                  <Textarea
                    label="Descrição"
                    placeholder="Descrição do tipo de custo"
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
                  <Button
                    onClick={handleNovoTipo}
                    disabled={!novoTipo.nome.trim()}
                  >
                    Criar Tipo
                  </Button>
                </div>
              </CardContent>
            </Card>
        )}

        {/* Lista de Tipos */}
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
                          id="ativo-edit"
                          checked={editandoTipo.ativo}
                          onChange={(e) => setEditandoTipo(prev => ({ ...prev, ativo: e.target.checked }))}
                          className="rounded border-border"
                        />
                        <label htmlFor="ativo-edit" className="text-sm text-text-primary">
                          Tipo ativo
                        </label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelarEdicao}
                      >
                        <XMarkIcon className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleEditarTipo(tipo)}
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tipo.ativo 
                            ? 'bg-success-bg text-success-text' 
                            : 'bg-error-bg text-error-text'
                        }`}>
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
                            <p>Editar tipo de custo</p>
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
                              <p>Inativar tipo de custo</p>
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
                              <p>Reativar tipo de custo</p>
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
              <CalculatorIcon className="mx-auto h-12 w-12 text-text-muted" />
              <h3 className="mt-2 text-sm font-medium text-text-primary">
                {searchTerm 
                  ? 'Nenhum tipo encontrado' 
                  : abaAtiva === 'ativos' 
                    ? 'Nenhum tipo de custo ativo' 
                    : 'Nenhum tipo de custo inativo'}
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                {searchTerm 
                  ? 'Tente ajustar o termo de busca.'
                  : abaAtiva === 'ativos'
                    ? 'Comece criando um novo tipo de custo.'
                    : 'Não há tipos inativos no momento.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Modal de Confirmação de Inativação */}
        <ConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="Inativar Tipo de Custo"
          description={
            tipoParaExcluir
              ? `Tem certeza que deseja inativar o tipo de custo "${tipoParaExcluir.nome}"? Ele não aparecerá em listas de seleção, mas continuará disponível para eventos existentes.`
              : 'Tem certeza que deseja inativar este tipo de custo?'
          }
          confirmText="Inativar"
          cancelText="Cancelar"
          variant="default"
          onConfirm={handleConfirmarExclusao}
        />
      </div>
      </PlanOverlay>
    </Layout>
  );
}