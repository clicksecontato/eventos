'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePreCadastros } from '@/hooks/useData';
import { useToast } from '@/components/ui/toast';
import { handlePlanoError } from '@/lib/utils/plano-errors';
import { PreCadastroEvento, StatusPreCadastro } from '@/types';
import PreCadastroCard from '@/components/PreCadastroCard';
import PreCadastroDetailsModal from '@/components/PreCadastroDetailsModal';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import NomeEventoDialog from '@/components/ui/nome-evento-dialog';
import { LinkIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function PreCadastrosSection() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data: preCadastros, loading, error, refetch } = usePreCadastros();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('pendente');
  const [selectedPreCadastro, setSelectedPreCadastro] = useState<PreCadastroEvento | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [preCadastroParaDeletar, setPreCadastroParaDeletar] = useState<PreCadastroEvento | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [showNomeEventoDialog, setShowNomeEventoDialog] = useState(false);

  // Filtrar pré-cadastros
  const filteredPreCadastros = useMemo(() => {
    if (!preCadastros) return [];

    let filtered = preCadastros;

    // Filtro por status
    if (filterStatus !== 'todos') {
      filtered = filtered.filter(pc => {
        const statusLower = typeof pc.status === 'string' ? pc.status.toLowerCase() : pc.status;
        return statusLower === filterStatus.toLowerCase();
      });
    }

    // Filtro por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(pc =>
        pc.clienteNome?.toLowerCase().includes(term) ||
        pc.clienteEmail?.toLowerCase().includes(term) ||
        pc.nomeEvento?.toLowerCase().includes(term) ||
        pc.local?.toLowerCase().includes(term) ||
        pc.contratante?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [preCadastros, filterStatus, searchTerm]);

  // Contadores
  const pendentesCount = preCadastros?.filter(pc => {
    const status = typeof pc.status === 'string' ? pc.status.toLowerCase() : pc.status;
    return status === StatusPreCadastro.PENDENTE || status === 'pendente';
  }).length || 0;

  const preenchidosCount = preCadastros?.filter(pc => {
    const status = typeof pc.status === 'string' ? pc.status.toLowerCase() : pc.status;
    return status === StatusPreCadastro.PREENCHIDO || status === 'preenchido';
  }).length || 0;

  const handleGenerateLinkClick = () => {
    setShowNomeEventoDialog(true);
  };

  const handleGenerateLink = async (nomeEvento: string) => {
    if (generatingLink) return;

    setGeneratingLink(true);
    try {
      const response = await fetch('/api/pre-cadastros/gerar-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nomeEvento }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar link');
      }

      const result = await response.json();
      const linkData = result.data || result;
      
      // Garantir que temos o link ou o ID como string
      let link: string;
      if (typeof linkData.link === 'string') {
        link = linkData.link;
      } else if (typeof linkData.id === 'string') {
        link = `${window.location.origin}/pre-cadastro/${linkData.id}`;
      } else {
        throw new Error('Resposta inválida da API');
      }

      // Copiar para área de transferência
      await navigator.clipboard.writeText(link);
      showToast('Link gerado e copiado para a área de transferência!', 'success');
      
      // Recarregar lista
      await refetch();
    } catch (error: any) {
      showToast(error.message || 'Erro ao gerar link', 'error');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleView = (preCadastro: PreCadastroEvento) => {
    setSelectedPreCadastro(preCadastro);
    setShowDetailsModal(true);
  };

  const handleCreateEvent = async (preCadastro: PreCadastroEvento) => {
    try {
      const response = await fetch(`/api/pre-cadastros/${preCadastro.id}/criar-evento`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.error || 'Erro ao criar evento');
        (error as any).status = response.status;
        (error as any).limite = errorData.details?.limite || errorData.limite;
        (error as any).usado = errorData.details?.usado || errorData.usado;
        (error as any).restante = errorData.details?.restante || errorData.restante;
        
        // Tratar erro de plano/limite usando handlePlanoError
        const erroTratado = handlePlanoError(error, showToast, () => router.push('/planos'));
        if (erroTratado) {
          return;
        }
        
        throw error;
      }

      const result = await response.json();
      const evento = result.data?.evento || result.evento;
      const eventoId = evento?.id;

      showToast('Evento criado com sucesso!', 'success');
      
      // Recarregar lista
      await refetch();
      
      // Redirecionar para o evento criado
      if (eventoId) {
        router.push(`/eventos/${eventoId}`);
      } else {
        router.push('/eventos');
      }
    } catch (error: any) {
      showToast(error.message || 'Erro ao criar evento', 'error');
    }
  };

  const handleIgnore = async (preCadastro: PreCadastroEvento) => {
    try {
      const response = await fetch(`/api/pre-cadastros/${preCadastro.id}/ignorar`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Erro ao ignorar pré-cadastro');
      }

      showToast('Pré-cadastro ignorado com sucesso', 'success');
      await refetch();
    } catch (error: any) {
      showToast(error.message || 'Erro ao ignorar pré-cadastro', 'error');
    }
  };

  const handleRenew = async (preCadastro: PreCadastroEvento) => {
    try {
      const response = await fetch(`/api/pre-cadastros/${preCadastro.id}/renovar`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Erro ao renovar link');
      }

      showToast('Link renovado com sucesso!', 'success');
      await refetch();
    } catch (error: any) {
      showToast(error.message || 'Erro ao renovar link', 'error');
    }
  };

  const handleCopyLink = async (preCadastro: PreCadastroEvento) => {
    try {
      const response = await fetch(`/api/pre-cadastros/${preCadastro.id}/link`);
      
      if (!response.ok) {
        throw new Error('Erro ao obter link');
      }

      const result = await response.json();
      const linkData = result.data || result;
      
      // Garantir que temos o link como string
      let link: string;
      if (typeof linkData.link === 'string') {
        link = linkData.link.startsWith('http') 
          ? linkData.link 
          : `${window.location.origin}${linkData.link}`;
      } else if (typeof linkData === 'string') {
        link = linkData.startsWith('http')
          ? linkData
          : `${window.location.origin}${linkData}`;
      } else {
        // Fallback: usar o ID do pré-cadastro
        link = `${window.location.origin}/pre-cadastro/${preCadastro.id}`;
      }

      await navigator.clipboard.writeText(link);
      showToast('Link copiado para a área de transferência!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Erro ao copiar link', 'error');
    }
  };

  const handleDelete = (preCadastro: PreCadastroEvento) => {
    setPreCadastroParaDeletar(preCadastro);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!preCadastroParaDeletar) return;

    try {
      const response = await fetch(`/api/pre-cadastros/${preCadastroParaDeletar.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar pré-cadastro');
      }

      showToast('Pré-cadastro deletado com sucesso', 'success');
      setShowDeleteDialog(false);
      setPreCadastroParaDeletar(null);
      await refetch();
    } catch (error: any) {
      showToast(error.message || 'Erro ao deletar pré-cadastro', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Carregando pré-cadastros...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-error/10 border-error">
        <CardContent className="p-6">
          <p className="text-error">Erro ao carregar pré-cadastros: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Botão Gerar Link */}
        <Card>
          <CardContent className="p-4">
            <Button
              onClick={handleGenerateLinkClick}
              disabled={generatingLink}
              className="w-full sm:w-auto"
            >
              {generatingLink ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />
                  Gerando...
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Gerar Novo Link de Pré-Cadastro
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Filtros */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Buscar"
                placeholder="Nome, email, evento ou local..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Filtros de Status */}
        <Card>
          <CardContent className="p-0">
            <div className="flex gap-2 p-2 overflow-x-auto">
              <button
                onClick={() => setFilterStatus('todos')}
                className={`px-4 py-2 text-sm font-medium transition-all rounded-lg cursor-pointer whitespace-nowrap ${
                  filterStatus === 'todos'
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                Todos ({preCadastros?.length || 0})
              </button>
              <button
                onClick={() => setFilterStatus('pendente')}
                className={`px-4 py-2 text-sm font-medium transition-all rounded-lg cursor-pointer whitespace-nowrap ${
                  filterStatus === 'pendente'
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                Pendentes ({pendentesCount})
              </button>
              <button
                onClick={() => setFilterStatus('preenchido')}
                className={`px-4 py-2 text-sm font-medium transition-all rounded-lg cursor-pointer whitespace-nowrap ${
                  filterStatus === 'preenchido'
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                Preenchidos ({preenchidosCount})
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Pré-Cadastros */}
        <div className="space-y-4">
          {filteredPreCadastros.map((preCadastro) => (
            <PreCadastroCard
              key={preCadastro.id}
              preCadastro={preCadastro}
              onView={handleView}
              onCreateEvent={handleCreateEvent}
              onIgnore={handleIgnore}
              onRenew={handleRenew}
              onCopyLink={handleCopyLink}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {filteredPreCadastros.length === 0 && (
          <Card className="bg-surface/50 backdrop-blur-sm">
            <CardContent className="text-center py-12">
              <LinkIcon className="mx-auto h-12 w-12 text-text-muted" />
              <h3 className="mt-2 text-sm font-medium text-text-primary">
                {searchTerm || filterStatus !== 'todos'
                  ? 'Nenhum pré-cadastro encontrado'
                  : 'Nenhum pré-cadastro cadastrado'}
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                {searchTerm || filterStatus !== 'todos'
                  ? 'Tente ajustar os filtros.'
                  : 'Gere um link de pré-cadastro para começar.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedPreCadastro && (
        <PreCadastroDetailsModal
          preCadastro={selectedPreCadastro}
          open={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPreCadastro(null);
          }}
          onCreateEvent={handleCreateEvent}
          onIgnore={handleIgnore}
          onRenew={handleRenew}
          onCopyLink={handleCopyLink}
          onDelete={handleDelete}
        />
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Deletar Pré-Cadastro"
        description={
          preCadastroParaDeletar
            ? `Tem certeza que deseja deletar o pré-cadastro de "${preCadastroParaDeletar.clienteNome || 'cliente não informado'}"? Esta ação não pode ser desfeita.`
            : 'Tem certeza que deseja deletar este pré-cadastro?'
        }
        confirmText="Deletar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />

      {/* Dialog para Solicitar Nome do Evento */}
      <NomeEventoDialog
        open={showNomeEventoDialog}
        onOpenChange={setShowNomeEventoDialog}
        onConfirm={handleGenerateLink}
      />
    </>
  );
}
