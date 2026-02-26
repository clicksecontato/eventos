'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Layout from '@/components/Layout';
import { Plano, Funcionalidade } from '@/types/funcionalidades';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';

export default function AdminPlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [funcionalidades, setFuncionalidades] = useState<Funcionalidade[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Plano | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    codigoHotmart: '',
    funcionalidades: [] as string[],
    preco: 0,
    intervalo: 'mensal' as 'mensal' | 'anual',
    ativo: true,
    destaque: false,
    limiteEventos: undefined as number | undefined,
    limiteClientes: undefined as number | undefined,
    limiteUsuarios: undefined as number | undefined,
    limiteArmazenamento: undefined as number | undefined
  });
  const [precoInput, setPrecoInput] = useState<string>('');
  const [message, setMessage] = useState('');
  const [planoParaExcluir, setPlanoParaExcluir] = useState<Plano | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadPlanos();
    loadFuncionalidades();
  }, []);

  const loadPlanos = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/planos');
      const data = await res.json();
      
      if (!res.ok) {
        setMessage(`❌ Erro: ${data.error || 'Erro ao carregar planos'}`);
        setPlanos([]);
        return;
      }
      
      setPlanos(data.planos || []);
      if (data.planos && data.planos.length === 0) {
        setMessage('ℹ️ Nenhum plano cadastrado. Execute o seed primeiro.');
      }
    } catch (error: any) {
      setMessage(`❌ Erro ao carregar planos: ${error.message}`);
      setPlanos([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFuncionalidades = async () => {
    try {
      const res = await fetch('/api/funcionalidades');
      const data = await res.json();
      setFuncionalidades(data.funcionalidades || []);
    } catch (error) {
      // Erro silencioso
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const payload = {
        ...formData,
        limiteEventos: formData.limiteEventos || null,
        limiteClientes: formData.limiteClientes || null,
        limiteUsuarios: formData.limiteUsuarios || null,
        limiteArmazenamento: formData.limiteArmazenamento || null
      };

      const url = editing ? `/api/planos/${editing.id}` : '/api/planos';
      const method = editing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setMessage('✅ Plano salvo com sucesso!');
        resetForm();
        setTimeout(() => {
          loadPlanos();
        }, 500);
      } else {
        const data = await res.json();
        setMessage(`❌ Erro: ${data.error || 'Erro ao salvar plano'}`);
      }
    } catch (error: any) {
      setMessage(`❌ Erro inesperado: ${error.message || 'Erro ao salvar'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      codigoHotmart: '',
      funcionalidades: [],
      preco: 0,
      intervalo: 'mensal',
      ativo: true,
      destaque: false,
      limiteEventos: undefined,
      limiteClientes: undefined,
      limiteUsuarios: undefined,
      limiteArmazenamento: undefined
    });
    setPrecoInput('');
    setEditing(null);
  };

  const handleEdit = (plano: Plano) => {
    setEditing(plano);
    setFormData({
      nome: plano.nome,
      descricao: plano.descricao,
      codigoHotmart: plano.codigoHotmart,
      funcionalidades: plano.funcionalidades,
      preco: plano.preco,
      intervalo: plano.intervalo,
      ativo: plano.ativo,
      destaque: plano.destaque,
      limiteEventos: plano.limiteEventos,
      limiteClientes: plano.limiteClientes,
      limiteUsuarios: plano.limiteUsuarios,
      limiteArmazenamento: plano.limiteArmazenamento
    });
    setPrecoInput(plano.preco === 0 ? '' : String(plano.preco));
  };

  const handleDeleteClick = (plano: Plano) => {
    setPlanoParaExcluir(plano);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!planoParaExcluir) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/planos/${planoParaExcluir.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Plano deletado com sucesso!', 'success');
        setMessage('');
        setTimeout(() => {
          loadPlanos();
        }, 500);
      } else {
        const data = await res.json();
        showToast(`Erro ao deletar: ${data.error || 'Erro desconhecido'}`, 'error');
        setMessage(`❌ Erro: ${data.error || 'Erro ao deletar'}`);
      }
    } catch (error: any) {
      showToast(`Erro inesperado: ${error.message || 'Erro ao deletar'}`, 'error');
      setMessage(`❌ Erro inesperado: ${error.message || 'Erro ao deletar'}`);
    } finally {
      setLoading(false);
      setPlanoParaExcluir(null);
    }
  };

  const toggleFuncionalidade = (funcId: string) => {
    setFormData({
      ...formData,
      funcionalidades: formData.funcionalidades.includes(funcId)
        ? formData.funcionalidades.filter(id => id !== funcId)
        : [...formData.funcionalidades, funcId]
    });
  };

  const funcionalidadesPorCategoria = funcionalidades.reduce((acc, func) => {
    if (!acc[func.categoria]) acc[func.categoria] = [];
    acc[func.categoria].push(func);
    return acc;
  }, {} as Record<string, Funcionalidade[]>);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Gerenciar Planos</h1>
          <p className="text-text-secondary">Configure os planos disponíveis para assinatura</p>
        </div>

        {message && (
          <div className={`p-4 rounded-md ${
            message.startsWith('✅') ? 'bg-success-bg text-success-text' : 'bg-error-bg text-error-text'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{editing ? 'Editar' : 'Novo'} Plano</CardTitle>
              <CardDescription>
                {editing ? 'Atualize os dados do plano' : 'Crie um novo plano de assinatura'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Básico"
                  required
                />
                
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Descrição</label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    rows={3}
                    required
                  />
                </div>

                <Input
                  label="Código Hotmart"
                  value={formData.codigoHotmart}
                  onChange={(e) => setFormData({ ...formData, codigoHotmart: e.target.value.toUpperCase() })}
                  placeholder="BASICO_MENSAL"
                  required
                />

                <Input
                  label="Preço (R$)"
                  type="number"
                  step="0.01"
                  value={precoInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPrecoInput(value);
                    // Converter para número apenas quando houver valor válido
                    const numValue = value === '' ? 0 : (parseFloat(value) || 0);
                    setFormData({ ...formData, preco: numValue });
                  }}
                  onBlur={(e) => {
                    // Garantir que o valor seja atualizado quando o campo perde o foco
                    const value = e.target.value;
                    if (value === '') {
                      setPrecoInput('');
                    } else {
                      const numValue = parseFloat(value) || 0;
                      setPrecoInput(numValue === 0 ? '' : String(numValue));
                      setFormData({ ...formData, preco: numValue });
                    }
                  }}
                  required
                  hideSpinner
                />

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Intervalo</label>
                  <select
                    value={formData.intervalo}
                    onChange={(e) => setFormData({ ...formData, intervalo: e.target.value as 'mensal' | 'anual' })}
                    className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Limite Eventos/mês"
                    type="number"
                    value={formData.limiteEventos || ''}
                    onChange={(e) => setFormData({ ...formData, limiteEventos: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Ilimitado"
                  />
                  <Input
                    label="Limite Clientes"
                    type="number"
                    value={formData.limiteClientes || ''}
                    onChange={(e) => setFormData({ ...formData, limiteClientes: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Ilimitado"
                  />
                  <Input
                    label="Limite Usuários"
                    type="number"
                    value={formData.limiteUsuarios || ''}
                    onChange={(e) => setFormData({ ...formData, limiteUsuarios: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Ilimitado"
                  />
                  <Input
                    label="Limite Armazenamento (GB)"
                    type="number"
                    value={formData.limiteArmazenamento || ''}
                    onChange={(e) => setFormData({ ...formData, limiteArmazenamento: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Ilimitado"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={formData.ativo}
                      onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                      className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                    />
                    <label htmlFor="ativo" className="ml-2 block text-sm text-text-primary">
                      Ativo
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="destaque"
                      checked={formData.destaque}
                      onChange={(e) => setFormData({ ...formData, destaque: e.target.checked })}
                      className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                    />
                    <label htmlFor="destaque" className="ml-2 block text-sm text-text-primary">
                      Destaque
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? 'Salvando...' : editing ? 'Atualizar' : 'Criar'}
                  </Button>
                  {editing && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Funcionalidades e Lista */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Funcionalidades do Plano</CardTitle>
              <CardDescription>Selecione as funcionalidades que este plano inclui</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {Object.entries(funcionalidadesPorCategoria).map(([categoria, funcs]) => (
                  <div key={categoria}>
                    <h3 className="font-semibold text-sm mb-2 text-text-primary">{categoria}</h3>
                    <div className="space-y-1">
                      {funcs.map(func => (
                        <label
                          key={func.id}
                          className="flex items-center p-2 hover:bg-surface-hover rounded cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.funcionalidades.includes(func.id)}
                            onChange={() => toggleFuncionalidade(func.id)}
                            className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                          />
                          <span className="ml-2 text-sm text-text-primary">{func.nome}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Planos */}
        <Card>
          <CardHeader>
            <CardTitle>Planos Cadastrados ({planos.length})</CardTitle>
            <CardDescription>Lista de todos os planos disponíveis</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && planos.length === 0 ? (
              <div className="text-center py-8 text-text-muted">Carregando...</div>
            ) : planos.length === 0 ? (
              <div className="text-center py-8 text-text-muted">Nenhum plano cadastrado</div>
            ) : (
              <div className="space-y-3">
                {planos.map(plano => (
                  <div
                    key={plano.id}
                    className="flex items-center justify-between p-4 border border-border rounded-md hover:bg-surface-hover transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-lg text-text-primary">{plano.nome}</span>
                        {plano.ativo ? (
                          <span className="px-2 py-0.5 text-xs bg-success-bg text-success-text rounded">Ativo</span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs bg-surface text-text-secondary rounded">Inativo</span>
                        )}
                        {plano.destaque && (
                          <span className="px-2 py-0.5 text-xs bg-warning-bg text-warning-text rounded">Destaque</span>
                        )}
                      </div>
                      <div className="text-sm text-text-muted mt-1">{plano.descricao}</div>
                      <div className="text-sm text-text-secondary mt-2">
                        <span className="font-medium">R$ {plano.preco.toFixed(2)}</span> / {plano.intervalo}
                        {' • '}
                        Código Hotmart: <code className="bg-surface px-1 rounded text-text-primary">{plano.codigoHotmart}</code>
                      </div>
                      <div className="text-xs text-text-muted mt-1">
                        {plano.funcionalidades.length} funcionalidade(s) • 
                        Limites: Eventos: {plano.limiteEventos || 'Ilimitado'}, 
                        Clientes: {plano.limiteClientes || 'Ilimitado'}, 
                        Usuários: {plano.limiteUsuarios || 'Ilimitado'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(plano)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(plano)}
                        className="text-error hover:bg-error-bg hover:text-error-text"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Confirmação de Exclusão */}
        <ConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="Deletar Plano"
          description={
            planoParaExcluir
              ? `Tem certeza que deseja deletar o plano "${planoParaExcluir.nome}"? Esta ação não pode ser desfeita.`
              : 'Tem certeza que deseja deletar este plano? Esta ação não pode ser desfeita.'
          }
          confirmText="Deletar"
          cancelText="Cancelar"
          variant="destructive"
          onConfirm={handleDelete}
        />
      </div>
    </Layout>
  );
}

