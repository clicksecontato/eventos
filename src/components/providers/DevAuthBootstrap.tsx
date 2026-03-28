'use client';

import { useEffect, useRef } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { SENHA_CREDENCIALS_BYPASS_DESENVOLVIMENTO } from '@/lib/constants/dev-bypass-credenciais';

/**
 * Em desenvolvimento, dispara signIn Credentials com o usuário de bypass
 * para a UI (useSession) alinhar com as APIs que já aceitam bypass.
 */
export function DevAuthBootstrap() {
  const { status } = useSession();
  const tentou = useRef(false);

  useEffect(() => {
    const ativo = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';
    if (!ativo || status !== 'unauthenticated' || tentou.current) {
      return;
    }
    tentou.current = true;
    const email =
      process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS_EMAIL?.trim() ||
      'kontempler@gmail.com';
    void signIn('credentials', {
      email,
      password: SENHA_CREDENCIALS_BYPASS_DESENVOLVIMENTO,
      redirect: false
    });
  }, [status]);

  return null;
}
