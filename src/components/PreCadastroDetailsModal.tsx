'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PreCadastroEvento, StatusPreCadastro } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { dateToLocalMidnight } from '@/lib/utils/date-helpers';
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  PlusIcon,
  XMarkIcon,
  ArrowPathIcon,
  LinkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface PreCadastroDetailsModalProps {
  preCadastro: PreCadastroEvento;
  open: boolean;
  onClose: () => void;
  onCreateEvent: (preCadastro: PreCadastroEvento) => void;
  onIgnore: (preCadastro: PreCadastroEvento) => void;
  onRenew: (preCadastro: PreCadastroEvento) => void;
  onCopyLink: (preCadastro: PreCadastroEvento) => void;
  onDelete: (preCadastro: PreCadastroEvento) => void;
}

export default function PreCadastroDetailsModal({
  preCadastro,
  open,
  onClose,
  onCreateEvent,
  onIgnore,
  onRenew,
  onCopyLink,
  onDelete,
}: PreCadastroDetailsModalProps) {
  const isExpired = new Date(preCadastro.dataExpiracao) < new Date();
  const statusValue = preCadastro.status as StatusPreCadastro | string;
  const statusStr = String(statusValue).toLowerCase();
  const canCreateEvent = statusValue === StatusPreCadastro.PREENCHIDO || statusStr === StatusPreCadastro.PREENCHIDO;
  const canIgnore = statusValue === StatusPreCadastro.PENDENTE || statusStr === StatusPreCadastro.PENDENTE || statusValue === StatusPreCadastro.PREENCHIDO || statusStr === StatusPreCadastro.PREENCHIDO;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Detalhes do Pré-Cadastro
          </DialogTitle>
          <DialogDescription>
            Informações completas do pré-cadastro de evento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status e Metadados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-surface rounded-lg">
            <div>
              <p className="text-sm font-medium text-text-secondary">Status</p>
              <p className="text-base text-text-primary mt-1">
                {(() => {
                  const statusVal = preCadastro.status as StatusPreCadastro | string;
                  const statusStr = String(statusVal).toLowerCase();
                  if (statusVal === StatusPreCadastro.PENDENTE || statusStr === StatusPreCadastro.PENDENTE) return 'Pendente';
                  if (statusVal === StatusPreCadastro.PREENCHIDO || statusStr === StatusPreCadastro.PREENCHIDO) return 'Preenchido';
                  if (statusVal === StatusPreCadastro.CONVERTIDO || statusStr === StatusPreCadastro.CONVERTIDO) return 'Convertido';
                  if (statusVal === StatusPreCadastro.EXPIRADO || statusStr === StatusPreCadastro.EXPIRADO) return 'Expirado';
                  if (statusVal === StatusPreCadastro.IGNORADO || statusStr === StatusPreCadastro.IGNORADO) return 'Ignorado';
                  return String(statusVal);
                })()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Data de Expiração</p>
              <p className="text-base text-text-primary mt-1">
                {format(new Date(preCadastro.dataExpiracao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                {isExpired && <span className="ml-2 text-error">(Expirado)</span>}
              </p>
            </div>
            {preCadastro.dataPreenchimento && (
              <div>
                <p className="text-sm font-medium text-text-secondary">Data de Preenchimento</p>
                <p className="text-base text-text-primary mt-1">
                  {format(new Date(preCadastro.dataPreenchimento), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </p>
              </div>
            )}
            {preCadastro.dataConversao && (
              <div>
                <p className="text-sm font-medium text-text-secondary">Data de Conversão</p>
                <p className="text-base text-text-primary mt-1">
                  {format(new Date(preCadastro.dataConversao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </p>
              </div>
            )}
          </div>

          {/* Dados do Cliente */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Dados do Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-text-secondary">Nome</p>
                <p className="text-base text-text-primary mt-1">{preCadastro.clienteNome || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-text-secondary">Email</p>
                <p className="text-base text-text-primary mt-1 flex items-center gap-2">
                  <EnvelopeIcon className="h-4 w-4" />
                  {preCadastro.clienteEmail || 'Não informado'}
                </p>
              </div>
              {preCadastro.clienteTelefone && (
                <div>
                  <p className="text-sm font-medium text-text-secondary">Telefone</p>
                  <p className="text-base text-text-primary mt-1 flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4" />
                    {preCadastro.clienteTelefone}
                  </p>
                </div>
              )}
              {preCadastro.clienteCpf && (
                <div>
                  <p className="text-sm font-medium text-text-secondary">CPF</p>
                  <p className="text-base text-text-primary mt-1">{preCadastro.clienteCpf}</p>
                </div>
              )}
              {preCadastro.clienteEndereco && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-text-secondary">Endereço</p>
                  <p className="text-base text-text-primary mt-1">{preCadastro.clienteEndereco}</p>
                </div>
              )}
              {preCadastro.clienteCep && (
                <div>
                  <p className="text-sm font-medium text-text-secondary">CEP</p>
                  <p className="text-base text-text-primary mt-1">{preCadastro.clienteCep}</p>
                </div>
              )}
              {preCadastro.clienteInstagram && (
                <div>
                  <p className="text-sm font-medium text-text-secondary">Instagram</p>
                  <p className="text-base text-text-primary mt-1">{preCadastro.clienteInstagram}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dados do Evento */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Dados do Evento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {preCadastro.nomeEvento && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-text-secondary">Nome do Evento</p>
                  <p className="text-base text-text-primary mt-1">{preCadastro.nomeEvento}</p>
                </div>
              )}
              {preCadastro.dataEvento && (
                <div>
                  <p className="text-sm font-medium text-text-secondary">Data do Evento</p>
                  <p className="text-base text-text-primary mt-1 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {format(dateToLocalMidnight(new Date(preCadastro.dataEvento)), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              )}
              {preCadastro.tipoEvento && (
                <div>
                  <p className="text-sm font-medium text-text-secondary">Tipo de Evento</p>
                  <p className="text-base text-text-primary mt-1">{preCadastro.tipoEvento}</p>
                </div>
              )}
              {preCadastro.local && (
                <div>
                  <p className="text-sm font-medium text-text-secondary">Local</p>
                  <p className="text-base text-text-primary mt-1 flex items-center gap-2">
                    <MapPinIcon className="h-4 w-4" />
                    {preCadastro.local}
                  </p>
                </div>
              )}
              {preCadastro.endereco && (
                <div>
                  <p className="text-sm font-medium text-text-secondary">Endereço</p>
                  <p className="text-base text-text-primary mt-1">{preCadastro.endereco}</p>
                </div>
              )}
              {preCadastro.contratante && (
                <div>
                  <p className="text-sm font-medium text-text-secondary">Contratante</p>
                  <p className="text-base text-text-primary mt-1">{preCadastro.contratante}</p>
                </div>
              )}
              {preCadastro.numeroConvidados !== undefined && (
                <div>
                  <p className="text-sm font-medium text-text-secondary">Número de Convidados</p>
                  <p className="text-base text-text-primary mt-1">{preCadastro.numeroConvidados}</p>
                </div>
              )}
              {preCadastro.quantidadeMesas !== undefined && (
                <div>
                  <p className="text-sm font-medium text-text-secondary">Quantidade de Mesas</p>
                  <p className="text-base text-text-primary mt-1">{preCadastro.quantidadeMesas}</p>
                </div>
              )}
              {preCadastro.hashtag && (
                <div>
                  <p className="text-sm font-medium text-text-secondary">Hashtag</p>
                  <p className="text-base text-text-primary mt-1">{preCadastro.hashtag}</p>
                </div>
              )}
              {preCadastro.horarioInicio && (
                <div>
                  <p className="text-sm font-medium text-text-secondary">Horário de Início</p>
                  <p className="text-base text-text-primary mt-1 flex items-center gap-2">
                    <ClockIcon className="h-4 w-4" />
                    {preCadastro.horarioInicio}
                  </p>
                </div>
              )}
              {preCadastro.horarioTermino && (
                <div>
                  <p className="text-sm font-medium text-text-secondary">Horário de Término</p>
                  <p className="text-base text-text-primary mt-1 flex items-center gap-2">
                    <ClockIcon className="h-4 w-4" />
                    {preCadastro.horarioTermino}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Cerimonialista */}
          {preCadastro.cerimonialista?.nome && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text-primary">Cerimonialista</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Nome</p>
                  <p className="text-base text-text-primary mt-1">{preCadastro.cerimonialista.nome}</p>
                </div>
                {preCadastro.cerimonialista.telefone && (
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Telefone</p>
                    <p className="text-base text-text-primary mt-1">{preCadastro.cerimonialista.telefone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Serviços */}
          {preCadastro.servicos && preCadastro.servicos.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text-primary">Serviços Selecionados</h3>
              <div className="flex flex-wrap gap-2">
                {preCadastro.servicos
                  .filter(s => !s.removido)
                  .map(servico => (
                    <span
                      key={servico.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary"
                    >
                      {servico.tipoServico?.nome || 'Serviço'}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Observações */}
          {preCadastro.observacoes && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text-primary">Observações</h3>
              <p className="text-base text-text-primary whitespace-pre-wrap">{preCadastro.observacoes}</p>
            </div>
          )}

          {/* Ações */}
          <div className="pt-4 border-t">
            <div className="flex flex-wrap gap-2">
              {canCreateEvent && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onCreateEvent(preCadastro);
                    onClose();
                  }}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Criar Evento
                </Button>
              )}
              {canIgnore && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onIgnore(preCadastro);
                    onClose();
                  }}
                  className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                >
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  Ignorar
                </Button>
              )}
              {!isExpired && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onRenew(preCadastro);
                    onClose();
                  }}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  Renovar
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  onCopyLink(preCadastro);
                }}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                <LinkIcon className="h-4 w-4 mr-1" />
                Copiar Link
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onDelete(preCadastro);
                  onClose();
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Deletar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
