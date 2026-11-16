import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { ActionBar, closeFlow, FlowScreen } from '@/components/add/FlowScreen';
import { PhotoZone } from '@/components/add/PhotoZone';
import { StepHeader } from '@/components/add/StepHeader';
import { Pill } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Heading } from '@/components/ui/Heading';
import { E1 } from '@/components/ui/elevation';
import { InfoCard } from '@/components/ui/InfoCard';
import { useDraft } from '@/lib/add-draft';

/**
 * « On a reconnu » (Figma « Objet — Résultat du scan », node 135:1969) :
 * ce que l'IA a trouvé, à vérifier. Continuer et Modifier mènent tous deux
 * au formulaire, pré-rempli ; un vêtement reconnu part vers le formulaire
 * vêtement (taille, couleur…), un objet vers le formulaire objet. Tout ce
 * qui est montré ici arrive pré-rempli dans le formulaire, modifiable.
 */
export default function ResultScreen() {
  const { t } = useTranslation('add');
  const { draft } = useDraft();
  const s = draft.scan?.suggestion;
  const next = () => router.push(draft.kind === 'garment' ? '/ajout/vetement/infos' : '/ajout/objet/infos');
  const subtitle = [s?.category?.name, s?.description].filter(Boolean).join(' · ');

  return (
    <FlowScreen>
      <StepHeader close onClose={closeFlow} title={t('result.title')} legend={t('result.legend')} />
      <PhotoZone photo={draft.photo} art="pantalon" height={240} />

      <View style={E1} className="mx-5 flex-row items-center gap-3 rounded-md bg-surface p-4 dark:bg-surface-night">
        <View className="flex-1 gap-1">
          <Heading level="h4" className="uppercase text-ink dark:text-ink-night">{s?.name ?? t('result.noName')}</Heading>
          {subtitle !== '' && (
            <Text numberOfLines={2} className="font-luciole text-legend text-muted dark:text-muted-night">
              {subtitle}
            </Text>
          )}
        </View>
        {s?.confidence != null && <Pill label={t('result.confidence', { percent: Math.round(s.confidence * 100) })} />}
      </View>

      <InfoCard
        title={t('result.filled')}
        rows={[
          [t('result.type'), s?.type === 'GARMENT' ? t('result.garment') : t('result.item')],
          [t('result.name'), s?.name],
          [t('result.brand'), s?.brand?.name],
          [t('result.category'), s?.category?.name],
          [t('result.color'), s?.colors.map((c) => c.name).join(', ')],
          [t('result.size'), s?.size],
          [t('result.composition'), s?.composition.map((p) => (p.percent === null ? p.material : `${p.percent} % ${p.material}`)).join(', ')],
          [t('result.care'), s?.care.join(', ')],
          [t('result.madeIn'), s?.madeIn],
        ]}
      />

      <ActionBar note={t('result.note')}>
        <Button label={t('result.continue')} onPress={next} />
        <Button label={t('result.edit')} variant="secondary" onPress={next} />
      </ActionBar>
    </FlowScreen>
  );
}
