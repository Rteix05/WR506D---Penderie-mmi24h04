import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { ProfileCard } from '@/components/profiles/ProfileCard';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { useSwitchProfile } from '@/lib/auth';
import { useAccountProfiles } from '@/lib/profiles';

/**
 * « Changer de profil » (Figma « Compte — Changer de profil », 135:5957) :
 * un profil par carte, l'actif marqué, puis « Profils de la famille ·
 * Gérer » et « Continuer ». Toucher une carte la choisit ; « Continuer »
 * ouvre la penderie de ce profil.
 *
 * Écart avec la maquette : « Gérer » mène à la fiche du profil choisi
 * (modifier, autorisations, supprimer) et à l'ajout d'un profil, au lieu
 * d'une page de gestion à part.
 */
export default function SwitchProfileScreen() {
  const { t } = useTranslation('profiles');
  const profiles = useAccountProfiles();
  const switchProfile = useSwitchProfile();
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const active = profiles.data?.find((p) => p.active);
  const target = chosen ?? active?.id ?? null;
  const canCreate = active?.type === 'ADULT';

  const go = async () => {
    if (!target || target === active?.id) {
      router.back();

      return;
    }
    setBusy(true);
    await switchProfile(target);
    // Toute l'app repart du profil choisi : on revient à l'accueil.
    router.dismissTo('/');
  };

  return (
    <FlowScreen>
      <View className="flex-row px-5">
        <BackButton close />
      </View>
      <View className="px-5">
        <ScreenTitle title={t('switch.title')} legend={t('switch.legend')} />
      </View>

      {profiles.isPending && <ActivityIndicator className="py-6" />}
      {profiles.isError && <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{profiles.error.message}</Text>}

      <View accessibilityRole="radiogroup" className="gap-3 px-5">
        {profiles.data?.map((p) => (
          <ProfileCard key={p.id} profile={p} selected={p.id === target && !p.active} onPress={() => (p.suspended ? undefined : setChosen(p.id))} />
        ))}
      </View>

      <View className="px-5">
        <View style={E1} className="flex-row items-center gap-3 rounded-md bg-surface px-4 py-3 dark:bg-surface-night">
          <View className="flex-1 gap-0.5">
            <Text className="font-luciole-bold text-[18px] text-ink dark:text-ink-night">{t('switch.family')}</Text>
            <Text className="font-luciole text-legend text-muted dark:text-muted-night">{canCreate ? t('switch.manageHint') : t('switch.viewHint')}</Text>
          </View>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => target && router.push({ pathname: '/profils/[id]', params: { id: target } })}>
            <Text className="font-luciole-bold text-legend text-primary dark:text-primary-night">{t('switch.manage')}</Text>
          </Pressable>
        </View>
      </View>

      <ActionBar note={t('switch.note')}>
        <Button label={t('switch.continue')} onPress={go} loading={busy} disabled={!profiles.data} />
        {canCreate && <Button label={t('switch.add')} variant="secondary" glyph="+" onPress={() => router.push('/profils/nouveau')} disabled={busy} />}
      </ActionBar>
    </FlowScreen>
  );
}
