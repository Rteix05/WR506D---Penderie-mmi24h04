import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { ActionBar, closeFlow, FlowScreen } from '@/components/add/FlowScreen';
import { PhotoZone } from '@/components/add/PhotoZone';
import { StepHeader } from '@/components/add/StepHeader';
import { Pill } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
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
  const { draft } = useDraft();
  const s = draft.scan?.suggestion;
  const next = () => router.push(draft.kind === 'garment' ? '/ajout/vetement/infos' : '/ajout/objet/infos');
  const subtitle = [s?.category?.name, s?.description].filter(Boolean).join(' · ');

  return (
    <FlowScreen>
      <StepHeader close onClose={closeFlow} title="On a reconnu" legend="Vérifie avant de continuer" />
      <PhotoZone photo={draft.photo} art="pantalon" height={240} />

      <View style={E1} className="mx-5 flex-row items-center gap-3 rounded-md bg-surface p-4 dark:bg-surface-night">
        <View className="flex-1 gap-1">
          <Text className="font-typolio text-h4 uppercase text-ink dark:text-ink-night">{s?.name ?? 'Sans nom'}</Text>
          {subtitle !== '' && (
            <Text numberOfLines={2} className="font-luciole text-legend text-muted dark:text-muted-night">
              {subtitle}
            </Text>
          )}
        </View>
        {s?.confidence != null && <Pill label={`Sûr à ${Math.round(s.confidence * 100)} %`} />}
      </View>

      <InfoCard
        title="Ce qu'on a rempli"
        rows={[
          ['Type', s?.type === 'GARMENT' ? 'Vêtement' : 'Objet'],
          ['Nom', s?.name],
          ['Marque', s?.brand?.name],
          ['Catégorie', s?.category?.name],
          ['Couleur', s?.colors.map((c) => c.name).join(', ')],
          ['Taille', s?.size],
          ['Composition', s?.composition.map((p) => (p.percent === null ? p.material : `${p.percent} % ${p.material}`)).join(', ')],
          ['Entretien', s?.care.join(', ')],
          ['Fabriqué en', s?.madeIn],
        ]}
      />

      <ActionBar note="Rien n'est enregistré tant que tu n'as pas terminé.">
        <Button label="Continuer" onPress={next} />
        <Button label="Modifier" variant="secondary" onPress={next} />
      </ActionBar>
    </FlowScreen>
  );
}
