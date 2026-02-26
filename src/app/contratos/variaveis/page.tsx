'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { VariavelContrato } from '@/types';
import { PlusIcon, PencilIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { InfoTooltip } from '@/components/ui/info-tooltip';

const FORMATO_UNICA = '{{variavel}}';
const FORMATO_MULTIPLA = '[variavel]';

export default function VariaveisContratoPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [variaveis, setVariaveis] = useState<VariavelContrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [variavelParaExcluir, setVariavelParaExcluir] = useState<VariavelContrato | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    chave: '',
    label: '',
    tipo: 'unica' as 'unica' | 'multipla',
    valorPadrao: '',
    descricao: '',
    ordem: 0,
    ativo: true
  });

  useEffect(() => {
    loadVariaveis();
  }, []);

  const loadVariaveis = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/variaveis-contrato');
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setVariaveis(Array.isArray(data) ? data : []);
      } else {
        const error = await response.json();
        showToast(error.error || 'Erro ao carregar campos', 'error');
      }
    } catch (error) {
      showToast('Erro ao carregar campos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNovo = () => {
    setFormData({
      chave: '',
      label: '',
      tipo: 'unica',
      valorPadrao: '',
      descricao: '',
      ordem: 0,
      ativo: true
    });
    setEditandoId(null);
    setMostrarForm(true);
  };

  const handleEditar = (variavel: VariavelContrato) => {
    setFormData({
      chave: variavel.chave,
      label: variavel.label,
      tipo: variavel.tipo,
      valorPadrao: variavel.valorPadrao || '',
      descricao: variavel.descricao || '',
      ordem: variavel.ordem,
      ativo: variavel.ativo
    });
    setEditandoId(variavel.id);
    setMostrarForm(true);
  };

  const handleSalvar = async () => {
    if (!formData.chave || !formData.label) {
      showToast('Chave e Label são obrigatórios', 'error');
      return;
    }

    try {
      const url = editandoId 
        ? `/api/variaveis-contrato/${editandoId}`
        : '/api/variaveis-contrato';
      
      const method = editandoId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showToast(
          editandoId ? 'Campo atualizado com sucesso' : 'Campo criado com sucesso',
          'success'
        );
        setMostrarForm(false);
        setEditandoId(null);
        loadVariaveis();
      } else {
        const error = await response.json();
        showToast(error.error || 'Erro ao salvar campo', 'error');
      }
    } catch (error) {
      showToast('Erro ao salvar campo', 'error');
    }
  };

  const handleExcluir = (variavel: VariavelContrato) => {
    setVariavelParaExcluir(variavel);
    setShowDeleteDialog(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!variavelParaExcluir) return;

    try {
      const response = await fetch(`/api/variaveis-contrato/${variavelParaExcluir.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showToast('Campo excluído com sucesso', 'success');
        loadVariaveis();
        setVariavelParaExcluir(null);
        setShowDeleteDialog(false);
      } else {
        const error = await response.json();
        showToast(error.error || 'Erro ao excluir campo', 'error');
      }
    } catch (error) {
      showToast('Erro ao excluir campo', 'error');
    }
  };

  const variaveisOrdenadas = [...variaveis].sort((a, b) => {
    if (a.ordem !== b.ordem) return a.ordem - b.ordem;
    return a.label.localeCompare(b.label);
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/contratos')}
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Campos Personalizados</h1>
            <p className="text-text-secondary mt-2">
              Crie campos personalizados com valores fixos para usar nos seus modelos de contrato
            </p>
          </div>
        </div>

        {!mostrarForm ? (
          <>
            <div className="flex justify-end mb-4">
              <Button onClick={handleNovo}>
                <PlusIcon className="h-5 w-5 mr-2" />
                Novo Campo
              </Button>
            </div>

            {loading ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-text-secondary">Carregando...</p>
                </CardContent>
              </Card>
            ) : variaveisOrdenadas.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-text-secondary mb-4">Nenhum campo personalizado cadastrado</p>
                  <Button onClick={handleNovo}>
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Criar Primeiro Campo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {variaveisOrdenadas.map((variavel) => (
                  <Card key={variavel.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold text-text-primary">{variavel.label}</h3>
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border ${
                              variavel.tipo === 'unica'
                                ? 'bg-blue-100 text-blue-700 border-blue-300'
                                : 'bg-purple-100 text-purple-700 border-purple-300'
                            }`}>
                              <span className="mr-1">{variavel.tipo === 'unica' ? '📝' : '📋'}</span>
                              {variavel.label || variavel.chave.replace(/_/g, ' ')}
                            </span>
                            {!variavel.ativo && (
                              <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                Inativa
                              </span>
                            )}
                          </div>
                          {variavel.descricao && (
                            <p className="text-sm text-text-secondary mb-2">{variavel.descricao}</p>
                          )}
                          {variavel.valorPadrao && (
                            <p className="text-sm text-text-secondary">
                              <strong>Valor padrão:</strong> {variavel.valorPadrao}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditar(variavel)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExcluir(variavel)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                {editandoId ? 'Editar Campo' : 'Novo Campo'}
              </CardTitle>
              <CardDescription>
                {formData.tipo === 'unica' 
                  ? `Campo de valor único — insere como {{${formData.chave || 'chave'}}} no modelo`
                  : `Campo com lista de valores — insere como [${formData.chave || 'chave'}] no modelo, exibindo itens separados por vírgula`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-text-primary">
                    Chave *
                  </label>
                  <InfoTooltip
                    title="Chave"
                    description="Identificador único do campo usado no modelo do contrato. Exemplo: se a chave for nome_empresa, use {{nome_empresa}} no modelo para inserir o valor automaticamente."
                    calculation="Use apenas letras minúsculas, números e underscore (_). Exemplo: nome_empresa, cnpj_cliente, endereco_sede."
                    calculationLabel="Como funciona:"
                    className="w-5 h-5"
                    iconClassName="h-4 w-4"
                  />
                </div>
                <Input
                  value={formData.chave}
                  onChange={(e) => setFormData({ ...formData, chave: e.target.value })}
                  placeholder="nome_empresa"
                  disabled={!!editandoId}
                />
                <p className="text-xs text-text-secondary mt-1">
                  Apenas letras minúsculas, números e underscore (_). Não pode ser alterada após criação.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-text-primary">
                    Nome de exibição *
                  </label>
                  <InfoTooltip
                    title="Nome de exibição"
                    description="Nome amigável que aparecerá na lista de campos disponíveis ao criar ou editar um modelo de contrato."
                    calculation="Exemplo: se a chave for nome_empresa, o nome de exibição pode ser 'Nome da Empresa'."
                    calculationLabel="Como funciona:"
                    className="w-5 h-5"
                    iconClassName="h-4 w-4"
                  />
                </div>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Nome da Empresa"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-text-primary">
                    Tipo *
                  </label>
                  <InfoTooltip
                    title="Tipo do campo"
                    description="Define como o campo será inserido e exibido no modelo de contrato."
                    calculation="Valor único: contém um só valor (ex: CNPJ, nome). Insere como {{chave}} no modelo. Lista de valores: contém vários itens separados por vírgula (ex: lista de serviços). Insere como [chave] no modelo."
                    calculationLabel="Como funciona:"
                    className="w-5 h-5"
                    iconClassName="h-4 w-4"
                  />
                </div>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'unica' | 'multipla' })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary"
                >
                  <option value="unica">Valor único — {FORMATO_UNICA}</option>
                  <option value="multipla">Lista de valores — {FORMATO_MULTIPLA}</option>
                </select>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-text-primary">
                    Valor Padrão
                  </label>
                  <InfoTooltip
                    title="Valor Padrão"
                    description="Valor que será inserido automaticamente no contrato quando este campo for utilizado. Você pode alterar este valor a qualquer momento."
                    calculation={formData.tipo === 'multipla' 
                      ? "Para listas, separe os valores por vírgula. Exemplo: item1, item2, item3." 
                      : "Preencha com o valor fixo que deseja exibir no contrato. Exemplo: 12.345.678/0001-99."}
                    calculationLabel="Como funciona:"
                    className="w-5 h-5"
                    iconClassName="h-4 w-4"
                  />
                </div>
                <Input
                  value={formData.valorPadrao}
                  onChange={(e) => setFormData({ ...formData, valorPadrao: e.target.value })}
                  placeholder={formData.tipo === 'multipla' ? 'item1, item2, item3' : 'Valor padrão'}
                />
                {formData.tipo === 'multipla' && (
                  <p className="text-xs text-text-secondary mt-1">
                    Para listas, separe os valores por vírgula
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-text-primary">
                    Descrição
                  </label>
                  <InfoTooltip
                    title="Descrição"
                    description="Anotação interna para lembrar para que serve este campo. Visível apenas nesta página, não aparece no contrato."
                    className="w-5 h-5"
                    iconClassName="h-4 w-4"
                  />
                </div>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição do campo"
                  rows={3}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-text-primary">
                    Ordem
                  </label>
                  <InfoTooltip
                    title="Ordem de exibição"
                    description="Define a posição deste campo na lista. Campos com números menores aparecem primeiro na listagem."
                    className="w-5 h-5"
                    iconClassName="h-4 w-4"
                  />
                </div>
                <Input
                  type="number"
                  value={formData.ordem}
                  onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="ativo" className="text-sm text-text-primary">
                  Ativo
                </label>
                <InfoTooltip
                  title="Campo ativo"
                  description="Campos inativos não aparecem na lista de campos disponíveis ao criar ou editar um modelo de contrato."
                  className="w-5 h-5"
                  iconClassName="h-4 w-4"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSalvar}>
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMostrarForm(false);
                    setEditandoId(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <ConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleConfirmarExclusao}
          title="Excluir Campo"
          description={`Tem certeza que deseja excluir o campo "${variavelParaExcluir?.label}"? Esta ação não pode ser desfeita.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="destructive"
        />
      </div>
    </Layout>
  );
}
