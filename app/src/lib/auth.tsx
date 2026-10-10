import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { activeProfileId, ApiError, apiRequest, onSessionChange, restoreSession, setActiveProfileId } from '@/lib/api';

type Status = 'loading' | 'signedIn' | 'signedOut';

const SessionContext = createContext<Status | null>(null);

/**
 * Fournit l'état de connexion à toute l'app. Au lancement, l'état vaut
 * « loading » le temps de relire le trousseau (l'écran de démarrage reste
 * affiché), puis « signedIn » ou « signedOut ». L'écran racine s'en sert
 * pour montrer soit l'app, soit la connexion (Stack.Protected).
 */
export function SessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<Status>('loading');
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onSessionChange((signedIn) => {
      // À la déconnexion, on vide le cache : le compte suivant ne doit rien
      // voir des données du précédent.
      if (!signedIn) queryClient.clear();
      setStatus(signedIn ? 'signedIn' : 'signedOut');
    });
    restoreSession()
      .then((signedIn) => setStatus(signedIn ? 'signedIn' : 'signedOut'))
      .catch(() => setStatus('signedOut'));

    return unsubscribe;
  }, [queryClient]);

  return <SessionContext value={status}>{children}</SessionContext>;
}

export function useSessionStatus(): Status {
  const status = use(SessionContext);
  if (status === null) {
    throw new Error('useSessionStatus doit être utilisé sous <SessionProvider>.');
  }

  return status;
}

// ---------------------------------------------------------------------------
// Qui suis-je (GET /api/me)
// ---------------------------------------------------------------------------

export type ProfileType = 'ADULT' | 'CHILD' | 'RELATIVE';

export type MeProfile = {
  id: string;
  '@id': string;
  username: string;
  displayName: string;
  type: ProfileType;
  isDefault: boolean;
  suspended: boolean;
};

export type Me = {
  account: { id: string; email: string; roles: string[] };
  activeProfile: string;
  profiles: MeProfile[];
};

async function fetchMe(signal: AbortSignal): Promise<Me> {
  try {
    return await apiRequest<Me>('/api/me', { signal, accept: 'application/json' });
  } catch (error) {
    // Le profil gardé en mémoire n'est plus utilisable (supprimé, suspendu) :
    // on revient au profil par défaut du compte plutôt que de bloquer l'app.
    if (error instanceof ApiError && error.status === 403 && activeProfileId() !== null) {
      await setActiveProfileId(null);

      return apiRequest<Me>('/api/me', { signal, accept: 'application/json' });
    }
    throw error;
  }
}

/** Le compte connecté, ses profils et le profil actif. */
export function useMe() {
  const status = useSessionStatus();

  return useQuery({ queryKey: ['me'], queryFn: ({ signal }) => fetchMe(signal), enabled: status === 'signedIn' });
}

/** Le profil actif, tel que /api/me le décrit. */
export function useActiveProfile(): MeProfile | undefined {
  const me = useMe().data;

  return me?.profiles.find((profile) => profile.id === me.activeProfile);
}

/**
 * Passe sur un autre profil du compte (Rafael → Léa). Tout le cache est
 * jeté : chaque écran recharge ses données vues par le nouveau profil.
 */
export function useSwitchProfile() {
  const queryClient = useQueryClient();

  return async (profileId: string) => {
    await setActiveProfileId(profileId);
    await queryClient.resetQueries();
  };
}
