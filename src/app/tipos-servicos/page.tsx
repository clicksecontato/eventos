'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Layout from '@/components/Layout';
import { useCurrentUser } from '@/hooks/useAuth';
import { usePlano } from '@/lib/hooks/usePlano';
import { dataService } from '@/lib/data-service';
import { TipoServico } from '@/types';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { handlePlanoError } from '@/lib/utils/plano-errors';

export default function TiposServicosPage() {
  const router = useRouter();
  const { userId } = useCurrentUser();
  const [tiposServico, setTiposServico] = useState<TipoServico[]>([]);
  const [tiposInativos, setTiposInativos] = useState<TipoServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<'ativos' | 'inativos'>('ativos');
  const [showForm, setShowForm] = useState(false);
  const [tipoEditando, setTipoEditando] = useState<TipoServico | null>(null);
  const [tipoParaExcluir, setTipoParaExcluir] = useState<TipoServico | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    ativo: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    tipo.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNovoTipo = () => {
    setTipoEditando(null);
    setFormData({ nome: '', descricao: '', ativo: true });
    setErrors({});
    setShowForm(true);
  };

  const handleEditarTipo = (tipo: TipoServico) => {
    setTipoEditando(tipo);
    setFormData({
      nome: tipo.nome,
      descricao: tipo.descricao,
      ativo: tipo.ativo
    });
    setErrors({});
    setShowForm(true);
  };

  const handleExcluirTipo = (tipo: TipoServico) => {
    setTipoParaExcluir(tipo);
    setShowDeleteDialog(true);
  };

  const handleConfirmarExclusao = async () => {
    if (tipoParaExcluir && userId) {
      try {
        await dataService.deleteTipoServico(tipoParaExcluir.id, userId);
        showToast('Tipo de serviço inativado com sucesso!', 'success');
        await recarregarTipos();
        setTipoParaExcluir(null);
      } catch (error) {
        showToast('Erro ao inativar tipo de serviço', 'error');
      }
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!userId) return;

    try {
      if (tipoEditando) {
        await dataService.updateTipoServico(tipoEditando.id, formData, userId);
        showToast('Tipo de serviço atualizado com sucesso!', 'success');
      } else {
        await dataService.createTipoServico(formData, userId);
        showToast('Tipo de serviço criado com sucesso!', 'success');
      }
      
      await recarregarTipos();
      setShowForm(false);
      setTipoEditando(null);
      setFormData({ nome: '', descricao: '', ativo: true });
    } catch (error: any) {
      // Tratar erros de plano
      const erroTratado = handlePlanoError(error, showToast, () => router.push('/planos'));
      
      if (!erroTratado) {
        showToast(error.message || 'Erro ao salvar tipo de serviço. Tente novamente.', 'error');
      }
    }
  };

  const handleCancelar = () => {
    setShowForm(false);
    setTipoEditando(null);
    setFormData({ nome: '', descricao: '', ativo: true });
    setErrors({});
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Tipos de Serviço</h1>
            <p className="text-text-secondary">
              Gerencie os tipos de serviços disponíveis
            </p>
          </div>
          <Button onClick={handleNovoTipo} className="btn-add">
            <PlusIcon className="h-4 w-4 mr-2" />
            Novo Tipo
          </Button>
        </div>

        {/* Formulário */}
        {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {tipoEditando ? 'Editar Tipo de Serviço' : 'Novo Tipo de Serviço'}
                </CardTitle>
                <CardDescription>
                  {tipoEditando ? 'Atualize as informações do tipo' : 'Crie um novo tipo de serviço'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    label="Nome"
                    placeholder="Ex: Fotografia, Decoração, Buffet..."
                    value={formData.nome}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, nome: e.target.value }));
                      if (errors.nome) setErrors(prev => ({ ...prev, nome: '' }));
                    }}
                    error={errors.nome}
                    required
                  />
                </div>
                <div>
                  <Textarea
                    label="Descrição"
                    placeholder="Descreva o tipo de serviço..."
                    value={formData.descricao}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, descricao: e.target.value }));
                      if (errors.descricao) setErrors(prev => ({ ...prev, descricao: '' }));
                    }}
                    error={errors.descricao}
                    rows={3}
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                    className="rounded border-border"
                  />
                  <label htmlFor="ativo" className="text-sm text-text-primary">
                    Ativo
                  </label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelar}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" variant="outline">
                    {tipoEditando ? 'Atualizar' : 'Salvar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

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
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder={`Buscar tipos de serviço ${abaAtiva === 'ativos' ? 'ativos' : 'inativos'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de Tipos */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tiposFiltrados.map((tipo) => (
            <Card key={tipo.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <TagIcon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{tipo.nome}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditarTipo(tipo)}
                      title="Editar"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    {abaAtiva === 'ativos' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExcluirTipo(tipo)}
                        title="Inativar"
                        className="text-error hover:text-error hover:bg-error/10"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReativar(tipo)}
                        title="Reativar"
                        className="text-success hover:text-success hover:bg-success/10"
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <CardDescription>{tipo.descricao}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    tipo.ativo 
                      ? 'bg-success-bg text-success-text' 
                      : 'bg-error-bg text-error-text'
                  }`}>
                    {tipo.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  <span className="text-text-muted">
                    {format(tipo.dataCadastro, 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
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
                  ? 'Tente ajustar os termos de busca.'
                  : abaAtiva === 'ativos'
                    ? 'Comece criando um novo tipo de serviço.'
                    : 'Não há tipos inativos no momento.'}
              </p>
              {!searchTerm && abaAtiva === 'ativos' && (
                <div className="mt-6">
                  <Button onClick={handleNovoTipo} className="btn-add">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Novo Tipo
                  </Button>
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
    </Layout>
  );
}
