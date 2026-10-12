import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { StepHeader } from '@/components/add/StepHeader';
import { Chips } from '@/components/form/Chips';
import { RowCard } from '@/components/places/Blocks';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { usePlaceDraft } from '@/lib/place-draft';
import { ROOM_GROUPS } from '@/lib/places';

/**
 * Étape 3 « Quelles pièces ? » (Figma « Logement — Ajout · Pièces »,
 * 135:2480) : les pièces courantes par groupe, déjà cochées selon le type
 * choisi, et « Ajouter une pièce » pour une pièce qui n'y est pas.
 */
export default function PlaceRoomsStep() {
  const { draft, update } = usePlaceDraft();
  const [adding, setAdding] = useState(false);
  const [typed, setTyped] = useState('');

  const toggle = (name: string) => update({ rooms: draft.rooms.includes(name) ? draft.rooms.filter((r) => r !== name) : [...draft.rooms, name] });

  const add = () => {
    const name = typed.trim();
    if (name === '') return;
    const known = ROOM_GROUPS.some((g) => g.rooms.some((r) => r.name === name)) || draft.custom.includes(name);
    update({ custom: known ? draft.custom : [...draft.custom, name], rooms: draft.rooms.includes(name) ? draft.rooms : [...draft.rooms, name] });
    setTyped('');
    setAdding(false);
  };

  const n = draft.rooms.length;
  const legend = `Étape 3 sur 4 · ${n} sélectionnée${n > 1 ? 's' : ''}`;

  return (
    <FlowScreen>
      <StepHeader title="Quelles pièces ?" step={3} legend={legend} />

      <View className="gap-5 px-5">
        {ROOM_GROUPS.map((group) => (
          <Chips key={group.title} label={group.title} multiple options={group.rooms.map((r) => ({ value: r.name, label: r.name }))} selected={draft.rooms} onToggle={toggle} />
        ))}
        {draft.custom.length > 0 && <Chips label="Ajoutées par toi" multiple options={draft.custom.map((name) => ({ value: name, label: name }))} selected={draft.rooms} onToggle={toggle} />}
      </View>

      {adding ? (
        <View className="gap-3 px-5">
          <TextField label="Nom de la pièce" value={typed} onChangeText={setTyped} autoCapitalize="sentences" autoFocus placeholder="Ex. Chambre de Léa" returnKeyType="done" onSubmitEditing={add} />
          <Button label="Ajouter" variant="secondary" onPress={add} disabled={typed.trim() === ''} />
        </View>
      ) : (
        <View>
          <RowCard title="+ Ajouter une pièce" subtitle="Si elle n'est pas dans la liste" onPress={() => setAdding(true)} />
        </View>
      )}

      <ActionBar note="Tu pourras ajouter des pièces et des rangements plus tard.">
        <Button label="Continuer" onPress={() => router.push('/nouveau-logement/verification')} />
      </ActionBar>
    </FlowScreen>
  );
}
