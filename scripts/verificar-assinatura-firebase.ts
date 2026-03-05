/**
 * Diagnóstico de assinatura no Firebase (controle_users + assinaturas + planos).
 *
 * Uso:
 *   npx tsx scripts/verificar-assinatura-firebase.ts <email>
 *   npx tsx scripts/verificar-assinatura-firebase.ts kontempler@gmail.com clicksecontato@gmail.com
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatDate(value: unknown): string {
  if (!value) return '-';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null) {
    const maybeWithToDate = value as { toDate?: () => Date; seconds?: number };
    if (typeof maybeWithToDate.toDate === 'function') {
      return maybeWithToDate.toDate().toISOString();
    }
    if (typeof maybeWithToDate.seconds === 'number') {
      return new Date(maybeWithToDate.seconds * 1000).toISOString();
    }
  }
  try {
    return new Date(String(value)).toISOString();
  } catch {
    return String(value);
  }
}

async function diagnosticarEmail(email: string): Promise<void> {
  const { AdminUserRepository } = await import('../src/lib/repositories/admin-user-repository');
  const { AdminAssinaturaRepository } = await import('../src/lib/repositories/admin-assinatura-repository');
  const { AdminPlanoRepository } = await import('../src/lib/repositories/admin-plano-repository');

  const userRepo = new AdminUserRepository();
  const assinaturaRepo = new AdminAssinaturaRepository();
  const planoRepo = new AdminPlanoRepository();

  console.log(`\n================ DIAGNOSTICO: ${email} ================`);

  const user = await userRepo.findByEmail(email);
  if (!user) {
    console.log('Usuario nao encontrado em controle_users.');
    return;
  }

  console.log('Usuario:');
  console.log(`- id: ${user.id}`);
  console.log(`- role: ${user.role}`);
  console.log(`- ativo: ${String(user.ativo)}`);
  console.log(`- dataCadastro: ${formatDate(user.dataCadastro)}`);
  console.log(`- dataAtualizacao: ${formatDate(user.dataAtualizacao)}`);

  console.log('\nCache de assinatura no usuario (controle_users.assinatura):');
  if (!user.assinatura) {
    console.log('- assinatura: ausente');
  } else {
    console.log(`- id: ${user.assinatura.id || '-'}`);
    console.log(`- planoId: ${user.assinatura.planoId || '-'}`);
    console.log(`- planoNome: ${user.assinatura.planoNome || '-'}`);
    console.log(`- planoCodigoHotmart: ${user.assinatura.planoCodigoHotmart || '-'}`);
    console.log(`- status: ${user.assinatura.status || '-'}`);
    console.log(`- pagamentoEmDia: ${String(user.assinatura.pagamentoEmDia)}`);
    console.log(`- dataExpira: ${formatDate(user.assinatura.dataExpira)}`);
    console.log(`- dataProximoPagamento: ${formatDate(user.assinatura.dataProximoPagamento)}`);
    console.log(`- ultimaSincronizacao: ${formatDate(user.assinatura.ultimaSincronizacao)}`);
  }

  const assinaturaAtiva = await assinaturaRepo.findByUserId(user.id);
  const todasAssinaturas = await assinaturaRepo.findAllByUserId(user.id);
  const premium = await planoRepo.findByCodigoHotmart('PREMIUM_MENSAL');

  console.log('\nAssinaturas na colecao assinaturas:');
  if (todasAssinaturas.length === 0) {
    console.log('- nenhuma assinatura encontrada');
  } else {
    for (const [index, assinatura] of todasAssinaturas.entries()) {
      const plano = assinatura.planoId ? await planoRepo.findById(assinatura.planoId) : null;
      console.log(`- [${index + 1}] id=${assinatura.id}`);
      console.log(`  status=${assinatura.status}`);
      console.log(`  planoId=${assinatura.planoId || '-'}`);
      console.log(`  planoCodigo=${plano?.codigoHotmart || '-'}`);
      console.log(`  dataInicio=${formatDate(assinatura.dataInicio)}`);
      console.log(`  dataFim=${formatDate(assinatura.dataFim)}`);
      console.log(`  dataRenovacao=${formatDate(assinatura.dataRenovacao)}`);
      console.log(`  funcionalidades=${assinatura.funcionalidadesHabilitadas?.length || 0}`);
    }
  }

  console.log('\nStatus calculado (regra equivalente da API):');
  let status = 'sem_assinatura';
  let ativo = false;
  let pagamentoEmDia = false;
  let mensagem = 'Usuário não possui assinatura ativa';
  let planoCodigo = '-';

  if (user.role === 'admin') {
    status = 'active';
    ativo = true;
    pagamentoEmDia = true;
    mensagem = 'Admin - acesso total';
  } else if (assinaturaAtiva) {
    status = assinaturaAtiva.status;
    ativo = assinaturaAtiva.status === 'active' || assinaturaAtiva.status === 'trial';
    pagamentoEmDia = ativo;
    if (assinaturaAtiva.dataFim && assinaturaAtiva.dataFim < new Date()) {
      pagamentoEmDia = false;
      ativo = false;
      mensagem = 'Pagamento em atraso/assinatura expirada';
    } else {
      mensagem = ativo ? '-' : `Assinatura ${assinaturaAtiva.status.toLowerCase()}`;
    }
    if (assinaturaAtiva.planoId) {
      const plano = await planoRepo.findById(assinaturaAtiva.planoId);
      planoCodigo = plano?.codigoHotmart || '-';
    }
  }

  console.log(`- status: ${status}`);
  console.log(`- ativo: ${String(ativo)}`);
  console.log(`- pagamentoEmDia: ${String(pagamentoEmDia)}`);
  console.log(`- mensagem: ${mensagem}`);
  console.log(`- planoCodigo: ${planoCodigo}`);

  let temPremiumAtivo = false;
  for (const assinatura of todasAssinaturas) {
    if (!assinatura.planoId) continue;
    const plano = await planoRepo.findById(assinatura.planoId);
    const assinaturaAtiva = assinatura.status === 'active' || assinatura.status === 'trial';
    if (assinaturaAtiva && plano?.codigoHotmart === 'PREMIUM_MENSAL') {
      temPremiumAtivo = true;
      break;
    }
  }

  console.log('\nChecks rapidos:');
  console.log(`- plano PREMIUM_MENSAL existe: ${premium ? 'sim' : 'nao'}`);
  console.log(`- assinatura ativa encontrada por findByUserId: ${assinaturaAtiva ? 'sim' : 'nao'}`);
  console.log(`- possui assinatura PREMIUM ativa/trial: ${String(!!temPremiumAtivo)}`);
}

async function main(): Promise<void> {
  const emails = process.argv.slice(2).map((item) => item.trim()).filter(Boolean);
  if (emails.length === 0) {
    console.error('Informe ao menos um email.');
    console.error('Exemplo: npx tsx scripts/verificar-assinatura-firebase.ts kontempler@gmail.com');
    process.exit(1);
  }

  for (const email of emails) {
    try {
      await diagnosticarEmail(email);
    } catch (error: unknown) {
      console.error(`Falha ao diagnosticar ${email}: ${getErrorMessage(error)}`);
    }
  }
}

main().catch((error) => {
  console.error('Erro fatal:', getErrorMessage(error));
  process.exit(1);
});
