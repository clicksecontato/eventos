'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import { usePlano } from '@/lib/hooks/usePlano';
import { useSidebar } from '@/contexts/SidebarContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import LoadingHotmart from '@/components/LoadingHotmart';
import CookieConsent from '@/components/CookieConsent';
import {
  HomeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CogIcon,
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  WrenchScrewdriverIcon,
  TagIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  DocumentTextIcon,
  BanknotesIcon,
  CalculatorIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BellIcon
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/painel', icon: HomeIcon },
  { name: 'Eventos', href: '/eventos', icon: CalendarIcon },
  { name: 'Clientes', href: '/clientes', icon: UserIcon },
  { name: 'Relatórios', href: '/relatorios', icon: ChartBarIcon },
  { name: 'Contratos', href: '/contratos', icon: DocumentTextIcon },
  { name: 'Pagamentos', href: '/pagamentos', icon: BanknotesIcon },
  { name: 'Tipos de Serviços', href: '/servicos', icon: WrenchScrewdriverIcon },
  { name: 'Canais de Entrada', href: '/canais-entrada', icon: TagIcon },
  { name: 'Tipos de Evento', href: '/tipos-eventos', icon: CalendarDaysIcon },
  { name: 'Tipos de Custo', href: '/tipos-custos', icon: CalculatorIcon },
  { name: 'Configurações', href: '/configuracoes', icon: CogIcon },
  // { name: 'Google Calendar', href: '/configuracoes/calendario', icon: CalendarIcon }, // COMENTADO: Aguardando permissões diretas da Google para dados sensíveis
];

