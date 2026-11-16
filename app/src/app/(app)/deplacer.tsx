import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { LocationStep } from '@/components/add/LocationStep';
import { StepHeader } from '@/components/add/StepHeader';
import { Button } from '@/components/ui/Button';
import { PathCard } from '@/components/ui/InfoCard';
import { locationPath, type Location } from '@/lib/add-draft';
import { move, type Movable } from '@/lib/moves';

/**
 * « Où tu le ranges ? » pour un bien déjà rangé, ou un carton (maquette,
 * « Objet — Localisation » et « Rangement — Carton », bouton « Déplacer ») :
 * l'emplacement actuel, puis le même choix en cascade que les parcours
 * d'ajout (Logement › Pièce › Rangement › Conteneur, création comprise).
 *
 * Paramètres : kind (item, garment, box), id, name, from (chemin actuel).
 */
export default function MoveScreen() {
  const { t } = useTranslation('inventory');
  const { kind, id, name, from } = useLocalSearchParams<{ kind: Movable; id: string; name: string; from?: string }>();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState<Location>({ place: null, room: null, storage: null, box: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const what: Record<Movable, { title: string; note: string }> = {
    item: { title: t('move.itemTitle'), note: t('move.itemNote') },
    garment: { title: t('move.garmentTitle'), note: t('move.garmentNote') },
    box: { title: t('move.boxTitle'), note: t('move.boxNote') },
  };
  const copy = what[kind] ?? what.item;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await move(queryClient, kind, id, location);
      router.back();
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : t('move.error'));
    }
  };

  return (
    <FlowScreen>
      <StepHeader title={copy.title} legend={name} close />
      {from ? <PathCard title={t('move.current')} path={from} /> : null}
      <LocationStep kind={kind} location={location} onChange={setLocation} />

      <ActionBar note={copy.note}>
        {error && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {error}
          </Text>
        )}
        <Button label={location.room ? t('move.store', { path: locationPath({ ...location, place: null }) }) : t('move.moveHere')} onPress={save} loading={saving} disabled={!location.room} />
      </ActionBar>
    </FlowScreen>
  );
}
