'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SelectWithSearch from '@/components/ui/SelectWithSearch';
import { TipoEvento, TipoServico, CanalEntrada, PreCadastroEvento } from '@/types';
import { TagIcon } from '@heroicons/react/24/outline';
import { dateToLocalMidnight, formatLocalDate } from '@/lib/utils/date-helpers';

interface PreCadastroFormProps {
  preCadastroId: string;
  preCadastro?: PreCadastroEvento;
  onSuccess: () => void;
}

interface FormData {
  // Dados do Cliente
  clienteNome: string;
  clienteEmail: string;
  clienteTelefone: string;
  clienteCpf: string;
  clienteEndereco: string;
  clienteCep: string;
  clienteInstagram: string;
  clienteCanalEntradaId: string;
  
  // Dados do Evento
  nomeEvento: string;
  dataEvento: string;
  local: string;
  endereco: string;
  tipoEvento: string;
  tipoEventoId: string;
  contratante: string;
  numeroConvidados: number;
  quantidadeMesas?: number;
  hashtag: string;
  horarioInicio: string;
  horarioTermino: string; // Horário de Desmontagem
  cerimonialista: {
    nome?: string;
    telefone?: string;
  };
  observacoes: string;
  
  // Serviços
  servicosIds: Set<string>;
}

export default function PreCadastroForm({ preCadastroId, preCadastro, onSuccess }: PreCadastroFormProps) {
  const [formData, setFormData] = useState<FormData>({
    clienteNome: '',
    clienteEmail: '',
    clienteTelefone: '',
    clienteCpf: '',
    clienteEndereco: '',
    clienteCep: '',
    clienteInstagram: '',
    clienteCanalEntradaId: '',
    nomeEvento: '',
    dataEvento: '',
    local: '',
    endereco: '',
    tipoEvento: '',
    tipoEventoId: '',
    contratante: '',
    numeroConvidados: 0,
    quantidadeMesas: 0,
    hashtag: '',
    horarioInicio: '',
    horarioTermino: '',
    cerimonialista: {
      nome: '',
      telefone: ''
    },
    observacoes: '',
    servicosIds: new Set()
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Dados do dono da conta
  const [tiposEvento, setTiposEvento] = useState<TipoEvento[]>([]);
  const [tiposServico, setTiposServico] = useState<TipoServico[]>([]);
  const [canaisEntrada, setCanaisEntrada] = useState<CanalEntrada[]>([]);
  const [loadingTiposEvento, setLoadingTiposEvento] = useState(false);
  const [loadingTiposServico, setLoadingTiposServico] = useState(false);
  const [loadingCanaisEntrada, setLoadingCanaisEntrada] = useState(false);

  // Carregar dados do pre-cadastro se existir
  useEffect(() => {
    if (preCadastro) {
      setFormData({
        clienteNome: preCadastro.clienteNome || '',
        clienteEmail: preCadastro.clienteEmail || '',
        clienteTelefone: preCadastro.clienteTelefone || '',
        clienteCpf: preCadastro.clienteCpf || '',
        clienteEndereco: preCadastro.clienteEndereco || '',
        clienteCep: preCadastro.clienteCep || '',
        clienteInstagram: preCadastro.clienteInstagram || '',
        clienteCanalEntradaId: preCadastro.clienteCanalEntradaId || '',
        nomeEvento: preCadastro.nomeEvento || '',
        dataEvento: preCadastro.dataEvento ? formatLocalDate(dateToLocalMidnight(new Date(preCadastro.dataEvento))) : '',
        local: preCadastro.local || '',
        endereco: preCadastro.endereco || '',
        tipoEvento: preCadastro.tipoEvento || '',
        tipoEventoId: preCadastro.tipoEventoId || '',
        contratante: preCadastro.contratante || '',
        numeroConvidados: preCadastro.numeroConvidados || 0,
        quantidadeMesas: preCadastro.quantidadeMesas || 0,
        hashtag: preCadastro.hashtag || '',
        horarioInicio: preCadastro.horarioInicio || '',
        horarioTermino: preCadastro.horarioTermino || '',
        cerimonialista: preCadastro.cerimonialista || { nome: '', telefone: '' },
        observacoes: preCadastro.observacoes || '',
        servicosIds: new Set()
      });
    }
  }, [preCadastro]);

  // Carregar tipos de evento, serviços e canais de entrada
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      
      try {
        // Carregar em paralelo
        const [tiposEventoRes, tiposServicoRes, canaisRes] = await Promise.all([
          fetch(`/api/pre-cadastros/${preCadastroId}/tipos-evento`),
          fetch(`/api/pre-cadastros/${preCadastroId}/tipos-servico`),
          fetch(`/api/pre-cadastros/${preCadastroId}/canais-entrada`)
        ]);

        if (tiposEventoRes.ok) {
          const tipos = await tiposEventoRes.json();
          setTiposEvento(tipos);
        }

        if (tiposServicoRes.ok) {
          const tipos = await tiposServicoRes.json();
          setTiposServico(tipos);
        }

        if (canaisRes.ok) {
          const canais = await canaisRes.json();
          setCanaisEntrada(canais);
        }
      } catch (error) {
        // Erro silencioso
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [preCadastroId]);

  // Carregar serviços já selecionados do pre-cadastro
  useEffect(() => {
    const carregarServicos = async () => {
      if (!preCadastro) return;

      try {
        const response = await fetch(`/api/pre-cadastros/${preCadastroId}`);
        if (response.ok) {
          const data = await response.json();
          // Os serviços virão no preCadastro quando implementarmos a busca completa
          // Por enquanto, vamos deixar vazio
        }
      } catch (error) {
        // Erro silencioso
      }
    };

    carregarServicos();
  }, [preCadastroId, preCadastro]);

  const handleInputChange = (field: string, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleCerimonialistaChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      cerimonialista: {
        ...prev.cerimonialista,
        [field]: value
      }
    }));
  };

  const handleTipoEventoSelect = (tipoId: string) => {
    if (!tipoId) {
      setFormData(prev => ({
        ...prev,
        tipoEvento: '',
        tipoEventoId: ''
      }));
      return;
    }

    const tipo = tiposEvento.find(t => t.id === tipoId);
    if (!tipo) {
      return;
    }

    setFormData(prev => ({
      ...prev,
      tipoEvento: tipo.nome,
      tipoEventoId: tipo.id
    }));
  };

  const handleToggleTipoServico = (tipoId: string) => {
    setFormData(prev => ({
      ...prev,
      servicosIds: (() => {
        const atualizados = new Set(prev.servicosIds);
        if (atualizados.has(tipoId)) {
          atualizados.delete(tipoId);
        } else {
          atualizados.add(tipoId);
        }
        return atualizados;
      })()
    }));
  };

  const handleSelecionarTodosTiposServico = () => {
    setFormData(prev => ({
      ...prev,
      servicosIds: prev.servicosIds.size === tiposServico.length
        ? new Set()
        : new Set(tiposServico.map(tipo => tipo.id))
    }));
  };

  const calcularTempoEvento = (inicio: string, fim: string): string => {
    if (!inicio || !fim) return '';
    
    const [horaInicio, minutoInicio] = inicio.split(':').map(Number);
    const [horaFim, minutoFim] = fim.split(':').map(Number);
    
    const minutosInicio = horaInicio * 60 + minutoInicio;
    let minutosFim = horaFim * 60 + minutoFim;
    
    if (minutosFim < minutosInicio) {
      minutosFim += 24 * 60;
    }
    
    const diferencaMinutos = minutosFim - minutosInicio;
    const horas = Math.floor(diferencaMinutos / 60);
    const minutos = diferencaMinutos % 60;
    
    if (horas === 0 && minutos === 0) return '';
    if (minutos === 0) {
      return horas === 1 ? '1 HORA' : `${horas} HORAS`;
    }
    if (horas === 0) {
      return `${minutos} MINUTOS`;
    }
    const horasTexto = horas === 1 ? '1 HORA' : `${horas} HORAS`;
    return `${horasTexto} E ${minutos} MINUTOS`;
  };

  const tipoEventoOptions = tiposEvento.map(tipo => ({
    value: tipo.id,
    label: tipo.nome,
    description: tipo.descricao
  })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar dados do cliente
    if (!formData.clienteNome.trim()) newErrors.clienteNome = 'Nome é obrigatório';
    if (!formData.clienteEmail.trim()) newErrors.clienteEmail = 'Email é obrigatório';
    if (!formData.clienteTelefone.trim()) newErrors.clienteTelefone = 'Telefone é obrigatório';

    // Validar dados do evento
    if (!formData.dataEvento) newErrors.dataEvento = 'Data do evento é obrigatória';
    if (!formData.local.trim()) newErrors.local = 'Local é obrigatório';
    if (!formData.endereco.trim()) newErrors.endereco = 'Endereço é obrigatório';
    if (!formData.contratante.trim()) newErrors.contratante = 'Nome do contratante é obrigatório';
    if (!formData.numeroConvidados || formData.numeroConvidados <= 0) {
      newErrors.numeroConvidados = 'Número de convidados deve ser maior que zero';
    }
    if (!formData.tipoEventoId) newErrors.tipoEvento = 'Selecione um tipo de evento';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitting) return;
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);

    try {
      const dados = {
        clienteNome: formData.clienteNome.trim(),
        clienteEmail: formData.clienteEmail.trim(),
        clienteTelefone: formData.clienteTelefone.trim(),
        clienteCpf: formData.clienteCpf.trim() || undefined,
        clienteEndereco: formData.clienteEndereco.trim() || undefined,
        clienteCep: formData.clienteCep.trim() || undefined,
        clienteInstagram: formData.clienteInstagram.trim() || undefined,
        clienteCanalEntradaId: formData.clienteCanalEntradaId || undefined,
        nomeEvento: formData.nomeEvento.trim() || undefined,
        dataEvento: formData.dataEvento,
        local: formData.local.trim(),
        endereco: formData.endereco.trim(),
        tipoEvento: formData.tipoEvento,
        tipoEventoId: formData.tipoEventoId,
        contratante: formData.contratante.trim(),
        numeroConvidados: formData.numeroConvidados,
        quantidadeMesas: formData.quantidadeMesas || undefined,
        hashtag: formData.hashtag.trim() || undefined,
        horarioInicio: formData.horarioInicio || undefined,
        horarioTermino: formData.horarioTermino || undefined,
        cerimonialista: formData.cerimonialista?.nome ? {
          nome: formData.cerimonialista.nome,
          telefone: formData.cerimonialista.telefone || ''
        } : undefined,
        observacoes: formData.observacoes.trim() || undefined
      };

      const servicosIds = Array.from(formData.servicosIds);

      const response = await fetch(`/api/pre-cadastros/${preCadastroId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dados, servicosIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar pré-cadastro');
      }

      const result = await response.json();
      onSuccess();
    } catch (error: any) {
      setErrors({
        general: error.message || 'Erro ao salvar pré-cadastro. Tente novamente.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const tempoEventoCalculado = calcularTempoEvento(formData.horarioInicio, formData.horarioTermino);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Carregando formulário...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && (
        <div className="p-4 bg-error/10 border border-error rounded-md text-error">
          {errors.general}
        </div>
      )}

      {/* Dados do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
          <CardDescription>
            Preencha as informações do cliente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nome *"
              value={formData.clienteNome}
              onChange={(e) => handleInputChange('clienteNome', e.target.value)}
              error={errors.clienteNome}
            />
            <Input
              label="CPF"
              value={formData.clienteCpf}
              onChange={(e) => handleInputChange('clienteCpf', e.target.value)}
            />
            <Input
              label="Email *"
              type="email"
              value={formData.clienteEmail}
              onChange={(e) => handleInputChange('clienteEmail', e.target.value)}
              error={errors.clienteEmail}
            />
            <Input
              label="Telefone *"
              value={formData.clienteTelefone}
              onChange={(e) => handleInputChange('clienteTelefone', e.target.value)}
              error={errors.clienteTelefone}
            />
            <Input
              label="Endereço"
              value={formData.clienteEndereco}
              onChange={(e) => handleInputChange('clienteEndereco', e.target.value)}
            />
            <Input
              label="CEP"
              value={formData.clienteCep}
              onChange={(e) => handleInputChange('clienteCep', e.target.value)}
            />
            <Input
              label="Instagram"
              value={formData.clienteInstagram}
              onChange={(e) => handleInputChange('clienteInstagram', e.target.value)}
            />
            <SelectWithSearch
              label="Canal de Entrada"
              placeholder="Selecione um canal de entrada"
              options={canaisEntrada.map(canal => ({
                value: canal.id,
                label: canal.nome
              })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))}
              value={formData.clienteCanalEntradaId}
              onChange={(value) => handleInputChange('clienteCanalEntradaId', value)}
              allowCreate={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dados do Evento */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Evento</CardTitle>
          <CardDescription>
            Informações básicas sobre o evento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Data do Evento *"
              type="date"
              value={formData.dataEvento}
              onChange={(e) => handleInputChange('dataEvento', e.target.value)}
              error={errors.dataEvento}
            />
            <SelectWithSearch
              label="Tipo de Evento *"
              placeholder="Selecione um tipo de evento"
              options={tipoEventoOptions}
              value={formData.tipoEventoId}
              onChange={handleTipoEventoSelect}
              allowCreate={false}
              error={errors.tipoEvento}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Local *"
              value={formData.local}
              onChange={(e) => handleInputChange('local', e.target.value)}
              error={errors.local}
            />
            <Input
              label="Endereço *"
              value={formData.endereco}
              onChange={(e) => handleInputChange('endereco', e.target.value)}
              error={errors.endereco}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nome do Contratante *"
              value={formData.contratante}
              onChange={(e) => handleInputChange('contratante', e.target.value)}
              error={errors.contratante}
            />
            <Input
              label="Número de Convidados *"
              type="number"
              value={formData.numeroConvidados}
              onChange={(e) => handleInputChange('numeroConvidados', parseInt(e.target.value) || 0)}
              error={errors.numeroConvidados}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Quantidade de Mesas"
              type="number"
              value={formData.quantidadeMesas || ''}
              onChange={(e) => handleInputChange('quantidadeMesas', parseInt(e.target.value) || undefined)}
            />
            <Input
              label="Hashtag"
              value={formData.hashtag}
              onChange={(e) => handleInputChange('hashtag', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Horários */}
      <Card>
        <CardHeader>
          <CardTitle>Horários</CardTitle>
          <CardDescription>
            Defina os horários do evento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Horário de início"
              type="time"
              value={formData.horarioInicio}
              onChange={(e) => handleInputChange('horarioInicio', e.target.value)}
            />
            <Input
              label="Horário de término do evento"
              type="time"
              value={formData.horarioTermino}
              onChange={(e) => handleInputChange('horarioTermino', e.target.value)}
            />
          </div>

          {tempoEventoCalculado && (
            <Input
              label="Tempo de Evento (calculado automaticamente)"
              value={tempoEventoCalculado}
              disabled={true}
            />
          )}
        </CardContent>
      </Card>

      {/* Cerimonialista */}
      <Card>
        <CardHeader>
          <CardTitle>Cerimonialista</CardTitle>
          <CardDescription>
            Informações do cerimonialista (opcional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nome Cerimonialista"
              value={formData.cerimonialista?.nome || ''}
              onChange={(e) => handleCerimonialistaChange('nome', e.target.value)}
            />
            <Input
              label="Telefone Cerimonialista"
              value={formData.cerimonialista?.telefone || ''}
              onChange={(e) => handleCerimonialistaChange('telefone', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Serviços do Evento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TagIcon className="h-5 w-5" />
            Serviços do Evento
          </CardTitle>
          <CardDescription>
            Selecione os serviços que farão parte deste evento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tiposServico.length === 0 ? (
            <div className="text-sm text-text-secondary">
              Nenhum tipo de serviço disponível.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <span className="text-sm font-medium text-text-primary">
                  {formData.servicosIds.size} de {tiposServico.length} selecionados
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelecionarTodosTiposServico}
                >
                  {formData.servicosIds.size === tiposServico.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </Button>
              </div>
              <div className="space-y-2">
                {tiposServico.map((tipo) => (
                  <label
                    key={tipo.id}
                    className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-surface-hover cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-accent border-border rounded focus:ring-accent focus:ring-2"
                      checked={formData.servicosIds.has(tipo.id)}
                      onChange={() => handleToggleTipoServico(tipo.id)}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-primary">
                        {tipo.nome}
                      </div>
                      {tipo.descricao && (
                        <div className="text-xs text-text-secondary mt-0.5">
                          {tipo.descricao}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            label="Observações"
            value={formData.observacoes}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex justify-end space-x-4">
        <Button
          type="submit"
          disabled={submitting}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span
                className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
                aria-hidden="true"
              />
              Enviando...
            </span>
          ) : (
            'Enviar Pré-Cadastro'
          )}
        </Button>
      </div>
    </form>
  );
}
