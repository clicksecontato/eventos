'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CalendarIcon,
  EnvelopeIcon,
  HomeIcon,
  PhoneIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import type { AgendamentoAlocacao, Evento } from '@/types';
import { classeCorStatusAgendamentoAlocacao } from './evento-view-cores';

type Props = {
  evento: Evento;
  alocacoesEvento: AgendamentoAlocacao[];
  profissionaisAlocacao: Map<string, string>;
  onGerenciarAgendamento: () => void;
};

export function EventoBasicoSection({
  evento,
  alocacoesEvento,
  profissionaisAlocacao,
  onGerenciarAgendamento,
}: Props) {
  const dataEvt = evento.dataEvento instanceof Date ? evento.dataEvento : new Date(evento.dataEvento);

  return (
    <div id="basico" className="grid grid-cols-1 gap-6 pt-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Informações do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center text-sm">
            <UserIcon className="mr-2 h-4 w-4 text-text-muted" />
            <span className="font-medium">{evento.cliente.nome}</span>
          </div>
          {evento.cliente.email && (
            <div className="flex items-center text-sm text-text-secondary">
              <EnvelopeIcon className="mr-2 h-4 w-4 text-text-muted" />
              <a href={`mailto:${evento.cliente.email}`} className="text-link hover:text-link-hover hover:underline">
                {evento.cliente.email}
              </a>
            </div>
          )}
          {evento.cliente.telefone && (
            <div className="flex items-center text-sm text-text-secondary">
              <PhoneIcon className="mr-2 h-4 w-4 text-text-muted" />
              <a
                href={`tel:${evento.cliente.telefone.replace(/\D/g, '')}`}
                className="text-link hover:text-link-hover hover:underline"
              >
                {evento.cliente.telefone}
              </a>
            </div>
          )}
          {evento.cliente.endereco && (
            <div className="flex items-center text-sm text-text-secondary">
              <HomeIcon className="mr-2 h-4 w-4 text-text-muted" />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(evento.cliente.endereco)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="break-words text-link hover:text-link-hover hover:underline"
              >
                {evento.cliente.endereco}
              </a>
            </div>
          )}
          {evento.cliente.instagram && (
            <div className="flex items-center text-sm text-text-secondary">
              <span className="mr-2">📷</span>
              <a
                href={`https://instagram.com/${evento.cliente.instagram.replace('@', '').replace('https://instagram.com/', '').replace('https://www.instagram.com/', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link hover:text-link-hover hover:underline"
              >
                {evento.cliente.instagram}
              </a>
            </div>
          )}
          {evento.cliente.canalEntrada && (
            <div className="text-sm text-text-secondary">
              <span className="font-medium">Canal de Entrada:</span> {evento.cliente.canalEntrada.nome}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Evento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center text-sm">
            <CalendarIcon className="mr-2 h-4 w-4 text-text-muted" />
            <span className="font-medium">
              {dataEvt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} -{' '}
              {dataEvt
                .toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })
                .toUpperCase()}
            </span>
          </div>
          <div className="text-sm">
            <span className="font-medium text-text-primary">Tipo:</span> {evento.tipoEvento}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Agendamento</CardTitle>
            <Button variant="outline" size="sm" type="button" onClick={onGerenciarAgendamento}>
              Gerenciar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-text-primary">Horário de início:</span>
              <div className="text-text-secondary">{evento.horarioInicio}</div>
            </div>
            <div>
              <span className="font-medium text-text-primary">Horário fim:</span>
              <div className="text-text-secondary">{evento.horarioFim || evento.horarioDesmontagem}</div>
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium text-text-primary">Alocações do evento</span>
            {alocacoesEvento.length === 0 ? (
              <p className="text-sm text-text-secondary">Nenhuma alocação cadastrada.</p>
            ) : (
              <div className="space-y-1">
                {[...alocacoesEvento]
                  .sort((a, b) => a.inicioTs.getTime() - b.inicioTs.getTime())
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                    >
                      <div className="text-sm text-text-secondary">
                        <span className="font-medium text-text-primary">
                          {profissionaisAlocacao.get(item.profissionalId) || 'Profissional'}
                        </span>
                        {' - '}
                        {item.inicioTs.toLocaleDateString('pt-BR')}{' '}
                        {item.inicioTs.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        {' às '}
                        {item.fimTs.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classeCorStatusAgendamentoAlocacao(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {evento.observacoes && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-text-secondary">{evento.observacoes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
