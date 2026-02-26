'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCliente, useEventos } from '@/hooks/useData';
import {
  ArrowLeftIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  EyeIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const parseDate = (value?: Date | string) => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const formatDateLong = (value?: Date | string) => {
  const date = parseDate(value);
  if (!date) {
    return 'Sem data';
  }

  try {
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch (error) {
    return 'Data inválida';
  }
};

const formatDateShort = (value?: Date | string) => {
  const date = parseDate(value);
  if (!date) {
    return 'Sem data';
  }

  try {
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  } catch (error) {
    return 'Data inválida';
  }
};

const formatCurrency = (valor: number) =>
  `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function ClienteDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const clienteId = params?.id as string;

  const {
    data: cliente,
    loading: loadingCliente,
    error: errorCliente
  } = useCliente(clienteId);
  const { data: eventos, loading: loadingEventos } = useEventos();

  const eventosDoCliente = useMemo(() => {
    if (!eventos?.length || !clienteId) {
      return [];
    }

    return eventos.filter(evento => evento.clienteId === clienteId);
  }, [eventos, clienteId]);

  const eventosOrdenados = useMemo(() => {
    if (!eventosDoCliente.length) {
      return [];
    }

    return [...eventosDoCliente].sort((a, b) => {
      const dataA = parseDate(a.dataEvento)?.getTime() ?? 0;
      const dataB = parseDate(b.dataEvento)?.getTime() ?? 0;
      return dataA - dataB;
    });
  }, [eventosDoCliente]);

  const resumo = useMemo(() => {
    if (!eventosDoCliente.length) {
      return {
        totalEventos: 0,
        valorTotal: 0,
        valorMedio: 0,
        proximoEvento: null as typeof eventosDoCliente[number] | null
      };
    }

    const valorTotal = eventosDoCliente.reduce((total, evento) => total + (evento.valorTotal || 0), 0);
    const totalEventos = eventosDoCliente.length;
    const valorMedio = totalEventos > 0 ? valorTotal / totalEventos : 0;

    const agora = new Date();
    const proximoEvento = eventosDoCliente
      .filter(evento => {
        const dataEvento = parseDate(evento.dataEvento);
        return dataEvento ? dataEvento >= agora : false;
      })
      .sort((a, b) => {
        const dataA = parseDate(a.dataEvento)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const dataB = parseDate(b.dataEvento)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return dataA - dataB;
      })[0] || null;

    return {
      totalEventos,
      valorTotal,
      valorMedio,
      proximoEvento
    };
  }, [eventosDoCliente]);

  const carregando = loadingCliente || loadingEventos;

  if (carregando) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Carregando informações do cliente...</div>
        </div>
      </Layout>
    );
  }

  if (errorCliente) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-error">Erro ao carregar cliente: {errorCliente}</div>
        </div>
      </Layout>
    );
  }

  if (!cliente) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Cliente não encontrado</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Button
            variant="outline"
            onClick={() => router.push('/clientes')}
            className="w-full md:w-auto"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Voltar para clientes
          </Button>
          <div className="text-left md:text-right">
            <h1 className="text-2xl font-bold text-text-primary">{cliente.nome}</h1>
            <p className="text-sm text-text-secondary">
              Cliente cadastrado em {formatDateLong(cliente.dataCadastro)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <UserIcon className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium text-text-secondary">Eventos registrados</p>
                  <p className="text-2xl font-bold text-text-primary">{resumo.totalEventos}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CurrencyDollarIcon className="h-8 w-8 text-success" />
                <div>
                  <p className="text-sm font-medium text-text-secondary">Valor total contratado</p>
                  <p className="text-2xl font-bold text-text-primary">{formatCurrency(resumo.valorTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-sm font-medium text-text-secondary">Próximo evento</p>
                  <p className="text-base font-semibold text-text-primary">
                    {resumo.proximoEvento
                      ? formatDateShort(resumo.proximoEvento.dataEvento)
                      : 'Nenhum evento futuro'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Informações do Cliente</CardTitle>
              <CardDescription>Dados de contato e detalhes complementares</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <EnvelopeIcon className="h-5 w-5 text-text-secondary" />
                  <div>
                    <p className="text-xs text-text-secondary">Email</p>
                    <p className="font-medium text-text-primary">{cliente.email || 'Não informado'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <PhoneIcon className="h-5 w-5 text-text-secondary" />
                  <div>
                    <p className="text-xs text-text-secondary">Telefone</p>
                    <p className="font-medium text-text-primary">{cliente.telefone || 'Não informado'}</p>
                  </div>
                </div>
                {cliente.cpf && (
                  <div className="flex items-center gap-2">
                    <span className="text-text-secondary text-sm font-semibold">CPF</span>
                    <p className="font-medium text-text-primary">{cliente.cpf}</p>
                  </div>
                )}
                {cliente.instagram && (
                  <div className="flex items-center gap-2">
                    <span className="text-text-secondary text-sm font-semibold">Instagram</span>
                    <p className="font-medium text-text-primary">{cliente.instagram}</p>
                  </div>
                )}
              </div>
              {cliente.endereco && (
                <div className="flex items-start gap-2">
                  <MapPinIcon className="h-5 w-5 text-text-secondary mt-0.5" />
                  <div>
                    <p className="text-xs text-text-secondary">Endereço</p>
                    <p className="font-medium text-text-primary">{cliente.endereco}</p>
                    {cliente.cep && (
                      <p className="text-xs text-text-secondary">CEP: {cliente.cep}</p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">Canal de entrada</span>
                <span className="text-sm font-medium text-text-primary">
                  {cliente.canalEntrada?.nome || 'Não informado'}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Visão Rápida</CardTitle>
              <CardDescription>Indicadores principais do relacionamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-text-secondary">Valor médio por evento</p>
                <p className="text-lg font-semibold text-text-primary">{formatCurrency(resumo.valorMedio || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Data de cadastro</p>
                <p className="text-sm font-medium text-text-primary">
                  {formatDateShort(cliente.dataCadastro)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Total de eventos futuros</p>
                <p className="text-sm font-medium text-text-primary">
                  {eventosDoCliente.filter(evento => {
                    const dataEvento = parseDate(evento.dataEvento);
                    return dataEvento ? dataEvento >= new Date() : false;
                  }).length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Eventos do Cliente</CardTitle>
            <CardDescription>Lista de eventos associados a este cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {eventosOrdenados.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-text-secondary">
                Nenhum evento cadastrado para este cliente.
              </div>
            ) : (
              eventosOrdenados.map((evento) => (
                <div
                  key={evento.id}
                  className="flex flex-col gap-4 rounded-lg border border-border bg-surface/40 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-text-primary">
                      {evento.nomeEvento || evento.tipoEvento || 'Evento'}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-secondary">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        {formatDateLong(evento.dataEvento)}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="inline-flex items-center rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-medium text-text-primary">
                          {evento.status}
                        </span>
                      </div>
                      {evento.local && (
                        <div className="flex items-center gap-1">
                          <MapPinIcon className="h-4 w-4" />
                          {evento.local}
                        </div>
                      )}
                      {typeof evento.numeroConvidados === 'number' && (
                        <div>
                          {evento.numeroConvidados} convidado(s)
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    <div className="text-right sm:text-left">
                      <p className="text-xs text-text-secondary">Valor total</p>
                      <p className="text-sm font-semibold text-text-primary">
                        {formatCurrency(evento.valorTotal || 0)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/eventos/${evento.id}`)}
                      className="flex items-center gap-2"
                    >
                      <EyeIcon className="h-4 w-4" />
                      Ver evento
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}


