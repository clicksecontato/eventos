# Correção: Dados da Empresa não Preenchidos ao Criar Contrato a partir de Evento

## Data: 2025-01-XX

## Problema Identificado

Quando o usuário clicava para gerar um contrato a partir de um evento (usando a rota `/contratos/novo?eventoId=...`), os dados da empresa não vinham preenchidos. No entanto, quando ia direto para `/contratos`, os dados da empresa estavam preenchidos corretamente.

## Causa Raiz

O problema estava no método `handleSelecionarModelo` da página `/contratos/novo/page.tsx`:

1. **Quando havia evento**: O código chamava `ContratoService.preencherDadosDoEvento(evento, modelo)`, que tentava buscar os campos fixos da empresa usando `(evento as any).userId`. No entanto, esse campo pode não estar disponível ou estar vazio, resultando em dados da empresa não sendo carregados.

2. **Quando não havia evento**: O código buscava os campos fixos via API `/api/configuracao-contrato/campos-fixos`, que usa o usuário autenticado automaticamente, funcionando corretamente.

## Solução Implementada

Modificado o método `handleSelecionarModelo` para **sempre buscar os campos fixos via API**, independentemente de haver ou não um evento. Quando há um evento, os dados do evento são mesclados com os campos fixos da empresa.

### Alterações Realizadas

**Arquivo**: `src/app/contratos/novo/page.tsx`

**Mudanças no método `handleSelecionarModelo`**:

**Antes**:
```typescript
const handleSelecionarModelo = async (modelo: ModeloContrato) => {
  setModeloSelecionado(modelo);
  setPasso(2);

  if (evento) {
    // Tentava buscar campos fixos via userId do evento (não funcionava)
    const dados = await ContratoService.preencherDadosDoEvento(evento, modelo);
    setDadosPreenchidos(dados);
  } else {
    // Buscava campos fixos via API (funcionava)
    const camposFixosResponse = await fetch('/api/configuracao-contrato/campos-fixos');
    // ...
  }
};
```

**Depois**:
```typescript
const handleSelecionarModelo = async (modelo: ModeloContrato) => {
  setModeloSelecionado(modelo);
  setPasso(2);

  // Sempre buscar campos fixos via API (mesmo quando há evento)
  try {
    const configResponse = await fetch('/api/configuracao-contrato');
    
    if (configResponse.ok) {
      const configResult = await configResponse.json();
      const config = configResult.data || configResult;
      if (config && config.id) {
        setConfigExistente(true);
        // Buscar campos fixos formatados
        const camposFixosResponse = await fetch('/api/configuracao-contrato/campos-fixos');
        if (camposFixosResponse.ok) {
          const camposFixosResult = await camposFixosResponse.json();
          const camposFixos = camposFixosResult.data || camposFixosResult;
          
          // Se houver evento, mesclar dados do evento com campos fixos
          if (evento) {
            const dadosEvento = await ContratoService.preencherDadosDoEvento(evento, modelo);
            // Mesclar: campos fixos primeiro, depois dados do evento
            // (evento sobrescreve campos fixos se houver conflito)
            setDadosPreenchidos({ ...camposFixos, ...dadosEvento });
          } else {
            // Sem evento, usar apenas campos fixos
            setDadosPreenchidos(camposFixos);
          }
        }
      }
    }
  } catch (error) {
    // Tratamento de erro com fallback para dados do evento se disponível
    if (evento) {
      const dadosEvento = await ContratoService.preencherDadosDoEvento(evento, modelo);
      setDadosPreenchidos(dadosEvento);
    }
  }
};
```

## Benefícios da Solução

1. **Consistência**: Os dados da empresa são sempre carregados da mesma forma, independentemente de haver ou não um evento
2. **Confiabilidade**: Usa o usuário autenticado via API, garantindo que os dados corretos sejam carregados
3. **Fallback**: Se houver erro ao buscar campos fixos, ainda tenta preencher com dados do evento
4. **Mesclagem Inteligente**: Quando há evento, mescla campos fixos (empresa) com dados do evento, priorizando dados do evento em caso de conflito

## Fluxo de Dados

1. Usuário seleciona um modelo de contrato
2. Sistema busca configuração da empresa via API
3. Sistema busca campos fixos formatados via API
4. Se houver evento:
   - Busca dados do evento via `ContratoService.preencherDadosDoEvento`
   - Mescla campos fixos com dados do evento
   - Dados do evento têm prioridade em caso de conflito
5. Se não houver evento:
   - Usa apenas campos fixos da empresa

## Arquivos Modificados

