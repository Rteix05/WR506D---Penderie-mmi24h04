import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';

import { SessionProvider, useSessionStatus } from '@/lib/auth';
import { queryClient } from '@/lib/query-client';

// L'écran de démarrage reste affiché tant que la session n'est pas relue :
// pas de flash de l'écran de connexion pour quelqu'un déjà connecté.
SplashScreen.preventAutoHideAsync();

/**
 * Racine de l'app : le cache React Query, la session, puis deux mondes
 * séparés par Stack.Protected :
 *  - (app) : l'app elle-même (onglets), seulement si on est connecté ;
 *  - (auth) : connexion et inscription, seulement si on ne l'est pas.
 * Quand l'état change (connexion, déconnexion, session expirée), Expo
 * Router bascule tout seul vers le monde autorisé.
 */
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const status = useSessionStatus();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hide();
  }, [status]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
