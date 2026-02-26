'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';
import { Input } from './input';
import { LinkIcon } from '@heroicons/react/24/outline';

interface NomeEventoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (nomeEvento: string) => void;
}

export default function NomeEventoDialog({
  open,
  onOpenChange,
  onConfirm
}: NomeEventoDialogProps) {
  const [nomeEvento, setNomeEvento] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setNomeEvento('');
      setError('');
    }
  }, [open]);

  const handleConfirm = () => {
    const nomeTrimmed = nomeEvento.trim();
    
    if (!nomeTrimmed) {
      setError('O nome do evento é obrigatório');
      return;
    }

    if (nomeTrimmed.length < 3) {
      setError('O nome do evento deve ter pelo menos 3 caracteres');
      return;
    }

    onConfirm(nomeTrimmed);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setNomeEvento('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-surface border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <LinkIcon className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-text-primary">Gerar Link de Pré-Cadastro</DialogTitle>
          </div>
          <DialogDescription className="text-text-secondary pt-2">
            Informe o nome do evento para facilitar a identificação deste pré-cadastro na lista.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            label="Nome do Evento *"
            value={nomeEvento}
            onChange={(e) => {
              setNomeEvento(e.target.value);
              if (error) setError('');
            }}
            placeholder="Ex: Casamento de Maria e João"
            error={error}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
              }
            }}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          <Button
            variant="default"
            onClick={handleConfirm}
          >
            Gerar Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
