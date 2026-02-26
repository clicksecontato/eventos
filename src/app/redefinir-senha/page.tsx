'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import LoadingHotmart from '@/components/LoadingHotmart';

function RedefinirSenhaForm() {
  const [code, setCode] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Verificar se é token curto ou código do Firebase
    const token = searchParams.get('token');
    const oobCode = searchParams.get('oobCode');
    const mode = searchParams.get('mode');

    if (token) {
      // Token curto personalizado
      resolveToken(token);
    } else if (oobCode && mode === 'resetPassword') {
      // Código direto do Firebase
      setCode(oobCode);
      verifyCode(oobCode);
    } else {
      setError('Link de redefinição inválido ou expirado');
      setVerifying(false);
    }
  }, [searchParams]);

  const resolveToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/resolve-reset-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const responseData = await response.json();
      const data = responseData.data ?? responseData;

      if (response.ok && data.success) {
        setCode(data.code);
        setEmail(data.email);
        verifyCode(data.code);
      } else {
        setError(data.error || responseData.error || 'Token inválido ou expirado');
        setVerifying(false);
      }
    } catch (err) {
      setError('Erro ao verificar token. Tente novamente.');
      setVerifying(false);
    }
  };

  const verifyCode = async (resetCode: string) => {
    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: resetCode }),
      });

      const responseData = await response.json();
      const data = responseData.data ?? responseData;

      if (response.ok && data.success) {
        setEmail(data.email ?? email);
        setVerifying(false);
      } else {
        setError(data.error || responseData.error || 'Código de redefinição inválido ou expirado');
        setVerifying(false);
      }
    } catch (err) {
      setError('Erro ao verificar código. Tente novamente.');
      setVerifying(false);
    }
  };

  const passwordValidation = {
    minLength: password.length >= 6,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const passwordStrength = Object.values(passwordValidation).filter(Boolean).length;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!password || !confirmPassword) {
      setError('Todos os campos são obrigatórios');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (passwordStrength < 3) {
      setError('A senha deve atender aos critérios mínimos de segurança');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/confirm-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, newPassword: password }),
      });

      const responseData = await response.json();
      const data = responseData.data ?? responseData;

      if (response.ok && data?.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/painel');
        }, 3000);
      } else {
        setError(data?.error || responseData.error || 'Erro ao redefinir senha');
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength < 2) return 'Fraca';
    if (passwordStrength < 4) return 'Média';
    return 'Forte';
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 2) return 'var(--error)';
    if (passwordStrength < 4) return 'var(--warning)';
    return 'var(--success)';
  };

  const confirmPasswordError =
    confirmPassword.length > 0 && !passwordsMatch ? 'Senhas não coincidem' : undefined;

  const confirmPasswordHelper =
    confirmPassword.length > 0 && passwordsMatch ? 'Senhas coincidem' : undefined;

  if (verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <LoadingHotmart size="md" />
        <p className="mt-4 text-text-secondary">Verificando código de redefinição...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-success text-6xl mb-4">✓</div>
                <h2 className="text-2xl font-bold text-text-primary">Senha redefinida com sucesso!</h2>
                <p className="text-text-secondary">
                  Sua senha foi atualizada. Você será redirecionado para o login em instantes...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
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
            Redefinir senha
          </h2>
          {email && (
            <p className="mt-2 text-sm text-text-secondary">
              Redefinindo senha para: {email}
            </p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nova senha</CardTitle>
            <CardDescription>
              Digite sua nova senha
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  label="Nova senha"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua nova senha"
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-text-muted"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Validação de Senha */}
              {password && (
                <div className="border border-border bg-surface rounded-md p-3">
                  <p className="text-sm font-medium text-text-secondary mb-2">Critérios da senha:</p>
                  <div className="space-y-1">
                    <div className={`flex items-center text-xs ${passwordValidation.minLength ? 'text-success' : 'text-error'}`}>
                      <span className="mr-2">{passwordValidation.minLength ? '✓' : '✗'}</span>
                      Mínimo 6 caracteres
                    </div>
                    <div className={`flex items-center text-xs ${passwordValidation.hasUpperCase ? 'text-success' : 'text-error'}`}>
                      <span className="mr-2">{passwordValidation.hasUpperCase ? '✓' : '✗'}</span>
                      Uma letra maiúscula
                    </div>
                    <div className={`flex items-center text-xs ${passwordValidation.hasLowerCase ? 'text-success' : 'text-error'}`}>
                      <span className="mr-2">{passwordValidation.hasLowerCase ? '✓' : '✗'}</span>
                      Uma letra minúscula
                    </div>
                    <div className={`flex items-center text-xs ${passwordValidation.hasNumber ? 'text-success' : 'text-error'}`}>
                      <span className="mr-2">{passwordValidation.hasNumber ? '✓' : '✗'}</span>
                      Um número
                    </div>
                    <div className={`flex items-center text-xs ${passwordValidation.hasSpecialChar ? 'text-success' : 'text-error'}`}>
                      <span className="mr-2">{passwordValidation.hasSpecialChar ? '✓' : '✗'}</span>
                      Um caractere especial
                    </div>
                  </div>
                  
                  {/* Indicador de força da senha */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-text-secondary mb-1">
                      <span>Força da senha:</span>
                      <span className="font-medium" style={{ color: getPasswordStrengthColor() }}>
                        {getPasswordStrengthLabel()}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(passwordStrength / 5) * 100}%`,
                          backgroundColor: getPasswordStrengthColor()
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="relative">
                <Input
                  label="Confirmar nova senha"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite novamente a senha"
                  required
                  disabled={loading}
                  className="pr-10"
                  error={confirmPasswordError}
                  helperText={confirmPasswordHelper}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-text-muted"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
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
                disabled={!password || !confirmPassword || loading || passwordStrength < 3}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span
                      className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
                      aria-hidden="true"
                    />
                    Redefinindo...
                  </span>
                ) : (
                  'Redefinir senha'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <LoadingHotmart size="md" />
        <p className="mt-4 text-text-secondary">Carregando...</p>
      </div>
    }>
      <RedefinirSenhaForm />
    </Suspense>
  );
}

