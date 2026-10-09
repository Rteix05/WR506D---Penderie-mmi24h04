import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClothVisual, type ClothKind } from '@/components/home/ClothVisual';
import { useOpenAddMenu } from '@/components/nav/AddMenu';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { useActiveProfile } from '@/lib/auth';
import { relativeDay, useInventoryOverview, type RecentEntry } from '@/lib/inventory';

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * Accueil — Tableau de bord, d'après Figma (page « Maquette v2 », node
 * 135:1797) : barre haute (marque, notifications, avatar), salutation et
 * compteurs, Scanner / Ajouter, aperçus Inventaire et Dressing, derniers
 * ajouts.
 *
 * Données réelles : compteurs et derniers ajouts viennent de l'API. Les
 * sections « Prêts en cours », « Tenues suggérées » et le lien vers la
 * penderie des amis attendent leurs routes d'API ; elles apparaîtront avec
 * elles, plutôt que d'afficher des données d'exemple.
 */
export default function HomeScreen() {
  const profile = useActiveProfile();
  const overview = useInventoryOverview();
  const openAdd = useOpenAddMenu();
  const counts = overview.data ? `${plural(overview.data.items, 'objet', 'objets')} · ${plural(overview.data.garments, 'vêtement', 'vêtements')}` : ' ';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-6 pb-14">
        <TopBar initial={profile?.displayName.charAt(0).toUpperCase() ?? ''} />

        <View className="gap-1 px-5">
          <Text accessibilityRole="header" className="font-typolio text-h3 uppercase text-ink dark:text-ink-night">
            {profile ? `Bonjour ${profile.displayName}` : 'Bonjour'}
          </Text>
          <Text className="font-luciole text-legend text-muted dark:text-muted-night">{counts}</Text>
        </View>

        <View className="flex-row gap-3 px-5">
          <View className="flex-1">
            <Button glyph="[ ]" label="Scanner" onPress={() => router.push('/ajout/scan')} />
          </View>
          <View className="flex-1">
            <Button glyph="+" label="Ajouter" variant="secondary" onPress={openAdd} />
          </View>
        </View>

        <View className="flex-row gap-3 px-5">
          <Preview title="Inventaire" meta={overview.data ? plural(overview.data.items, 'objet', 'objets') : ' '} tint="bg-primary/[0.08]" art={['baskets', 'casquette', 'pantalon', 'veste']} />
          <Preview title="Dressing" meta={overview.data ? plural(overview.data.garments, 'vêtement', 'vêtements') : ' '} tint="bg-cloth/[0.08]" art={['tshirt', 'veste', 'robe', 'casquette']} />
        </View>

        <View className="gap-3">
          <Text accessibilityRole="header" className="px-5 font-luciole-bold text-body text-ink dark:text-ink-night">
            Derniers ajouts
          </Text>
          {overview.isError && <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{overview.error.message}</Text>}
          {overview.data && overview.data.recent.length === 0 && (
            <View style={E1} className="mx-5 gap-1 rounded-md bg-surface p-4 dark:bg-surface-night">
              <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">Rien pour l&apos;instant</Text>
              <Text className="font-luciole text-legend text-muted dark:text-muted-night">Scanne ou ajoute ton premier objet : il apparaîtra ici.</Text>
            </View>
          )}
          {overview.data && overview.data.recent.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-5 pb-1">
              {overview.data.recent.map((entry) => (
                <RecentCard key={entry.id} entry={entry} />
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Barre haute (Figma « Barre haute ») : logo 28 + PENDERIE, puis « ! » et l'avatar, ronds de 36. */
function TopBar({ initial }: { initial: string }) {
  return (
    <View className="h-14 flex-row items-center justify-between px-5">
      <View className="flex-row items-center gap-2">
        <Image source={require('@/assets/images/logo.png')} style={{ width: 28, height: 25.73 }} contentFit="contain" accessible={false} />
        <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">PENDERIE</Text>
      </View>
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => Alert.alert('Notifications', 'Les notifications arrivent bientôt.')}
          hitSlop={4}
          style={E1}
          className="h-9 w-9 items-center justify-center rounded-full bg-surface active:opacity-80 dark:bg-surface-night">
          <Text className="font-luciole-bold text-[14px] text-ink dark:text-ink-night">!</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mon profil"
          onPress={() => router.navigate('/profil')}
          hitSlop={4}
          className="h-9 w-9 items-center justify-center rounded-full bg-primary/[0.12] active:opacity-80">
          <Text className="font-luciole-bold text-legend text-primary dark:text-primary-night">{initial}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Carte d'aperçu (Figma « Card/Apercu ») : mosaïque 2 × 2 de vignettes de 63, titre et compteur. */
function Preview({ title, meta, tint, art }: { title: string; meta: string; tint: string; art: ClothKind[] }) {
  const tile = (kind: ClothKind, i: number) => (
    <View key={i} className={`h-[63px] w-[63px] items-center justify-center overflow-hidden rounded-xs ${tint}`}>
      <ClothVisual kind={kind} />
    </View>
  );

  return (
    <View accessible accessibilityLabel={`${title}, ${meta}`} style={E1} className="flex-1 gap-3 rounded-md bg-surface p-3 dark:bg-surface-night">
      <View className="gap-1.5">
        <View className="flex-row gap-1.5">{art.slice(0, 2).map(tile)}</View>
        <View className="flex-row gap-1.5">{art.slice(2, 4).map((k, i) => tile(k, i + 2))}</View>
      </View>
      <View className="gap-0.5 pl-1">
        <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{title}</Text>
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">{meta}</Text>
      </View>
    </View>
  );
}

/** Carte d'objet (Figma « Card/Object ») : 140 de large, vignette 124 × 162, nom, pièce, date. */
function RecentCard({ entry }: { entry: RecentEntry }) {
  const when = relativeDay(entry.createdAt);

  return (
    <View
      accessible
      accessibilityLabel={[entry.name, entry.room, when].filter(Boolean).join(', ')}
      style={E1}
      className="w-[140px] gap-2 rounded-md bg-surface px-2 pb-3 pt-2 dark:bg-surface-night">
      <View className={`h-[162px] w-[124px] items-center justify-center overflow-hidden rounded-sm ${entry.kind === 'garment' ? 'bg-cloth/[0.08]' : 'bg-primary/[0.08]'}`}>
        <ClothVisual kind={entry.kind === 'garment' ? 'tshirt' : 'baskets'} scale={1.968} />
      </View>
      <View className="gap-0.5 px-1">
        <Text numberOfLines={1} className="font-luciole-bold text-legend text-ink dark:text-ink-night">
          {entry.name}
        </Text>
        {entry.room && (
          <Text numberOfLines={1} className="font-luciole text-legend text-muted dark:text-muted-night">
            {entry.room}
          </Text>
        )}
        <Text className="font-luciole text-legend text-muted/[0.60] dark:text-muted-night/[0.60]">{when}</Text>
      </View>
    </View>
  );
}
