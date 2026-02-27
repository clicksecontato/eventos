'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Plano, StatusAssinatura } from '@/types/funcionalidades';
import { User } from '@/types';

type StatusOption = StatusAssinatura | '';

interface UserLinha extends User {
  planoSelecionado?: string;
  statusSelecionado?: StatusOption;
}

const statusDisponiveis: Array<{ value: StatusAssinatura; label: string }> = [
  { value: 'active', label: 'Ativa' },
  { value: 'trial', label: 'Trial' },
  { value: 'suspended', label: 'Suspensa' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'expired', label: 'Expirada' }
];

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [criandoUsuario, setCriandoUsuario] = useState(false);
  const [users, setUsers] = useState<UserLinha[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [novoUsuario, setNovoUsuario] = useState({
    nome: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user'
  });
  const [ultimoUsuarioCriado, setUltimoUsuarioCriado] = useState<{
    nome: string;
    email: string;
    planoNome: string | null;
    planoCodigo: string | null;
  } | null>(null);
  const [salvandoPlano, setSalvandoPlano] = useState<Record<string, boolean>>({});
  const [salvandoStatus, setSalvandoStatus] = useState<Record<string, boolean>>({});
  const [sincronizando, setSincronizando] = useState<Record<string, boolean>>({});

  const usuariosNaoAdmin = useMemo(
    () => users.filter(user => user.role !== 'admin'),
    [users]
  );

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [usersRes, planosRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/planos?ativos=false')
      ]);

      const usersJson = await usersRes.json();
      const planosJson = await planosRes.json();

      if (!usersRes.ok) {
        throw new Error(usersJson.error || 'Erro ao carregar usuários');
      }

      if (!planosRes.ok) {
        throw new Error(planosJson.error || 'Erro ao carregar planos');
      }

      const usersData: User[] = usersJson?.data?.users || [];
      const planosData: Plano[] = planosJson?.data?.planos || [];

      setPlanos(planosData);
      setUsers(
        usersData.map(user => ({
          ...user,
          planoSelecionado: user.assinatura?.planoId || '',
          statusSelecionado: (() => {
            if (user.assinatura?.status === 'ATIVA') return 'active';
            if (user.assinatura?.status === 'TRIAL') return 'trial';
            if (user.assinatura?.status === 'SUSPENSA') return 'suspended';
            if (user.assinatura?.status === 'CANCELADA') return 'cancelled';
            if (user.assinatura?.status === 'EXPIRADA') return 'expired';
            return '';
          })()
        }))
      );
    } catch (error: any) {
      showToast(error?.message || 'Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const atualizarCampoUsuario = (userId: string, campo: 'planoSelecionado' | 'statusSelecionado', valor: string) => {
    setUsers(prev =>
      prev.map(user =>
        user.id === userId
          ? { ...user, [campo]: valor }
          : user
      )
    );
  };

  const aplicarPlano = async (user: UserLinha) => {
    if (!user.planoSelecionado) {
      showToast('Selecione um plano antes de aplicar', 'warning');
      return;
    }

    setSalvandoPlano(prev => ({ ...prev, [user.id]: true }));
    try {
      const res = await fetch(`/api/admin/users/${user.id}/plano`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planoId: user.planoSelecionado,
          status: (user.statusSelecionado || 'active') as StatusAssinatura
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Erro ao aplicar plano');
      }

      showToast('Plano atualizado com sucesso', 'success');
      await carregarDados();
    } catch (error: any) {
      showToast(error?.message || 'Erro ao aplicar plano', 'error');
    } finally {
      setSalvandoPlano(prev => ({ ...prev, [user.id]: false }));
    }
  };

  const aplicarStatus = async (user: UserLinha) => {
    if (!user.statusSelecionado) {
      showToast('Selecione um status antes de atualizar', 'warning');
      return;
    }

    setSalvandoStatus(prev => ({ ...prev, [user.id]: true }));
    try {
      const res = await fetch(`/api/admin/users/${user.id}/assinatura-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: user.statusSelecionado,
          motivo: 'Atualização manual pelo admin'
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Erro ao atualizar status');
      }

      showToast('Status da assinatura atualizado com sucesso', 'success');
      await carregarDados();
    } catch (error: any) {
      showToast(error?.message || 'Erro ao atualizar status', 'error');
    } finally {
      setSalvandoStatus(prev => ({ ...prev, [user.id]: false }));
    }
  };

  const sincronizarUsuario = async (userId: string) => {
    setSincronizando(prev => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch(`/api/users/${userId}/assinatura`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sincronizar: true })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Erro ao sincronizar usuário');
      }
      showToast('Sincronização concluída', 'success');
      await carregarDados();
    } catch (error: any) {
      showToast(error?.message || 'Erro ao sincronizar usuário', 'error');
    } finally {
      setSincronizando(prev => ({ ...prev, [userId]: false }));
    }
  };

  const criarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!novoUsuario.nome || !novoUsuario.email || !novoUsuario.password) {
      showToast('Preencha nome, email e senha para criar o usuário', 'warning');
      return;
    }

    setCriandoUsuario(true);
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoUsuario)
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao criar usuário');
      }

      const planoCodigo = json?.planoAtribuido?.planoCodigo;
      const planoNome = json?.planoAtribuido?.planoNome;
      const mensagemSucesso = planoCodigo || planoNome
        ? `Usuário criado com sucesso (${planoNome || 'Plano'}${planoCodigo ? ` - ${planoCodigo}` : ''})`
        : 'Usuário criado com sucesso';

      showToast(mensagemSucesso, 'success');
      setUltimoUsuarioCriado({
        nome: json?.user?.nome || novoUsuario.nome,
        email: json?.user?.email || novoUsuario.email,
        planoNome: planoNome || null,
        planoCodigo: planoCodigo || null
      });
      setNovoUsuario({
        nome: '',
        email: '',
        password: '',
        role: 'user'
      });
      await carregarDados();
    } catch (error: any) {
      showToast(error?.message || 'Erro ao criar usuário', 'error');
    } finally {
      setCriandoUsuario(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Administração de Usuários</h1>
          <p className="text-text-secondary">
            Defina plano e status da assinatura diretamente pelo CRM.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Novo Usuário</CardTitle>
            <CardDescription>
              Criação de contas é feita exclusivamente por este painel administrativo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={criarUsuario} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Nome"
                value={novoUsuario.nome}
                onChange={(e) => setNovoUsuario(prev => ({ ...prev, nome: e.target.value }))}
                required
              />
              <Input
                label="Email"
                type="email"
                value={novoUsuario.email}
                onChange={(e) => setNovoUsuario(prev => ({ ...prev, email: e.target.value }))}
                required
              />
              <Input
                label="Senha"
                type="password"
                value={novoUsuario.password}
                onChange={(e) => setNovoUsuario(prev => ({ ...prev, password: e.target.value }))}
                required
              />
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Perfil</label>
                <select
                  value={novoUsuario.role}
                  onChange={(e) => setNovoUsuario(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                  className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={criandoUsuario}>
                  {criandoUsuario ? 'Criando usuário...' : 'Criar usuário'}
                </Button>
              </div>
              {ultimoUsuarioCriado && (
                <div className="md:col-span-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700">
                  <span className="font-medium">Último usuário criado:</span>{' '}
                  {ultimoUsuarioCriado.nome} ({ultimoUsuarioCriado.email}){' '}
                  {ultimoUsuarioCriado.planoCodigo || ultimoUsuarioCriado.planoNome
                    ? `• Plano atribuído: ${ultimoUsuarioCriado.planoNome || 'Plano'}${ultimoUsuarioCriado.planoCodigo ? ` (${ultimoUsuarioCriado.planoCodigo})` : ''}`
                    : ''}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
            <CardDescription>
              {loading ? 'Carregando...' : `${usuariosNaoAdmin.length} usuário(s) gerenciável(is)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-text-secondary">Carregando usuários...</div>
            ) : usuariosNaoAdmin.length === 0 ? (
              <div className="py-8 text-center text-text-secondary">Nenhum usuário encontrado.</div>
            ) : (
              <div className="space-y-4">
                {usuariosNaoAdmin.map(user => (
                  <div
                    key={user.id}
                    className="border border-border rounded-lg p-4 bg-surface/50 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="font-semibold text-text-primary">{user.nome}</p>
                        <p className="text-sm text-text-secondary">{user.email}</p>
                        <p className="text-xs text-text-muted">
                          Plano atual: {user.assinatura?.planoNome || 'Sem plano'} • Status: {user.assinatura?.status || 'Sem assinatura'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => sincronizarUsuario(user.id)}
                        disabled={!!sincronizando[user.id]}
                      >
                        {sincronizando[user.id] ? 'Sincronizando...' : 'Sincronizar cache'}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-primary">Plano</label>
                        <div className="flex gap-2">
                          <select
                            value={user.planoSelecionado || ''}
                            onChange={e => atualizarCampoUsuario(user.id, 'planoSelecionado', e.target.value)}
                            className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                          >
                            <option value="">Selecione um plano</option>
                            {planos.map(plano => (
                              <option key={plano.id} value={plano.id}>
                                {plano.nome} ({plano.codigoHotmart})
                              </option>
                            ))}
                          </select>
                          <Button
                            onClick={() => aplicarPlano(user)}
                            disabled={!!salvandoPlano[user.id]}
                          >
                            {salvandoPlano[user.id] ? 'Aplicando...' : 'Aplicar'}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-primary">Status da assinatura</label>
                        <div className="flex gap-2">
                          <select
                            value={user.statusSelecionado || ''}
                            onChange={e => atualizarCampoUsuario(user.id, 'statusSelecionado', e.target.value)}
                            className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                          >
                            <option value="">Selecione um status</option>
                            {statusDisponiveis.map(status => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                          <Button
                            variant="outline"
                            onClick={() => aplicarStatus(user)}
                            disabled={!!salvandoStatus[user.id]}
                          >
                            {salvandoStatus[user.id] ? 'Salvando...' : 'Salvar'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
