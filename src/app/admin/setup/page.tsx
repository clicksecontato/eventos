'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';

export default function AdminSetupPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const criarAdmin = async () => {
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/create-default-admin', {
        method: 'POST'
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`✅ ${data.message}`);
        if (data.credentials) {
          setMessage(`✅ ${data.message}\n\nCredenciais:\nEmail: ${data.credentials.email}\nSenha: ${data.credentials.password}`);
        }
        setTimeout(() => {
          window.location.href = '/painel';
        }, 2000);
      } else {
        setMessage(`❌ Erro: ${data.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ Erro inesperado: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Configuração Inicial</h1>
          <p className="text-text-secondary">Criar usuário administrador</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Criar Usuário Admin</CardTitle>
            <CardDescription>
              Este processo criará um usuário administrador no Firebase Authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-info-bg rounded-md">
              <h3 className="font-medium text-info-text mb-2">Usuário que será criado:</h3>
              <div className="text-sm text-info-text space-y-1">
                <p><strong>Email:</strong> admin@clickse.com</p>
                <p><strong>Senha:</strong> 123456</p>
                <p><strong>Função:</strong> Administrador</p>
              </div>
            </div>

            {message && (
              <div className={`p-4 rounded-md whitespace-pre-line ${
                message.startsWith('✅') ? 'bg-success-bg text-success-text' : 'bg-error-bg text-error-text'
              }`}>
                {message}
              </div>
            )}

            <Button
              onClick={criarAdmin}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Criando...' : 'Criar Usuário Admin'}
            </Button>

            <div className="mt-4 p-4 bg-surface rounded-md">
              <p className="text-sm text-text-primary">
                <strong>Nota:</strong> Se o usuário admin já existir no Firebase, este processo tentará atualizar o role para admin.
                Se você já sabe a senha do usuário admin, pode simplesmente fazer login diretamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

