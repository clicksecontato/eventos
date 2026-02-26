'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signIn } from 'next-auth/react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import LoadingHotmart from '@/components/LoadingHotmart';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password: senha,
        redirect: false
      });
      
      if (result?.error) {
        setError('Email ou senha inválidos');
        setLoading(false);
      } else if (result?.ok) {
        router.push('/painel');
        router.refresh();
      } else {
        setError('Erro inesperado. Tente novamente.');
        setLoading(false);
      }
    } catch (error) {
      setError('Erro inesperado. Tente novamente.');
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
          <div className="flex items-end justify-center gap-3 mb-2">
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
            Gestão para Empresas de Cabine de Fotos
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Faça login para acessar o sistema
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>
              Digite suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Sua senha"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-text-muted" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-text-muted" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-error text-sm bg-error-bg p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button
                variant="outline"
                type="submit"
                className="w-full"
                disabled={!email || !senha || loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span
                      className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
                      aria-hidden="true"
                    />
                    Entrando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <button
                type="button"
                onClick={() => router.push('/esqueci-senha')}
                className="text-sm text-link cursor-pointer block w-full transition-colors"
              >
                Esqueci minha senha
              </button>
              <p className="text-sm text-text-secondary">
                <strong>Primeira vez aqui?</strong> Defina sua senha em{' '}
                <button
                  type="button"
                  onClick={() => router.push('/esqueci-senha')}
                  className="font-medium text-link cursor-pointer transition-colors"
                >
                  Esqueci minha senha
                </button>
                {' '}com o e-mail da sua compra.
              </p>
              <p className="text-sm text-text-secondary">
                Não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/register')}
                  className="font-medium text-link cursor-pointer transition-colors"
                >
                  Criar conta
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
