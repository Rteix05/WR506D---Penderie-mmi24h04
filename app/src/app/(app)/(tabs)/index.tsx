import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { useActiveProfile } from '@/lib/auth';

/**
 * Accueil (docs/accueil-final.png). Pour l'instant : le bonjour au profil
 * actif et les deux actions de la maquette. Les compteurs, les cartes
 * Inventaire / Dressing et les derniers ajouts arrivent avec l'inventaire.
 */
export default function HomeScreen() {
  const profile = useActiveProfile();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-8 px-5 py-6">
        <ScreenTitle title={profile ? `Bonjour ${profile.displayName}` : 'Bonjour'} legend={profile ? `@${profile.username}` : undefined} />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button label="Scanner" onPress={() => router.push('/scan')} />
          </View>
          <View className="flex-1">
            <Button label="+ Ajouter" variant="secondary" onPress={() => router.push('/scan')} />
          </View>
        </View>

        <View className="gap-3 rounded-md bg-surface p-4 dark:bg-surface-night">
          <Text className="text-body font-bold text-ink dark:text-ink-night">Ton inventaire arrive bientôt</Text>
          <Text className="text-body text-ink/70 dark:text-ink-night/70">
            Ici s&apos;afficheront tes objets, ton dressing et tes derniers ajouts. En attendant, le scan reconnaît déjà un vêtement ou une étiquette.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
