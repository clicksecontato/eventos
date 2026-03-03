/**
 * Script para executar o seed de funcionalidades e planos diretamente
 * Uso: npx tsx scripts/executar-seed.ts
 */

import { repositoryFactory } from '../src/lib/repositories/repository-factory';
import { Funcionalidade, Plano } from '../src/types/funcionalidades';

const FUNCIONALIDADES_INICIAIS: Omit<Funcionalidade, 'id' | 'dataCadastro'>[] = [
  // EVENTOS
  { codigo: 'EVENTOS_LIMITADOS', nome: 'Eventos Limitados', descricao: 'Criar eventos com limite mensal', categoria: 'EVENTOS', ativo: true, ordem: 1 },
  
  // CLIENTES
  { codigo: 'CLIENTES_LIMITADOS', nome: 'Clientes Limitados', descricao: 'Cadastrar clientes com limite anual', categoria: 'EVENTOS', ativo: true, ordem: 2 },
  
  // FINANCEIRO
  { codigo: 'PAGAMENTOS_REGISTRAR', nome: 'Registrar Pagamentos', descricao: 'Registrar pagamentos e parcelas', categoria: 'FINANCEIRO', ativo: true, ordem: 10 },
  { codigo: 'PAGAMENTOS_COMPROVANTES', nome: 'Comprovantes de Pagamento', descricao: 'Upload de comprovantes de pagamento', categoria: 'FINANCEIRO', ativo: true, ordem: 11 },
  { codigo: 'PAGAMENTOS_CONTROLE_PADRAO', nome: 'Controle de Pagamentos Padrão', descricao: 'Controle de pagamentos com opções padrão', categoria: 'FINANCEIRO', ativo: true, ordem: 12 },
  { codigo: 'PAGAMENTOS_CONTROLE_PERSONALIZADO', nome: 'Controle de Pagamentos Personalizado', descricao: 'Controle de pagamentos com opções personalizadas', categoria: 'FINANCEIRO', ativo: true, ordem: 13 },
  { codigo: 'FLUXO_CAIXA', nome: 'Fluxo de Caixa', descricao: 'Acesso ao relatório de fluxo de caixa', categoria: 'FINANCEIRO', ativo: true, ordem: 14 },
  
  // RELATORIOS
  { codigo: 'RELATORIOS_BASICOS', nome: 'Relatórios Básicos', descricao: 'Relatórios básicos (dashboard e receita mensal)', categoria: 'RELATORIOS', ativo: true, ordem: 20 },
  { codigo: 'RELATORIOS_AVANCADOS', nome: 'Relatórios Avançados', descricao: 'Relatórios avançados (performance, serviços, canais, impressões)', categoria: 'RELATORIOS', ativo: true, ordem: 21 },
  { codigo: 'RELATORIOS_FULL', nome: 'Relatórios Full', descricao: 'Relatórios completos com métricas detalhadas para melhor tomada de decisão', categoria: 'RELATORIOS', ativo: true, ordem: 22 },
  
  // TIPOS (Padrão e Personalizado)
  { codigo: 'TIPOS_PADRAO', nome: 'Tipos Padrão', descricao: 'Usar apenas tipos padrão (custos, serviços, eventos e canais de entrada)', categoria: 'EVENTOS', ativo: true, ordem: 30 },
  { codigo: 'TIPOS_PERSONALIZADO', nome: 'Tipos Personalizados', descricao: 'Criar tipos personalizados além dos padrão (custos, serviços, eventos e canais de entrada)', categoria: 'EVENTOS', ativo: true, ordem: 31 },
  
  // OUTROS
  { codigo: 'UPLOAD_ANEXOS', nome: 'Upload de Anexos', descricao: 'Upload de anexos (comprovantes de pagamentos, contratos, molduras e arquivos de cada Evento)', categoria: 'EVENTOS', ativo: true, ordem: 40 },
  { codigo: 'BOTAO_COPIAR', nome: 'Botão Copiar', descricao: 'Copiar informações do evento para enviar para Colaboradores e Cerimonialistas', categoria: 'EVENTOS', ativo: true, ordem: 41 },
  { codigo: 'CONTRATO_AUTOMATIZADO', nome: 'Preenchimento Automatizado de Contrato', descricao: 'Preenchimento automatizado de contrato com dados do evento', categoria: 'EVENTOS', ativo: true, ordem: 42 },
  { codigo: 'ANEXOS_CUSTO', nome: 'Anexos de Custo', descricao: 'Upload de anexos para custos', categoria: 'FINANCEIRO', ativo: true, ordem: 43 },
];

