'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { ModeloContrato } from '@/types';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function TemplatesContratoPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<ModeloContrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateParaExcluir, setTemplateParaExcluir] = useState<ModeloContrato | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/modelos-contrato');
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setTemplates(Array.isArray(data) ? data : []);
      } else {
        const error = await response.json();
        showToast(error.error || 'Erro ao carregar templates', 'error');
      }
    } catch (error) {
      showToast('Erro ao carregar templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = (template: ModeloContrato) => {
    setTemplateParaExcluir(template);
    setShowDeleteDialog(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!templateParaExcluir) return;

    try {
      const response = await fetch(`/api/modelos-contrato/${templateParaExcluir.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showToast('Template excluído com sucesso', 'success');
        loadTemplates();
        setTemplateParaExcluir(null);
        setShowDeleteDialog(false);
      } else {
        const error = await response.json();
        showToast(error.error || 'Erro ao excluir template', 'error');
      }
    } catch (error) {
      showToast('Erro ao excluir template', 'error');
    }
  };

  const templatesGlobais = templates.filter(t => !t.userId);
  const templatesProprios = templates.filter(t => t.userId);

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
            <h1 className="text-3xl font-bold text-text-primary">Templates de Contrato</h1>
            <p className="text-text-secondary mt-2">
              Gerencie seus templates personalizados de contratos
            </p>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Button onClick={() => router.push('/contratos/templates/novo')}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Novo Template
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-text-secondary">Carregando...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Templates Próprios */}
            {templatesProprios.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  Meus Templates ({templatesProprios.length})
                </h2>
                <div className="space-y-4">
                  {templatesProprios.map((template) => (
                    <Card key={template.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-text-primary">{template.nome}</h3>
                              {!template.ativo && (
                                <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                  Inativo
                                </span>
                              )}
                            </div>
                            {template.descricao && (
                              <p className="text-sm text-text-secondary">{template.descricao}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/contratos/templates/${template.id}`)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExcluir(template)}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Templates Globais */}
            {templatesGlobais.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  Modelos Globais ({templatesGlobais.length})
                </h2>
                <div className="space-y-4">
                  {templatesGlobais.map((template) => (
                    <Card key={template.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-text-primary">{template.nome}</h3>
                              <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                Global
                              </span>
                              {!template.ativo && (
                                <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                  Inativo
                                </span>
                              )}
                            </div>
                            {template.descricao && (
                              <p className="text-sm text-text-secondary">{template.descricao}</p>
                            )}
                            <p className="text-xs text-text-secondary mt-2">
                              Modelos globais não podem ser editados ou excluídos
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {templates.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-text-secondary mb-4">Nenhum template encontrado</p>
                  <Button onClick={() => router.push('/contratos/templates/novo')}>
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Criar Primeiro Template
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <ConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleConfirmarExclusao}
          title="Excluir Template"
          description={`Tem certeza que deseja excluir o template "${templateParaExcluir?.nome}"? Esta ação não pode ser desfeita.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="destructive"
        />
      </div>
    </Layout>
  );
}
