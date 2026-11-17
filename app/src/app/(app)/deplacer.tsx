import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { LocationStep } from '@/components/add/LocationStep';
import { StepHeader } from '@/components/add/StepHeader';
import { Button } from '@/components/ui/Button';
import { PathCard } from '@/components/ui/InfoCard';
import { locationPath, type Location } from '@/lib/add-draft';
import { move, type Movable } from '@/lib/moves';

const WHAT: Record<Movable, { title: string; note: string }> = {
  item: { title: 'Déplacer l’objet', note: 'L’ancien emplacement reste dans l’historique de l’objet.' },
  garment: { title: 'Déplacer le vêtement', note: 'L’ancien emplacement reste dans l’historique du vêtement.' },
  box: { title: 'Déplacer le carton', note: 'Tout ce qu’il contient le suit, et chaque objet garde la trace de son ancien emplacement.' },
};

/**
 * « Où tu le ranges ? » pour un bien déjà rangé, ou un carton (maquette,
 * « Objet — Localisation » et « Rangement — Carton », bouton « Déplacer ») :
 * l'emplacement actuel, puis le même choix en cascade que les parcours
 * d'ajout (Logement › Pièce › Rangement › Conteneur, création comprise).
 *
 * Paramètres : kind (item, garment, box), id, name, from (chemin actuel).
 */
export default function MoveScreen() {
  const { kind, id, name, from } = useLocalSearchParams<{ kind: Movable; id: string; name: string; from?: string }>();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState<Location>({ place: null, room: null, storage: null, box: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const what = WHAT[kind] ?? WHAT.item;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await move(queryClient, kind, id, location);
      router.back();
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : 'Déplacement impossible.');
    }
  };

  return (
    <FlowScreen>
      <StepHeader title={what.title} legend={name} close />
      {from ? <PathCard title="Actuellement" path={from} /> : null}
      <LocationStep kind={kind} location={location} onChange={setLocation} />

      <ActionBar note={what.note}>
        {error && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {error}
          </Text>
        )}
        <Button label={location.room ? `Ranger : ${locationPath({ ...location, place: null })}` : 'Déplacer ici'} onPress={save} loading={saving} disabled={!location.room} />
      </ActionBar>
    </FlowScreen>
  );
}
