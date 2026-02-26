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
import { CanalEntrada } from '@/types';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import PlanOverlay from '@/components/PlanOverlay';
import { useToast } from '@/components/ui/toast';
import { handlePlanoError } from '@/lib/utils/plano-errors';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function CanaisEntradaPage() {
  const router = useRouter();
  const { userId } = useCurrentUser();
  const [canaisEntrada, setCanaisEntrada] = useState<CanalEntrada[]>([]);
  const [canaisInativos, setCanaisInativos] = useState<CanalEntrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<'ativos' | 'inativos'>('ativos');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [canalParaExcluir, setCanalParaExcluir] = useState<CanalEntrada | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { showToast } = useToast();
  const [novoCanal, setNovoCanal] = useState({
    nome: '',
    descricao: ''
  });
  const [editandoCanal, setEditandoCanal] = useState({
    nome: '',
    descricao: '',
    ativo: true
  });
  const [mostrarFormNovo, setMostrarFormNovo] = useState(false);

  // Carregar canais de entrada
  useEffect(() => {
    const carregarCanaisEntrada = async () => {
      if (!userId) {
        return;
      }

      try {
        const canais = await dataService.getCanaisEntradaAtivos(userId);
        const inativos = await dataService.getCanaisEntradaInativos(userId);
        setCanaisEntrada(canais);
        setCanaisInativos(inativos);
      } catch (error) {
        // Erro silencioso
      } finally {
        setLoading(false);
      }
    };

    carregarCanaisEntrada();
  }, [userId]);

  const recarregarCanais = async () => {
    if (!userId) return;
    try {
      const canais = await dataService.getCanaisEntradaAtivos(userId);
      const inativos = await dataService.getCanaisEntradaInativos(userId);
      setCanaisEntrada(canais);
      setCanaisInativos(inativos);
    } catch (error) {
      // Erro silencioso
    }
  };

  // Filtrar canais de entrada
  const canaisExibidos = abaAtiva === 'ativos' ? canaisEntrada : canaisInativos;
  const canaisFiltrados = canaisExibidos.filter(canal =>
    canal.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    canal.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNovoCanal = async () => {
    if (!userId || !novoCanal.nome.trim()) return;

    try {
      await dataService.createCanalEntrada({
        nome: novoCanal.nome.trim(),
        descricao: novoCanal.descricao.trim() || '',
        ativo: true,
        dataCadastro: new Date()
      }, userId);
      
      showToast('Canal de entrada criado com sucesso!', 'success');
      await recarregarCanais();
      setNovoCanal({ nome: '', descricao: '' });
      setMostrarFormNovo(false);
    } catch (error: any) {
      // Tratar erros de plano
      const erroTratado = handlePlanoError(error, showToast, () => router.push('/planos'));
      
      if (!erroTratado) {
        showToast(error.message || 'Erro ao criar canal de entrada. Tente novamente.', 'error');
      }
    }
  };

  const handleEditarCanal = async (canal: CanalEntrada) => {
    if (!userId || !editandoCanal.nome.trim()) return;

    try {
      await dataService.updateCanalEntrada(canal.id, {
        nome: editandoCanal.nome.trim(),
        descricao: editandoCanal.descricao.trim() || '',
        ativo: editandoCanal.ativo
      }, userId);
      
      showToast('Canal de entrada atualizado com sucesso!', 'success');
      await recarregarCanais();
      setEditandoId(null);
    } catch (error) {
      // Erro silencioso
    }
  };

  const handleExcluirCanal = (canal: CanalEntrada) => {
    setCanalParaExcluir(canal);
    setShowDeleteDialog(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!canalParaExcluir || !userId) return;

    try {
      await dataService.deleteCanalEntrada(canalParaExcluir.id, userId);
      showToast('Canal de entrada inativado com sucesso!', 'success');
      await recarregarCanais();
      setCanalParaExcluir(null);
    } catch (error) {
      showToast('Erro ao inativar canal de entrada', 'error');
    }
  };

  const handleReativar = async (canal: CanalEntrada) => {
    if (!userId) return;

    try {
      await dataService.reativarCanalEntrada(canal.id, userId);
      showToast('Canal de entrada reativado com sucesso!', 'success');
      await recarregarCanais();
    } catch (error) {
      showToast('Erro ao reativar canal de entrada', 'error');
    }
  };

  const iniciarEdicao = (canal: CanalEntrada) => {
    setEditandoId(canal.id);
    setEditandoCanal({
      nome: canal.nome,
      descricao: canal.descricao,
      ativo: canal.ativo
    });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setEditandoCanal({ nome: '', descricao: '', ativo: true });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Carregando canais de entrada...</div>
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
              Canais de Entrada
            </h1>
            <p className="text-text-secondary">
              Gerencie os canais pelos quais os clientes chegam
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
                <p>Novo canal de entrada</p>
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
                Ativos ({canaisEntrada.length})
              </button>
              <button
                onClick={() => setAbaAtiva('inativos')}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-all rounded-lg cursor-pointer ${
                  abaAtiva === 'inativos'
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                Inativos ({canaisInativos.length})
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Busca */}
        <Card>
          <CardContent className="p-6">
            <Input
              label="Buscar"
              placeholder={`Buscar canais de entrada ${abaAtiva === 'ativos' ? 'ativos' : 'inativos'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Formulário Novo Canal - No TOPO */}
        {mostrarFormNovo && (
          <Card>
              <CardHeader>
                <CardTitle>Novo Canal de Entrada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Nome *"
                  placeholder="Ex: Instagram, Boca a boca, Google..."
                  value={novoCanal.nome}
                  onChange={(e) => setNovoCanal(prev => ({ ...prev, nome: e.target.value }))}
                />
                <Textarea
                  label="Descrição"
                  placeholder="Descrição opcional do canal de entrada"
                  value={novoCanal.descricao}
                  onChange={(e) => setNovoCanal(prev => ({ ...prev, descricao: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMostrarFormNovo(false);
                    setNovoCanal({ nome: '', descricao: '' });
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleNovoCanal}
                  disabled={!novoCanal.nome.trim()}
                >
                  Criar Canal
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Canais */}
        <div className="space-y-4">
          {canaisFiltrados.map((canal) => (
            <Card key={canal.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                {editandoId === canal.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <Input
                        label="Nome *"
                        value={editandoCanal.nome}
                        onChange={(e) => setEditandoCanal(prev => ({ ...prev, nome: e.target.value }))}
                      />
                      <Textarea
                        label="Descrição"
                        value={editandoCanal.descricao}
                        onChange={(e) => setEditandoCanal(prev => ({ ...prev, descricao: e.target.value }))}
                        rows={3}
                      />
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="ativo-edit"
                          checked={editandoCanal.ativo}
                          onChange={(e) => setEditandoCanal(prev => ({ ...prev, ativo: e.target.checked }))}
                          className="rounded border-border"
                        />
                        <label htmlFor="ativo-edit" className="text-sm text-text-primary">
                          Canal ativo
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
                        onClick={() => handleEditarCanal(canal)}
                        disabled={!editandoCanal.nome.trim()}
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
                          {canal.nome}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          canal.ativo 
                            ? 'bg-success-bg text-success-text' 
                            : 'bg-error-bg text-error-text'
                        }`}>
                          {canal.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      {canal.descricao && (
                        <p className="text-text-secondary mb-2">{canal.descricao}</p>
                      )}
                      <p className="text-sm text-text-muted">
                        Criado em {new Date(canal.dataCadastro).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="action-edit"
                              size="icon"
                              onClick={() => iniciarEdicao(canal)}
                            >
                              <PencilIcon className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="font-medium">
                            <p>Editar canal de entrada</p>
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
                                onClick={() => handleExcluirCanal(canal)}
                              >
                                <TrashIcon className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="font-medium">
                              <p>Inativar canal de entrada</p>
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
                                onClick={() => handleReativar(canal)}
                              >
                                <ArrowPathIcon className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="font-medium">
                              <p>Reativar canal de entrada</p>
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

        {canaisFiltrados.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <TagIcon className="mx-auto h-12 w-12 text-text-muted" />
              <h3 className="mt-2 text-sm font-medium text-text-primary">
                {searchTerm 
                  ? 'Nenhum canal encontrado' 
                  : abaAtiva === 'ativos' 
                    ? 'Nenhum canal de entrada ativo' 
                    : 'Nenhum canal de entrada inativo'}
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                {searchTerm 
                  ? 'Tente ajustar o termo de busca.'
                  : abaAtiva === 'ativos'
                    ? 'Comece criando um novo canal de entrada.'
                    : 'Não há canais inativos no momento.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Modal de Confirmação de Inativação */}
        <ConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="Inativar Canal de Entrada"
          description={
            canalParaExcluir
              ? `Tem certeza que deseja inativar o canal de entrada "${canalParaExcluir.nome}"? Ele não aparecerá em listas de seleção, mas continuará disponível para clientes existentes.`
              : 'Tem certeza que deseja inativar este canal de entrada?'
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