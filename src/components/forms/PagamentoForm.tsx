'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Pagamento, 
  Evento,
  AnexoPagamento
} from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/utils/date-helpers';
import { usePlano } from '@/lib/hooks/usePlano';

interface PagamentoFormProps {
  pagamento?: Pagamento;
  evento: Evento;
  onSave: (pagamento: Pagamento) => Promise<Pagamento>;
  onCancel: () => void;
}

interface FormData {
  valor: number;
  dataPagamento: string;
  formaPagamento: 'Dinheiro' | 'Cartão de crédito' | 'Depósito bancário' | 'PIX' | 'Transferência';
  observacoes?: string;
  comprovante?: string;
}

const formaPagamentoOptions = [
  { value: 'Cartão de crédito', label: 'Cartão de crédito' },
  { value: 'Depósito bancário', label: 'Depósito bancário' },
  { value: 'Dinheiro', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'Transferência', label: 'Transferência' }
];

export default function PagamentoForm({ pagamento, evento, onSave, onCancel }: PagamentoFormProps) {
  const { temPermissao } = usePlano();
  const [temComprovantes, setTemComprovantes] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    valor: 0,
    dataPagamento: '',
    formaPagamento: 'PIX',
    observacoes: '',
    comprovante: ''
  });

  const [valorInput, setValorInput] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [anexos, setAnexos] = useState<AnexoPagamento[]>([]);
  const [anexosTemporarios, setAnexosTemporarios] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    temPermissao('PAGAMENTOS_COMPROVANTES').then(setTemComprovantes);
  }, [temPermissao]);

  useEffect(() => {
    if (pagamento) {
      setFormData({
        valor: pagamento.valor,
        dataPagamento: format(pagamento.dataPagamento, 'yyyy-MM-dd'),
        formaPagamento: pagamento.formaPagamento,
        observacoes: pagamento.observacoes || '',
        comprovante: pagamento.comprovante || ''
      });
      setValorInput(pagamento.valor === 0 ? '' : String(pagamento.valor));
      if (temComprovantes) {
        carregarAnexosExistentes();
      }
    } else {
      // Preencher dados sugeridos para novo pagamento
      const hoje = new Date();
      const valorSugerido = evento.valorTotal * 0.3; // Sugerir 30% do valor total
      const valorArredondado = Math.round(valorSugerido * 100) / 100;
      
      setFormData({
        valor: valorArredondado, // Arredondar para 2 casas decimais
        dataPagamento: format(hoje, 'yyyy-MM-dd'),
        formaPagamento: 'PIX', // PIX como padrão
        observacoes: `Pagamento parcial - ${format(hoje, 'dd/MM/yyyy', { locale: ptBR })}`,
        comprovante: ''
      });
      setValorInput(valorArredondado === 0 ? '' : String(valorArredondado));
    }
  }, [pagamento, evento, temComprovantes]);

  const carregarAnexosExistentes = async () => {
    if (!pagamento?.id) return;
    
    try {
      const response = await fetch(
        `/api/comprovantes?eventoId=${evento.id}&pagamentoId=${pagamento.id}`
      );
      
      if (response.ok) {
        const result = await response.json();
        // A API retorna { data: { success: true, anexos: [...] } } via createApiResponse
        const data = result.data || result;
        const anexos = data?.anexos || [];
        setAnexos(anexos);
      }
    } catch (error) {
      // Erro silencioso
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

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !temComprovantes) return;

    if (!pagamento?.id) {
      const novosArquivos = Array.from(files);
      setAnexosTemporarios(prev => [...prev, ...novosArquivos]);
      return;
    }

    // Para pagamentos existentes, fazer upload imediato
    setUploading(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('eventoId', evento.id);
        formData.append('pagamentoId', pagamento.id);

        const response = await fetch('/api/upload-comprovante', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
          throw new Error(errorData.error || 'Erro no upload');
        }

        const result = await response.json();
        
        // A API pode retornar { success: true, anexo: {...} } ou { data: { success: true, anexo: {...} } }
        const data = result.data || result;
        const anexo = data?.anexo || result.anexo;
        
        if (!anexo) {
          throw new Error('Anexo não retornado na resposta');
        }
        
        return anexo;
      });

      const uploadedAnexos = await Promise.all(uploadPromises);
      setAnexos(prev => [...prev, ...uploadedAnexos]);
      
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        upload: 'Erro ao fazer upload dos arquivos'
      }));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAnexo = async (anexoId: string) => {
    try {
      const response = await fetch(
        `/api/comprovantes?eventoId=${evento.id}&pagamentoId=${pagamento?.id}&anexoId=${anexoId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setAnexos(prev => prev.filter(anexo => anexo.id !== anexoId));
      }
    } catch (error) {
      // Erro silencioso
    }
  };

  const handleDeleteAnexoTemporario = (index: number) => {
    setAnexosTemporarios(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAnexosTemporarios = async (pagamentoId: string) => {
    if (anexosTemporarios.length === 0) return;

    setUploading(true);
    
    try {
      const uploadPromises = anexosTemporarios.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('eventoId', evento.id);
        formData.append('pagamentoId', pagamentoId);

        const response = await fetch('/api/upload-comprovante', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Erro no upload');
        }

        const result = await response.json();
        return result.anexo;
      });

      const uploadedAnexos = await Promise.all(uploadPromises);
      setAnexos(prev => [...prev, ...uploadedAnexos]);
      setAnexosTemporarios([]); // Limpar arquivos temporários
      
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        upload: 'Erro ao fazer upload dos arquivos'
      }));
    } finally {
      setUploading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.valor || formData.valor <= 0) {
      newErrors.valor = 'Valor deve ser maior que zero';
    }

    if (!formData.dataPagamento) {
      newErrors.dataPagamento = 'Data de pagamento é obrigatória';
    }

    if (!formData.formaPagamento) {
      newErrors.formaPagamento = 'Forma de pagamento é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const pagamentoData = {
        valor: formData.valor,
        dataPagamento: parseLocalDate(formData.dataPagamento),
        formaPagamento: formData.formaPagamento,
        status: 'Pago' as const,
        observacoes: formData.observacoes || undefined,
        comprovante: formData.comprovante || undefined
      };

      // Salvar pagamento
      const pagamentoSalvo = await onSave(pagamentoData as Pagamento);
      
      if (anexosTemporarios.length > 0 && pagamentoSalvo?.id && temComprovantes) {
        await uploadAnexosTemporarios(pagamentoSalvo.id);
      }
    } catch (error) {
      // Erro silencioso
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações do Evento */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Evento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Evento</label>
              <div className="mt-1 text-sm text-text-primary">
                {evento.contratante} - {format(evento.dataEvento, 'dd/MM/yyyy', { locale: ptBR })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Valor Total</label>
              <div className="mt-1 text-sm text-text-primary">
                R$ {evento.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Dia Final de Pagamento</label>
              <div className="mt-1 text-sm text-text-primary">
                {format(evento.diaFinalPagamento, 'dd/MM/yyyy', { locale: ptBR })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Pagamento</CardTitle>
          <CardDescription>
            {pagamento ? 'Edite as informações do pagamento' : 'Preencha os dados do novo pagamento'}
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
              label="Data do Pagamento *"
              type="date"
              value={formData.dataPagamento}
              onChange={(e) => handleInputChange('dataPagamento', e.target.value)}
              error={errors.dataPagamento}
            />
          </div>

          <Select
            label="Forma de Pagamento *"
            options={formaPagamentoOptions}
            value={formData.formaPagamento}
            onValueChange={(value) => handleInputChange('formaPagamento', value)}
            error={errors.formaPagamento}
          />


          <Input
            label="Comprovante (Texto)"
            value={formData.comprovante || ''}
            onChange={(e) => handleInputChange('comprovante', e.target.value)}
            placeholder="Número do comprovante ou referência"
          />

          {temComprovantes && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Comprovantes (Arquivos)
            </label>
            
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

            {/* Lista de Anexos Temporários (para novos pagamentos) */}
            {anexosTemporarios.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-text-primary">Arquivos Selecionados (serão anexados após salvar):</h4>
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

            {/* Lista de Anexos Existentes (para pagamentos em edição) */}
            {anexos.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-text-primary">Arquivos Anexados:</h4>
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

          <Textarea
            label="Observações"
            value={formData.observacoes || ''}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
            rows={3}
            placeholder="Observações sobre este pagamento"
          />
        </CardContent>
      </Card>

      {/* Aviso sobre Status */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent>
          <div className="text-sm text-blue-800">
            <strong>Informação:</strong> Todos os pagamentos são considerados como &quot;Pago&quot; independente da data.
            <br />
            <strong>Valor a Receber:</strong> Aparece até o dia final de pagamento para valores não pagos.
            <br />
            <strong>Valor Atrasado:</strong> Aparece após o dia final de pagamento para valores não pagos.
          </div>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="outline">
          {pagamento ? 'Atualizar Pagamento' : 'Adicionar Pagamento'}
        </Button>
      </div>
    </form>
  );
}