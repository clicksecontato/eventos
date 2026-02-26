'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Layout from '@/components/Layout';
import { Funcionalidade, CategoriaFuncionalidade } from '@/types/funcionalidades';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';

const CATEGORIAS: CategoriaFuncionalidade[] = ['EVENTOS', 'FINANCEIRO', 'RELATORIOS', 'INTEGRACAO', 'ADMIN'];

export default function AdminFuncionalidadesPage() {
  const [funcionalidades, setFuncionalidades] = useState<Funcionalidade[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Funcionalidade | null>(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    categoria: 'EVENTOS' as CategoriaFuncionalidade,
    ativo: true,
    ordem: 0
  });
  const [message, setMessage] = useState('');
  const [funcionalidadeParaExcluir, setFuncionalidadeParaExcluir] = useState<Funcionalidade | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadFuncionalidades();
  }, []);

  const loadFuncionalidades = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/funcionalidades');
      const data = await res.json();
      
      if (!res.ok) {
        setMessage(`❌ Erro: ${data.error || 'Erro ao carregar funcionalidades'}`);
        setFuncionalidades([]);
        return;
      }
      
      setFuncionalidades(data.funcionalidades || []);
      if (data.funcionalidades && data.funcionalidades.length === 0) {
        setMessage('ℹ️ Nenhuma funcionalidade cadastrada. Execute o seed primeiro.');
      }
    } catch (error: any) {
      setMessage(`❌ Erro ao carregar funcionalidades: ${error.message}`);
      setFuncionalidades([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const url = editing ? `/api/funcionalidades/${editing.id}` : '/api/funcionalidades';
      const method = editing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setMessage('✅ Funcionalidade salva com sucesso!');
        setFormData({ codigo: '', nome: '', descricao: '', categoria: 'EVENTOS', ativo: true, ordem: 0 });
        setEditing(null);
        setTimeout(() => {
          loadFuncionalidades();
        }, 500);
      } else {
        const data = await res.json();
        setMessage(`❌ Erro: ${data.error || 'Erro ao salvar funcionalidade'}`);
      }
    } catch (error: any) {
      setMessage(`❌ Erro inesperado: ${error.message || 'Erro ao salvar'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (func: Funcionalidade) => {
    setEditing(func);
    setFormData({
      codigo: func.codigo,
      nome: func.nome,
      descricao: func.descricao,
      categoria: func.categoria,
      ativo: func.ativo,
      ordem: func.ordem
    });
  };

  const handleDeleteClick = (funcionalidade: Funcionalidade) => {
    setFuncionalidadeParaExcluir(funcionalidade);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!funcionalidadeParaExcluir) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/funcionalidades/${funcionalidadeParaExcluir.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Funcionalidade deletada com sucesso!', 'success');
        setMessage('');
        setTimeout(() => {
          loadFuncionalidades();
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
      setFuncionalidadeParaExcluir(null);
    }
  };

  const funcionalidadesPorCategoria = funcionalidades.reduce((acc, func) => {
    if (!acc[func.categoria]) acc[func.categoria] = [];
    acc[func.categoria].push(func);
    return acc;
  }, {} as Record<CategoriaFuncionalidade, Funcionalidade[]>);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Gerenciar Funcionalidades</h1>
          <p className="text-text-secondary">Configure as funcionalidades disponíveis no sistema</p>
        </div>

        {message && (
          <div className={`p-4 rounded-md ${
            message.startsWith('✅') ? 'bg-success-bg text-success-text' : 'bg-error-bg text-error-text'
          }`}>
            {message}
          </div>
        )}

        {/* Debug Info */}
        {funcionalidades.length > 0 && (
          <div className="p-3 bg-info-bg rounded-md text-sm text-info-text">
            ✅ {funcionalidades.length} funcionalidade(s) carregada(s)
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{editing ? 'Editar' : 'Nova'} Funcionalidade</CardTitle>
              <CardDescription>
                {editing ? 'Atualize os dados da funcionalidade' : 'Adicione uma nova funcionalidade ao sistema'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Código"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  placeholder="EVENTOS_ILIMITADOS"
                  required
                />
                
                <Input
                  label="Nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
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

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Categoria</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value as CategoriaFuncionalidade })}
                    className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    {CATEGORIAS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Ordem"
                  type="number"
                  value={formData.ordem}
                  onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                  required
                />

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
                      onClick={() => {
                        setEditing(null);
                        setFormData({ codigo: '', nome: '', descricao: '', categoria: 'EVENTOS', ativo: true, ordem: 0 });
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Lista */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Funcionalidades ({funcionalidades.length})</CardTitle>
              <CardDescription>Lista de todas as funcionalidades cadastradas</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && funcionalidades.length === 0 ? (
                <div className="text-center py-8 text-text-muted">Carregando...</div>
              ) : funcionalidades.length === 0 ? (
                <div className="text-center py-8 text-text-muted">Nenhuma funcionalidade cadastrada</div>
              ) : (
                <div className="space-y-4">
                  {CATEGORIAS.map(categoria => {
                    const funcs = funcionalidadesPorCategoria[categoria] || [];
                    if (funcs.length === 0) return null;

                    return (
                      <div key={categoria}>
                        <h3 className="font-semibold text-lg mb-2 text-text-primary">{categoria}</h3>
                        <div className="space-y-2">
                          {funcs.map(func => (
                            <div
                              key={func.id}
                              className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-surface-hover transition-colors"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-text-primary">{func.nome}</span>
                                  {func.ativo ? (
                                    <span className="px-2 py-0.5 text-xs bg-success-bg text-success-text rounded">Ativo</span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-xs bg-surface text-text-secondary rounded">Inativo</span>
                                  )}
                                </div>
                                <div className="text-sm text-text-muted mt-1">{func.codigo}</div>
                                <div className="text-sm text-text-secondary mt-1">{func.descricao}</div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(func)}
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteClick(func)}
                                  className="text-error hover:bg-error-bg hover:text-error-text"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modal de Confirmação de Exclusão */}
          <ConfirmationDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            title="Deletar Funcionalidade"
            description={
              funcionalidadeParaExcluir
                ? `Tem certeza que deseja deletar a funcionalidade "${funcionalidadeParaExcluir.nome}"? Esta ação não pode ser desfeita.`
                : 'Tem certeza que deseja deletar esta funcionalidade? Esta ação não pode ser desfeita.'
            }
            confirmText="Deletar"
            cancelText="Cancelar"
            variant="destructive"
            onConfirm={handleDelete}
          />
        </div>
      </div>
    </Layout>
  );
}

