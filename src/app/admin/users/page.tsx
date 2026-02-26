'use client';

/*

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Layout from '@/components/Layout';
import { authService } from '@/lib/auth-service';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function AdminUsersPage() {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validação de senha
  const passwordValidation = {
    minLength: formData.password.length >= 6,
    hasUpperCase: /[A-Z]/.test(formData.password),
    hasLowerCase: /[a-z]/.test(formData.password),
    hasNumber: /\d/.test(formData.password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
  };

  const passwordStrength = Object.values(passwordValidation).filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const result = await authService.register(
        formData.email,
        formData.password,
        formData.nome,
        formData.role
      );

      if (result.success) {
        setMessage('✅ Usuário criado com sucesso!');
        setFormData({
          nome: '',
          email: '',
          password: '',
          role: 'user'
        });
      } else {
        setMessage(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      setMessage('❌ Erro inesperado ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultUsers = async () => {
    setLoading(true);
    setMessage('');

    try {
      // Criar usuário admin
      const adminResult = await authService.register(
        'admin@clickse.com',
        'admin123',
        'Administrador',
        'admin'
      );

      // Criar usuário comum
      const userResult = await authService.register(
        'user@clickse.com',
        'user123',
        'Usuário Teste',
        'user'
      );

      if (adminResult.success && userResult.success) {
        setMessage('✅ Usuários padrão criados com sucesso!');
      } else {
        setMessage('⚠️ Alguns usuários podem já existir ou houve erro na criação');
      }
    } catch (error) {
      setMessage('❌ Erro ao criar usuários padrão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Administração de Usuários</h1>
          <p className="text-gray-600">Gerencie usuários do sistema</p>
        </div>

        {message && (
          <div className={`p-4 rounded-md ${
            message.startsWith('✅') ? 'bg-green-100 text-green-700' : 
            message.startsWith('⚠️') ? 'bg-yellow-100 text-yellow-700' : 
            'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Criar Novo Usuário * /}
          <Card>
            <CardHeader>
              <CardTitle>Criar Novo Usuário</CardTitle>
              <CardDescription>
                Cadastre um novo usuário no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Nome Completo"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
                
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                
                {/* Campo de Senha * /}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Validação de Senha * /}
                {formData.password && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-gray-700 mb-2">Critérios da senha:</p>
                    <div className="space-y-1">
                      <div className={`flex items-center text-xs ${passwordValidation.minLength ? 'text-green-600' : 'text-red-600'}`}>
                        <span className="mr-2">{passwordValidation.minLength ? '✓' : '✗'}</span>
                        Mínimo 6 caracteres
                      </div>
                      <div className={`flex items-center text-xs ${passwordValidation.hasUpperCase ? 'text-green-600' : 'text-red-600'}`}>
                        <span className="mr-2">{passwordValidation.hasUpperCase ? '✓' : '✗'}</span>
                        Uma letra maiúscula
                      </div>
                      <div className={`flex items-center text-xs ${passwordValidation.hasLowerCase ? 'text-green-600' : 'text-red-600'}`}>
                        <span className="mr-2">{passwordValidation.hasLowerCase ? '✓' : '✗'}</span>
                        Uma letra minúscula
                      </div>
                      <div className={`flex items-center text-xs ${passwordValidation.hasNumber ? 'text-green-600' : 'text-red-600'}`}>
                        <span className="mr-2">{passwordValidation.hasNumber ? '✓' : '✗'}</span>
                        Um número
                      </div>
                      <div className={`flex items-center text-xs ${passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-red-600'}`}>
                        <span className="mr-2">{passwordValidation.hasSpecialChar ? '✓' : '✗'}</span>
                        Um caractere especial
                      </div>
                    </div>
                    
                    {/* Indicador de força da senha * /}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Força da senha:</span>
                        <span className={`font-medium ${
                          passwordStrength < 2 ? 'text-red-600' :
                          passwordStrength < 4 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {passwordStrength < 2 ? 'Fraca' :
                           passwordStrength < 4 ? 'Média' :
                           'Forte'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            passwordStrength < 2 ? 'bg-red-500' :
                            passwordStrength < 4 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Função
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="user">Usuário</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Usuários Padrão * /}
          <Card>
            <CardHeader>
              <CardTitle>Usuários Padrão</CardTitle>
              <CardDescription>
                Crie usuários padrão para desenvolvimento e teste
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-md">
                  <h3 className="font-medium text-blue-800 mb-2">Usuários que serão criados:</h3>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><strong>Admin:</strong> admin@clickse.com / admin123</p>
                    <p><strong>Usuário:</strong> user@clickse.com / user123</p>
                  </div>
                </div>

                <Button
                  onClick={createDefaultUsers}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading ? 'Criando...' : 'Criar Usuários Padrão'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instruções * /}
        <Card>
          <CardHeader>
            <CardTitle>Como Funciona o Sistema de Autenticação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h4 className="font-medium mb-2">🔐 Firebase Authentication:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Usuários são criados no Firebase Authentication</li>
                  <li>Dados adicionais são salvos na collection <code>controle_users</code></li>
                  <li>Autenticação real com email e senha</li>
                  <li>Sistema de roles (admin/user)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">🔄 Fallback para Desenvolvimento:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Se Firebase não estiver configurado, usa usuários mockados</li>
                  <li>Credenciais de teste: admin@clickse.com / user@clickse.com</li>
                  <li>Qualquer senha com 3+ caracteres funciona</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">📝 Para Usar em Produção:</h4>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Configure as variáveis do Firebase no <code>.env.local</code></li>
                  <li>Crie usuários através desta página ou da página de registro</li>
                  <li>Usuários poderão fazer login com email e senha reais</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

*/

export default function AdminUsersPage() {
  return null;
}
