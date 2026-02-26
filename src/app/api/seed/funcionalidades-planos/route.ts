import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { AdminFuncionalidadeRepository } from '@/lib/repositories/admin-funcionalidade-repository';
import { AdminPlanoRepository } from '@/lib/repositories/admin-plano-repository';
import { Funcionalidade, Plano } from '@/types/funcionalidades';

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

export async function POST(request: NextRequest) {
  try {
    // Verificar se há um token de segurança no header (para uso via Postman/API)
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization');
    const isDevMode = process.env.NODE_ENV === 'development';
    
    // Verificar parâmetro reset
    const { searchParams } = new URL(request.url);
    const reset = searchParams.get('reset') === 'true';
    
    // Tentar autenticação via sessão primeiro
    const session = await getServerSession(authOptions);
    
    // Se não houver sessão, verificar se é modo dev ou tem API key válida
    if (!session || session.user?.role !== 'admin') {
      // Verificar se tem API key válida (para uso via Postman)
      if (apiKey) {
        const validApiKey = process.env.SEED_API_KEY || 'dev-seed-key-2024';
        if (apiKey !== validApiKey && !apiKey.includes(validApiKey)) {
          return NextResponse.json({ error: 'API key inválida' }, { status: 401 });
        }
        // API key válida, continuar sem verificação de role
      } else if (!isDevMode) {
        // Em produção, requer autenticação
        return NextResponse.json({ 
          error: 'Não autorizado. Em produção, use autenticação admin ou forneça x-api-key header' 
        }, { status: 401 });
      }
      // Em desenvolvimento, permitir sem autenticação
    }

    const funcionalidadeRepo = new AdminFuncionalidadeRepository();
    const planoRepo = new AdminPlanoRepository();

    // Se reset=true, limpar tudo primeiro
    if (reset) {
      console.log('🔄 Modo RESET: removendo funcionalidades e planos existentes...');
      
      // Remover todos os planos primeiro (eles dependem das funcionalidades)
      const todosPlanos = await planoRepo.findAll();
      for (const plano of todosPlanos) {
        await planoRepo.delete(plano.id);
      }
      console.log(`✅ ${todosPlanos.length} plano(s) removido(s)`);
      
      // Remover todas as funcionalidades
      const todasFuncionalidadesAntigas = await funcionalidadeRepo.findAll();
      for (const func of todasFuncionalidadesAntigas) {
        await funcionalidadeRepo.delete(func.id);
      }
      console.log(`✅ ${todasFuncionalidadesAntigas.length} funcionalidade(s) removida(s)`);
    }

    // Criar/Atualizar funcionalidades
    const funcionalidadesCriadas: Funcionalidade[] = [];
    const funcionalidadesAtualizadas: Funcionalidade[] = [];
    const funcionalidadesExistentes = await funcionalidadeRepo.findAll();
    const funcionalidadesPorCodigo = new Map(funcionalidadesExistentes.map(f => [f.codigo, f]));
    const codigosNoSeed = new Set(FUNCIONALIDADES_INICIAIS.map(f => f.codigo));

    // Criar ou atualizar funcionalidades do seed
    for (const funcData of FUNCIONALIDADES_INICIAIS) {
      const existente = funcionalidadesPorCodigo.get(funcData.codigo);
      
      if (!existente) {
        // Criar nova
        const func = await funcionalidadeRepo.create({
          ...funcData,
          dataCadastro: new Date()
        });
        funcionalidadesCriadas.push(func);
      } else {
        // Atualizar existente (mantém ID e dataCadastro)
        const atualizada = await funcionalidadeRepo.update(existente.id, {
          nome: funcData.nome,
          descricao: funcData.descricao,
          categoria: funcData.categoria,
          ativo: funcData.ativo,
          ordem: funcData.ordem
        });
        funcionalidadesAtualizadas.push(atualizada);
      }
    }

    // Remover funcionalidades que não estão mais no seed (se não estiver em reset, que já removeu tudo)
    if (!reset) {
      const funcionalidadesRemovidas: string[] = [];
      for (const func of funcionalidadesExistentes) {
        if (!codigosNoSeed.has(func.codigo)) {
          await funcionalidadeRepo.delete(func.id);
          funcionalidadesRemovidas.push(func.codigo);
        }
      }
      if (funcionalidadesRemovidas.length > 0) {
        console.log(`🗑️ ${funcionalidadesRemovidas.length} funcionalidade(s) removida(s): ${funcionalidadesRemovidas.join(', ')}`);
      }
    }

    // Buscar todas as funcionalidades (incluindo as recém-criadas/atualizadas)
    const todasFuncionalidades = await funcionalidadeRepo.findAll();
    const funcionalidadesMap = new Map(todasFuncionalidades.map(f => [f.codigo, f]));

    // Definir planos iniciais
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

    // Buscar planos existentes e mapear
    const planosExistentes = await planoRepo.findAll();
    const planosPorCodigo = new Map(planosExistentes.map(p => [p.codigoHotmart, p]));
    const codigosPlanosNoSeed = new Set(PLANOS_INICIAIS.map(p => p.codigoHotmart));

    const planosCriados: Plano[] = [];
    const planosAtualizados: Plano[] = [];

    // Criar ou atualizar planos do seed
    for (const planoData of PLANOS_INICIAIS) {
      const existente = planosPorCodigo.get(planoData.codigoHotmart);
      
      if (!existente) {
        // Criar novo plano
        const plano = await planoRepo.create({
          ...planoData,
          dataCadastro: new Date(),
          dataAtualizacao: new Date()
        });
        planosCriados.push(plano);
      } else {
        // Atualizar plano existente (mantém ID e dataCadastro)
        const planoAtualizado = await planoRepo.update(existente.id, {
          nome: planoData.nome,
          descricao: planoData.descricao,
          funcionalidades: planoData.funcionalidades,
          preco: planoData.preco,
          intervalo: planoData.intervalo,
          ativo: planoData.ativo,
          destaque: planoData.destaque,
          limiteEventos: planoData.limiteEventos,
          limiteClientes: planoData.limiteClientes,
          limiteUsuarios: planoData.limiteUsuarios,
          limiteArmazenamento: planoData.limiteArmazenamento,
          dataAtualizacao: new Date()
        });
        planosAtualizados.push(planoAtualizado);
      }
    }

    // Remover planos que não estão mais no seed (se não estiver em reset, que já removeu tudo)
    const planosRemovidos: string[] = [];
    if (!reset) {
      for (const plano of planosExistentes) {
        if (!codigosPlanosNoSeed.has(plano.codigoHotmart)) {
          await planoRepo.delete(plano.id);
          planosRemovidos.push(plano.codigoHotmart);
        }
      }
      if (planosRemovidos.length > 0) {
        console.log(`🗑️ ${planosRemovidos.length} plano(s) removido(s): ${planosRemovidos.join(', ')}`);
      }
    }

    const totalPlanos = await planoRepo.findAll();

    return NextResponse.json({
      success: true,
      message: reset 
        ? 'Seed executado com sucesso (modo RESET - dados limpos e recriados)'
        : 'Seed executado com sucesso (atualização incremental)',
      reset: reset,
      funcionalidades: {
        total: todasFuncionalidades.length,
        criadas: funcionalidadesCriadas.length,
        atualizadas: funcionalidadesAtualizadas.length,
        novas: funcionalidadesCriadas.map(f => ({ codigo: f.codigo, nome: f.nome })),
        atualizadasDetalhes: funcionalidadesAtualizadas.map(f => ({ codigo: f.codigo, nome: f.nome }))
      },
      planos: {
        total: totalPlanos.length,
        criados: planosCriados.length,
        atualizados: planosAtualizados.length,
        novos: planosCriados.map(p => ({ nome: p.nome, codigoHotmart: p.codigoHotmart })),
        atualizadosDetalhes: planosAtualizados.map(p => ({ nome: p.nome, codigoHotmart: p.codigoHotmart }))
      }
    });
  } catch (error: any) {
    console.error('Erro ao executar seed:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao executar seed' },
      { status: 500 }
    );
  }
}

