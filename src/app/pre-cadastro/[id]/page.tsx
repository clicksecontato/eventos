'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PreCadastroForm from '@/components/forms/PreCadastroForm';
import { PreCadastroEvento, StatusPreCadastro } from '@/types';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function PreCadastroPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [preCadastro, setPreCadastro] = useState<PreCadastroEvento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const carregarPreCadastro = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/pre-cadastros/${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Pré-cadastro não encontrado');
          } else if (response.status === 410) {
            setError('Este link de pré-cadastro expirou. Por favor, entre em contato com o dono da conta.');
          } else {
            const errorData = await response.json();
            setError(errorData.error || 'Erro ao carregar pré-cadastro');
          }
          return;
        }

        const data = await response.json();
        setPreCadastro(data);

        // Se já foi preenchido, mostrar mensagem de sucesso
        if (data.status === StatusPreCadastro.PREENCHIDO || (typeof data.status === 'string' && data.status.toLowerCase() === 'preenchido')) {
          setSubmitted(true);
        }
      } catch (err) {
        setError('Erro ao carregar pré-cadastro. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      carregarPreCadastro();
    }
  }, [id]);

  const handleSuccess = () => {
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-error">
              <XCircleIcon className="h-6 w-6" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary mb-4">{error}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted || (preCadastro && (preCadastro.status === StatusPreCadastro.PREENCHIDO || (typeof preCadastro.status === 'string' && preCadastro.status.toLowerCase() === 'preenchido')))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full border-2 border-success/30 bg-success/5">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircleIcon className="h-10 w-10 text-success" />
              </div>
            </div>
            <CardTitle className="flex items-center justify-center gap-2 text-success text-xl">
              Pré-Cadastro Realizado com Sucesso!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <CardDescription className="mb-4 text-base text-text-primary">
              Seus dados foram enviados com sucesso. O dono da conta receberá uma notificação e entrará em contato em breve.
            </CardDescription>
            <p className="text-sm text-text-secondary mt-4">
              Você pode fechar esta janela.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!preCadastro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Pré-Cadastro não encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary mb-4">
              O pré-cadastro solicitado não foi encontrado.
            </p>
            <Button onClick={() => router.push('/')} variant="outline">
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verificar se expirou
  if (new Date(preCadastro.dataExpiracao) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <ClockIcon className="h-6 w-6" />
              Link Expirado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Este link de pré-cadastro expirou. Por favor, entre em contato com o dono da conta para solicitar um novo link.
            </CardDescription>
            <Button onClick={() => router.push('/')} variant="outline">
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pré-Cadastro de Evento</CardTitle>
            <CardDescription>
              Preencha os dados abaixo para realizar o pré-cadastro do seu evento. 
              Após o envio, o dono da conta entrará em contato.
            </CardDescription>
          </CardHeader>
        </Card>

        <PreCadastroForm
          preCadastroId={id}
          preCadastro={preCadastro}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}
