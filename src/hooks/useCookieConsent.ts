'use client';

import { useState, useEffect } from 'react';

const COOKIE_CONSENT_KEY = 'clicksehub_cookie_consent';
const COOKIE_CONSENT_DATE_KEY = 'clicksehub_cookie_consent_date';

export interface CookieConsent {
  accepted: boolean;
  date: string | null;
  preferences?: {
    necessary: boolean;
    analytics: boolean;
    marketing: boolean;
  };
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent>({
    accepted: false,
    date: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se está no cliente (não SSR)
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      const storedDate = localStorage.getItem(COOKIE_CONSENT_DATE_KEY);

      if (stored === 'true' && storedDate) {
        setConsent({
          accepted: true,
          date: storedDate,
          preferences: {
            necessary: true,
            analytics: localStorage.getItem('cookie_analytics') === 'true',
            marketing: localStorage.getItem('cookie_marketing') === 'true',
          },
        });
      }
    } catch (error) {
      // Erro ao ler consentimento
    } finally {
      setIsLoading(false);
    }
  }, []);

  const acceptCookies = (preferences?: CookieConsent['preferences']) => {
    const date = new Date().toISOString();
    const consentData: CookieConsent = {
      accepted: true,
      date: date,
      preferences: preferences || {
        necessary: true,
        analytics: true,
        marketing: true,
      },
    };

    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
      localStorage.setItem(COOKIE_CONSENT_DATE_KEY, date);
      
      if (consentData.preferences) {
        localStorage.setItem('cookie_analytics', consentData.preferences.analytics.toString());
        localStorage.setItem('cookie_marketing', consentData.preferences.marketing.toString());
      }

      setConsent(consentData);
    } catch (error) {
      // Erro ao salvar consentimento
    }
  };

  const rejectCookies = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'false');
      localStorage.setItem(COOKIE_CONSENT_DATE_KEY, new Date().toISOString());
      localStorage.setItem('cookie_analytics', 'false');
      localStorage.setItem('cookie_marketing', 'false');

      setConsent({
        accepted: false,
        date: new Date().toISOString(),
        preferences: {
          necessary: true,
          analytics: false,
          marketing: false,
        },
      });
    } catch (error) {
      // Erro ao rejeitar cookies
    }
  };

  return {
    consent,
    isLoading,
    acceptCookies,
    rejectCookies,
    hasConsent: consent.accepted,
  };
}

