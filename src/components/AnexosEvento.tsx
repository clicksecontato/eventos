'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AnexoEvento, 
  Evento
} from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  TrashIcon,
  DocumentIcon,
  EyeIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { usePlano } from '@/lib/hooks/usePlano';
import PlanoBloqueio from '@/components/PlanoBloqueio';

interface AnexosEventoProps {
  evento: Evento;
  anexos: AnexoEvento[];
  onAnexosChange: () => void;
}

export default function AnexosEvento({ 
  evento,
  anexos, 
  onAnexosChange 
}: AnexosEventoProps) {
  const [anexoParaExcluir, setAnexoParaExcluir] = useState<AnexoEvento | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { temPermissao } = usePlano();
  const [temAcessoUpload, setTemAcessoUpload] = useState<boolean | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'PDF':
        return <DocumentIcon className="h-8 w-8 text-red-500" />;
      case 'Imagem':
        return <DocumentIcon className="h-8 w-8 text-blue-500" />;
      case 'Documento':
        return <DocumentIcon className="h-8 w-8 text-text-secondary" />;
      default:
        return <DocumentIcon className="h-8 w-8 text-gray-400" />;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar evento.id antes de fazer upload
    if (!evento?.id || typeof evento.id !== 'string' || evento.id.trim() === '') {
      setUploadError('ID do evento inválido. Por favor, recarregue a página e tente novamente.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('eventoId', evento.id.trim());

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      // Tentar parsear a resposta mesmo se não for OK
      let result;
      try {
        const text = await response.text();
        result = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Erro ao processar resposta do servidor: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        // Se a resposta não for OK, result pode ter 'error' ou 'data.error'
        const errorMessage = result.error || result.data?.error || `Erro no upload: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      // Verificar se a resposta tem success ou se está dentro de data
      const success = result.success || result.data?.success;
      const arquivo = result.arquivo || result.data?.arquivo;

      if (success) {
        onAnexosChange();
        // Limpar o input
        event.target.value = '';
      } else {
        const errorMessage = result.error || result.data?.error || 'Erro no upload';
        throw new Error(errorMessage);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Erro desconhecido ao fazer upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleExcluirAnexo = (anexo: AnexoEvento) => {
    setAnexoParaExcluir(anexo);
  };

  const handleConfirmarExclusao = async () => {
    if (!anexoParaExcluir) return;

    try {
      const response = await fetch(`/api/upload?arquivoId=${anexoParaExcluir.id}&eventoId=${evento.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao excluir arquivo');
      }

      if (result.success) {
        onAnexosChange();
        setAnexoParaExcluir(null);
      } else {
        throw new Error(result.error || 'Erro ao excluir arquivo');
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Erro ao excluir arquivo');
    }
  };

  const handleVisualizarAnexo = (anexo: AnexoEvento) => {
    window.open(anexo.url, '_blank');
  };

  useEffect(() => {
    const verificarAcesso = async () => {
      const acesso = await temPermissao('UPLOAD_ANEXOS');
      setTemAcessoUpload(acesso);
    };
    verificarAcesso();
  }, [temPermissao]);

  return (
    <div className="space-y-6">
      {/* Upload de Anexos */}
      <PlanoBloqueio 
        funcionalidade="UPLOAD_ANEXOS"
        mensagem="Upload de anexos está disponível apenas nos planos Profissional e Premium"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CloudArrowUpIcon className="h-5 w-5 mr-2" />
              Anexar Arquivo
            </CardTitle>
            <CardDescription>
              Faça upload de um arquivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{uploadError}</p>
              </div>
            )}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.txt"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mb-4" />
                <div className="text-sm text-gray-600">
                  {isUploading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Fazendo upload...
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-blue-600 hover:text-blue-500">
                        Clique para fazer upload
                      </span>
                      <span className="block">ou arraste o arquivo aqui</span>
                      <span className="text-xs text-text-secondary mt-1">
                        PDF, JPG, PNG, GIF, DOC, DOCX, TXT (máx. 10MB)
                      </span>
                    </>
                  )}
                </div>
              </label>
            </div>
          </CardContent>
        </Card>
      </PlanoBloqueio>

      {/* Lista de Anexos */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Anexos do Evento</CardTitle>
              <CardDescription>
                {anexos.length} anexo(s) registrado(s)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {anexos.length === 0 ? (
            <div className="text-center py-8">
              <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-text-primary">Nenhum anexo registrado</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Faça upload do contrato PDF para começar.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {anexos.map((anexo) => (
                <div
                  key={anexo.id}
                  className="border border-border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getTipoIcon(anexo.tipo)}
                      <div>
                        <div className="font-medium text-text-primary">
                          {anexo.nome}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-text-secondary">
                          <div className="flex items-center">
                            <span className="mr-1">Tipo:</span>
                            {anexo.tipo}
                          </div>
                          <div className="flex items-center">
                            <span className="mr-1">Tamanho:</span>
                            {formatFileSize(anexo.tamanho)}
                          </div>
                          <div className="flex items-center">
                            <span className="mr-1">Upload:</span>
                            {format(anexo.dataUpload, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVisualizarAnexo(anexo)}
                        title="Visualizar anexo"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExcluirAnexo(anexo)}
                        title="Excluir anexo"
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card> 

      {/* Modal de Confirmação de Exclusão */}
      {anexoParaExcluir && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 modal-card">
            <CardHeader>
              <CardTitle>Confirmar Exclusão</CardTitle>
              <CardDescription>
                Tem certeza que deseja excluir este anexo?
                <br />
                <strong>Arquivo:</strong> {anexoParaExcluir.nome}
                <br />
                Esta ação não pode ser desfeita.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setAnexoParaExcluir(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleConfirmarExclusao}
                >
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
