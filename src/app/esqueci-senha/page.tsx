'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import LoadingHotmart from '@/components/LoadingHotmart';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Por favor, informe seu email');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      // A API retorna { data: { success: true, message: '...' } } quando sucesso
      // ou { error: '...' } quando erro
      if (response.ok && data.data?.success) {
        setSuccess(true);
      } else {
        // Se houver erro, mostrar a mensagem de erro
        setError(data.error || data.data?.error || 'Erro ao enviar email de redefinição');
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingHotmart size="md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Image 
              src="/logo.png" 
              alt="Clicksehub Logo" 
              width={48} 
              height={48}
              className="object-contain"
            />
            <h1 className="text-4xl font-bold">
              <span className="text-primary">Clickse</span>
              <span style={{ color: '#FF4001' }}>hub</span>
            </h1>
          </div>
          <h2 className="text-2xl font-semibold text-text-primary">
            Esqueci minha senha
          </h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Redefinir senha</CardTitle>
            <CardDescription>
              {success 
                ? 'Enviamos um email com instruções para redefinir sua senha'
                : 'Digite seu email para receber instruções de redefinição de senha'}
            </CardDescription>
            {!success && (
              <p className="text-sm text-text-secondary mt-1">
                <strong>Acabou de comprar o Clicksehub?</strong> Use o <strong>mesmo e-mail da compra</strong> aqui para receber um link e <strong>definir sua senha de acesso</strong>. Não é preciso ter senha antiga.
              </p>
            )}
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="text-center p-4 bg-success-bg border border-success rounded-md">
                  <p className="text-sm text-success">
                    Verifique sua caixa de entrada. Se o email estiver cadastrado, você receberá um link para redefinir sua senha.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/painel')}
                >
                  Voltar para o login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  disabled={loading}
                />

                {error && (
                  <div className="text-error text-sm bg-error-bg p-3 rounded-md">
                    {error}
                  </div>
                )}

                <Button
                  variant="outline"
                  type="submit"
                  className="w-full"
                  disabled={!email || loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
                        aria-hidden="true"
                      />
                      Enviando...
                    </span>
                  ) : (
                    'Enviar instruções'
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => router.push('/painel')}
                className="text-sm text-link flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Voltar para o login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