1. `src/app/contratos/novo/page.tsx`
   - Modificado método `handleSelecionarModelo` para sempre buscar campos fixos via API
   - Adicionada lógica de mesclagem de dados quando há evento

## Melhoria Adicional: Preenchimento de Tipo de Serviço

**Problema**: O campo "tipo_servico" do contrato não era preenchido com os serviços do evento.

**Solução**: 
- Adicionado carregamento dos serviços do evento quando o evento é carregado
- Modificado `ContratoService.preencherDadosDoEvento` para aceitar serviços do evento como parâmetro opcional
- O campo `tipo_servico` é preenchido com os nomes dos tipos de serviço do evento, separados por vírgula

**Arquivos Modificados**:
1. `src/lib/services/contrato-service.ts`
   - Adicionado parâmetro opcional `servicosEvento` ao método `preencherDadosDoEvento`
   - Adicionada lógica para preencher `tipo_servico` com nomes dos tipos de serviço

2. `src/app/contratos/novo/page.tsx`
   - Adicionado estado `servicosEvento` para armazenar serviços do evento
   - Adicionado carregamento de serviços quando evento é carregado
   - Passado `servicosEvento` para todas as chamadas de `preencherDadosDoEvento`

**Código Adicionado**:
```typescript
// Em ContratoService.preencherDadosDoEvento
static async preencherDadosDoEvento(
  evento: Evento, 
  modelo: ModeloContrato, 
  servicosEvento?: ServicoEvento[]
): Promise<Record<string, any>> {
  // ... outros campos ...
  
  // Preencher tipo_servico com os serviços do evento
  if (servicosEvento && servicosEvento.length > 0) {
    const tiposServicoNomes = servicosEvento
      .filter(servico => !servico.removido && servico.tipoServico)
      .map(servico => servico.tipoServico.nome)
      .filter((nome, index, array) => array.indexOf(nome) === index); // Remover duplicatas
    
    dados.tipo_servico = tiposServicoNomes.join(', ') || '';
  } else {
    dados.tipo_servico = '';
  }
  
  // ... resto do código ...
}
```

## Correções Adicionais: Formato de Datas e Data do Contrato

**Problemas Identificados**:
1. Campo `data_evento` não aparecia preenchido no formulário (formato incorreto)
2. Campo `data_contrato` não estava sendo preenchido
3. Campo `tipo_servico` precisava garantir formato correto

**Soluções Implementadas**:

1. **Formato de `data_evento`**:
   - Alterado de `toLocaleDateString('pt-BR')` (formato "DD/MM/YYYY") para formato "YYYY-MM-DD"
   - Campos HTML do tipo `date` requerem formato "YYYY-MM-DD"

2. **Preenchimento de `data_contrato`**:
   - Adicionado preenchimento automático com data atual no formato "YYYY-MM-DD"
   - Preenchido tanto quando há evento quanto quando não há evento
   - Usuário pode alterar a data se necessário

3. **Garantia de `tipo_servico`**:
   - Mantida lógica de preenchimento com serviços do evento
   - Formato: nomes separados por vírgula (ex: "Especial Prime, ClickSe 360")

**Código Adicionado**:
```typescript
// Formatar data_evento para formato YYYY-MM-DD (necessário para campos date do HTML)
if (evento.dataEvento) {
  const dataEvento = new Date(evento.dataEvento);
  const ano = dataEvento.getFullYear();
  const mes = String(dataEvento.getMonth() + 1).padStart(2, '0');
  const dia = String(dataEvento.getDate()).padStart(2, '0');
  dados.data_evento = `${ano}-${mes}-${dia}`;
} else {
  dados.data_evento = '';
}

// Preencher data_contrato com a data atual (formato YYYY-MM-DD)
const hoje = new Date();
const ano = hoje.getFullYear();
const mes = String(hoje.getMonth() + 1).padStart(2, '0');
const dia = String(hoje.getDate()).padStart(2, '0');
dados.data_contrato = `${ano}-${mes}-${dia}`;
```

## Verificações Realizadas

- ✅ Dados da empresa são carregados quando vem de um evento
- ✅ Dados da empresa são carregados quando não há evento
- ✅ Dados do evento são mesclados corretamente com dados da empresa
- ✅ Fallback funciona se houver erro ao buscar campos fixos
- ✅ Campo `tipo_servico` é preenchido com serviços do evento
- ✅ Serviços removidos são filtrados
- ✅ Nomes duplicados são removidos
- ✅ Campo `data_evento` é preenchido no formato correto (YYYY-MM-DD)
- ✅ Campo `data_contrato` é preenchido automaticamente com data atual
- ✅ Data do contrato pode ser alterada pelo usuário
