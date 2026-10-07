import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_URL, apiGet } from '@/lib/api';

/**
 * Écran provisoire du socle : prouve que l'app démarre, que les jetons du
 * design system s'appliquent, et qu'elle joint l'API Symfony. Il sera remplacé
 * par l'accueil de la maquette.
 */
export default function Index() {
  const api = useQuery({
    queryKey: ['api', 'entrypoint'],
    queryFn: ({ signal }) => apiGet<{ '@type': string }>('/api', signal),
    retry: false,
  });

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-night">
      <View className="flex-1 justify-center gap-8 px-5">
        <View className="gap-3">
          <Text className="text-h3 font-bold text-ink dark:text-ink-night">Penderie</Text>
          <Text className="text-body text-ink/70 dark:text-ink-night/70">
            Ranger, retrouver et partager tout ce que je possède.
          </Text>
        </View>

        <View className="gap-3 rounded-md bg-surface p-4 dark:bg-surface-night">
          <Text className="text-body font-bold text-ink dark:text-ink-night">Connexion à l&apos;API</Text>
          <Text className="text-legend text-muted dark:text-muted-night">{API_URL}</Text>

          {api.isPending && (
            <Text className="text-body text-muted dark:text-muted-night">Connexion en cours…</Text>
          )}
          {api.isSuccess && (
            <Text className="text-body font-bold text-main dark:text-main-night">
              Connectée ({api.data['@type']})
            </Text>
          )}
          {api.isError && (
            <View className="gap-3">
              <Text className="text-body text-error dark:text-error-night">
                Injoignable : {api.error.message}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => api.refetch()}
                className="min-h-11 items-center justify-center rounded-md bg-primary px-4">
                <Text className="text-body font-bold text-white">Réessayer</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Link href="/scan" asChild>
          <Pressable accessibilityRole="button" className="min-h-11 items-center justify-center rounded-md bg-primary px-4">
            <Text className="text-body font-bold text-white">Tester le scan</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