const adminNavigation = [
  { name: 'Funcionalidades', href: '/admin/funcionalidades', icon: CogIcon },
  { name: 'Planos', href: '/admin/planos', icon: CogIcon },
  { name: 'Atividades', href: '/admin/atividades', icon: BellIcon },
];

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Banner de plano não é dismissível - sempre visível até adquirir plano
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { statusPlano, loading: loadingPlano } = usePlano();
  const { isCollapsed, toggleSidebar } = useSidebar();

  const loading = status === 'loading';
  const user = session?.user ? {
    name: session.user.name || 'Usuário',
    email: session.user.email || ''
  } : null;

  // Verificar se usuário tem plano ativo
  const temPlanoAtivo = statusPlano?.ativo === true;

  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/painel');
    }
  }, [status, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingHotmart size="md" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/painel' });
  };

  // Verificar se um item do menu está ativo
  const isActive = (href: string) => {
    if (href === '/painel') {
      return pathname === '/painel' || pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex w-64 flex-col bg-surface/95 backdrop-blur-md shadow-2xl border-r border-border">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Image 
                src="/logo.png" 
                alt="Clicksehub Logo" 
                width={32} 
                height={32}
                className="object-contain"
              />
              <h1 className="text-xl font-bold self-end">
                <span className="text-primary">Clickse</span>
                <span style={{ color: '#FF4001' }}>hub</span>
              </h1>
            </div>
            <button
              type="button"
              className="text-text-muted hover:text-text-secondary cursor-pointer"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group relative flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                    active
                      ? 'bg-primary/10 text-primary shadow-sm scale-105'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary hover:shadow-sm hover:scale-[1.02]'
                  }`}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                  )}
                  <item.icon className={`mr-3 h-5 w-5 transition-transform duration-200 ${
                    active ? 'scale-110' : 'group-hover:scale-110'
                  }`} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
            
            {session?.user?.role === 'admin' && (
              <>
                <div className="border-t border-border my-4"></div>
                <div className="px-2">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Administração
                  </h3>
                  {adminNavigation.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`group relative flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                          active
                            ? 'bg-primary/10 text-primary shadow-sm scale-105'
                            : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary hover:shadow-sm hover:scale-[1.02]'
                        }`}
                      >
                        {active && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                        )}
                        <item.icon className={`mr-3 h-5 w-5 transition-transform duration-200 ${
                          active ? 'scale-110' : 'group-hover:scale-110'
                        }`} />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </nav>
          <div className="flex-shrink-0 border-t border-border p-4">
            <div className="flex items-center mb-3">
              <div className="flex-shrink-0">
                <UserIcon className="h-8 w-8 rounded-full bg-surface" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-text-primary">{user?.name}</p>
                <p className="text-xs text-text-muted">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={handleLogout}
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        <div className="flex flex-grow flex-col overflow-y-auto bg-surface/95 backdrop-blur-md border-r border-border shadow-xl">
          <div className={`flex h-16 items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
            {!isCollapsed ? (
              <div className="flex items-center gap-2 flex-1">
                <Image 
                  src="/logo.png" 
                  alt="Clicksehub Logo" 
                  width={32} 
                  height={32}
                  className="object-contain"
                />
                <h1 className="text-xl font-bold self-end">
                  <span className="text-primary">Clickse</span>
                  <span style={{ color: '#FF4001' }}>hub</span>
                </h1>
              </div>
            ) : (
              <div className="flex justify-center w-full">
                <Image 
                  src="/logo.png" 
                  alt="Clicksehub Logo" 
                  width={32} 
                  height={32}
                  className="object-contain"
                />
              </div>
            )}
            {!isCollapsed && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={toggleSidebar}
                      className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
                      aria-label="Colapsar menu"
                    >
                      <ChevronLeftIcon className="h-5 w-5 text-text-secondary" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Colapsar menu
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {isCollapsed && (
            <div className="flex justify-center px-2 pb-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={toggleSidebar}
                      className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
                      aria-label="Expandir menu"
                    >
                      <ChevronRightIcon className="h-5 w-5 text-text-secondary" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Expandir menu
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          <nav className="flex-1 space-y-1 px-2 py-4">
            <TooltipProvider>
              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <Tooltip key={item.name} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={`group relative flex items-center text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                          isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                        } ${
                          active
                            ? 'bg-primary/10 text-primary shadow-sm scale-105'
                            : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary hover:shadow-sm hover:scale-[1.02]'
                        }`}
                      >
                        {active && !isCollapsed && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                        )}
                        <item.icon className={`transition-transform duration-200 ${
                          isCollapsed ? 'h-5 w-5' : 'h-5 w-5 mr-3'
                        } ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                        {!isCollapsed && <span className="font-medium">{item.name}</span>}
                      </Link>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side="right">
                        {item.name}
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </TooltipProvider>
            
            {session?.user?.role === 'admin' && (
              <>
                <div className="border-t border-border my-4"></div>
                {!isCollapsed && (
                  <div className="px-2">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                      Administração
                    </h3>
                  </div>
                )}
                <TooltipProvider>
                  {adminNavigation.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Tooltip key={item.name} delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={`group relative flex items-center text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                              isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                            } ${
                              active
                                ? 'bg-primary/10 text-primary shadow-sm scale-105'
                                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary hover:shadow-sm hover:scale-[1.02]'
                            }`}
                          >
                            {active && !isCollapsed && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                            )}
                            <item.icon className={`transition-transform duration-200 ${
                              isCollapsed ? 'h-5 w-5' : 'h-5 w-5 mr-3'
                            } ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                            {!isCollapsed && <span className="font-medium">{item.name}</span>}
                          </Link>
                        </TooltipTrigger>
                        {isCollapsed && (
                          <TooltipContent side="right">
                            {item.name}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </>
            )}
          </nav>
          <div className={`flex-shrink-0 border-t border-border ${isCollapsed ? 'p-2' : 'p-4'}`}>
            {!isCollapsed ? (
              <>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserIcon className="h-8 w-8 rounded-full bg-surface" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-text-primary">{user?.name}</p>
                    <p className="text-xs text-text-muted">{user?.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={handleLogout}
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={handleLogout}
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Sair
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Banner de Plano - Não dismissível, sempre visível até ter plano */}
        {!loadingPlano && !temPlanoAtivo && (
          <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-red-500/10 border-b-2 border-amber-500/40 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-shrink-0 p-1.5 bg-amber-500/20 rounded-full">
                  <CreditCardIcon className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text-primary">
                    Você ainda não possui um plano ativo
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Adquira um plano para desbloquear todas as funcionalidades do sistema
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => router.push('/planos')}
                className="bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-sm"
              >
                Ver Planos Disponíveis
              </Button>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className={`sticky ${!loadingPlano && !temPlanoAtivo ? 'top-[73px]' : 'top-0'} z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-surface/80 backdrop-blur-md px-4 shadow-lg sm:gap-x-6 sm:px-6 lg:px-8`}>
          <button
            type="button"
            className="-m-2.5 p-2.5 text-text-primary lg:hidden cursor-pointer"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" />
              <ThemeToggle />
              <div className="flex items-center gap-x-2">
                <UserIcon className="h-6 w-6 text-text-muted" />
                <span className="text-sm font-medium text-text-primary">{user?.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      
      {/* Cookie Consent Banner */}
      <CookieConsent />
    </div>
  );
}
