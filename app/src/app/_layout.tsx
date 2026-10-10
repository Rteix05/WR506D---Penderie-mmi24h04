import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
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
  // Polices du DS : chargées à l'exécution (useFonts marche dans Expo Go,
  // contrairement au plugin de config qui exige un build natif).
  const [fontsLoaded, fontError] = useFonts({
    Typolio: require('@/assets/fonts/Typolio-Regular.ttf'),
    Luciole: require('@/assets/fonts/Luciole-Regular.ttf'),
    'Luciole-Bold': require('@/assets/fonts/Luciole-Bold.ttf'),
  });
  // Si une police ne charge pas, l'app s'ouvre quand même, en police système.
  const ready = status !== 'loading' && (fontsLoaded || fontError !== null);

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) {
    return null;
  }

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
