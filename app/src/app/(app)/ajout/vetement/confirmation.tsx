import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ActionBar, closeFlow, FlowScreen } from '@/components/add/FlowScreen';
import { PhotoZone } from '@/components/add/PhotoZone';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { InfoCard, PathCard } from '@/components/ui/InfoCard';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { locationPath, useDraft } from '@/lib/add-draft';

/**
 * « Vêtement ajouté ! » (Figma « Vêtement — Ajout · Confirmation »,
 * 135:3164). « Voir le vêtement » ferme le parcours et ouvre sa fiche.
 */
export default function GarmentDoneScreen() {
  const { t } = useTranslation('add');
  const { draft, created, reset } = useDraft();
  const total = created?.total ?? 0;

  return (
    <FlowScreen>
      <View className="pt-1">
        <Banner tone="success" title={t('garmentDone.added')} text={t('garmentDone.banner', { count: total })} />
      </View>
      <View className="px-5">
        <ScreenTitle title={created?.name ?? draft.name} legend={[t('garmentDone.legend'), draft.location.room?.name].filter(Boolean).join(' · ')} />
      </View>
      <PhotoZone photo={draft.photo} art={draft.garmentType?.art ?? 'tshirt'} />
      <PathCard title={t('garmentDone.location')} path={locationPath(draft.location)} />
      <InfoCard
        title={t('garmentDone.now')}
        rows={[
          [t('garmentDone.wear'), t('garmentDone.wearValue')],
          [t('garmentDone.lend'), t('garmentDone.lendValue')],
          [t('garmentDone.sell'), t('garmentDone.sellValue')],
        ]}
      />
      <ActionBar note={created?.photoSaved === false ? t('garmentDone.photoFailed') : undefined}>
        {created && (
          <Button
            label={t('garmentDone.see')}
            onPress={() => {
              closeFlow();
              router.push({ pathname: '/vetement/[id]', params: { id: created.id } });
            }}
          />
        )}
        <Button
          label={t('garmentDone.addAnother')}
          variant="secondary"
          onPress={() => {
            reset('garment');
            router.dismissTo('/ajout/vetement/type');
          }}
        />
        <Button label={t('garmentDone.home')} variant="ghost" onPress={closeFlow} />
      </ActionBar>
    </FlowScreen>
  );
}
