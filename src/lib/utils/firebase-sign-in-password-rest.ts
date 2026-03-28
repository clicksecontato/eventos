/**
 * Login e-mail/senha via Identity Toolkit (REST), adequado ao Node no NextAuth.
 * O SDK web `signInWithEmailAndPassword` no servidor costuma falhar de forma opaca.
 */
export interface ResultadoSignInPasswordRest {
  localId: string;
  email: string;
  displayName?: string;
  idToken: string;
}

export async function firebaseSignInWithPasswordRest(
  email: string,
  password: string
): Promise<ResultadoSignInPasswordRest> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey || apiKey === 'demo-key') {
    throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY não configurada');
  }

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim(),
      password,
      returnSecureToken: true
    })
  });

  const data = (await res.json()) as {
    localId?: string;
    email?: string;
    displayName?: string;
    idToken?: string;
    error?: { message?: string; code?: number };
  };

  if (!res.ok || !data.localId || !data.idToken) {
    const code = data.error?.message ?? 'FALHA_LOGIN_FIREBASE';
    const err = new Error(code);
    (err as Error & { firebaseCode: string }).firebaseCode = code;
    throw err;
  }

  return {
    localId: data.localId,
    email: data.email ?? email.trim(),
    displayName: data.displayName,
    idToken: data.idToken
  };
}
