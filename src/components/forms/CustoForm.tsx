'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SelectWithSearch from '@/components/ui/SelectWithSearch';
import { 
  CustoEvento, 
  Evento,
  AnexoCusto
} from '@/types';
import { dataService } from '@/lib/data-service';
import { useCurrentUser } from '@/hooks/useAuth';
import { usePlano } from '@/lib/hooks/usePlano';

interface CustoFormProps {
  custo?: CustoEvento;
  evento: Evento;
  onSave: (custo: CustoEvento) => void | Promise<CustoEvento | void>;
  onCancel: () => void;
}

interface FormData {
  tipoCustoId: string;
  valor: number;
  quantidade?: number;
  observacoes?: string;
}


export default function CustoForm({ custo, evento, onSave, onCancel }: CustoFormProps) {
  const { userId } = useCurrentUser();
  const { temPermissao } = usePlano();
  const [temAnexosCusto, setTemAnexosCusto] = useState(false);
  const [anexos, setAnexos] = useState<AnexoCusto[]>([]);
  const [anexosTemporarios, setAnexosTemporarios] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<FormData>({
    tipoCustoId: '',
    valor: 0,
    quantidade: 1,
    observacoes: ''
  });

  const [valorInput, setValorInput] = useState<string>('');
  const [tiposCusto, setTiposCusto] = useState<Array<{
    id: string;
    nome: string;
    descricao?: string;
    ativo: boolean;
  }>>([]);
  const [loading, setLoading] = useState(true);

  // Carregar tipos de custo do Firestore
  useEffect(() => {
    const carregarTiposCusto = async () => {
      if (!userId) {
        return;
      }
      
      try {
        setLoading(true);
        const tipos = await dataService.getTiposCusto(userId);
        setTiposCusto(tipos);
      } catch (error) {
        // Erro ao carregar tipos de custo
      } finally {
        setLoading(false);
      }
    };

    carregarTiposCusto();
  }, [userId]);

  useEffect(() => {
    if (custo) {
      setFormData({
        tipoCustoId: custo.tipoCustoId,
        valor: custo.valor,
        quantidade: custo.quantidade || 1,
        observacoes: custo.observacoes || ''
      });
      setValorInput(custo.valor === 0 ? '' : String(custo.valor));
    } else {
      setValorInput('');
    }
  }, [custo]);

  useEffect(() => {
    temPermissao('ANEXOS_CUSTO').then(setTemAnexosCusto);
  }, [temPermissao]);

  const carregarAnexosExistentes = async () => {
    if (!custo?.id) return;
    try {
      const response = await fetch(
        `/api/anexos-custo?eventoId=${evento.id}&custoId=${custo.id}`
      );
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        const anexosList = data?.anexos || [];
        setAnexos(anexosList);
      }
    } catch (error) {
      // Erro ao carregar anexos existentes
    }
  };

  useEffect(() => {
    if (custo?.id && temAnexosCusto) {
      carregarAnexosExistentes();
    }
  }, [custo?.id, temAnexosCusto]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !temAnexosCusto) return;
    if (!custo?.id) {
      const novosArquivos = Array.from(files);
      setAnexosTemporarios(prev => [...prev, ...novosArquivos]);
      return;
    }
    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('eventoId', evento.id);
        formDataUpload.append('custoId', custo.id);
        const response = await fetch('/api/upload-anexo-custo', {
          method: 'POST',
          body: formDataUpload,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
          throw new Error(errorData.error || 'Erro no upload');
        }
        const result = await response.json();
        const data = result.data || result;
        const anexo = data?.anexo || result.anexo;
        if (!anexo) throw new Error('Anexo não retornado na resposta');
        return anexo;
      });
      const uploadedAnexos = await Promise.all(uploadPromises);
      setAnexos(prev => [...prev, ...uploadedAnexos]);
    } catch (error) {
      setErrors(prev => ({ ...prev, upload: 'Erro ao fazer upload dos arquivos' }));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAnexo = async (anexoId: string) => {
    try {
      const response = await fetch(
        `/api/anexos-custo?eventoId=${evento.id}&custoId=${custo?.id}&anexoId=${anexoId}`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        setAnexos(prev => prev.filter(anexo => anexo.id !== anexoId));
      }
    } catch (error) {
      // Erro ao deletar anexo
    }
  };

  const handleDeleteAnexoTemporario = (index: number) => {
    setAnexosTemporarios(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAnexosTemporarios = async (custoId: string) => {
    if (anexosTemporarios.length === 0 || !temAnexosCusto) return;
    setUploading(true);
    try {
      const uploadPromises = anexosTemporarios.map(async (file) => {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('eventoId', evento.id);
        formDataUpload.append('custoId', custoId);
        const response = await fetch('/api/upload-anexo-custo', {
          method: 'POST',
          body: formDataUpload,
        });
        if (!response.ok) throw new Error('Erro no upload');
        const result = await response.json();
        return result.anexo;
      });
      const uploadedAnexos = await Promise.all(uploadPromises);
      setAnexos(prev => [...prev, ...uploadedAnexos]);
      setAnexosTemporarios([]);
    } catch (error) {
      setErrors(prev => ({ ...prev, upload: 'Erro ao fazer upload dos arquivos' }));
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };



  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.tipoCustoId) {
      newErrors.tipoCustoId = 'Selecione um tipo de custo';
    }

    if (!formData.valor || formData.valor <= 0) {
      newErrors.valor = 'Valor deve ser maior que zero';
    }

    if (formData.quantidade && formData.quantidade <= 0) {
      newErrors.quantidade = 'Quantidade deve ser maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNewTipoCusto = async (nome: string) => {
    if (!userId) {
      return;
    }
    
    try {
      const novoTipoCusto = await dataService.createTipoCusto({
        nome,
        descricao: '',
        ativo: true
      }, userId);
      
      // Atualizar a lista de tipos de custo e ordenar
      setTiposCusto(prev => [...prev, novoTipoCusto].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      
      setFormData(prev => ({
        ...prev,
        tipoCustoId: novoTipoCusto.id
      }));
      
      // Limpar erro se existir
      if (errors.tipoCustoId) {
        setErrors(prev => ({
          ...prev,
          tipoCustoId: ''
        }));
      }
    } catch (error) {
      // Erro ao criar tipo de custo
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const tipoCusto = tiposCusto.find(tipo => tipo.id === formData.tipoCustoId);
      if (!tipoCusto) {
        setErrors({ tipoCustoId: 'Tipo de custo não encontrado' });
        return;
      }

      const custoData = {
        eventoId: evento.id,
        tipoCustoId: tipoCusto.id,
        tipoCusto,
        valor: formData.valor,
        quantidade: formData.quantidade || undefined,
        observacoes: formData.observacoes || undefined
      };

      const resultado = await Promise.resolve(onSave(custoData as CustoEvento));
      const custoSalvo = (resultado as CustoEvento | undefined) || custo;
      if (anexosTemporarios.length > 0 && custoSalvo?.id && temAnexosCusto) {
        await uploadAnexosTemporarios(custoSalvo.id);
      }
    } catch (error) {
      // Erro ao salvar custo
    }
  };

  // Preparar opções para o dropdown
  const tipoCustoOptions = tiposCusto
    .filter(tipo => tipo.ativo)
    .map(tipo => ({
      value: tipo.id,
      label: tipo.nome,
      description: tipo.descricao || ''
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando tipos de custo...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tipo de Custo */}
      <Card>
        <CardHeader>
          <CardTitle>Tipo de Custo</CardTitle>
          <CardDescription>
            Selecione um tipo existente ou crie um novo digitando o nome
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SelectWithSearch
            label="Tipo de Custo *"
            options={tipoCustoOptions}
            value={formData.tipoCustoId}
            onChange={(value) => handleInputChange('tipoCustoId', value)}
            onCreateNew={handleCreateNewTipoCusto}
            placeholder="Selecione ou digite para criar um novo tipo"
            error={errors.tipoCustoId}
            allowCreate={true}
          />
        </CardContent>
      </Card>

      {/* Dados do Custo */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Custo</CardTitle>
          <CardDescription>
            {custo ? 'Edite as informações do custo' : 'Preencha os dados do novo custo'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Valor *"
              type="number"
              step="0.01"
              min="0"
              value={valorInput}
              onChange={(e) => {
                const value = e.target.value;
                setValorInput(value);
                // Converter para número apenas quando houver valor válido
                const numValue = value === '' ? 0 : (parseFloat(value) || 0);
                handleInputChange('valor', numValue);
              }}
              onBlur={(e) => {
                // Garantir que o valor seja atualizado quando o campo perde o foco
                const value = e.target.value;
                if (value === '') {
                  setValorInput('');
                } else {
                  const numValue = parseFloat(value) || 0;
                  setValorInput(numValue === 0 ? '' : String(numValue));
                  handleInputChange('valor', numValue);
                }
              }}
              error={errors.valor}
              hideSpinner
            />
            <Input
              label="Quantidade"
              type="number"
              min="1"
              value={formData.quantidade || ''}
              onChange={(e) => handleInputChange('quantidade', parseInt(e.target.value) || 1)}
              error={errors.quantidade}
            />
          </div>

          <Textarea
            label="Observações"
            value={formData.observacoes || ''}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
            rows={3}
            placeholder="Observações sobre este custo"
          />

          {temAnexosCusto && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Anexos</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.txt"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="mb-2"
                  >
                    {uploading ? 'Enviando...' : 'Selecionar Arquivos'}
                  </Button>
                  <p className="text-xs text-text-secondary">
                    Tipos aceitos: JPG, PNG, PDF, DOC, DOCX, TXT (máx. 5MB cada)
                  </p>
                </div>
              </div>
              {anexosTemporarios.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-text-primary">Arquivos selecionados (serão anexados após salvar)</h4>
                  {anexosTemporarios.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-surface rounded border border-border">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-text-primary">{file.name}</span>
                        <span className="text-xs text-text-muted">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAnexoTemporario(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {anexos.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-text-primary">Arquivos anexados</h4>
                  {anexos.map((anexo) => (
                    <div key={anexo.id} className="flex items-center justify-between p-2 bg-surface rounded border border-border">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-text-primary">{anexo.nome}</span>
                        <span className="text-xs text-text-muted">
                          ({(anexo.tamanho / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(anexo.url, '_blank')}
                        >
                          Ver
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAnexo(anexo.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {errors.upload && (
                <p className="text-sm text-red-600">{errors.upload}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="outline">
          {custo ? 'Atualizar Custo' : 'Adicionar Custo'}
        </Button>
      </div>
    </form>
  );
}
