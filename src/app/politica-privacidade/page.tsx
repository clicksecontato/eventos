'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import CookieConsent from '@/components/CookieConsent';
import { ShieldCheckIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PoliticaPrivacidadePage() {
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
            <div className="p-3 bg-accent/10 rounded-lg">
              <ShieldCheckIcon className="h-8 w-8 text-accent" />
            </div>
            <h1 className="text-3xl font-bold text-text-primary">Política de Privacidade</h1>
          </div>
          <p className="text-text-secondary">
            Última atualização: {dataAtualizacao}
          </p>
        </div>

        {/* Introdução */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">1. Introdução</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              A Clicksehub ("nós", "nosso" ou "empresa") está comprometida em proteger a privacidade 
              e os dados pessoais de nossos usuários. Esta Política de Privacidade descreve como coletamos, 
              usamos, armazenamos e protegemos suas informações pessoais quando você utiliza nossa plataforma 
              de gestão de eventos.
            </p>
            <p className="text-text-secondary leading-relaxed">
              Ao utilizar nossos serviços, você concorda com as práticas descritas nesta política. 
              Recomendamos que leia atentamente este documento para entender como tratamos seus dados pessoais.
            </p>
          </CardContent>
        </Card>

        {/* Dados Coletados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">2. Dados que Coletamos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-text-primary mb-2">2.1. Dados Fornecidos por Você</h3>
              <ul className="list-disc list-inside space-y-2 text-text-secondary ml-4">
                <li><strong>Dados de Cadastro:</strong> Nome completo, e-mail, telefone, CPF/CNPJ, endereço</li>
                <li><strong>Dados de Eventos:</strong> Informações sobre eventos, clientes, serviços contratados</li>
                <li><strong>Dados Financeiros:</strong> Informações de pagamentos, valores, histórico financeiro</li>
                <li><strong>Dados de Contratos:</strong> Documentos, termos e condições acordados</li>
                <li><strong>Dados de Comunicação:</strong> Mensagens, feedback e comunicações com nosso suporte</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">2.2. Dados Coletados Automaticamente</h3>
              <ul className="list-disc list-inside space-y-2 text-text-secondary ml-4">
                <li><strong>Dados de Uso:</strong> Páginas visitadas, tempo de permanência, ações realizadas</li>
                <li><strong>Dados Técnicos:</strong> Endereço IP, tipo de navegador, sistema operacional, dispositivo utilizado</li>
                <li><strong>Cookies e Tecnologias Similares:</strong> Para melhorar a experiência e funcionalidades do site</li>
                <li><strong>Dados de Localização:</strong> Quando permitido, para funcionalidades baseadas em localização</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Como Usamos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">3. Como Utilizamos Seus Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              Utilizamos seus dados pessoais para as seguintes finalidades:
            </p>
            <div className="space-y-3">
              <div className="p-4 bg-surface rounded-lg border border-border">
                <h4 className="font-semibold text-text-primary mb-2">3.1. Prestação de Serviços</h4>
                <p className="text-text-secondary text-sm">
                  Para fornecer, manter e melhorar nossos serviços de gestão de eventos, processar transações, 
                  gerenciar sua conta e fornecer suporte ao cliente.
                </p>
              </div>
              <div className="p-4 bg-surface rounded-lg border border-border">
                <h4 className="font-semibold text-text-primary mb-2">3.2. Comunicação</h4>
                <p className="text-text-secondary text-sm">
                  Para enviar notificações importantes sobre sua conta, atualizações de serviços, 
                  informações sobre eventos e respostas às suas solicitações.
                </p>
              </div>
              <div className="p-4 bg-surface rounded-lg border border-border">
                <h4 className="font-semibold text-text-primary mb-2">3.3. Melhoria dos Serviços</h4>
                <p className="text-text-secondary text-sm">
                  Para analisar o uso da plataforma, identificar tendências, desenvolver novos recursos 
                  e personalizar sua experiência.
                </p>
              </div>
              <div className="p-4 bg-surface rounded-lg border border-border">
                <h4 className="font-semibold text-text-primary mb-2">3.4. Segurança e Conformidade</h4>
                <p className="text-text-secondary text-sm">
                  Para proteger nossos serviços, detectar fraudes, cumprir obrigações legais e 
                  fazer cumprir nossos termos de uso.
                </p>
              </div>
              <div className="p-4 bg-surface rounded-lg border border-border">
                <h4 className="font-semibold text-text-primary mb-2">3.5. Marketing (com seu consentimento)</h4>
                <p className="text-text-secondary text-sm">
                  Para enviar comunicações promocionais sobre nossos serviços, novidades e ofertas especiais, 
                  sempre com a possibilidade de descadastro.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compartilhamento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">4. Compartilhamento de Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              Não vendemos seus dados pessoais. Podemos compartilhar suas informações apenas nas seguintes situações:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary ml-4">
              <li><strong>Prestadores de Serviços:</strong> Empresas que nos auxiliam na operação (hospedagem, pagamentos, analytics)</li>
              <li><strong>Obrigações Legais:</strong> Quando exigido por lei, ordem judicial ou processo legal</li>
              <li><strong>Proteção de Direitos:</strong> Para proteger nossos direitos, propriedade ou segurança, ou de nossos usuários</li>
              <li><strong>Com seu Consentimento:</strong> Em outras situações, quando você autorizar expressamente</li>
            </ul>
            <p className="text-text-secondary leading-relaxed mt-4">
              Todos os prestadores de serviços são contratualmente obrigados a manter a confidencialidade 
              e segurança de seus dados.
            </p>
          </CardContent>
        </Card>

        {/* Segurança */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">5. Segurança dos Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              Implementamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais contra 
              acesso não autorizado, alteração, divulgação ou destruição:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary ml-4">
              <li>Criptografia de dados em trânsito e em repouso</li>
              <li>Controles de acesso baseados em função</li>
              <li>Monitoramento contínuo de segurança</li>
              <li>Backups regulares e planos de recuperação</li>
              <li>Treinamento regular de equipe em segurança de dados</li>
              <li>Auditorias e testes de segurança periódicos</li>
            </ul>
            <p className="text-text-secondary leading-relaxed mt-4">
              Embora adotemos medidas de segurança robustas, nenhum sistema é 100% seguro. 
              Recomendamos que você também tome precauções para proteger suas informações.
            </p>
          </CardContent>
        </Card>

        {/* Seus Direitos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">6. Seus Direitos (LGPD)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              De acordo com a Lei Geral de Proteção de Dados (LGPD), você possui os seguintes direitos:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 bg-surface rounded-lg border border-border">
                <h4 className="font-semibold text-text-primary mb-2">Acesso</h4>
                <p className="text-text-secondary text-sm">
                  Solicitar acesso aos seus dados pessoais que possuímos
                </p>
              </div>
              <div className="p-4 bg-surface rounded-lg border border-border">
                <h4 className="font-semibold text-text-primary mb-2">Correção</h4>
                <p className="text-text-secondary text-sm">
                  Solicitar correção de dados incompletos, inexatos ou desatualizados
                </p>
              </div>
              <div className="p-4 bg-surface rounded-lg border border-border">
                <h4 className="font-semibold text-text-primary mb-2">Exclusão</h4>
                <p className="text-text-secondary text-sm">
                  Solicitar a exclusão de dados desnecessários ou tratados em desconformidade
                </p>
              </div>
              <div className="p-4 bg-surface rounded-lg border border-border">
                <h4 className="font-semibold text-text-primary mb-2">Portabilidade</h4>
                <p className="text-text-secondary text-sm">
                  Solicitar a portabilidade dos seus dados para outro fornecedor
                </p>
              </div>
              <div className="p-4 bg-surface rounded-lg border border-border">
                <h4 className="font-semibold text-text-primary mb-2">Revogação</h4>
                <p className="text-text-secondary text-sm">
                  Revogar seu consentimento a qualquer momento
                </p>
              </div>
              <div className="p-4 bg-surface rounded-lg border border-border">
                <h4 className="font-semibold text-text-primary mb-2">Oposição</h4>
                <p className="text-text-secondary text-sm">
                  Opor-se ao tratamento de dados em certas circunstâncias
                </p>
              </div>
            </div>
            <p className="text-text-secondary leading-relaxed mt-4">
              Para exercer seus direitos, entre em contato conosco através do e-mail: 
              <a href="mailto:clicksehub@gmail.com" className="text-accent hover:text-accent-dark underline ml-1">
                clicksehub@gmail.com
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Cookies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">7. Cookies e Tecnologias Similares</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              Utilizamos cookies e tecnologias similares para melhorar sua experiência, analisar o uso 
              da plataforma e personalizar conteúdo. Você pode gerenciar suas preferências de cookies 
              através das configurações do seu navegador ou através do banner de consentimento.
            </p>
            <div>
              <h4 className="font-semibold text-text-primary mb-2">Tipos de Cookies Utilizados:</h4>
              <ul className="list-disc list-inside space-y-2 text-text-secondary ml-4">
                <li><strong>Cookies Essenciais:</strong> Necessários para o funcionamento básico da plataforma</li>
                <li><strong>Cookies de Desempenho:</strong> Para analisar como você utiliza nossa plataforma</li>
                <li><strong>Cookies de Funcionalidade:</strong> Para lembrar suas preferências e personalizar sua experiência</li>
                <li><strong>Cookies de Marketing:</strong> Para fornecer conteúdo relevante e medir a eficácia de campanhas (com seu consentimento)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Retenção */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">8. Retenção de Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              Mantemos seus dados pessoais apenas pelo tempo necessário para cumprir as finalidades descritas 
              nesta política, exceto quando um período de retenção mais longo for exigido ou permitido por lei.
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary ml-4">
              <li><strong>Dados de Conta:</strong> Enquanto sua conta estiver ativa e por até 5 anos após o encerramento</li>
              <li><strong>Dados Financeiros:</strong> Conforme exigido por lei (geralmente 5 a 10 anos)</li>
              <li><strong>Dados de Eventos:</strong> Enquanto necessário para prestação de serviços e histórico</li>
              <li><strong>Dados de Marketing:</strong> Até você solicitar a remoção ou revogar consentimento</li>
            </ul>
          </CardContent>
        </Card>

        {/* Menores */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">9. Privacidade de Menores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              Nossos serviços são destinados a pessoas maiores de 18 anos. Não coletamos intencionalmente 
              dados pessoais de menores de idade. Se tomarmos conhecimento de que coletamos dados de um menor, 
              tomaremos medidas para excluir essas informações imediatamente.
            </p>
            <p className="text-text-secondary leading-relaxed">
              Se você é pai, mãe ou responsável e acredita que seu filho nos forneceu dados pessoais, 
              entre em contato conosco imediatamente.
            </p>
          </CardContent>
        </Card>

        {/* Alterações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">10. Alterações nesta Política</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente para refletir mudanças em nossas 
              práticas ou por outros motivos operacionais, legais ou regulatórios. Notificaremos você sobre 
              alterações significativas através de:
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary ml-4">
              <li>E-mail enviado ao endereço associado à sua conta</li>
              <li>Notificação na plataforma</li>
              <li>Atualização da data de "Última atualização" no topo desta página</li>
            </ul>
            <p className="text-text-secondary leading-relaxed mt-4">
              Recomendamos que revise esta política periodicamente para se manter informado sobre como 
              protegemos suas informações.
            </p>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <DocumentTextIcon className="h-6 w-6 text-accent" />
              11. Contato e Encarregado de Dados (DPO)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              Se você tiver dúvidas, preocupações ou solicitações relacionadas a esta Política de Privacidade 
              ou ao tratamento de seus dados pessoais, entre em contato conosco:
            </p>
            <div className="p-4 bg-surface rounded-lg border border-border">
              <p className="text-text-primary font-semibold mb-2">Clicksehub</p>
              <p className="text-text-secondary text-sm mb-1">
                <strong>E-mail:</strong>{' '}
                <a href="mailto:clicksehub@gmail.com" className="text-accent hover:text-accent-dark underline">
                  clicksehub@gmail.com
                </a>
              </p>
              <p className="text-text-secondary text-sm mb-1">
                <strong>Encarregado de Dados (DPO):</strong> disponível através do e-mail acima
              </p>
              <p className="text-text-secondary text-sm">
                <strong>Horário de Atendimento:</strong> Segunda a Sexta, das 9h às 18h
              </p>
            </div>
            <p className="text-text-secondary leading-relaxed text-sm">
              Você também tem o direito de apresentar uma reclamação à Autoridade Nacional de Proteção de Dados (ANPD) 
              se considerar que o tratamento de seus dados pessoais viola a legislação aplicável.
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-6 text-text-muted text-sm">
          <p>© {new Date().getFullYear()} Clicksehub. Todos os direitos reservados.</p>
        </div>
          </div>
        </div>
      </main>

      {/* Cookie Consent Banner */}
      <CookieConsent />
    </div>
  );
}

