import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { ActionBar, closeFlow, FlowScreen } from '@/components/add/FlowScreen';
import { StepHeader } from '@/components/add/StepHeader';
import { ClothVisual } from '@/components/home/ClothVisual';
import { Button } from '@/components/ui/Button';
import { InfoCard } from '@/components/ui/InfoCard';
import { useDraft } from '@/lib/add-draft';
import { analyzeImage } from '@/lib/scan';

/**
 * « On analyse ta photo » (Figma « Objet — Scan · Analyse en cours »,
 * node 227:34971). La photo part à POST /api/scans/analyze ; selon la
 * réponse, on passe au résultat ou à l'échec.
 *
 * La jauge avance avec le temps (l'API ne dit pas où elle en est : un seul
 * appel, jusqu'à une minute si les premiers modèles gratuits sont saturés).
 * « Ajouter manuellement » reste possible à tout moment : la réponse qui
 * arriverait ensuite est ignorée.
 */
export default function AnalyseScreen() {
  const { draft, applyScan, reset } = useDraft();
  const [elapsed, setElapsed] = useState(0);
  const abandoned = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!draft.photo) return;
    analyzeImage(draft.photo, 'PHOTO')
      .then((result) => {
        if (abandoned.current) return;
        if (result.status === 'FAILED' || !result.suggestion) {
          router.replace('/ajout/echec');

          return;
        }
        applyScan(result);
        router.replace('/ajout/resultat');
      })
      .catch(() => {
        if (!abandoned.current) router.replace('/ajout/echec');
      });
    // Une seule analyse par photo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1 segment tout de suite, puis un toutes les 6 s, jamais le 4e avant la réponse.
  const filled = Math.min(3, 1 + Math.floor(elapsed / 6));

  return (
    <FlowScreen>
      <StepHeader close onClose={closeFlow} title="On analyse ta photo" legend="Quelques secondes" />

      <View className="px-5">
        <View className="h-[360px] items-center justify-center gap-6 overflow-hidden rounded-lg bg-ink/[0.06] dark:bg-ink-night/10">
          {draft.photo ? (
            <Image source={{ uri: draft.photo.uri }} style={{ width: 180, height: 130, borderRadius: 24 }} contentFit="cover" accessibilityLabel="Ta photo" />
          ) : (
            <ClothVisual kind="pantalon" scale={4.06} />
          )}
          <Text accessibilityLiveRegion="polite" className="font-luciole text-legend text-muted dark:text-muted-night">
            Analyse en cours…
          </Text>
        </View>
      </View>

      <View className="flex-row gap-1 px-5" accessible accessibilityLabel="Analyse en cours">
        {[1, 2, 3, 4].map((n) => (
          <View key={n} className={`h-1 flex-1 rounded-full ${n <= filled ? 'bg-primary' : 'bg-ink/10 dark:bg-ink-night/15'}`} />
        ))}
      </View>

      <InfoCard
        title="On cherche"
        rows={[
          ["Le type d'objet", 'En cours'],
          ['La marque', 'En cours'],
          ['La catégorie', 'En cours'],
        ]}
      />

      <ActionBar note="Tu peux passer à la saisie manuelle à tout moment.">
        <Button
          label="Ajouter manuellement"
          variant="secondary"
          onPress={() => {
            abandoned.current = true;
            reset('item', true);
            router.replace('/ajout/objet/infos');
          }}
        />
      </ActionBar>
    </FlowScreen>
  );
}