async function executarSeed() {
  console.log('🔄 Iniciando seed de funcionalidades e planos...\n');

  const funcionalidadeRepo = repositoryFactory.getFuncionalidadeRepository();
  const planoRepo = repositoryFactory.getPlanoRepository();

  try {
    // Remover todos os planos primeiro
    console.log('🗑️  Removendo planos existentes...');
    const todosPlanos = await planoRepo.findAll();
    for (const plano of todosPlanos) {
      await planoRepo.delete(plano.id);
    }
    console.log(`✅ ${todosPlanos.length} plano(s) removido(s)\n`);

    // Remover todas as funcionalidades
    console.log('🗑️  Removendo funcionalidades existentes...');
    const funcionalidadesParaRemover = await funcionalidadeRepo.findAll();
    for (const func of funcionalidadesParaRemover) {
      await funcionalidadeRepo.delete(func.id);
    }
    console.log(`✅ ${funcionalidadesParaRemover.length} funcionalidade(s) removida(s)\n`);

    // Criar funcionalidades
    console.log('📝 Criando funcionalidades...');
    const funcionalidadesCriadas: Funcionalidade[] = [];
    for (const funcData of FUNCIONALIDADES_INICIAIS) {
      const func = await funcionalidadeRepo.create({
        ...funcData,
        dataCadastro: new Date()
      });
      funcionalidadesCriadas.push(func);
      console.log(`  ✓ ${func.codigo}`);
    }
    console.log(`✅ ${funcionalidadesCriadas.length} funcionalidade(s) criada(s)\n`);

    // Buscar todas as funcionalidades
    const todasFuncionalidades = await funcionalidadeRepo.findAll();
    const funcionalidadesMap = new Map(todasFuncionalidades.map(f => [f.codigo, f]));

    // Criar planos
    console.log('📋 Criando planos...');
    const PLANOS_INICIAIS: Omit<Plano, 'id' | 'dataCadastro' | 'dataAtualizacao'>[] = [
      {
        nome: 'Basico',
        descricao: 'Plano ideal para começar a usar o sistema',
        codigoHotmart: 'BASICO_MENSAL',
        funcionalidades: [
          funcionalidadesMap.get('EVENTOS_LIMITADOS')?.id,
          funcionalidadesMap.get('CLIENTES_LIMITADOS')?.id,
          funcionalidadesMap.get('PAGAMENTOS_REGISTRAR')?.id,
          funcionalidadesMap.get('PAGAMENTOS_CONTROLE_PADRAO')?.id,
          funcionalidadesMap.get('TIPOS_PADRAO')?.id,
          funcionalidadesMap.get('RELATORIOS_BASICOS')?.id,
        ].filter(Boolean) as string[],
        preco: 49.90,
        intervalo: 'mensal',
        ativo: true,
        destaque: true,
        limiteEventos: 10,
        limiteClientes: 100,
        limiteUsuarios: 1,
      },
      {
        nome: 'Profissional',
        descricao: 'Plano completo para profissionais',
        codigoHotmart: 'PROFISSIONAL_MENSAL',
        funcionalidades: [
          funcionalidadesMap.get('EVENTOS_LIMITADOS')?.id,
          funcionalidadesMap.get('CLIENTES_LIMITADOS')?.id,
          funcionalidadesMap.get('PAGAMENTOS_REGISTRAR')?.id,
          funcionalidadesMap.get('PAGAMENTOS_CONTROLE_PERSONALIZADO')?.id,
          funcionalidadesMap.get('TIPOS_PERSONALIZADO')?.id,
          funcionalidadesMap.get('RELATORIOS_BASICOS')?.id,
          funcionalidadesMap.get('RELATORIOS_AVANCADOS')?.id,
          funcionalidadesMap.get('FLUXO_CAIXA')?.id,
          funcionalidadesMap.get('UPLOAD_ANEXOS')?.id,
          funcionalidadesMap.get('BOTAO_COPIAR')?.id,
        ].filter(Boolean) as string[],
        preco: 97.90,
        intervalo: 'mensal',
        ativo: true,
        destaque: true,
        limiteEventos: 50,
        limiteClientes: 600,
        limiteUsuarios: 1,
      },
      {
        nome: 'Premium',
        descricao: 'Plano premium com todas as funcionalidades',
        codigoHotmart: 'PREMIUM_MENSAL',
        funcionalidades: [
          funcionalidadesMap.get('EVENTOS_LIMITADOS')?.id,
          funcionalidadesMap.get('CLIENTES_LIMITADOS')?.id,
          funcionalidadesMap.get('PAGAMENTOS_REGISTRAR')?.id,
          funcionalidadesMap.get('PAGAMENTOS_COMPROVANTES')?.id,
          funcionalidadesMap.get('PAGAMENTOS_CONTROLE_PERSONALIZADO')?.id,
          funcionalidadesMap.get('TIPOS_PERSONALIZADO')?.id,
          funcionalidadesMap.get('RELATORIOS_BASICOS')?.id,
          funcionalidadesMap.get('RELATORIOS_AVANCADOS')?.id,
          funcionalidadesMap.get('RELATORIOS_FULL')?.id,
          funcionalidadesMap.get('FLUXO_CAIXA')?.id,
          funcionalidadesMap.get('UPLOAD_ANEXOS')?.id,
          funcionalidadesMap.get('BOTAO_COPIAR')?.id,
          funcionalidadesMap.get('CONTRATO_AUTOMATIZADO')?.id,
          funcionalidadesMap.get('ANEXOS_CUSTO')?.id,
        ].filter(Boolean) as string[],
        preco: 149.90,
        intervalo: 'mensal',
        ativo: true,
        destaque: true,
        limiteEventos: 400,
        limiteClientes: 4800,
        limiteUsuarios: 1,
      },
    ];

    const planosCriados: Plano[] = [];
    for (const planoData of PLANOS_INICIAIS) {
      const plano = await planoRepo.create({
        ...planoData,
        dataCadastro: new Date(),
        dataAtualizacao: new Date()
      });
      planosCriados.push(plano);
      console.log(`  ✓ ${plano.nome} (${plano.funcionalidades.length} funcionalidades)`);
    }
    console.log(`✅ ${planosCriados.length} plano(s) criado(s)\n`);

    console.log('🎉 Seed executado com sucesso!');
    console.log('\n📊 Resumo:');
    console.log(`  - Funcionalidades: ${funcionalidadesCriadas.length}`);
    console.log(`  - Planos: ${planosCriados.length}`);
    console.log('\n✅ Processo concluído!');

  } catch (error: any) {
    console.error('❌ Erro ao executar seed:', error);
    process.exit(1);
  }
}

executarSeed();


