'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import CookieConsent from '@/components/CookieConsent';
import { DocumentTextIcon, ScaleIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TermosUsoPage() {
  const router = useRouter();
  const dataAtualizacao = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="min-h-screen bg-background">
      {/* Header Público */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image 
              src="/logo.png" 
              alt="Clicksehub Logo" 
              width={40} 
              height={40}
              className="object-contain"
            />
            <h1 className="text-2xl font-bold">
              <span className="text-primary">Clickse</span>
              <span style={{ color: '#FF4001' }}>hub</span>
            </h1>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button 
              onClick={() => router.push('/painel')}
              variant="outline"
            >
              Entrar
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="py-8">
        <div className="container mx-auto px-4">
          <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <ScaleIcon className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-text-primary">Termos de Uso</h1>
          </div>
          <p className="text-text-secondary">
            Última atualização: {dataAtualizacao}
          </p>
        </div>

        {/* Introdução */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">1. Aceitação dos Termos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              Bem-vindo à Clicksehub! Estes Termos de Uso ("Termos") regem o uso da plataforma de gestão 
              de eventos Clicksehub ("Plataforma", "Serviço" ou "nós") operada por Clicksehub ("empresa", 
              "nós" ou "nosso").
            </p>
            <p className="text-text-secondary leading-relaxed">
              Ao acessar ou utilizar nossa Plataforma, você concorda em ficar vinculado a estes Termos. 
              Se você não concordar com qualquer parte destes Termos, não deve utilizar nossos serviços.
            </p>
            <p className="text-text-secondary leading-relaxed">
              Estes Termos constituem um acordo legal entre você e a Clicksehub. Recomendamos que leia 
              atentamente este documento antes de utilizar nossos serviços.
            </p>
          </CardContent>
        </Card>

        {/* Definições */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">2. Definições</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-text-secondary">
                <strong className="text-text-primary">"Usuário"</strong> ou <strong className="text-text-primary">"Você"</strong>: 
                {' '}Refere-se à pessoa física ou jurídica que acessa ou utiliza a Plataforma.
              </p>
              <p className="text-text-secondary">
                <strong className="text-text-primary">"Conta"</strong>: 
                {' '}Refere-se à conta criada pelo Usuário para acessar os serviços da Plataforma.
              </p>
              <p className="text-text-secondary">
                <strong className="text-text-primary">"Conteúdo"</strong>: 
                {' '}Refere-se a qualquer informação, dados, texto, imagens ou outros materiais enviados ou disponibilizados na Plataforma.
              </p>
              <p className="text-text-secondary">
                <strong className="text-text-primary">"Serviços"</strong>: 
                {' '}Refere-se a todos os serviços, funcionalidades e recursos oferecidos através da Plataforma.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cadastro */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">3. Cadastro e Conta de Usuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-text-primary mb-2">3.1. Requisitos para Cadastro</h3>
              <p className="text-text-secondary leading-relaxed mb-2">
                Para utilizar nossos serviços, você deve:
              </p>
              <ul className="list-disc list-inside space-y-1 text-text-secondary ml-4">
                <li>Ter pelo menos 18 anos de idade ou ter autorização de um responsável legal</li>
                <li>Fornecer informações precisas, completas e atualizadas</li>
                <li>Manter a segurança de sua conta e senha</li>
                <li>Notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta</li>
                <li>Ser responsável por todas as atividades que ocorram em sua conta</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">3.2. Responsabilidades do Usuário</h3>
              <p className="text-text-secondary leading-relaxed">
                Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas 
                as atividades que ocorram sob sua conta. A Clicksehub não será responsável por perdas ou 
                danos decorrentes do uso não autorizado de sua conta.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Uso Aceitável */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">4. Uso Aceitável da Plataforma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              Ao utilizar nossa Plataforma, você concorda em:
            </p>
            <div className="space-y-3">
              <div className="p-4 bg-surface rounded-lg border border-border">
                <h4 className="font-semibold text-text-primary mb-2">4.1. Uso Permitido</h4>
                <ul className="list-disc list-inside space-y-1 text-text-secondary text-sm ml-4">
                  <li>Utilizar a Plataforma apenas para fins legítimos e de acordo com estes Termos</li>
                  <li>Respeitar todos os direitos de propriedade intelectual</li>
                  <li>Manter a confidencialidade de informações sensíveis</li>
                  <li>Cumprir todas as leis e regulamentos aplicáveis</li>
                </ul>
              </div>
              <div className="p-4 bg-error-bg rounded-lg border border-error/20">
                <h4 className="font-semibold text-error-text mb-2">4.2. Uso Proibido</h4>
                <p className="text-error-text text-sm mb-2">Você NÃO deve:</p>
                <ul className="list-disc list-inside space-y-1 text-error-text text-sm ml-4">
                  <li>Utilizar a Plataforma para atividades ilegais ou não autorizadas</li>
                  <li>Tentar acessar áreas restritas ou contas de outros usuários</li>
                  <li>Interferir ou interromper o funcionamento da Plataforma</li>
                  <li>Transmitir vírus, malware ou código malicioso</li>
                  <li>Realizar engenharia reversa ou tentar extrair código-fonte</li>
                  <li>Utilizar bots, scripts automatizados ou scraping sem autorização</li>
                  <li>Compartilhar sua conta com terceiros</li>
                  <li>Publicar conteúdo ofensivo, difamatório ou que viole direitos de terceiros</li>
                  <li>Utilizar a Plataforma para spam ou atividades de marketing não autorizadas</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Propriedade Intelectual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">5. Propriedade Intelectual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-text-primary mb-2">5.1. Propriedade da Clicksehub</h3>
              <p className="text-text-secondary leading-relaxed">
                A Plataforma, incluindo seu design, funcionalidades, código-fonte, logotipos, marcas e 
                todo o conteúdo, é propriedade da Clicksehub ou de seus licenciadores e está protegida 
                por leis de propriedade intelectual.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">5.2. Conteúdo do Usuário</h3>
              <p className="text-text-secondary leading-relaxed mb-2">
                Você mantém todos os direitos sobre o conteúdo que você cria, envia ou disponibiliza na Plataforma. 
                Ao fazer upload de conteúdo, você concede à Clicksehub uma licença não exclusiva, mundial, 
                livre de royalties e transferível para:
              </p>
              <ul className="list-disc list-inside space-y-1 text-text-secondary ml-4">
                <li>Usar, reproduzir, modificar e exibir seu conteúdo na Plataforma</li>
                <li>Fornecer e melhorar nossos serviços</li>
                <li>Realizar backups e garantir a segurança dos dados</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">5.3. Feedback</h3>
              <p className="text-text-secondary leading-relaxed">
                Qualquer feedback, sugestões ou ideias que você fornecer sobre a Plataforma podem ser 
                utilizados pela Clicksehub sem qualquer obrigação de compensação.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Planos e Pagamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">6. Planos, Assinaturas e Pagamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-text-primary mb-2">6.1. Planos de Assinatura</h3>
              <p className="text-text-secondary leading-relaxed">
                Oferecemos diferentes planos de assinatura com funcionalidades e limites variados. 
                Os detalhes de cada plano, incluindo preços e funcionalidades, estão disponíveis na 
                seção de planos da Plataforma.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">6.2. Pagamentos</h3>
              <ul className="list-disc list-inside space-y-2 text-text-secondary ml-4">
                <li>Os pagamentos são processados através de provedores de pagamento terceirizados seguros</li>
                <li>As assinaturas são renovadas automaticamente, a menos que canceladas</li>
                <li>Você autoriza a cobrança automática no método de pagamento cadastrado</li>
                <li>Preços podem ser alterados com aviso prévio de 30 dias</li>
                <li>Reembolsos seguem nossa política de reembolso disponível na Plataforma</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">6.3. Cancelamento</h3>
              <p className="text-text-secondary leading-relaxed">
                Você pode cancelar sua assinatura a qualquer momento através das configurações da sua conta. 
                O cancelamento entrará em vigor no final do período de faturamento atual. Não oferecemos 
                reembolsos parciais para períodos não utilizados.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Disponibilidade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">7. Disponibilidade e Modificações do Serviço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              Nos esforçamos para manter a Plataforma disponível 24 horas por dia, 7 dias por semana. 
              No entanto, não garantimos disponibilidade ininterrupta e podemos realizar manutenções, 
              atualizações ou modificações que podem resultar em interrupções temporárias.
            </p>
            <p className="text-text-secondary leading-relaxed">
              Reservamo-nos o direito de:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary ml-4">
              <li>Modificar, suspender ou descontinuar qualquer parte da Plataforma a qualquer momento</li>
              <li>Adicionar ou remover funcionalidades</li>
              <li>Alterar limites de uso ou recursos disponíveis</li>
              <li>Realizar manutenções programadas ou de emergência</li>
            </ul>
            <p className="text-text-secondary leading-relaxed mt-4">
              Notificaremos você sobre mudanças significativas sempre que possível, mas não somos obrigados 
              a fazê-lo para todas as modificações.
            </p>
          </CardContent>
        </Card>

        {/* Limitação de Responsabilidade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">8. Limitação de Responsabilidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              Na medida máxima permitida por lei:
            </p>
            <div className="p-4 bg-warning-bg rounded-lg border border-warning/20">
              <p className="text-warning-text text-sm leading-relaxed">
                A CLICKSEHUB FORNECE A PLATAFORMA "COMO ESTÁ" E "CONFORME DISPONÍVEL", SEM GARANTIAS DE 
                QUALQUER TIPO, EXPRESSAS OU IMPLÍCITAS, INCLUINDO, MAS NÃO SE LIMITANDO A, GARANTIAS DE 
                COMERCIALIZAÇÃO, ADEQUAÇÃO A UM PROPÓSITO ESPECÍFICO E NÃO VIOLAÇÃO.
              </p>
            </div>
            <p className="text-text-secondary leading-relaxed mt-4">
              Não garantimos que:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary ml-4">
              <li>A Plataforma atenderá a todos os seus requisitos</li>
              <li>A Plataforma será ininterrupta, segura ou livre de erros</li>
              <li>Os resultados obtidos serão precisos ou confiáveis</li>
              <li>Defeitos serão corrigidos</li>
            </ul>
            <p className="text-text-secondary leading-relaxed mt-4">
              Em nenhuma circunstância a Clicksehub será responsável por danos indiretos, incidentais, 
              especiais, consequenciais ou punitivos, incluindo perda de lucros, dados ou uso.
            </p>
          </CardContent>
        </Card>

        {/* Indenização */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">9. Indenização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              Você concorda em indenizar, defender e isentar a Clicksehub, seus diretores, funcionários, 
              agentes e licenciadores de e contra quaisquer reivindicações, obrigações, danos, perdas, 
              responsabilidades, custos ou dívidas, e despesas (incluindo honorários advocatícios) 
              decorrentes de:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary ml-4">
              <li>Seu uso ou acesso à Plataforma</li>
              <li>Violation destes Termos</li>
              <li>Violation de qualquer direito de terceiros</li>
              <li>Conteúdo que você enviar, postar ou transmitir através da Plataforma</li>
            </ul>
          </CardContent>
        </Card>

        {/* Rescisão */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">10. Rescisão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-text-primary mb-2">10.1. Rescisão por Você</h3>
              <p className="text-text-secondary leading-relaxed">
                Você pode encerrar sua conta a qualquer momento através das configurações da sua conta 
                ou entrando em contato conosco.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">10.2. Rescisão por Nós</h3>
              <p className="text-text-secondary leading-relaxed mb-2">
                Podemos suspender ou encerrar sua conta e acesso à Plataforma imediatamente, sem aviso prévio, 
                se você:
              </p>
              <ul className="list-disc list-inside space-y-1 text-text-secondary ml-4">
                <li>Violar estes Termos ou qualquer política aplicável</li>
                <li>Utilizar a Plataforma de forma fraudulenta ou ilegal</li>
                <li>Não efetuar pagamentos devidos</li>
                <li>Interferir no funcionamento da Plataforma ou de outros usuários</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">10.3. Efeitos da Rescisão</h3>
              <p className="text-text-secondary leading-relaxed">
                Após a rescisão, seu direito de usar a Plataforma cessará imediatamente. Podemos reter 
                seus dados por um período razoável conforme necessário para cumprir obrigações legais ou 
                resolver disputas.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Lei Aplicável */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">11. Lei Aplicável e Jurisdição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa 
              relacionada a estes Termos será submetida à jurisdição exclusiva dos tribunais competentes 
              do Brasil.
            </p>
            <p className="text-text-secondary leading-relaxed">
              Se você for um consumidor, você também pode ter direitos adicionais sob a legislação de 
              proteção ao consumidor do Brasil, que não podem ser alterados por estes Termos.
            </p>
          </CardContent>
        </Card>

        {/* Alterações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">12. Alterações nos Termos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              Reservamo-nos o direito de modificar estes Termos a qualquer momento. Alterações significativas 
              serão comunicadas através de:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary ml-4">
              <li>E-mail enviado ao endereço associado à sua conta</li>
              <li>Notificação na Plataforma</li>
              <li>Atualização da data de "Última atualização" no topo desta página</li>
            </ul>
            <p className="text-text-secondary leading-relaxed mt-4">
              Seu uso continuado da Plataforma após as alterações constitui sua aceitação dos novos Termos. 
              Se você não concordar com as alterações, deve encerrar sua conta e parar de usar a Plataforma.
            </p>
          </CardContent>
        </Card>

        {/* Disposições Gerais */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">13. Disposições Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-text-primary mb-2">13.1. Acordo Completo</h3>
              <p className="text-text-secondary leading-relaxed">
                Estes Termos, juntamente com nossa Política de Privacidade, constituem o acordo completo 
                entre você e a Clicksehub em relação ao uso da Plataforma.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">13.2. Divisibilidade</h3>
              <p className="text-text-secondary leading-relaxed">
                Se qualquer disposição destes Termos for considerada inválida ou inexequível, as demais 
                disposições permanecerão em pleno vigor e efeito.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">13.3. Renúncia</h3>
              <p className="text-text-secondary leading-relaxed">
                A falha da Clicksehub em exercer ou fazer valer qualquer direito ou disposição destes Termos 
                não constituirá uma renúncia a tal direito ou disposição.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">13.4. Cessão</h3>
              <p className="text-text-secondary leading-relaxed">
                Você não pode ceder ou transferir estes Termos ou seus direitos sob estes Termos sem nosso 
                consentimento prévio por escrito. Podemos ceder estes Termos a qualquer momento.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <DocumentTextIcon className="h-6 w-6 text-primary" />
              14. Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              Se você tiver dúvidas sobre estes Termos de Uso, entre em contato conosco:
            </p>
            <div className="p-4 bg-surface rounded-lg border border-border">
              <p className="text-text-primary font-semibold mb-2">Clicksehub</p>
              <p className="text-text-secondary text-sm mb-1">
                <strong>E-mail:</strong>{' '}
                <a href="mailto:clicksehub@gmail.com" className="text-accent hover:text-accent-dark underline">
                  clicksehub@gmail.com
                </a>
              </p>
              <p className="text-text-secondary text-sm">
                <strong>Horário de Atendimento:</strong> Segunda a Sexta, das 9h às 18h
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-6 text-text-muted text-sm">
          <p>© {new Date().getFullYear()} Clicksehub. Todos os direitos reservados.</p>
          <p className="mt-2">
            Ao utilizar nossos serviços, você reconhece que leu, compreendeu e concorda em ficar vinculado 
            a estes Termos de Uso.
          </p>
        </div>
          </div>
        </div>
      </main>

      {/* Cookie Consent Banner */}
      <CookieConsent />
    </div>
  );
}

