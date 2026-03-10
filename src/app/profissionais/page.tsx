'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import { AgendamentoBloqueio, AgendamentoDisponibilidade, AgendamentoProfissional } from '@/types';
import { getJson } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';

export default function ProfissionaisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [profissionais, setProfissionais] = React.useState<AgendamentoProfissional[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busca, setBusca] = React.useState('');
  const [filtroStatus, setFiltroStatus] = React.useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [profissionalSelecionadoId, setProfissionalSelecionadoId] = React.useState<string>('');
  const [editandoId, setEditandoId] = React.useState<string | null>(null);

  const [nome, setNome] = React.useState('');
  const [especialidade, setEspecialidade] = React.useState('');
  const [observacoes, setObservacoes] = React.useState('');
  const [ativo, setAtivo] = React.useState(true);
  const [salvandoProfissional, setSalvandoProfissional] = React.useState(false);

  const hoje = new Date();
  const inicioPadrao = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
  const fimPadrao = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  const [periodoInicio, setPeriodoInicio] = React.useState(inicioPadrao);
  const [periodoFim, setPeriodoFim] = React.useState(fimPadrao);
  const [disponibilidades, setDisponibilidades] = React.useState<AgendamentoDisponibilidade[]>([]);
  const [disponibilidadesDia, setDisponibilidadesDia] = React.useState<AgendamentoDisponibilidade[]>([]);
  const [modoVisualizacaoDisponibilidade, setModoVisualizacaoDisponibilidade] = React.useState<'todas' | 'dia' | 'semana'>('todas');
  const [bloqueios, setBloqueios] = React.useState<AgendamentoBloqueio[]>([]);
  const [carregandoAgenda, setCarregandoAgenda] = React.useState(false);

  const [diaSemana, setDiaSemana] = React.useState('1');
  const [horaInicio, setHoraInicio] = React.useState('09:00');
  const [horaFim, setHoraFim] = React.useState('18:00');
  const [editandoDisponibilidadeId, setEditandoDisponibilidadeId] = React.useState<string | null>(null);
  const [bloqueioInicio, setBloqueioInicio] = React.useState('');
  const [bloqueioFim, setBloqueioFim] = React.useState('');
  const [motivoBloqueio, setMotivoBloqueio] = React.useState('');
  const [editandoBloqueioId, setEditandoBloqueioId] = React.useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [itemExclusao, setItemExclusao] = React.useState<{ tipo: 'disponibilidade' | 'bloqueio'; id: string } | null>(null);
  const [showStatusDialog, setShowStatusDialog] = React.useState(false);
  const [profissionalStatusPendente, setProfissionalStatusPendente] = React.useState<AgendamentoProfissional | null>(null);

  const atualizarQueryParams = React.useCallback((updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([chave, valor]) => {
      if (!valor) {
        params.delete(chave);
      } else {
        params.set(chave, valor);
      }
    });
    const query = params.toString();
    router.replace(query ? `/profissionais?${query}` : '/profissionais');
  }, [router, searchParams]);

  const carregarProfissionais = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getJson<AgendamentoProfissional[]>('/api/agendamento/profissionais?incluirInativos=true');
      setProfissionais(data);
      if (!profissionalSelecionadoId && data.length > 0) {
        setProfissionalSelecionadoId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar profissionais');
    } finally {
      setLoading(false);
    }
  }, [profissionalSelecionadoId]);

  const carregarAgenda = React.useCallback(async () => {
    if (!profissionalSelecionadoId || !periodoInicio || !periodoFim) return;
    try {
      setCarregandoAgenda(true);
      const inicio = new Date(`${periodoInicio}T00:00:00`).toISOString();
      const fim = new Date(`${periodoFim}T23:59:59`).toISOString();
      const data = await getJson<{
        disponibilidades: AgendamentoDisponibilidade[];
        disponibilidadesDia: AgendamentoDisponibilidade[];
        bloqueios: AgendamentoBloqueio[];
      }>(`/api/agendamento/disponibilidade?profissionalId=${profissionalSelecionadoId}&inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`);
      setDisponibilidades(data.disponibilidades || data.disponibilidadesDia || []);
      setDisponibilidadesDia(data.disponibilidadesDia || []);
      setBloqueios(data.bloqueios || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao carregar agenda', 'error');
    } finally {
      setCarregandoAgenda(false);
    }
  }, [profissionalSelecionadoId, periodoInicio, periodoFim, showToast]);

  React.useEffect(() => {
    carregarProfissionais();
  }, [carregarProfissionais]);

  React.useEffect(() => {
    carregarAgenda();
  }, [carregarAgenda]);

  React.useEffect(() => {
    const viewParam = searchParams.get('viewDisponibilidade');
    const profissionalIdParam = searchParams.get('profissionalId');
    const periodoInicioParam = searchParams.get('periodoInicio');
    const periodoFimParam = searchParams.get('periodoFim');
    const edicaoIdParam = searchParams.get('edicaoId');
    const buscaParam = searchParams.get('busca') || '';
    const statusParam = searchParams.get('status');
    const modo = viewParam === 'dia' || viewParam === 'semana' ? viewParam : 'todas';
    const statusNormalizado = statusParam === 'ativos' || statusParam === 'inativos' ? statusParam : 'todos';
    setModoVisualizacaoDisponibilidade((atual) => (atual === modo ? atual : modo));
    setBusca((atual) => (atual === buscaParam ? atual : buscaParam));
    setFiltroStatus((atual) => (atual === statusNormalizado ? atual : statusNormalizado));
    if (profissionalIdParam) {
      setProfissionalSelecionadoId((atual) => (atual === profissionalIdParam ? atual : profissionalIdParam));
    }
    if (periodoInicioParam) {
      setPeriodoInicio((atual) => (atual === periodoInicioParam ? atual : periodoInicioParam));
    }
    if (periodoFimParam) {
      setPeriodoFim((atual) => (atual === periodoFimParam ? atual : periodoFimParam));
    }
    if (edicaoIdParam) {
      const profissional = profissionais.find((p) => p.id === edicaoIdParam);
      if (profissional) {
        preencherFormularioParaEdicao(profissional);
      }
    } else if (editandoId) {
      limparFormulario();
    }
  }, [searchParams, profissionais, editandoId]);

  React.useEffect(() => {
    if (!profissionalSelecionadoId) return;
    atualizarQueryParams({ profissionalId: profissionalSelecionadoId });
  }, [profissionalSelecionadoId, atualizarQueryParams]);

  React.useEffect(() => {
    atualizarQueryParams({ busca: busca.trim() ? busca : undefined });
  }, [busca, atualizarQueryParams]);

  React.useEffect(() => {
    atualizarQueryParams({ status: filtroStatus === 'todos' ? undefined : filtroStatus });
  }, [filtroStatus, atualizarQueryParams]);

  const profissionaisFiltrados = React.useMemo(() => {
    return profissionais.filter((p) => {
      const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (p.especialidade || '').toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === 'todos' ||
        (filtroStatus === 'ativos' && p.ativo) ||
        (filtroStatus === 'inativos' && !p.ativo);
      return matchBusca && matchStatus;
    });
  }, [profissionais, busca, filtroStatus]);

  const limparFormulario = () => {
    setEditandoId(null);
    setNome('');
    setEspecialidade('');
    setObservacoes('');
    setAtivo(true);
  };

  const preencherFormularioParaEdicao = (profissional: AgendamentoProfissional) => {
    setEditandoId(profissional.id);
    setNome(profissional.nome);
    setEspecialidade(profissional.especialidade || '');
    setObservacoes(profissional.observacoes || '');
    setAtivo(profissional.ativo);
  };

  const salvarProfissional = async () => {
    if (!nome.trim()) {
      showToast('Nome do profissional é obrigatório', 'error');
      return;
    }
    try {
      setSalvandoProfissional(true);
      if (editandoId) {
        await getJson('/api/agendamento/profissionais', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editandoId,
            nome: nome.trim(),
            especialidade: especialidade || undefined,
            observacoes: observacoes || undefined,
            ativo
          })
        });
        showToast('Profissional atualizado com sucesso', 'success');
      } else {
        await getJson('/api/agendamento/profissionais', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: nome.trim(),
            especialidade: especialidade || undefined,
            observacoes: observacoes || undefined,
            ativo
          })
        });
        showToast('Profissional cadastrado com sucesso', 'success');
      }
      limparFormulario();
      await carregarProfissionais();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar profissional', 'error');
    } finally {
      setSalvandoProfissional(false);
    }
  };

  const alternarStatus = async (profissional: AgendamentoProfissional) => {
    try {
      await getJson('/api/agendamento/profissionais', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: profissional.id,
          ativo: !profissional.ativo
        })
      });
      showToast(`Profissional ${!profissional.ativo ? 'ativado' : 'inativado'} com sucesso`, 'success');
      await carregarProfissionais();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao atualizar status', 'error');
    }
  };

  const adicionarDisponibilidade = async () => {
    if (!profissionalSelecionadoId) return;
    try {
      await getJson('/api/agendamento/disponibilidade', {
        method: editandoDisponibilidadeId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'disponibilidade',
          id: editandoDisponibilidadeId || undefined,
          profissionalId: profissionalSelecionadoId,
          diaSemana: Number(diaSemana),
          horaInicio,
          horaFim,
          ativo: true
        })
      });
      showToast(editandoDisponibilidadeId ? 'Disponibilidade atualizada com sucesso' : 'Disponibilidade criada com sucesso', 'success');
      setEditandoDisponibilidadeId(null);
      setDiaSemana('1');
      setHoraInicio('09:00');
      setHoraFim('18:00');
      await carregarAgenda();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar disponibilidade', 'error');
    }
  };

  const adicionarBloqueio = async () => {
    if (!profissionalSelecionadoId || !bloqueioInicio || !bloqueioFim) {
      showToast('Preencha início e fim do bloqueio', 'error');
      return;
    }
    try {
      await getJson('/api/agendamento/disponibilidade', {
        method: editandoBloqueioId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'bloqueio',
          id: editandoBloqueioId || undefined,
          profissionalId: profissionalSelecionadoId,
          inicioTs: new Date(bloqueioInicio).toISOString(),
          fimTs: new Date(bloqueioFim).toISOString(),
          motivo: motivoBloqueio || undefined
        })
      });
      showToast(editandoBloqueioId ? 'Bloqueio atualizado com sucesso' : 'Bloqueio criado com sucesso', 'success');
      setEditandoBloqueioId(null);
      setBloqueioInicio('');
      setBloqueioFim('');
      setMotivoBloqueio('');
      await carregarAgenda();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar bloqueio', 'error');
    }
  };

  const removerDisponibilidade = async (id: string) => {
    try {
      await getJson(`/api/agendamento/disponibilidade?tipo=disponibilidade&id=${id}`, {
        method: 'DELETE'
      });
      showToast('Disponibilidade removida com sucesso', 'success');
      await carregarAgenda();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao remover disponibilidade', 'error');
    }
  };

  const removerBloqueio = async (id: string) => {
    try {
      await getJson(`/api/agendamento/disponibilidade?tipo=bloqueio&id=${id}`, {
        method: 'DELETE'
      });
      showToast('Bloqueio removido com sucesso', 'success');
      await carregarAgenda();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao remover bloqueio', 'error');
    }
  };

  const confirmarExclusao = async () => {
    if (!itemExclusao) return;

    if (itemExclusao.tipo === 'disponibilidade') {
      await removerDisponibilidade(itemExclusao.id);
    } else {
      await removerBloqueio(itemExclusao.id);
    }

    setShowDeleteDialog(false);
    setItemExclusao(null);
  };

  const confirmarAlteracaoStatus = async () => {
    if (!profissionalStatusPendente) return;
    await alternarStatus(profissionalStatusPendente);
    setProfissionalStatusPendente(null);
    setShowStatusDialog(false);
  };

  const formatarDatetimeLocal = (valor: Date | string): string => {
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return '';
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    const hora = String(data.getHours()).padStart(2, '0');
    const minuto = String(data.getMinutes()).padStart(2, '0');
    return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
  };

  const diasSemanaNoPeriodo = React.useMemo(() => {
    const inicio = new Date(`${periodoInicio}T00:00:00`);
    const fim = new Date(`${periodoFim}T00:00:00`);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || inicio > fim) {
      return new Set<number>();
    }

    const dias = new Set<number>();
    const cursor = new Date(inicio);
    while (cursor <= fim) {
      dias.add(cursor.getDay());
      cursor.setDate(cursor.getDate() + 1);
    }
    return dias;
  }, [periodoInicio, periodoFim]);

  const disponibilidadesSemana = React.useMemo(
    () => disponibilidades.filter((item) => diasSemanaNoPeriodo.has(item.diaSemana)),
    [disponibilidades, diasSemanaNoPeriodo]
  );

  const disponibilidadesParaExibir = React.useMemo(() => {
    if (modoVisualizacaoDisponibilidade === 'dia') return disponibilidadesDia;
    if (modoVisualizacaoDisponibilidade === 'semana') return disponibilidadesSemana;
    return disponibilidades;
  }, [modoVisualizacaoDisponibilidade, disponibilidades, disponibilidadesDia, disponibilidadesSemana]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <UserGroupIcon className="h-6 w-6 text-text-primary" />
          <h1 className="text-2xl font-bold text-text-primary">Profissionais</h1>
        </div>

        {loading && (
          <Card>
            <CardContent className="py-8 text-text-secondary">
              Carregando profissionais...
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="py-8 text-error">
              Erro ao carregar profissionais: {error}
            </CardContent>
          </Card>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <Input
                    label="Buscar profissional"
                    placeholder="Nome ou especialidade..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <Select
                    label="Status"
                    value={filtroStatus}
                    onValueChange={(value) => setFiltroStatus(value as 'todos' | 'ativos' | 'inativos')}
                    options={[
                      { value: 'todos', label: 'Todos' },
                      { value: 'ativos', label: 'Ativos' },
                      { value: 'inativos', label: 'Inativos' }
                    ]}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-end">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      limparFormulario();
                      atualizarQueryParams({ edicaoId: undefined });
                    }}
                  >
                    Novo cadastro
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Profissionais ({profissionaisFiltrados.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profissionaisFiltrados.length === 0 ? (
                    <p className="text-text-secondary">Nenhum profissional encontrado.</p>
                  ) : (
                    profissionaisFiltrados.map((profissional) => (
                      <div
                        key={profissional.id}
                        className="border rounded-lg p-3 space-y-2 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-text-primary">{profissional.nome}</p>
                            {profissional.especialidade && (
                              <p className="text-sm text-text-secondary">{profissional.especialidade}</p>
                            )}
                          </div>
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded-full ${
                              profissional.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {profissional.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              preencherFormularioParaEdicao(profissional);
                              atualizarQueryParams({ edicaoId: profissional.id });
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setProfissionalSelecionadoId(profissional.id);
                              atualizarQueryParams({ profissionalId: profissional.id });
                            }}
                          >
                            Ver agenda
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setProfissionalStatusPendente(profissional);
                              setShowStatusDialog(true);
                            }}
                          >
                            {profissional.ativo ? 'Inativar' : 'Ativar'}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{editandoId ? 'Editar profissional' : 'Cadastrar profissional'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
                  <Input label="Especialidade" value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} />
                  <Input label="Observações" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
                  <Select
                    label="Status"
                    value={ativo ? 'ativo' : 'inativo'}
                    onValueChange={(value) => setAtivo(value === 'ativo')}
                    options={[
                      { value: 'ativo', label: 'Ativo' },
                      { value: 'inativo', label: 'Inativo' }
                    ]}
                  />
                  <div className="flex gap-2">
                    <Button onClick={salvarProfissional} disabled={salvandoProfissional}>
                      {salvandoProfissional ? 'Salvando...' : editandoId ? 'Salvar edição' : 'Cadastrar'}
                    </Button>
                    {editandoId && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          limparFormulario();
                          atualizarQueryParams({ edicaoId: undefined });
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Disponibilidade e bloqueios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <Select
                    label="Profissional"
                    value={profissionalSelecionadoId}
                    onValueChange={(value) => {
                      setProfissionalSelecionadoId(value);
                      atualizarQueryParams({ profissionalId: value });
                    }}
                    options={(profissionais || []).map((p) => ({ value: p.id, label: p.nome }))}
                  />
                  <Input
                    label="Início do período"
                    type="date"
                    value={periodoInicio}
                    onChange={(e) => {
                      setPeriodoInicio(e.target.value);
                      atualizarQueryParams({ periodoInicio: e.target.value || undefined });
                    }}
                  />
                  <Input
                    label="Fim do período"
                    type="date"
                    value={periodoFim}
                    onChange={(e) => {
                      setPeriodoFim(e.target.value);
                      atualizarQueryParams({ periodoFim: e.target.value || undefined });
                    }}
                  />
                  <div className="flex items-end">
                    <Button variant="outline" onClick={carregarAgenda} className="w-full">Atualizar agenda</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-3 border rounded-lg p-3">
                    <h3 className="font-semibold text-text-primary">Nova disponibilidade</h3>
                    <Select
                      label="Dia da semana"
                      value={diaSemana}
                      onValueChange={setDiaSemana}
                      options={[
                        { value: '0', label: 'Domingo' },
                        { value: '1', label: 'Segunda' },
                        { value: '2', label: 'Terça' },
                        { value: '3', label: 'Quarta' },
                        { value: '4', label: 'Quinta' },
                        { value: '5', label: 'Sexta' },
                        { value: '6', label: 'Sábado' }
                      ]}
                    />
                    <Input label="Hora início" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                    <Input label="Hora fim" type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
                    <div className="flex gap-2">
                      <Button onClick={adicionarDisponibilidade}>
                        {editandoDisponibilidadeId ? 'Salvar disponibilidade' : 'Adicionar disponibilidade'}
                      </Button>
                      {editandoDisponibilidadeId && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditandoDisponibilidadeId(null);
                            setDiaSemana('1');
                            setHoraInicio('09:00');
                            setHoraFim('18:00');
                          }}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 border rounded-lg p-3">
                    <h3 className="font-semibold text-text-primary">Novo bloqueio</h3>
                    <Input label="Início" type="datetime-local" value={bloqueioInicio} onChange={(e) => setBloqueioInicio(e.target.value)} />
                    <Input label="Fim" type="datetime-local" value={bloqueioFim} onChange={(e) => setBloqueioFim(e.target.value)} />
                    <Input label="Motivo" value={motivoBloqueio} onChange={(e) => setMotivoBloqueio(e.target.value)} />
                    <div className="flex gap-2">
                      <Button onClick={adicionarBloqueio}>
                        {editandoBloqueioId ? 'Salvar bloqueio' : 'Adicionar bloqueio'}
                      </Button>
                      {editandoBloqueioId && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditandoBloqueioId(null);
                            setBloqueioInicio('');
                            setBloqueioFim('');
                            setMotivoBloqueio('');
                          }}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {carregandoAgenda ? (
                  <p className="text-text-secondary">Carregando agenda...</p>
                ) : (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div>
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <h3 className="font-semibold">Disponibilidades cadastradas</h3>
                        <div className="w-56">
                          <Select
                            label="Visualização"
                            value={modoVisualizacaoDisponibilidade}
                            onValueChange={(value) => {
                              const modo = value as 'todas' | 'dia' | 'semana';
                              setModoVisualizacaoDisponibilidade(modo);
                              atualizarQueryParams({
                                viewDisponibilidade: modo === 'todas' ? undefined : modo
                              });
                            }}
                            options={[
                              { value: 'todas', label: 'Todas' },
                              { value: 'dia', label: 'Dia selecionado' },
                              { value: 'semana', label: 'Semana selecionada' }
                            ]}
                          />
                        </div>
                      </div>
                      {disponibilidadesParaExibir.length === 0 ? (
                        <p className="text-text-secondary text-sm">
                          {modoVisualizacaoDisponibilidade === 'dia'
                            ? 'Nenhuma disponibilidade para o dia selecionado.'
                            : modoVisualizacaoDisponibilidade === 'semana'
                              ? 'Nenhuma disponibilidade para a semana selecionada.'
                              : 'Nenhuma disponibilidade cadastrada.'}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {disponibilidadesParaExibir.map((item) => (
                            <div key={item.id} className="border rounded-lg px-3 py-2 text-sm space-y-2">
                              <div>Dia {item.diaSemana} - {item.horaInicio} até {item.horaFim}</div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditandoDisponibilidadeId(item.id);
                                    setDiaSemana(String(item.diaSemana));
                                    setHoraInicio(item.horaInicio);
                                    setHoraFim(item.horaFim);
                                  }}
                                >
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setItemExclusao({ tipo: 'disponibilidade', id: item.id });
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  Excluir
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Disponibilidades do dia selecionado</h3>
                      {disponibilidadesDia.length === 0 ? (
                        <p className="text-text-secondary text-sm">Nenhuma disponibilidade para o dia selecionado.</p>
                      ) : (
                        <div className="space-y-2">
                          {disponibilidadesDia.map((item) => (
                            <div key={item.id} className="border rounded-lg px-3 py-2 text-sm">
                              Dia {item.diaSemana} - {item.horaInicio} até {item.horaFim}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Bloqueios no período</h3>
                      {bloqueios.length === 0 ? (
                        <p className="text-text-secondary text-sm">Nenhum bloqueio no período.</p>
                      ) : (
                        <div className="space-y-2">
                          {bloqueios.map((item) => (
                            <div key={item.id} className="border rounded-lg px-3 py-2 text-sm space-y-2">
                              <div>
                                {new Date(item.inicioTs).toLocaleString('pt-BR')} - {new Date(item.fimTs).toLocaleString('pt-BR')}
                                {item.motivo ? ` (${item.motivo})` : ''}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditandoBloqueioId(item.id);
                                    setBloqueioInicio(formatarDatetimeLocal(item.inicioTs));
                                    setBloqueioFim(formatarDatetimeLocal(item.fimTs));
                                    setMotivoBloqueio(item.motivo || '');
                                  }}
                                >
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setItemExclusao({ tipo: 'bloqueio', id: item.id });
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  Excluir
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Confirmar exclusão"
        description={
          itemExclusao?.tipo === 'disponibilidade'
            ? 'Deseja realmente excluir esta disponibilidade?'
            : 'Deseja realmente excluir este bloqueio?'
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={confirmarExclusao}
      />
      <ConfirmationDialog
        open={showStatusDialog}
        onOpenChange={setShowStatusDialog}
        title={profissionalStatusPendente?.ativo ? 'Confirmar inativação' : 'Confirmar ativação'}
        description={
          profissionalStatusPendente?.ativo
            ? 'Deseja realmente inativar este profissional?'
            : 'Deseja realmente ativar este profissional?'
        }
        confirmText="Confirmar"
        cancelText="Cancelar"
        variant="default"
        onConfirm={confirmarAlteracaoStatus}
      />
    </Layout>
  );
}

