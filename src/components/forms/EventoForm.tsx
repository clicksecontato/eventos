'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import SelectWithSearch from '@/components/ui/SelectWithSearch';
import { 
  Cliente, 
  Evento, 
  ServicoEvento,
  StatusEvento, 
  TipoEvento,
  TipoServico
} from '@/types';
import { useClientes, useCanaisEntrada } from '@/hooks/useData';
import { dataService } from '@/lib/data-service';
import { useCurrentUser } from '@/hooks/useAuth';
import EventoServicosSection from '@/components/forms/EventoServicosSection';
import PlanoBloqueio from '@/components/PlanoBloqueio';
import { usePlano } from '@/lib/hooks/usePlano';
import { useToast } from '@/components/ui/toast';
import { handlePlanoError } from '@/lib/utils/plano-errors';
import EventoStatusSelect from '@/components/EventoStatusSelect';
import { parseLocalDate, getDiaSemana } from '@/lib/utils/date-helpers';

interface EventoFormProps {
  evento?: Evento;
  clienteInicialId?: string;
  onSave: (evento: Evento) => void;
  onCancel: () => void;
}

interface FormData {
  nomeEvento?: string;
  clienteId: string;
  novoCliente: {
    nome: string;
    cpf: string;
    email: string;
    telefone: string;
    endereco: string;
    cep: string;
    instagram?: string;
    canalEntradaId?: string;
  };
  dataEvento: string;
  tipoEvento: string;
  tipoEventoId: string;
  horarioInicio: string;
  horarioFim: string;
  observacoes?: string;
  status: StatusEvento;
  modoValorTotal: 'automatico' | 'manual';
  valorTotalServicosCalculado: number;
  motivoAjusteValorTotal?: string;
  valorTotal: number;
  diaFinalPagamento: string;
}

interface ServicoConfiguracao {
  quantidade: number;
  valorUnitario: number;
  observacoes?: string;
  origemPreco: 'padrao' | 'editado_manual';
}

const statusOptions = [
  { value: StatusEvento.AGENDADO, label: 'Agendado' },
  { value: StatusEvento.CANCELADO, label: 'Cancelado' },
  { value: StatusEvento.CONCLUIDO, label: 'Concluído' },
  { value: StatusEvento.CONFIRMADO, label: 'Confirmado' },
  { value: StatusEvento.EM_ANDAMENTO, label: 'Em andamento' }
];

