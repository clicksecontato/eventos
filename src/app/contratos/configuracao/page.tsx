'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { ConfiguracaoContrato } from '@/types';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { ArrowLeftIcon, PhotoIcon } from '@heroicons/react/24/outline';

export default function ConfiguracaoContratoPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingMarcaDagua, setUploadingMarcaDagua] = useState(false);
  const [formData, setFormData] = useState<Partial<ConfiguracaoContrato>>({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    inscricaoEstadual: '',
    endereco: {
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: ''
    },
    contato: {
      telefone: '',
      email: '',
      site: ''
    },
    dadosBancarios: {
      banco: '',
      agencia: '',
      conta: '',
      tipo: 'corrente',
      pix: ''
    },
    marcaDaguaUrl: '',
    marcaDaguaS3Key: '',
    marcaDaguaTamanhoPercentual: 70,
    foro: '',
    cidade: ''
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/configuracao-contrato');
      if (response.ok) {
        const result = await response.json();
        // createApiResponse retorna { data: config }
        const configData = result.data || result;
        if (configData && configData.id) {
          setFormData(configData);
        }
      } else {
        // Configuração não encontrada
      }
    } catch (error) {
      // Erro ao carregar configuração
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      // Garantir que endereco e contato sejam objetos válidos (campos obrigatórios no schema)
      const dadosParaEnviar = {
        ...formData,
        endereco: formData.endereco || {
          logradouro: '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          estado: '',
          cep: ''
        },
        contato: formData.contato || {
          telefone: '',
          email: '',
          site: ''
        },
        dadosBancarios: formData.dadosBancarios || {
          banco: '',
          agencia: '',
          conta: '',
          tipo: 'corrente',
          pix: ''
        },
        marcaDaguaTamanhoPercentual: (() => {
          const valor = Number(formData.marcaDaguaTamanhoPercentual || 70);
          if (!Number.isFinite(valor)) return 70;
          return Math.max(20, Math.min(120, Math.round(valor)));
        })()
      };
      
      const response = await fetch('/api/configuracao-contrato', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosParaEnviar)
      });

      if (response.ok) {
        const result = await response.json();
        showToast('Configuração salva com sucesso!', 'success');
        router.push('/contratos');
      } else {
        const error = await response.json();
        showToast(error.error || 'Erro ao salvar configuração', 'error');
      }
    } catch (error) {
      showToast('Erro ao salvar configuração', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => {
        const parentValue = prev[parent as keyof typeof prev] as any;
        return {
          ...prev,
          [parent]: {
            ...(parentValue || {}),
            [child]: value
          }
        };
      });
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSelecionarMarcaDagua = () => {
    fileInputRef.current?.click();
  };

  const handleUploadMarcaDagua = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Formato inválido. Envie PNG, JPG ou WEBP.', 'error');
      event.target.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast('Arquivo muito grande. O limite é 5MB.', 'error');
      event.target.value = '';
      return;
    }

    try {
      setUploadingMarcaDagua(true);
      const payload = new FormData();
      payload.append('file', file);

      const response = await fetch('/api/configuracao-contrato/upload-marca-dagua', {
        method: 'POST',
        body: payload
      });

      if (!response.ok) {
        const error = await response.json();
        showToast(error.error || 'Erro ao enviar imagem', 'error');
        return;
      }

      const result = await response.json();
      const data = result.data || result;

      setFormData(prev => ({
        ...prev,
        marcaDaguaUrl: data.url,
        marcaDaguaS3Key: data.s3Key
      }));

      showToast('Marca d\'agua enviada com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao enviar marca d\'agua', 'error');
    } finally {
      setUploadingMarcaDagua(false);
      event.target.value = '';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Carregando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-2 mb-4">
          <Button variant="outline" onClick={() => router.push('/contratos')}>
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Voltar para Contratos
          </Button>
          <Button variant="outline" onClick={() => router.push('/configuracoes')}>
            Ir para Configurações
          </Button>
        </div>

        <h1 className="text-3xl font-bold text-text-primary mb-6">Dados da Empresa para gerar Contratos</h1>
        <p className="text-text-secondary mb-6">
          Configure os dados fixos da sua empresa que serão usados nos contratos.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Dados da Empresa */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>Informações principais da empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Razão Social *"
                  value={formData.razaoSocial || ''}
                  onChange={(e) => handleInputChange('razaoSocial', e.target.value)}
                  required
                />
                <Input
                  label="Nome Fantasia"
                  value={formData.nomeFantasia || ''}
                  onChange={(e) => handleInputChange('nomeFantasia', e.target.value)}
                />
                <Input
                  label="CNPJ *"
                  value={formData.cnpj || ''}
                  onChange={(e) => handleInputChange('cnpj', e.target.value)}
                  required
                />
                <Input
                  label="Inscrição Estadual"
                  value={formData.inscricaoEstadual || ''}
                  onChange={(e) => handleInputChange('inscricaoEstadual', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Endereço */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
              <CardDescription>Endereço completo da empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Logradouro *"
                  value={formData.endereco?.logradouro || ''}
                  onChange={(e) => handleInputChange('endereco.logradouro', e.target.value)}
                  required
                />
                <Input
                  label="Número *"
                  value={formData.endereco?.numero || ''}
                  onChange={(e) => handleInputChange('endereco.numero', e.target.value)}
                  required
                />
                <Input
                  label="Complemento"
                  value={formData.endereco?.complemento || ''}
                  onChange={(e) => handleInputChange('endereco.complemento', e.target.value)}
                />
                <Input
                  label="Bairro *"
                  value={formData.endereco?.bairro || ''}
                  onChange={(e) => handleInputChange('endereco.bairro', e.target.value)}
                  required
                />
                <Input
                  label="Cidade *"
                  value={formData.endereco?.cidade || ''}
                  onChange={(e) => handleInputChange('endereco.cidade', e.target.value)}
                  required
                />
                <Input
                  label="Estado *"
                  value={formData.endereco?.estado || ''}
                  onChange={(e) => handleInputChange('endereco.estado', e.target.value)}
                  required
                  maxLength={2}
                  placeholder="SP"
                />
                <Input
                  label="CEP *"
                  value={formData.endereco?.cep || ''}
                  onChange={(e) => handleInputChange('endereco.cep', e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Contato</CardTitle>
              <CardDescription>Informações de contato da empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Telefone *"
                  value={formData.contato?.telefone || ''}
                  onChange={(e) => handleInputChange('contato.telefone', e.target.value)}
                  required
                />
                <Input
                  label="E-mail *"
                  type="email"
                  value={formData.contato?.email || ''}
                  onChange={(e) => handleInputChange('contato.email', e.target.value)}
                  required
                />
                <Input
                  label="Site"
                  type="url"
                  value={formData.contato?.site || ''}
                  onChange={(e) => handleInputChange('contato.site', e.target.value)}
                  placeholder="https://exemplo.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Dados Bancários */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Dados Bancários (Opcional)</CardTitle>
              <CardDescription>Informações bancárias para pagamentos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Banco"
                  value={formData.dadosBancarios?.banco || ''}
                  onChange={(e) => handleInputChange('dadosBancarios.banco', e.target.value)}
                />
                <Input
                  label="Agência"
                  value={formData.dadosBancarios?.agencia || ''}
                  onChange={(e) => handleInputChange('dadosBancarios.agencia', e.target.value)}
                />
                <Input
                  label="Conta"
                  value={formData.dadosBancarios?.conta || ''}
                  onChange={(e) => handleInputChange('dadosBancarios.conta', e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Conta</label>
                  <select
                    value={formData.dadosBancarios?.tipo || 'corrente'}
                    onChange={(e) => handleInputChange('dadosBancarios.tipo', e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="corrente">Corrente</option>
                    <option value="poupanca">Poupança</option>
                  </select>
                </div>
                <Input
                  label="PIX"
                  value={formData.dadosBancarios?.pix || ''}
                  onChange={(e) => handleInputChange('dadosBancarios.pix', e.target.value)}
                  placeholder="Chave PIX"
                />
              </div>
            </CardContent>
          </Card>

          {/* Dados do Contrato */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Marca d&apos;agua do Contrato
                <InfoTooltip
                  title="Dicas para marca d'agua"
                  description="A variável {{marca_dagua_url}} aplica automaticamente o HTML da marca d'agua no contrato. Basta inserir a variável no template."
                  calculation="Tamanho ideal: imagem PNG com fundo transparente, proporção quadrada, resolução entre 1200x1200 e 2000x2000, até 5MB."
                  calculationLabel="Tamanho ideal da imagem:"
                />
              </CardTitle>
              <CardDescription>
                Envie a imagem da sua marca d&apos;agua (upload em S3) e ajuste o tamanho de exibição no contrato.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button type="button" variant="outline" onClick={handleSelecionarMarcaDagua} disabled={uploadingMarcaDagua}>
                  <PhotoIcon className="h-4 w-4 mr-2" />
                  {uploadingMarcaDagua ? 'Enviando imagem...' : 'Enviar marca d\'agua'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleUploadMarcaDagua}
                />
                <p className="text-sm text-text-secondary">
                  Formatos aceitos: PNG, JPG e WEBP (máx. 5MB).
                </p>
              </div>

              {formData.marcaDaguaUrl && (
                <div className="rounded-md border border-border p-4 bg-surface">
                  <p className="text-sm font-medium text-text-primary mb-2">Pré-visualização da marca d&apos;agua</p>
                  <div className="flex items-center justify-center h-40 bg-background border border-dashed border-border rounded">
                    <img
                      src={formData.marcaDaguaUrl}
                      alt="Marca d'agua"
                      className="max-h-32 max-w-full object-contain opacity-80"
                    />
                  </div>
                </div>
              )}

              <Input
                label="Tamanho da marca d'agua no contrato (%)"
                type="number"
                min={20}
                max={120}
                value={Number.isFinite(formData.marcaDaguaTamanhoPercentual) ? formData.marcaDaguaTamanhoPercentual : 70}
                onChange={(e) => handleInputChange('marcaDaguaTamanhoPercentual', Number(e.target.value))}
                helperText="Use entre 20% e 120%. Recomendado: 60% a 80%."
              />
            </CardContent>
          </Card>

          {/* Dados do Contrato */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Dados do Contrato</CardTitle>
              <CardDescription>Informações fixas para os contratos (Foro e Cidade)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Foro *"
                  value={formData.foro || ''}
                  onChange={(e) => handleInputChange('foro', e.target.value)}
                  placeholder="Ex: Nova Iguaçu-RJ"
                  required
                />
                <Input
                  label="Cidade *"
                  value={formData.cidade || ''}
                  onChange={(e) => handleInputChange('cidade', e.target.value)}
                  placeholder="Ex: Rio de Janeiro"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Botões */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" variant="outline" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

