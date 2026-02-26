/**
 * Executa:
 * A) Seed de funcionalidades e planos (Firestore)
 * B) Aplicação do plano PREMIUM para usuários de controle_users
 *
 * Uso:
 *   npx tsx scripts/executar-plano-a-b.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

import { Funcionalidade, Plano, Assinatura } from '../src/types/funcionalidades';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const FUNCIONALIDADES_INICIAIS: Omit<Funcionalidade, 'id' | 'dataCadastro'>[] = [
  { codigo: 'EVENTOS_LIMITADOS', nome: 'Eventos Limitados', descricao: 'Criar eventos com limite mensal', categoria: 'EVENTOS', ativo: true, ordem: 1 },
  { codigo: 'CLIENTES_LIMITADOS', nome: 'Clientes Limitados', descricao: 'Cadastrar clientes com limite anual', categoria: 'EVENTOS', ativo: true, ordem: 2 },
  { codigo: 'PAGAMENTOS_REGISTRAR', nome: 'Registrar Pagamentos', descricao: 'Registrar pagamentos e parcelas', categoria: 'FINANCEIRO', ativo: true, ordem: 10 },
  { codigo: 'PAGAMENTOS_COMPROVANTES', nome: 'Comprovantes de Pagamento', descricao: 'Upload de comprovantes de pagamento', categoria: 'FINANCEIRO', ativo: true, ordem: 11 },
  { codigo: 'PAGAMENTOS_CONTROLE_PADRAO', nome: 'Controle de Pagamentos Padrão', descricao: 'Controle de pagamentos com opções padrão', categoria: 'FINANCEIRO', ativo: true, ordem: 12 },
  { codigo: 'PAGAMENTOS_CONTROLE_PERSONALIZADO', nome: 'Controle de Pagamentos Personalizado', descricao: 'Controle de pagamentos com opções personalizadas', categoria: 'FINANCEIRO', ativo: true, ordem: 13 },
  { codigo: 'FLUXO_CAIXA', nome: 'Fluxo de Caixa', descricao: 'Acesso ao relatório de fluxo de caixa', categoria: 'FINANCEIRO', ativo: true, ordem: 14 },
  { codigo: 'RELATORIOS_BASICOS', nome: 'Relatórios Básicos', descricao: 'Relatórios básicos (dashboard e receita mensal)', categoria: 'RELATORIOS', ativo: true, ordem: 20 },
  { codigo: 'RELATORIOS_AVANCADOS', nome: 'Relatórios Avançados', descricao: 'Relatórios avançados (performance, serviços, canais, impressões)', categoria: 'RELATORIOS', ativo: true, ordem: 21 },
  { codigo: 'RELATORIOS_FULL', nome: 'Relatórios Full', descricao: 'Relatórios completos com métricas detalhadas para melhor tomada de decisão', categoria: 'RELATORIOS', ativo: true, ordem: 22 },
  { codigo: 'TIPOS_PADRAO', nome: 'Tipos Padrão', descricao: 'Usar apenas tipos padrão (custos, serviços, eventos e canais de entrada)', categoria: 'EVENTOS', ativo: true, ordem: 30 },
  { codigo: 'TIPOS_PERSONALIZADO', nome: 'Tipos Personalizados', descricao: 'Criar tipos personalizados além dos padrão (custos, serviços, eventos e canais de entrada)', categoria: 'EVENTOS', ativo: true, ordem: 31 },
  { codigo: 'UPLOAD_ANEXOS', nome: 'Upload de Anexos', descricao: 'Upload de anexos (comprovantes de pagamentos, contratos, molduras e arquivos de cada Evento)', categoria: 'EVENTOS', ativo: true, ordem: 40 },
  { codigo: 'BOTAO_COPIAR', nome: 'Botão Copiar', descricao: 'Copiar informações do evento para enviar para Colaboradores e Cerimonialistas', categoria: 'EVENTOS', ativo: true, ordem: 41 },
  { codigo: 'CONTRATO_AUTOMATIZADO', nome: 'Preenchimento Automatizado de Contrato', descricao: 'Preenchimento automatizado de contrato com dados do evento', categoria: 'EVENTOS', ativo: true, ordem: 42 },
  { codigo: 'ANEXOS_CUSTO', nome: 'Anexos de Custo', descricao: 'Upload de anexos para custos', categoria: 'FINANCEIRO', ativo: true, ordem: 43 }
];

async function seedFuncionalidadesEPlanos(): Promise<{ premium: Plano }> {
  const { AdminFuncionalidadeRepository } = await import('../src/lib/repositories/admin-funcionalidade-repository');
  const { AdminPlanoRepository } = await import('../src/lib/repositories/admin-plano-repository');

  const funcionalidadeRepo = new AdminFuncionalidadeRepository();
  const planoRepo = new AdminPlanoRepository();

  const funcionalidadesExistentes = await funcionalidadeRepo.findAll();
  const funcionalidadesPorCodigo = new Map(funcionalidadesExistentes.map(f => [f.codigo, f]));

  let criadas = 0;
  let atualizadas = 0;

  for (const item of FUNCIONALIDADES_INICIAIS) {
    const existente = funcionalidadesPorCodigo.get(item.codigo);
    if (!existente) {
      await funcionalidadeRepo.create({
        ...item,
        dataCadastro: new Date()
      });
      criadas++;
      continue;
    }

    await funcionalidadeRepo.update(existente.id, {
      ...existente,
      nome: item.nome,
      descricao: item.descricao,
      categoria: item.categoria,
      ativo: item.ativo,
      ordem: item.ordem
    });
    atualizadas++;
  }

  const todasFuncionalidades = await funcionalidadeRepo.findAll();
  const map = new Map(todasFuncionalidades.map(f => [f.codigo, f.id]));

  const PLANOS_INICIAIS: Omit<Plano, 'id' | 'dataCadastro' | 'dataAtualizacao'>[] = [
    {
      nome: 'Basico',
      descricao: 'Plano ideal para começar a usar o sistema',
      codigoHotmart: 'BASICO_MENSAL',
      funcionalidades: [
        map.get('EVENTOS_LIMITADOS'),
        map.get('CLIENTES_LIMITADOS'),
        map.get('PAGAMENTOS_REGISTRAR'),
        map.get('PAGAMENTOS_CONTROLE_PADRAO'),
        map.get('TIPOS_PADRAO'),
        map.get('RELATORIOS_BASICOS')
      ].filter(Boolean) as string[],
      preco: 49.9,
      intervalo: 'mensal',
      ativo: true,
      destaque: true,
      limiteEventos: 10,
      limiteClientes: 100,
      limiteUsuarios: 1
    },
    {
      nome: 'Profissional',
      descricao: 'Plano completo para profissionais',
      codigoHotmart: 'PROFISSIONAL_MENSAL',
      funcionalidades: [
        map.get('EVENTOS_LIMITADOS'),
        map.get('CLIENTES_LIMITADOS'),
        map.get('PAGAMENTOS_REGISTRAR'),
        map.get('PAGAMENTOS_CONTROLE_PERSONALIZADO'),
        map.get('TIPOS_PERSONALIZADO'),
        map.get('RELATORIOS_BASICOS'),
        map.get('RELATORIOS_AVANCADOS'),
        map.get('FLUXO_CAIXA'),
        map.get('UPLOAD_ANEXOS'),
        map.get('BOTAO_COPIAR')
      ].filter(Boolean) as string[],
      preco: 97.9,
      intervalo: 'mensal',
      ativo: true,
      destaque: true,
      limiteEventos: 50,
      limiteClientes: 600,
      limiteUsuarios: 1
    },
    {
      nome: 'Premium',
      descricao: 'Plano premium com todas as funcionalidades',
      codigoHotmart: 'PREMIUM_MENSAL',
      funcionalidades: [
        map.get('EVENTOS_LIMITADOS'),
        map.get('CLIENTES_LIMITADOS'),
        map.get('PAGAMENTOS_REGISTRAR'),
        map.get('PAGAMENTOS_COMPROVANTES'),
        map.get('PAGAMENTOS_CONTROLE_PERSONALIZADO'),
        map.get('TIPOS_PERSONALIZADO'),
        map.get('RELATORIOS_BASICOS'),
        map.get('RELATORIOS_AVANCADOS'),
        map.get('RELATORIOS_FULL'),
        map.get('FLUXO_CAIXA'),
        map.get('UPLOAD_ANEXOS'),
        map.get('BOTAO_COPIAR'),
        map.get('CONTRATO_AUTOMATIZADO'),
        map.get('ANEXOS_CUSTO')
      ].filter(Boolean) as string[],
      preco: 149.9,
      intervalo: 'mensal',
      ativo: true,
      destaque: true,
      limiteEventos: 400,
      limiteClientes: 4800,
      limiteUsuarios: 1
    }
  ];

  const planosExistentes = await planoRepo.findAll();
  const planosPorCodigo = new Map(planosExistentes.map(p => [p.codigoHotmart, p]));

  let planosCriados = 0;
  let planosAtualizados = 0;

  for (const item of PLANOS_INICIAIS) {
    const existente = planosPorCodigo.get(item.codigoHotmart);
    if (!existente) {
      await planoRepo.create({
        ...item,
        dataCadastro: new Date(),
        dataAtualizacao: new Date()
      });
      planosCriados++;
      continue;
    }

    await planoRepo.update(existente.id, {
      ...existente,
      nome: item.nome,
      descricao: item.descricao,
      funcionalidades: item.funcionalidades,
      preco: item.preco,
      intervalo: item.intervalo,
      ativo: item.ativo,
      destaque: item.destaque,
      limiteEventos: item.limiteEventos,
      limiteClientes: item.limiteClientes,
      limiteUsuarios: item.limiteUsuarios,
      dataAtualizacao: new Date()
    });
    planosAtualizados++;
  }

  const premium = await planoRepo.findByCodigoHotmart('PREMIUM_MENSAL');
  if (!premium) {
    throw new Error('Plano PREMIUM_MENSAL não foi encontrado após seed.');
  }

  console.log(`\n[A] Funcionalidades: ${criadas} criadas, ${atualizadas} atualizadas`);
  console.log(`[A] Planos: ${planosCriados} criados, ${planosAtualizados} atualizados`);
  console.log(`[A] Plano PREMIUM pronto: ${premium.id}\n`);

  return { premium };
}

async function aplicarPremiumEmControleUsers(premium: Plano): Promise<void> {
  const { AdminUserRepository } = await import('../src/lib/repositories/admin-user-repository');
  const { AdminAssinaturaRepository } = await import('../src/lib/repositories/admin-assinatura-repository');
  const { AdminPlanoRepository } = await import('../src/lib/repositories/admin-plano-repository');
  const { AssinaturaService } = await import('../src/lib/services/assinatura-service');

  const userRepo = new AdminUserRepository();
  const assinaturaRepo = new AdminAssinaturaRepository();
  const planoRepo = new AdminPlanoRepository();
  const assinaturaService = new AssinaturaService(assinaturaRepo, planoRepo, userRepo);

  const todosUsuarios = await userRepo.findAll();
  const usuariosAlvo = todosUsuarios.filter(u => u.role !== 'admin');

  let criadas = 0;
  let atualizadas = 0;
  let erros = 0;

  for (const user of usuariosAlvo) {
    try {
      const assinaturaAtiva = await assinaturaRepo.findByUserId(user.id);
      const todasAssinaturas = assinaturaAtiva ? [] : await assinaturaRepo.findAllByUserId(user.id);
      const assinaturaBase = assinaturaAtiva || (todasAssinaturas.length > 0 ? todasAssinaturas[0] : null);

      if (assinaturaBase) {
        await assinaturaRepo.update(assinaturaBase.id, {
          ...assinaturaBase,
          planoId: premium.id,
          funcionalidadesHabilitadas: premium.funcionalidades || [],
          status: 'active',
          dataAtualizacao: new Date()
        });
        await assinaturaRepo.addHistorico(assinaturaBase.id, {
          data: new Date(),
          acao: 'Migração em massa para PREMIUM_MENSAL',
          detalhes: {
            planoNovo: premium.id,
            codigoNovo: premium.codigoHotmart
          }
        });
        atualizadas++;
      } else {
        const agora = new Date();
        const novaAssinatura: Omit<Assinatura, 'id'> = {
          userId: user.id,
          planoId: premium.id,
          hotmartSubscriptionId: `MIGRACAO_PREMIUM_${user.id}_${Date.now()}`,
          status: 'active',
          dataInicio: agora,
          dataRenovacao: new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000),
          funcionalidadesHabilitadas: premium.funcionalidades || [],
          historico: [{
            data: agora,
            acao: 'Assinatura criada por migração em massa',
            detalhes: { planoId: premium.id, codigoHotmart: premium.codigoHotmart }
          }],
          dataCadastro: agora,
          dataAtualizacao: agora
        };
        await assinaturaRepo.create(novaAssinatura);
        criadas++;
      }

      await assinaturaService.sincronizarPlanoUsuario(user.id);
    } catch (error: any) {
      erros++;
      console.error(`[B] Erro no usuário ${user.id}: ${error?.message || error}`);
    }
  }

  console.log(`[B] Usuários avaliados (sem admin): ${usuariosAlvo.length}`);
  console.log(`[B] Assinaturas criadas: ${criadas}`);
  console.log(`[B] Assinaturas atualizadas: ${atualizadas}`);
  console.log(`[B] Erros: ${erros}`);
}

async function main() {
  console.log('Iniciando execução do Plano A + Plano B...');
  const { premium } = await seedFuncionalidadesEPlanos();
  await aplicarPremiumEmControleUsers(premium);
  console.log('\nConcluído com sucesso.');
}

main().catch((error) => {
  console.error('Falha na execução do Plano A + Plano B:', error);
  process.exit(1);
});

