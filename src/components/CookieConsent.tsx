'use client';

import React, { useState, useEffect } from 'react';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { Button } from '@/components/ui/button';
import {
  XMarkIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function CookieConsent() {
  const { consent, isLoading, acceptCookies, rejectCookies, hasConsent } = useCookieConsent();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Aguardar o carregamento do consentimento antes de mostrar
    if (!isLoading && !hasConsent) {
      // Pequeno delay para melhor UX
      const timer = setTimeout(() => {
        setIsVisible(true);
        setTimeout(() => setIsAnimating(true), 10);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, hasConsent]);

  const handleAccept = () => {
    setIsAnimating(false);
    setTimeout(() => {
      acceptCookies();
      setIsVisible(false);
    }, 300);
  };

  const handleReject = () => {
    setIsAnimating(false);
    setTimeout(() => {
      rejectCookies();
      setIsVisible(false);
    }, 300);
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      // Aceitar apenas cookies necessários ao fechar
      acceptCookies({
        necessary: true,
        analytics: false,
        marketing: false,
      });
      setIsVisible(false);
    }, 300);
  };

  if (isLoading || hasConsent || !isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${
        isAnimating
          ? 'translate-y-0 opacity-100'
          : 'translate-y-full opacity-0'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-4">
        <div className="relative rounded-lg border border-border bg-surface shadow-xl backdrop-blur-sm">
          {/* Botão de fechar */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-surface-hover transition-colors text-text-secondary hover:text-text-primary"
            aria-label="Fechar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <div className="p-4 sm:p-6 pr-12">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              {/* Ícone */}
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/10">
                  <ShieldCheckIcon className="h-6 w-6 text-accent" />
                </div>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-text-primary">
                    Utilizamos Cookies
                  </h3>
                  <InformationCircleIcon className="h-5 w-5 text-text-secondary flex-shrink-0 mt-0.5" />
                </div>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  Utilizamos cookies e tecnologias similares para melhorar sua experiência, 
                  analisar o desempenho do site e personalizar conteúdo. Ao continuar navegando, 
                  você concorda com nossa{' '}
                  <Link
                    href="/politica-privacidade"
                    className="text-accent hover:text-accent-dark underline font-medium"
                  >
                    Política de Privacidade
                  </Link>
                  {' '}e{' '}
                  <Link
                    href="/termos-uso"
                    className="text-accent hover:text-accent-dark underline font-medium"
                  >
                    Termos de Uso
                  </Link>
                  .
                </p>

                {/* Botões */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleAccept}
                    className="flex-1 sm:flex-none bg-accent hover:bg-accent-dark text-white border-accent hover:border-accent-dark shadow-sm hover:shadow-md transition-all"
                  >
                    Aceitar Todos
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="outline"
                    className="flex-1 sm:flex-none border-border hover:bg-surface-hover text-text-primary"
                  >
                    Aceitar Apenas Necessários
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

