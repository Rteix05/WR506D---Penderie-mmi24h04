import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { ActionBar, closeFlow, FlowScreen } from '@/components/add/FlowScreen';
import { ClothVisual } from '@/components/home/ClothVisual';
import { Banner, Pill } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { InfoCard } from '@/components/ui/InfoCard';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { locationPath, useDraft } from '@/lib/add-draft';

/**
 * « Objet ajouté ! » (Figma « Objet — Confirmation », 135:2103).
 * « Voir l'objet » ferme le parcours et ouvre sa fiche.
 */
export default function ItemDoneScreen() {
  const { t } = useTranslation('add');
  const { draft, created, reset } = useDraft();
  const total = created?.total ?? 0;

  return (
    <FlowScreen>
      <View className="pt-1">
        <Banner tone="success" title={t('itemDone.added')} text={t('itemDone.banner', { count: total })} />
      </View>
      <View className="px-5">
        <ScreenTitle title={created?.name ?? draft.name} legend={[t('itemDone.available'), draft.location.room?.name].filter(Boolean).join(' · ')} />
      </View>

      <View style={E1} className="mx-5 flex-row items-center gap-3 rounded-md bg-surface p-4 dark:bg-surface-night">
        <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-sm bg-ink/[0.04]">
          {draft.photo ? (
            <Image source={{ uri: draft.photo.uri }} style={{ width: 56, height: 56 }} contentFit="cover" accessible={false} />
          ) : (
            <ClothVisual kind="pantalon" scale={0.89} />
          )}
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{created?.name ?? draft.name}</Text>
          <Text className="font-luciole text-legend text-muted dark:text-muted-night">{locationPath(draft.location)}</Text>
        </View>
        <Pill label={t('itemDone.available')} />
      </View>

      <InfoCard
        title={t('itemDone.now')}
        rows={[
          [t('itemDone.lend'), t('itemDone.lendValue')],
          [t('itemDone.sell'), t('itemDone.sellValue')],
          [t('itemDone.move'), t('itemDone.moveValue')],
        ]}
      />

      <ActionBar note={created?.photoSaved === false ? t('itemDone.photoFailed') : undefined}>
        {created && (
          <Button
            label={t('itemDone.see')}
            onPress={() => {
              closeFlow();
              router.push({ pathname: '/objet/[id]', params: { id: created.id } });
            }}
          />
        )}
        <Button
          label={t('itemDone.addAnother')}
          variant="secondary"
          onPress={() => {
            reset('item');
            router.dismissTo('/ajout/scan');
          }}
        />
        <Button label={t('itemDone.home')} variant="ghost" onPress={closeFlow} />
      </ActionBar>
    </FlowScreen>
  );
}