export default function EventoForm({ evento, clienteInicialId, onSave, onCancel }: EventoFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { data: clientes } = useClientes();
  const { data: canaisEntrada, refetch: refetchCanaisEntrada } = useCanaisEntrada();
  const { userId, isLoading } = useCurrentUser();
  const { podeCriar: podeCriarEvento } = usePlano();

  const [formData, setFormData] = useState<FormData>({
    nomeEvento: '',
    clienteId: '',
    novoCliente: {
      nome: '',
      cpf: '',
      email: '',
      telefone: '',
      endereco: '',
      cep: '',
      instagram: '',
      canalEntradaId: ''
    },
    dataEvento: '',
    tipoEvento: '',
    tipoEventoId: '',
    horarioInicio: '',
    horarioFim: '',
    observacoes: '',
    status: StatusEvento.AGENDADO,
    modoValorTotal: 'automatico',
    valorTotalServicosCalculado: 0,
    motivoAjusteValorTotal: '',
    valorTotal: 0,
    diaFinalPagamento: ''
  });

  const [isNovoCliente, setIsNovoCliente] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [valorTotalInput, setValorTotalInput] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [tiposEvento, setTiposEvento] = useState<TipoEvento[]>([]);
  const [loadingTiposEvento, setLoadingTiposEvento] = useState(false);
  const [criandoTipoEvento, setCriandoTipoEvento] = useState(false);
  const [erroTiposEvento, setErroTiposEvento] = useState<string | null>(null);

  const [tiposServico, setTiposServico] = useState<TipoServico[]>([]);
  const [selectedTiposServicoIds, setSelectedTiposServicoIds] = useState<Set<string>>(new Set());
  const [servicosConfigurados, setServicosConfigurados] = useState<Record<string, ServicoConfiguracao>>({});
  const [servicosEventoOriginais, setServicosEventoOriginais] = useState<ServicoEvento[]>([]);
  const [loadingTiposServico, setLoadingTiposServico] = useState(false);
  const [criandoTipoServico, setCriandoTipoServico] = useState(false);
  const [erroTiposServico, setErroTiposServico] = useState<string | null>(null);

  const tipoEventoOptions = React.useMemo(() => {
    const baseOptions = tiposEvento
      .filter(tipo => tipo.ativo || tipo.id === formData.tipoEventoId)
      .map(tipo => ({
        value: tipo.id,
        label: tipo.nome,
        description: tipo.descricao
      }));

    if (!formData.tipoEventoId && formData.tipoEvento) {
      const jaExiste = baseOptions.some(
        option => option.label.toLowerCase() === formData.tipoEvento.toLowerCase()
      );

      if (!jaExiste) {
        baseOptions.push({
          value: formData.tipoEvento,
          label: formData.tipoEvento,
          description: 'Tipo associado a eventos já cadastrados'
        });
      }
    }

    return baseOptions.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [tiposEvento, formData.tipoEventoId, formData.tipoEvento]);


  useEffect(() => {
    if (evento) {
      // Usar o status do evento diretamente, como na página de detalhes
      const statusInicial = (evento.status as StatusEvento) || StatusEvento.AGENDADO;
      
      setFormData({
        nomeEvento: evento.nomeEvento || '',
        clienteId: evento.clienteId,
        novoCliente: {
          nome: '',
          cpf: '',
          email: '',
          telefone: '',
          endereco: '',
          cep: '',
          instagram: '',
          canalEntradaId: evento.cliente.canalEntradaId || ''
        },
        dataEvento: evento.dataEvento 
          ? new Date(evento.dataEvento.getTime() - evento.dataEvento.getTimezoneOffset() * 60000).toISOString().split('T')[0]
          : '',
        tipoEvento: evento.tipoEvento || '',
        tipoEventoId: evento.tipoEventoId || '',
        horarioInicio: evento.horarioInicio,
        horarioFim: evento.horarioFim || evento.horarioDesmontagem || '',
        observacoes: evento.observacoes || '',
        status: statusInicial,
        modoValorTotal: evento.modoValorTotal || 'manual',
        valorTotalServicosCalculado: evento.valorTotalServicosCalculado || 0,
        motivoAjusteValorTotal: evento.motivoAjusteValorTotal || '',
        valorTotal: evento.valorTotal,
        diaFinalPagamento: evento.diaFinalPagamento 
          ? new Date(evento.diaFinalPagamento.getTime() - evento.diaFinalPagamento.getTimezoneOffset() * 60000).toISOString().split('T')[0]
          : ''
      });
      setValorTotalInput(evento.valorTotal === 0 ? '' : String(evento.valorTotal));
      
      // Definir o cliente selecionado para exibição
      setClienteSearch(evento.cliente.nome);
      setIsNovoCliente(false);
    }
  }, [evento]);

  useEffect(() => {
    if (clienteSearch.length > 2 && clientes) {
      const filtrados = clientes.filter(cliente => 
        cliente.nome.toLowerCase().includes(clienteSearch.toLowerCase())
      );
      setClientesFiltrados(filtrados);
    } else {
      setClientesFiltrados([]);
    }
  }, [clienteSearch, clientes]);

  useEffect(() => {
    if (evento || !clienteInicialId || isNovoCliente || !clientes || clientes.length === 0) {
      return;
    }

    const clienteSelecionado = clientes.find((cliente) => cliente.id === clienteInicialId);
    if (!clienteSelecionado) {
      return;
    }

    setFormData((prev) => {
      if (prev.clienteId === clienteSelecionado.id) {
        return prev;
      }

      return {
        ...prev,
        clienteId: clienteSelecionado.id
      };
    });
    setClienteSearch(clienteSelecionado.nome);
    setClientesFiltrados([]);
  }, [evento, clienteInicialId, isNovoCliente, clientes]);

  useEffect(() => {
    const carregarTiposEvento = async () => {
      if (!userId) {
        return;
      }

      setLoadingTiposEvento(true);
      setErroTiposEvento(null);

      try {
        const tipos = await dataService.getTiposEvento(userId);
        const ordenados = tipos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        setTiposEvento(ordenados);

        if (!evento) {
          const atualSelecionado = formData.tipoEventoId;
          const tipoPadrao = ordenados.find(tipo => tipo.ativo) ?? ordenados[0];
          if (!atualSelecionado && tipoPadrao) {
            setFormData(prev => ({
              ...prev,
              tipoEvento: tipoPadrao.nome,
              tipoEventoId: tipoPadrao.id
            }));
          }
        } else if (evento && evento.tipoEventoId) {
          const tipoExistente = ordenados.find(tipo => tipo.id === evento.tipoEventoId);
          if (tipoExistente) {
            setFormData(prev => ({
              ...prev,
              tipoEvento: tipoExistente.nome,
              tipoEventoId: tipoExistente.id
            }));
          }
        }
      } catch (error) {
        setErroTiposEvento('Não foi possível carregar os tipos de evento.');
      } finally {
        setLoadingTiposEvento(false);
      }
    };

    carregarTiposEvento();
  }, [userId, evento]);

  useEffect(() => {
    const carregarTiposServico = async () => {
      if (!userId) {
        return;
      }

      setLoadingTiposServico(true);
      setErroTiposServico(null);

      try {
        const tipos = await dataService.getServicosCatalogoAtivos(userId);
        const tiposOrdenados = tipos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        setTiposServico(tiposOrdenados);
        setSelectedTiposServicoIds(prev => {
          if (prev.size === 0) {
            return prev;
          }

          const validIds = new Set<string>();
          prev.forEach(id => {
            if (tiposOrdenados.some(tipo => tipo.id === id)) {
              validIds.add(id);
            }
          });

          if (validIds.size === prev.size) {
            return prev;
          }

          return validIds;
        });
      } catch (error) {
        setErroTiposServico('Não foi possível carregar os serviços.');
      } finally {
        setLoadingTiposServico(false);
      }
    };

    carregarTiposServico();
  }, [userId]);

  useEffect(() => {
    const carregarServicosEvento = async () => {
      if (!userId || !evento?.id) {
        return;
      }

      try {
        const servicos = await dataService.getServicosEvento(userId, evento.id);
        setServicosEventoOriginais(servicos);
        setSelectedTiposServicoIds(
          new Set(
            servicos
              .map(servico => servico.servicoId)
              .filter((id): id is string => Boolean(id))
          )
        );
        const configuracoes: Record<string, ServicoConfiguracao> = {};
        servicos.forEach((servico) => {
          const chaveServico = servico.servicoId;
          if (!chaveServico) {
            return;
          }
          configuracoes[chaveServico] = {
            quantidade: servico.quantidade ?? 1,
            valorUnitario: servico.valorUnitario ?? servico.tipoServico?.valorPadrao ?? 0,
            observacoes: servico.observacoes || '',
            origemPreco: servico.origemPreco || 'padrao'
          };
        });
        setServicosConfigurados(configuracoes);
      } catch (error) {
        // Erro silencioso
      }
    };

    carregarServicosEvento();
  }, [userId, evento?.id]);

  useEffect(() => {
    if (selectedTiposServicoIds.size === 0 || tiposServico.length === 0) {
      return;
    }

    setServicosConfigurados(prev => {
      const atualizado = { ...prev };
      let alterou = false;

      selectedTiposServicoIds.forEach((tipoId) => {
        if (!atualizado[tipoId]) {
          const tipo = tiposServico.find(t => t.id === tipoId);
          atualizado[tipoId] = {
            quantidade: 1,
            valorUnitario: tipo?.valorPadrao ?? 0,
            observacoes: '',
            origemPreco: 'padrao'
          };
          alterou = true;
        }
      });

      return alterou ? atualizado : prev;
    });
  }, [selectedTiposServicoIds, tiposServico]);

  const handleInputChange = (field: string, value: string | number | undefined) => {
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

  const handleNovoClienteChange = (field: string, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      novoCliente: {
        ...prev.novoCliente,
        [field]: value
      }
    }));
  };

  const handleClienteSelect = (cliente: Cliente) => {
    setFormData(prev => ({
      ...prev,
      clienteId: cliente.id
    }));
    setClienteSearch(cliente.nome);
    setClientesFiltrados([]);
  };

  const handleTipoEventoSelect = (tipoId: string) => {
    if (!tipoId) {
      setFormData(prev => ({
        ...prev,
        tipoEvento: '',
        tipoEventoId: ''
      }));
      setErroTiposEvento('Selecione um tipo de evento');
      return;
    }

    const tipo = tiposEvento.find(t => t.id === tipoId);
    if (!tipo) {
      setFormData(prev => ({
        ...prev,
        tipoEvento: tipoId,
        tipoEventoId: ''
      }));
      setErroTiposEvento(null);
      if (errors.tipoEvento) {
        setErrors(prev => {
          const { tipoEvento, ...rest } = prev;
          return rest;
        });
      }
      return;
    }

    setFormData(prev => ({
      ...prev,
      tipoEvento: tipo.nome,
      tipoEventoId: tipo.id
    }));

    setErroTiposEvento(null);
    if (errors.tipoEvento) {
      setErrors(prev => {
        const { tipoEvento, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleCreateTipoEvento = async (nome: string) => {
    if (!userId || !nome.trim() || criandoTipoEvento) {
      return;
    }

    setCriandoTipoEvento(true);
    setErroTiposEvento(null);

    try {
      const novoTipo = await dataService.createTipoEvento(
        {
          nome: nome.trim(),
          descricao: '',
          ativo: true
        },
        userId
      );

      setTiposEvento(prev => [...prev, novoTipo].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      setFormData(prev => ({
        ...prev,
        tipoEvento: novoTipo.nome,
        tipoEventoId: novoTipo.id
      }));
    } catch (error) {
      setErroTiposEvento('Não foi possível criar o novo tipo de evento.');
    } finally {
      setCriandoTipoEvento(false);
    }
  };

  const handleToggleTipoServico = (tipoId: string) => {
    setSelectedTiposServicoIds(prev => {
      const atualizados = new Set(prev);
      if (atualizados.has(tipoId)) {
        atualizados.delete(tipoId);
        setServicosConfigurados(configs => {
          const copia = { ...configs };
          delete copia[tipoId];
          return copia;
        });
      } else {
        atualizados.add(tipoId);
        const tipo = tiposServico.find(t => t.id === tipoId);
        setServicosConfigurados(configs => ({
          ...configs,
          [tipoId]: configs[tipoId] || {
            quantidade: 1,
            valorUnitario: tipo?.valorPadrao ?? 0,
            observacoes: '',
            origemPreco: 'padrao'
          }
        }));
      }
      return atualizados;
    });
  };

  const handleSelecionarTodosTiposServico = () => {
    setSelectedTiposServicoIds(prev => {
      if (tiposServico.length === 0) {
        return prev;
      }

      if (prev.size === tiposServico.length) {
        setServicosConfigurados({});
        return new Set();
      }

      const configs: Record<string, ServicoConfiguracao> = {};
      tiposServico.forEach((tipo) => {
        configs[tipo.id] = {
          quantidade: 1,
          valorUnitario: tipo.valorPadrao ?? 0,
          observacoes: '',
          origemPreco: 'padrao'
        };
      });
      setServicosConfigurados(configs);
      return new Set(tiposServico.map(tipo => tipo.id));
    });
  };

  const handleCreateTipoServico = async (nome: string) => {
    if (!userId) {
      return;
    }

    setCriandoTipoServico(true);
    setErroTiposServico(null);

    try {
      const novoTipo = await dataService.createServicoCatalogo({
        nome,
        descricao: '',
        ativo: true
      }, userId);

      setTiposServico(prev => {
        const novaLista = [...prev, novoTipo].sort((a, b) =>
          a.nome.localeCompare(b.nome, 'pt-BR')
        );
        return novaLista;
      });

      setSelectedTiposServicoIds(prev => {
        const atualizado = new Set(prev);
        atualizado.add(novoTipo.id);
        return atualizado;
      });
      setServicosConfigurados(prev => ({
        ...prev,
        [novoTipo.id]: {
          quantidade: 1,
          valorUnitario: novoTipo.valorPadrao ?? 0,
          observacoes: '',
          origemPreco: 'padrao'
        }
      }));
    } catch (error) {
      setErroTiposServico('Não foi possível criar o novo serviço.');
      throw error;
    } finally {
      setCriandoTipoServico(false);
    }
  };

  const valorTotalServicosCalculado = React.useMemo(() => {
    return Array.from(selectedTiposServicoIds).reduce((total, tipoId) => {
      const config = servicosConfigurados[tipoId];
      if (!config) return total;
      return total + (config.quantidade || 0) * (config.valorUnitario || 0);
    }, 0);
  }, [selectedTiposServicoIds, servicosConfigurados]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      valorTotalServicosCalculado
    }));
  }, [valorTotalServicosCalculado]);

  useEffect(() => {
    if (formData.modoValorTotal !== 'automatico') {
      return;
    }

    setFormData(prev => ({
      ...prev,
      valorTotal: valorTotalServicosCalculado
    }));
    setValorTotalInput(valorTotalServicosCalculado === 0 ? '' : String(valorTotalServicosCalculado));
  }, [formData.modoValorTotal, valorTotalServicosCalculado]);

  const atualizarConfiguracaoServico = (
    tipoId: string,
    campo: keyof ServicoConfiguracao,
    valor: string | number
  ) => {
    setServicosConfigurados(prev => {
      const atual = prev[tipoId] || {
        quantidade: 1,
        valorUnitario: 0,
        observacoes: '',
        origemPreco: 'padrao' as const
      };

      const proximo: ServicoConfiguracao = {
        ...atual,
        [campo]: valor as never
      };

      if (campo === 'valorUnitario') {
        proximo.origemPreco = 'editado_manual';
      }

      return {
        ...prev,
        [tipoId]: proximo
      };
    });
  };

  const sincronizarServicosEvento = async (eventoId: string) => {
    if (!userId) {
      return;
    }

    const tiposMap = new Map(tiposServico.map(tipo => [tipo.id, tipo]));
    const selecionados = Array.from(selectedTiposServicoIds);

    try {
      if (evento) {
        let servicosAtuais = servicosEventoOriginais;

        if (servicosAtuais.length === 0) {
          try {
            servicosAtuais = await dataService.getServicosEvento(userId, eventoId);
          } catch (erro) {
            // Erro silencioso
          }
        }

        const mapaOriginais = new Map(servicosAtuais.map(servico => [servico.servicoId, servico]));
        const atualizados: ServicoEvento[] = [];

        for (const tipoId of selecionados) {
          const tipo = tiposMap.get(tipoId);
          const config = servicosConfigurados[tipoId];
          if (!tipo) {
            continue;
          }

          if (mapaOriginais.has(tipoId)) {
            const servicoExistente = mapaOriginais.get(tipoId)!;
            const quantidade = config?.quantidade ?? servicoExistente.quantidade ?? 1;
            const valorUnitario = config?.valorUnitario ?? servicoExistente.valorUnitario ?? tipo.valorPadrao ?? 0;
            const observacoes = config?.observacoes ?? servicoExistente.observacoes ?? '';
            const origemPreco = config?.origemPreco ?? servicoExistente.origemPreco ?? 'padrao';

            const servicoAtualizado = await dataService.updateServicoEvento(userId, eventoId, servicoExistente.id, {
              quantidade,
              valorUnitario,
              valorTotalItem: quantidade * valorUnitario,
              origemPreco,
              observacoes
            });
            atualizados.push(servicoAtualizado);
            mapaOriginais.delete(tipoId);
            continue;
          }

          const quantidade = config?.quantidade ?? 1;
          const valorUnitario = config?.valorUnitario ?? tipo.valorPadrao ?? 0;
          const novoServico = await dataService.createServicoEvento(userId, eventoId, {
            eventoId,
            servicoId: tipoId,
            tipoServico: tipo,
            quantidade,
            valorUnitario,
            valorTotalItem: quantidade * valorUnitario,
            origemPreco: config?.origemPreco || 'padrao',
            observacoes: config?.observacoes || '',
            dataCadastro: new Date()
          });

          atualizados.push(novoServico);
        }

        for (const [, servico] of mapaOriginais) {
          await dataService.deleteServicoEvento(userId, eventoId, servico.id);
        }

        setServicosEventoOriginais(atualizados);
      } else {
        if (selecionados.length === 0) {
          setServicosEventoOriginais([]);
          return;
        }

        const novosServicos: ServicoEvento[] = [];

        for (const tipoId of selecionados) {
          const tipo = tiposMap.get(tipoId);
          const config = servicosConfigurados[tipoId];
          if (!tipo) {
            continue;
          }

          const quantidade = config?.quantidade ?? 1;
          const valorUnitario = config?.valorUnitario ?? tipo.valorPadrao ?? 0;
          const novoServico = await dataService.createServicoEvento(userId, eventoId, {
            eventoId,
            servicoId: tipoId,
            tipoServico: tipo,
            quantidade,
            valorUnitario,
            valorTotalItem: quantidade * valorUnitario,
            origemPreco: config?.origemPreco || 'padrao',
            observacoes: config?.observacoes || '',
            dataCadastro: new Date()
          });

          novosServicos.push(novoServico);
        }

        setServicosEventoOriginais(novosServicos);
      }
    } catch (error) {
      throw error;
    }
  };

  const handleCreateCanalEntrada = async (nome: string) => {
    if (!userId) return;
    
    try {
      const novoCanal = await dataService.createCanalEntrada({
        nome,
        descricao: '',
        ativo: true,
        dataCadastro: new Date()
      }, userId);
      
      // Recarregar a lista de canais de entrada
      await refetchCanaisEntrada();
      
      // Atualizar o formData com o novo canal
      setFormData(prev => ({
        ...prev,
        novoCliente: {
          ...prev.novoCliente,
          canalEntradaId: novoCanal.id
        }
      }));
    } catch (error) {
      // Erro silencioso
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!isNovoCliente && !formData.clienteId) {
      newErrors.clienteId = 'Selecione um cliente';
    }

    if (isNovoCliente) {
      if (!formData.novoCliente.nome) newErrors.novoClienteNome = 'Nome é obrigatório';
      if (!formData.novoCliente.email) newErrors.novoClienteEmail = 'Email é obrigatório';
      if (!formData.novoCliente.telefone) newErrors.novoClienteTelefone = 'Telefone é obrigatório';
    }

    if (!formData.dataEvento) newErrors.dataEvento = 'Data do evento é obrigatória';
    if (!formData.tipoEventoId) newErrors.tipoEvento = 'Selecione um tipo de evento';
    if (!formData.valorTotal || formData.valorTotal <= 0) newErrors.valorTotal = 'Valor total deve ser maior que zero';
    if (!formData.diaFinalPagamento) newErrors.diaFinalPagamento = 'Dia final de pagamento é obrigatório';
    if (
      formData.modoValorTotal === 'manual' &&
      Math.abs((formData.valorTotal || 0) - (formData.valorTotalServicosCalculado || 0)) > 0.01 &&
      !formData.motivoAjusteValorTotal?.trim()
    ) {
      newErrors.motivoAjusteValorTotal = 'Informe o motivo do ajuste manual do valor total';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitting) {
      return;
    }
    
    if (isLoading) {
      return;
    }
    if (!userId) {
      setErrors({ general: 'Usuário não autenticado' });
      return;
    }

    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);

    try {
      let cliente: Cliente;
      
      if (isNovoCliente) {
        // Criar cliente sem validar plano (é parte da criação do evento)
        cliente = await dataService.createCliente(formData.novoCliente, userId, true);
      } else {
        const clienteExistente = clientes?.find(c => c.id === formData.clienteId);
        if (!clienteExistente) {
          setErrors({ clienteId: 'Cliente não encontrado' });
          return;
        }
        cliente = clienteExistente;
      }

      const eventoData = {
        nomeEvento: formData.nomeEvento || undefined,
        clienteId: cliente.id,
        cliente,
        dataEvento: parseLocalDate(formData.dataEvento),
        diaSemana: getDiaSemana(formData.dataEvento),
        tipoEvento: formData.tipoEvento,
        tipoEventoId: formData.tipoEventoId || undefined,
        horarioInicio: formData.horarioInicio,
        horarioFim: formData.horarioFim,
        observacoes: formData.observacoes || undefined,
        status: (typeof formData.status === 'string' ? formData.status : String(formData.status)) as Evento['status'],
        modoValorTotal: formData.modoValorTotal,
        valorTotalServicosCalculado: valorTotalServicosCalculado,
        valorTotal: formData.valorTotal,
        motivoAjusteValorTotal: formData.modoValorTotal === 'manual' ? (formData.motivoAjusteValorTotal || undefined) : undefined,
        valorTotalAjustadoPor: formData.modoValorTotal === 'manual' ? userId : undefined,
        valorTotalAjustadoEm: formData.modoValorTotal === 'manual' ? new Date() : undefined,
        diaFinalPagamento: parseLocalDate(formData.diaFinalPagamento),
        dataCadastro: new Date(),
        dataAtualizacao: new Date()
      };

      if (evento) {
        const eventoAtualizado = await dataService.updateEvento(evento.id, eventoData, userId);
        await sincronizarServicosEvento(eventoAtualizado.id);
        onSave(eventoAtualizado);
      } else {
        const novoEvento = await dataService.createEvento(eventoData, userId);
        await sincronizarServicosEvento(novoEvento.id);
        onSave(novoEvento);
      }
    } catch (error: any) {
      // Tratar erros de plano
      const erroTratado = handlePlanoError(error, showToast, () => router.push('/planos'));
      
      if (!erroTratado) {
        // Verificar se é erro de email duplicado (status 409)
        if (error?.status === 409 || error?.message?.includes('Já existe um cliente')) {
          const erroMensagem = error.message || 'Já existe um cliente cadastrado com este email. Por favor, selecione o cliente existente na lista.';
          setErrors({ 
            novoClienteEmail: erroMensagem,
            general: erroMensagem
          });
          showToast(erroMensagem, 'error');
          // Sugerir usar cliente existente
          setIsNovoCliente(false);
        } else {
          // Se não for erro de plano, mostrar erro genérico
          setErrors({ 
            general: error.message || 'Erro ao salvar evento. Tente novamente.' 
          });
          showToast(error.message || 'Erro ao salvar evento. Tente novamente.', 'error');
        }
      } else {
        // Mesmo tratando com toast, pode ser útil mostrar no formulário também
        setErrors({ 
          general: error.message || 'Não é possível criar evento. Verifique seu plano e limites.' 
        });
      }
      
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status do Evento */}
      {evento && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Status do Evento
              </label>
              <EventoStatusSelect
                eventoId={evento.id}
                statusAtual={formData.status || evento.status}
                onStatusChange={async (eventoId, novoStatus) => {
                  // Apenas atualizar o formData localmente
                  // A atualização no banco será feita ao salvar o formulário
                  handleInputChange('status', novoStatus as StatusEvento);
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nome do Evento */}
      <Card>
        <CardHeader>
          <CardTitle>Nome do Evento</CardTitle>
          <CardDescription>
            Identifique facilmente este evento com um nome personalizado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            label="Nome do Evento"
            placeholder="Ex: Casamento João e Maria, Aniversário 15 anos Ana..."
            value={formData.nomeEvento || ''}
            onChange={(e) => handleInputChange('nomeEvento', e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Dados do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
          <CardDescription>
            Selecione um cliente existente ou cadastre um novo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button
              type="button"
              variant={!isNovoCliente ? 'secondary' : 'outline'}
              onClick={() => setIsNovoCliente(false)}
            >
              Cliente Existente
            </Button>
            <Button
              type="button"
              variant={isNovoCliente ? 'secondary' : 'outline'}
              onClick={() => setIsNovoCliente(true)}
            >
              Novo Cliente
            </Button>
          </div>

          {!isNovoCliente ? (
            <div>
              <Input
                label="Buscar Cliente"
                placeholder="Digite o nome ou email do cliente..."
                value={clienteSearch}
                onChange={(e) => setClienteSearch(e.target.value)}
                error={errors.clienteId}
              />
              {clientesFiltrados.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                  {clientesFiltrados.map((cliente) => (
                    <div
                      key={cliente.id}
                      className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => handleClienteSelect(cliente)}
                    >
                      <div className="font-medium">{cliente.nome}</div>
                      <div className="text-sm text-text-secondary">{cliente.email}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nome *"
                value={formData.novoCliente.nome}
                onChange={(e) => handleNovoClienteChange('nome', e.target.value)}
                error={errors.novoClienteNome}
              />
              <Input
                label="CPF"
                value={formData.novoCliente.cpf}
                onChange={(e) => handleNovoClienteChange('cpf', e.target.value)}
              />
              <Input
                label="Email *"
                type="email"
                value={formData.novoCliente.email}
                onChange={(e) => handleNovoClienteChange('email', e.target.value)}
                error={errors.novoClienteEmail}
              />
              <Input
                label="Telefone *"
                value={formData.novoCliente.telefone}
                onChange={(e) => handleNovoClienteChange('telefone', e.target.value)}
                error={errors.novoClienteTelefone}
              />
              <Input
                label="Endereço"
                value={formData.novoCliente.endereco}
                onChange={(e) => handleNovoClienteChange('endereco', e.target.value)}
              />
              <Input
                label="CEP"
                value={formData.novoCliente.cep}
                onChange={(e) => handleNovoClienteChange('cep', e.target.value)}
              />
              <Input
                label="Instagram"
                value={formData.novoCliente.instagram || ''}
                onChange={(e) => handleNovoClienteChange('instagram', e.target.value)}
              />
              <SelectWithSearch
                label="Canal de Entrada"
                placeholder="Selecione ou digite um canal de entrada"
                options={canaisEntrada?.map(canal => ({
                  value: canal.id,
                  label: canal.nome
                })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')) || []}
                value={formData.novoCliente.canalEntradaId || ''}
                onChange={(value) => handleNovoClienteChange('canalEntradaId', value)}
                onCreateNew={(nome) => handleCreateCanalEntrada(nome)}
                allowCreate={true}
              />
            </div>
          )}
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
              label="Tipo de Evento"
              placeholder="Selecione ou digite um tipo de evento"
              options={tipoEventoOptions}
              value={formData.tipoEventoId || formData.tipoEvento}
              onChange={(value) => handleTipoEventoSelect(value)}
              onCreateNew={(nome) => handleCreateTipoEvento(nome)}
              allowCreate
              error={errors.tipoEvento ?? erroTiposEvento ?? undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Modo do valor total"
              value={formData.modoValorTotal}
              onValueChange={(value) => handleInputChange('modoValorTotal', value as 'automatico' | 'manual')}
              options={[
                { value: 'automatico', label: 'Automático (soma dos serviços)' },
                { value: 'manual', label: 'Manual (valor negociado)' }
              ]}
            />
            <Input
              label="Total calculado pelos serviços"
              type="number"
              value={Number(valorTotalServicosCalculado.toFixed(2))}
              disabled
              hideSpinner
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Valor Total *"
              type="number"
              step="0.01"
              min="0"
              value={valorTotalInput}
              disabled={formData.modoValorTotal === 'automatico'}
              onChange={(e) => {
                const value = e.target.value;
                setValorTotalInput(value);
                // Converter para número apenas quando houver valor válido
                const numValue = value === '' ? 0 : (parseFloat(value) || 0);
                handleInputChange('valorTotal', numValue);
              }}
              onBlur={(e) => {
                // Garantir que o valor seja atualizado quando o campo perde o foco
                const value = e.target.value;
                if (value === '') {
                  setValorTotalInput('');
                } else {
                  const numValue = parseFloat(value) || 0;
                  setValorTotalInput(numValue === 0 ? '' : String(numValue));
                  handleInputChange('valorTotal', numValue);
                }
              }}
              error={errors.valorTotal}
              hideSpinner
            />
            <Input
              label="Dia Final de Pagamento *"
              type="date"
              value={formData.diaFinalPagamento}
              onChange={(e) => handleInputChange('diaFinalPagamento', e.target.value)}
              error={errors.diaFinalPagamento}
            />
          </div>

          {formData.modoValorTotal === 'manual' && (
            <Textarea
              label="Motivo do ajuste manual"
              value={formData.motivoAjusteValorTotal || ''}
              onChange={(e) => handleInputChange('motivoAjusteValorTotal', e.target.value)}
              error={errors.motivoAjusteValorTotal}
              rows={2}
            />
          )}
        </CardContent>
      </Card>

      {/* Agendamento */}
      <Card>
        <CardHeader>
          <CardTitle>Agendamento</CardTitle>
          <CardDescription>
            Defina o horário de início e fim do evento
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
              label="Horário fim"
              type="time"
              value={formData.horarioFim}
              onChange={(e) => handleInputChange('horarioFim', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            label="Observações"
            value={formData.observacoes || ''}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      <EventoServicosSection
        tiposServico={tiposServico}
        selectedIds={selectedTiposServicoIds}
        onToggle={handleToggleTipoServico}
        onSelecionarTodos={handleSelecionarTodosTiposServico}
        totalSelecionado={selectedTiposServicoIds.size}
        loading={loadingTiposServico}
        onCreateTipo={handleCreateTipoServico}
        criandoTipo={criandoTipoServico}
        errorMessage={erroTiposServico}
      />

      {selectedTiposServicoIds.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Precificação dos Serviços</CardTitle>
            <CardDescription>
              Defina quantidade e valor unitário por serviço. O total é usado no modo automático.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from(selectedTiposServicoIds).map((tipoId) => {
              const tipo = tiposServico.find(t => t.id === tipoId);
              if (!tipo) return null;
              const config = servicosConfigurados[tipoId] || {
                quantidade: 1,
                valorUnitario: tipo.valorPadrao ?? 0,
                observacoes: '',
                origemPreco: 'padrao' as const
              };
              const totalItem = config.quantidade * config.valorUnitario;

              return (
                <div key={tipoId} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <p className="text-sm font-medium text-text-primary">{tipo.nome}</p>
                    <p className="text-xs text-text-secondary">
                      Valor padrão: R$ {(tipo.valorPadrao ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <Input
                    label="Qtd."
                    type="number"
                    min="1"
                    step="1"
                    value={config.quantidade}
                    onChange={(e) => atualizarConfiguracaoServico(tipoId, 'quantidade', Number(e.target.value || 1))}
                    hideSpinner
                  />
                  <Input
                    label="Valor unit. (R$)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={config.valorUnitario}
                    onChange={(e) => atualizarConfiguracaoServico(tipoId, 'valorUnitario', Number(e.target.value || 0))}
                    hideSpinner
                  />
                  <div className="sm:col-span-4 text-xs text-text-secondary">
                    Total do item: <strong>R$ {totalItem.toFixed(2)}</strong>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Botões de Ação */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="outline"
          data-testid="evento-submit"
          disabled={submitting}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span
                className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
                aria-hidden="true"
              />
              {evento ? 'Atualizando...' : 'Criando...'}
            </span>
          ) : (
            evento ? 'Atualizar Evento' : 'Criar Evento'
          )}
        </Button>
      </div>
    </form>
  );
}
