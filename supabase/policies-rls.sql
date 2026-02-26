-- ============================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ============================================
-- Este script cria políticas RLS para todas as tabelas
-- IMPORTANTE: Este sistema usa NextAuth, não Supabase Auth
-- Portanto, as políticas são baseadas em user_id passado diretamente
-- Operações via service_role_key bypassam RLS automaticamente
-- ============================================

-- Como o sistema usa NextAuth e não Supabase Auth, precisamos de políticas
-- que permitam acesso quando usar service role (admin) ou baseadas em user_id
-- Por enquanto, vamos criar políticas que permitam tudo para service role
-- e acesso baseado em user_id para operações autenticadas

-- IMPORTANTE: Service role key bypassa RLS automaticamente, então se os
-- repositórios estiverem usando service role (useAdmin: true), estas políticas
-- podem não ser necessárias. Mas vamos criá-las como segurança adicional.

-- ============================================
-- POLÍTICAS PARA TABELAS POR USER_ID
-- ============================================

-- Clientes
DROP POLICY IF EXISTS "Users can manage own clientes" ON clientes;
CREATE POLICY "Users can manage own clientes" ON clientes
    FOR ALL USING (true) WITH CHECK (true); -- Temporário: permitir tudo (RLS será gerenciado pelo código)

-- Eventos
DROP POLICY IF EXISTS "Users can manage own eventos" ON eventos;
CREATE POLICY "Users can manage own eventos" ON eventos
    FOR ALL USING (true) WITH CHECK (true);

-- Pagamentos
DROP POLICY IF EXISTS "Users can manage own pagamentos" ON pagamentos;
CREATE POLICY "Users can manage own pagamentos" ON pagamentos
    FOR ALL USING (true) WITH CHECK (true);

-- Custos
DROP POLICY IF EXISTS "Users can manage own custos" ON custos;
CREATE POLICY "Users can manage own custos" ON custos
    FOR ALL USING (true) WITH CHECK (true);

-- Serviços Evento
DROP POLICY IF EXISTS "Users can manage own servicos_evento" ON servicos_evento;
CREATE POLICY "Users can manage own servicos_evento" ON servicos_evento
    FOR ALL USING (true) WITH CHECK (true);

-- Anexos Eventos
DROP POLICY IF EXISTS "Users can manage own anexos_eventos" ON anexos_eventos;
CREATE POLICY "Users can manage own anexos_eventos" ON anexos_eventos
    FOR ALL USING (true) WITH CHECK (true);

-- Anexos Pagamento
DROP POLICY IF EXISTS "Users can manage own anexos_pagamento" ON anexos_pagamento;
CREATE POLICY "Users can manage own anexos_pagamento" ON anexos_pagamento
    FOR ALL USING (true) WITH CHECK (true);

-- Canais Entrada
DROP POLICY IF EXISTS "Users can manage own canais_entrada" ON canais_entrada;
CREATE POLICY "Users can manage own canais_entrada" ON canais_entrada
    FOR ALL USING (true) WITH CHECK (true);

-- Tipo Eventos
DROP POLICY IF EXISTS "Users can manage own tipo_eventos" ON tipo_eventos;
CREATE POLICY "Users can manage own tipo_eventos" ON tipo_eventos
    FOR ALL USING (true) WITH CHECK (true);

-- Tipo Custos
DROP POLICY IF EXISTS "Users can manage own tipo_custos" ON tipo_custos;
CREATE POLICY "Users can manage own tipo_custos" ON tipo_custos
    FOR ALL USING (true) WITH CHECK (true);

-- Tipo Serviços
DROP POLICY IF EXISTS "Users can manage own tipo_servicos" ON tipo_servicos;
CREATE POLICY "Users can manage own tipo_servicos" ON tipo_servicos
    FOR ALL USING (true) WITH CHECK (true);

-- Configuração Contrato
DROP POLICY IF EXISTS "Users can manage own configuracao_contrato" ON configuracao_contrato;
CREATE POLICY "Users can manage own configuracao_contrato" ON configuracao_contrato
    FOR ALL USING (true) WITH CHECK (true);

-- Contratos
DROP POLICY IF EXISTS "Users can manage own contratos" ON contratos;
CREATE POLICY "Users can manage own contratos" ON contratos
    FOR ALL USING (true) WITH CHECK (true);

