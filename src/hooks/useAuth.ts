import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export function useCurrentUser() {
  const { data: session, status } = useSession();
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      setUserId(session.user.id);
      setUserRole(session.user.role);
    } else {
      setUserId(null);
      setUserRole(null);
    }
  }, [session]);

  return {
    user: session?.user || null,
    userId,
    userRole,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading'
  };
}
