'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Layout from '@/components/Layout';
import { useCurrentUser } from '@/hooks/useAuth';
import { dataService } from '@/lib/data-service';
import { TipoServico } from '@/types';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import PlanOverlay from '@/components/PlanOverlay';
import { useToast } from '@/components/ui/toast';
import { handlePlanoError } from '@/lib/utils/plano-errors';

export default function ServicosPage() {
  const router = useRouter();
  const { userId } = useCurrentUser();
  const [tiposServico, setTiposServico] = useState<TipoServico[]>([]);
  const [tiposInativos, setTiposInativos] = useState<TipoServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<'ativos' | 'inativos'>('ativos');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [tipoParaExcluir, setTipoParaExcluir] = useState<TipoServico | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { showToast } = useToast();
  const [novoTipo, setNovoTipo] = useState({ nome: '', descricao: '' });
  const [editandoTipo, setEditandoTipo] = useState({ nome: '', descricao: '', ativo: true });
  const [mostrarFormNovo, setMostrarFormNovo] = useState(false);

  // Carregar tipos de serviço
  useEffect(() => {
    const carregarTiposServico = async () => {
      if (!userId) {
        return;
      }

      try {
        const tipos = await dataService.getTiposServicoAtivos(userId);
        const inativos = await dataService.getTiposServicoInativos(userId);
        setTiposServico(tipos);
        setTiposInativos(inativos);
      } catch (error) {
        // Erro silencioso
      } finally {
        setLoading(false);
      }
    };

    carregarTiposServico();
  }, [userId]);

  const recarregarTipos = async () => {
    if (!userId) return;
    try {
      const tipos = await dataService.getTiposServicoAtivos(userId);
      const inativos = await dataService.getTiposServicoInativos(userId);
      setTiposServico(tipos);
      setTiposInativos(inativos);
    } catch (error) {
      // Erro silencioso
    }
  };

  // Filtrar tipos de serviço
  const tiposExibidos = abaAtiva === 'ativos' ? tiposServico : tiposInativos;
  const tiposFiltrados = tiposExibidos.filter(tipo => 
    tipo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tipo.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNovoTipo = async () => {
    if (!userId || !novoTipo.nome.trim()) return;

    try {
      await dataService.createTipoServico({
        nome: novoTipo.nome.trim(),
        descricao: novoTipo.descricao.trim() || '',
        ativo: true
      }, userId);
      
      showToast('Tipo de serviço criado com sucesso!', 'success');
      await recarregarTipos();
      setNovoTipo({ nome: '', descricao: '' });
      setMostrarFormNovo(false);
    } catch (error: any) {
      // Tratar erros de plano
      const erroTratado = handlePlanoError(error, showToast, () => router.push('/planos'));
      
      if (!erroTratado) {
        showToast(error.message || 'Erro ao criar tipo de serviço. Tente novamente.', 'error');
      }
    }
  };

  const handleEditarTipo = async (tipo: TipoServico) => {
    if (!userId || !editandoTipo.nome.trim()) return;

    try {
      await dataService.updateTipoServico(tipo.id, {
        nome: editandoTipo.nome.trim(),
        descricao: editandoTipo.descricao.trim() || '',
        ativo: editandoTipo.ativo
      }, userId);
      
      showToast('Tipo de serviço atualizado com sucesso!', 'success');
      await recarregarTipos();
      setEditandoId(null);
    } catch (error) {
      showToast('Erro ao atualizar tipo de serviço', 'error');
    }
  };

  const handleExcluirTipo = (tipo: TipoServico) => {
    setTipoParaExcluir(tipo);
    setShowDeleteDialog(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!tipoParaExcluir || !userId) return;

    try {
      await dataService.deleteTipoServico(userId, tipoParaExcluir.id);
      showToast('Tipo de serviço inativado com sucesso!', 'success');
      await recarregarTipos();
      setTipoParaExcluir(null);
    } catch (error) {
      showToast('Erro ao inativar tipo de serviço', 'error');
    }
  };

  const handleReativar = async (tipo: TipoServico) => {
    if (!userId) return;

    try {
      await dataService.reativarTipoServico(tipo.id, userId);
      showToast('Tipo de serviço reativado com sucesso!', 'success');
      await recarregarTipos();
    } catch (error) {
      showToast('Erro ao reativar tipo de serviço', 'error');
    }
  };

  const iniciarEdicao = (tipo: TipoServico) => {
    setEditandoId(tipo.id);
    setEditandoTipo({ nome: tipo.nome, descricao: tipo.descricao || '', ativo: tipo.ativo });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setEditandoTipo({ nome: '', descricao: '', ativo: true });
  };

  const getTipoServicoColor = (nome: string) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
      'bg-yellow-100 text-yellow-800',
      'bg-red-100 text-red-800',
      'bg-gray-100 text-gray-800'
    ];
    
    let hash = 0;
    for (let i = 0; i < nome.length; i++) {
      hash = ((hash << 5) - hash + nome.charCodeAt(i)) & 0xffffffff;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Carregando tipos de serviço...</div>
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
              <TagIcon className="h-6 w-6" />
              Tipos de Serviço
            </h1>
            <p className="text-text-secondary">
              Gerencie os tipos de serviços disponíveis
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
                <p>Novo tipo de serviço</p>
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
                Ativos ({tiposServico.length})
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
              placeholder={`Nome ou descrição do tipo de serviço ${abaAtiva === 'ativos' ? 'ativos' : 'inativos'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Formulário Novo Tipo */}
        {mostrarFormNovo && (
          <Card>
            <CardHeader>
              <CardTitle>Novo Tipo de Serviço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Nome"
                placeholder="Nome do tipo de serviço"
                value={novoTipo.nome}
                onChange={(e) => setNovoTipo(prev => ({ ...prev, nome: e.target.value }))}
              />
              <Textarea
                label="Descrição"
                placeholder="Descrição do tipo de serviço (opcional)"
                value={novoTipo.descricao}
                onChange={(e) => setNovoTipo(prev => ({ ...prev, descricao: e.target.value }))}
                rows={3}
              />
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
                    <Input
                      label="Nome"
                      value={editandoTipo.nome}
                      onChange={(e) => setEditandoTipo(prev => ({ ...prev, nome: e.target.value }))}
                    />
                    <Textarea
                      label="Descrição"
                      value={editandoTipo.descricao}
                      onChange={(e) => setEditandoTipo(prev => ({ ...prev, descricao: e.target.value }))}
                      rows={3}
                    />
                    <div className="flex items-center gap-2 rounded-md border border-border/80 bg-surface/60 px-3 py-2">
                      <input
                        id={`ativo-${tipo.id}`}
                        type="checkbox"
                        className="rounded border-border"
                        checked={editandoTipo.ativo}
                        onChange={(e) => setEditandoTipo(prev => ({ ...prev, ativo: e.target.checked }))}
                      />
                      <label htmlFor={`ativo-${tipo.id}`} className="text-sm text-text-primary">
                        Tipo de serviço ativo
                      </label>
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTipoServicoColor(tipo.nome)}`}>
                          {tipo.nome}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          tipo.ativo ? 'bg-success-bg text-success-text' : 'bg-error-bg text-error-text'
                        }`}>
                          {tipo.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      {tipo.descricao && (
                        <p className="text-sm text-text-secondary">
                          {tipo.descricao}
                        </p>
                      )}
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
                            <p>Editar tipo de serviço</p>
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
                              <p>Inativar tipo de serviço</p>
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
                              <p>Reativar tipo de serviço</p>
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
              <TagIcon className="mx-auto h-12 w-12 text-text-muted" />
              <h3 className="mt-2 text-sm font-medium text-text-primary">
                {searchTerm 
                  ? 'Nenhum tipo encontrado' 
                  : abaAtiva === 'ativos' 
                    ? 'Nenhum tipo de serviço ativo' 
                    : 'Nenhum tipo de serviço inativo'}
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                {searchTerm 
                  ? 'Tente ajustar o termo de busca.'
                  : abaAtiva === 'ativos'
                    ? 'Comece criando um novo tipo de serviço.'
                    : 'Não há tipos inativos no momento.'}
              </p>
              {!searchTerm && abaAtiva === 'ativos' && (
                <div className="mt-6">
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={() => setMostrarFormNovo(true)} className="btn-add" size="icon">
                          <PlusIcon className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="font-medium">
                        <p>Novo tipo de serviço</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modal de Confirmação de Inativação */}
        <ConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="Inativar Tipo de Serviço"
          description={
            tipoParaExcluir
              ? `Tem certeza que deseja inativar o tipo de serviço "${tipoParaExcluir.nome}"? Ele não aparecerá em listas de seleção, mas continuará disponível para eventos existentes.`
              : 'Tem certeza que deseja inativar este tipo de serviço?'
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
