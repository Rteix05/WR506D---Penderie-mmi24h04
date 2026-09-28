import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';

import { queryClient } from '@/lib/query-client';

/**
 * Racine de l'app : fournit le cache React Query à tous les écrans.
 * La barre à cinq onglets de la maquette remplacera cette pile quand les
 * premiers écrans métier arriveront.
 */
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
