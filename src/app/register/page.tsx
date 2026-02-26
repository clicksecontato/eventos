'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/lib/auth-service';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  // Validação de senha
  const passwordValidation = {
    minLength: formData.password.length >= 6,
    hasUpperCase: /[A-Z]/.test(formData.password),
    hasLowerCase: /[a-z]/.test(formData.password),
    hasNumber: /\d/.test(formData.password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
  };

  const passwordStrength = Object.values(passwordValidation).filter(Boolean).length;
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validações
    if (!formData.nome || !formData.email || !formData.password) {
      setError('Todos os campos são obrigatórios');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
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
      const result = await authService.register(
        formData.email,
        formData.password,
        formData.nome,
        'user'
      );

      if (result.success) {
        // Notificar admin (fire-and-forget)
        fetch('/api/notificacao-admin/novo-cadastro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: formData.nome, email: formData.email })
        }).catch(() => {});
        router.push('/planos?bemVindo=true');
      } else {
        setError(result.error || 'Erro ao criar conta');
      }
    } catch {
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
    formData.confirmPassword.length > 0 && !passwordsMatch ? 'Senhas não coincidem' : undefined;

  const confirmPasswordHelper =
    formData.confirmPassword.length > 0 && passwordsMatch ? 'Senhas coincidem' : undefined;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-extrabold text-text-primary">
              Criar Conta
            </CardTitle>
            <CardDescription className="mt-2 text-sm text-text-secondary">
              Cadastre-se para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <Input
                  id="nome"
                  name="nome"
                  type="text"
                  required
                  label="Nome completo"
                  placeholder="Digite seu nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
                
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  label="Email"
                  placeholder="Digite seu email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                
                {/* Campo de Senha */}
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    label="Senha"
                    placeholder="Digite sua senha"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                {formData.password && (
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

                {/* Campo de Confirmação de Senha */}
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    label="Confirmar senha"
                    placeholder="Digite novamente a senha"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
              </div>

              {error && (
                <div className="text-error text-sm text-center bg-error-bg border border-border rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Criando conta...' : 'Criar Conta'}
                </Button>
              </div>

              <div className="text-center">
                <p className="text-sm text-text-secondary">
                  Já tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => router.push('/painel')}
                    className="font-semibold text-link cursor-pointer transition-colors"
                  >
                    Faça login
                  </button>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
