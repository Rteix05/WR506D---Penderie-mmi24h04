import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionBar } from '@/components/add/FlowScreen';
import { ProfileAvatar } from '@/components/profiles/ProfileCard';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Heading } from '@/components/ui/Heading';
import { InfoCard } from '@/components/ui/InfoCard';
import { dateLocale } from '@/i18n';
import { useSwitchProfile } from '@/lib/auth';
import { deleteProfile, modeLabel, profileKind, useAccountProfile, usePermissions, type AccountProfile } from '@/lib/profiles';

/** « 4 avril 2026 » */
const longDate = (iso: string) => new Date(iso).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * La fiche d'un profil (Figma « Compte — Profil famille », 135:5972) :
 * en-tête rose (avatar, prénom, type, date de création), « Ce que Léa peut
 * faire », « Sa penderie » (objets, vêtements, prêts en cours), puis
 * Utiliser, Modifier, Autorisations, Supprimer ce profil.
 *
 * Écart avec la maquette : « Partager les logements » et « Partager les
 * amis » n'ont pas d'équivalent dans le modèle de données (les profils
 * d'un même compte forment déjà un foyer qui voit ses logements) : ces
 * interrupteurs ne sont pas repris.
 */
export default function ProfileDetailScreen() {
  const { t } = useTranslation('profiles');
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useAccountProfile(id);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg dark:bg-bg-night">
      {profile.isPending && <ActivityIndicator className="py-10" />}
      {profile.isError && <Text className="p-5 font-luciole text-body text-error dark:text-error-night">{profile.error.message}</Text>}
      {!profile.isPending && !profile.data && !profile.isError && (
        <View className="gap-4 p-5">
          <BackButton />
          <Text className="font-luciole text-body text-muted dark:text-muted-night">{t('detail.gone')}</Text>
        </View>
      )}
      {profile.data && <ProfileBody profile={profile.data} />}
    </SafeAreaView>
  );
}

function ProfileBody({ profile }: { profile: AccountProfile }) {
  const { t } = useTranslation('profiles');
  const queryClient = useQueryClient();
  const switchProfile = useSwitchProfile();
  const permissions = usePermissions(profile.id);
  const [busy, setBusy] = useState(false);
  const mode = (key: string) => {
    const found = permissions.data?.permissions.find((p) => p.permission === key);

    return found ? modeLabel(found.mode) : '…';
  };

  const use = async () => {
    setBusy(true);
    await switchProfile(profile.id);
    router.dismissTo('/');
  };

  const remove = () =>
    Alert.alert(
      t('detail.deleteTitle', { name: profile.displayName }),
      t('detail.deleteText', { name: profile.guardian?.displayName ?? t('detail.guardianFallback') }),
      [
        { text: t('detail.cancel'), style: 'cancel' },
        {
          text: t('detail.delete'),
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await deleteProfile(queryClient, profile.id);
              router.back();
            } catch (e) {
              setBusy(false);
              Alert.alert(t('detail.deleteError'), e instanceof Error ? e.message : '');
            }
          },
        },
      ],
    );

  return (
    <ScrollView contentContainerClassName="gap-6 pb-10">
      <View className="items-center gap-2 bg-primary/[0.08] px-5 pb-6 pt-3">
        <View className="w-full flex-row">
          <BackButton />
        </View>
        <ProfileAvatar name={profile.displayName} size={88} />
        <Heading level="h3" accessibilityRole="header" className="uppercase text-ink dark:text-ink-night">
          {profile.displayName}
        </Heading>
        <Text className="font-luciole text-body text-muted dark:text-muted-night">
          {[profileKind(profile), profile.type === 'CHILD' ? t('meta.age', { age: profile.age }) : null].filter(Boolean).join(' · ')}
        </Text>
        {profile.createdAt && <Text className="font-luciole text-legend text-muted dark:text-muted-night">{t('detail.createdOn', { date: longDate(profile.createdAt) })}</Text>}
      </View>

      <InfoCard
        title={t('detail.canDo', { name: profile.displayName })}
        rows={[
          [t('detail.addItems'), mode('ITEM_CREATE')],
          [t('detail.lend'), mode('LOAN_LEND')],
          [t('detail.borrow'), mode('LOAN_BORROW')],
          [t('detail.sell'), mode('SELL')],
        ]}
      />
      <InfoCard
        title={t('detail.wardrobe')}
        rows={[
          [t('detail.items'), String(profile.counts.items)],
          [t('detail.garments'), String(profile.counts.garments)],
          [t('detail.activeLoans'), String(profile.counts.activeLoans)],
        ]}
      />
      {profile.guardian && <InfoCard title={t('detail.guardianship')} rows={[[t('detail.managedBy'), profile.guardian.displayName]]} />}

      <ActionBar>
        {!profile.active && <Button label={t('detail.use')} onPress={use} loading={busy} disabled={profile.suspended} />}
        {(profile.canManage || profile.active) && (
          <Button label={t('detail.edit')} variant={profile.active ? 'primary' : 'secondary'} onPress={() => router.push({ pathname: '/profils/[id]/modifier', params: { id: profile.id } })} disabled={busy} />
        )}
        {profile.type !== 'ADULT' && (
          <Button
            label={profile.canManage ? t('detail.permissions') : t('detail.myPermissions')}
            variant="secondary"
            onPress={() => router.push({ pathname: '/profils/[id]/autorisations', params: { id: profile.id } })}
            disabled={busy}
          />
        )}
        {profile.canDelete && (
          <Pressable accessibilityRole="button" onPress={remove} disabled={busy} hitSlop={8} className="self-center py-1">
            <Text className="font-luciole-bold text-legend text-error dark:text-error-night">{t('detail.deleteProfile')}</Text>
          </Pressable>
        )}
      </ActionBar>
    </ScrollView>
  );
}