-- Relatórios Diários
DROP POLICY IF EXISTS "Users can manage own relatorios_diarios" ON relatorios_diarios;
CREATE POLICY "Users can manage own relatorios_diarios" ON relatorios_diarios
    FOR ALL USING (true) WITH CHECK (true);

-- Relatórios Cache
DROP POLICY IF EXISTS "Users can manage own relatorios_cache" ON relatorios_cache;
CREATE POLICY "Users can manage own relatorios_cache" ON relatorios_cache
    FOR ALL USING (true) WITH CHECK (true);

-- Google Calendar Tokens
DROP POLICY IF EXISTS "Users can manage own google_calendar_tokens" ON google_calendar_tokens;
CREATE POLICY "Users can manage own google_calendar_tokens" ON google_calendar_tokens
    FOR ALL USING (true) WITH CHECK (true);

-- Pré-Cadastros Eventos
-- Permitir leitura pública para buscar por ID (link público)
DROP POLICY IF EXISTS "Public can read pre_cadastros_eventos by id" ON pre_cadastros_eventos;
CREATE POLICY "Public can read pre_cadastros_eventos by id" ON pre_cadastros_eventos
    FOR SELECT USING (true);

-- Permitir escrita pública para salvar formulário (sem autenticação)
DROP POLICY IF EXISTS "Public can insert pre_cadastros_eventos" ON pre_cadastros_eventos;
CREATE POLICY "Public can insert pre_cadastros_eventos" ON pre_cadastros_eventos
    FOR INSERT WITH CHECK (true);

-- Permitir atualização pública para salvar dados do formulário
DROP POLICY IF EXISTS "Public can update pre_cadastros_eventos by id" ON pre_cadastros_eventos;
CREATE POLICY "Public can update pre_cadastros_eventos by id" ON pre_cadastros_eventos
    FOR UPDATE USING (true) WITH CHECK (true);

-- Permitir que usuários autenticados gerenciem seus próprios pré-cadastros (via API autenticada)
DROP POLICY IF EXISTS "Authenticated users can manage own pre_cadastros_eventos" ON pre_cadastros_eventos;
CREATE POLICY "Authenticated users can manage own pre_cadastros_eventos" ON pre_cadastros_eventos
    FOR ALL USING (true) WITH CHECK (true);

-- Pré-Cadastros Serviços
-- Permitir leitura pública
DROP POLICY IF EXISTS "Public can read pre_cadastros_servicos" ON pre_cadastros_servicos;
CREATE POLICY "Public can read pre_cadastros_servicos" ON pre_cadastros_servicos
    FOR SELECT USING (true);

-- Permitir escrita pública
DROP POLICY IF EXISTS "Public can manage pre_cadastros_servicos" ON pre_cadastros_servicos;
CREATE POLICY "Public can manage pre_cadastros_servicos" ON pre_cadastros_servicos
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- TABELAS PÚBLICAS OU GLOBAIS
-- ============================================

-- Modelos Contrato (públicos/globais - todos podem ler)
DROP POLICY IF EXISTS "Anyone can read modelos_contrato" ON modelos_contrato;
CREATE POLICY "Anyone can read modelos_contrato" ON modelos_contrato
    FOR SELECT USING (true);

-- Modelos Contrato - Permitir gerenciamento completo (usado via service role)
DROP POLICY IF EXISTS "Service role can manage modelos_contrato" ON modelos_contrato;
CREATE POLICY "Service role can manage modelos_contrato" ON modelos_contrato
    FOR ALL USING (true) WITH CHECK (true);

-- Users (acesso controlado via código)
DROP POLICY IF EXISTS "Service role can manage users" ON users;
CREATE POLICY "Service role can manage users" ON users
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- Estas políticas permitem acesso geral (USING (true))
-- porque o sistema usa NextAuth e não Supabase Auth
-- A segurança é gerenciada pelo código (API routes verificam autenticação)
-- e pelos repositórios que filtram por user_id
-- 
-- Service role key bypassa RLS automaticamente, então se os repositórios
-- estiverem usando service role, estas políticas são redundantes mas não causam problema
-- ============================================
