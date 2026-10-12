import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { StepHeader } from '@/components/add/StepHeader';
import { Chips } from '@/components/form/Chips';
import { Loading } from '@/components/places/Blocks';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { createRoom, createStorage, ROOM_GROUPS, ROOM_TYPES, roomTypeOf, STORAGE_TYPES, type RoomType, type StorageType } from '@/lib/places';
import { useLocations } from '@/lib/reference';

/**
 * « Ajouter une pièce » (depuis un logement) et « Ajouter un rangement »
 * (depuis une pièce) : un nom et un type, sur une seule page. La maquette
 * n'a pas d'écran pour ces deux ajouts ; on reprend les champs et les
 * puces du parcours de création.
 *
 * Paramètres : level = room | storage ; parent = identifiant du logement
 * ou de la pièce.
 */
export default function NewLocationScreen() {
  const { level, parent } = useLocalSearchParams<{ level: 'room' | 'storage'; parent: string }>();
  const locations = useLocations();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [storageType, setStorageType] = useState<StorageType>('SHELF');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const data = locations.data;
  const place = level === 'room' ? data?.places.find((p) => p.id === parent) : undefined;
  const room = level === 'storage' ? data?.rooms.find((r) => r.id === parent) : undefined;
  const isRoom = level === 'room';

  if (!data || (!place && !room)) {
    return (
      <FlowScreen>
        <StepHeader title={isRoom ? 'Nouvelle pièce' : 'Nouveau rangement'} close />
        {data ? <Text className="px-5 font-luciole text-body text-muted dark:text-muted-night">Cet emplacement n&apos;existe plus.</Text> : <Loading error={locations.error} />}
      </FlowScreen>
    );
  }

  // Pièces courantes pas encore dans ce logement : en toucher une remplit le nom et le type.
  const suggestions = ROOM_GROUPS.flatMap((g) => g.rooms).filter((r) => !data.rooms.some((x) => x.place === place?.iri && x.name === r.name));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const trimmed = name.trim();
      if (place) {
        const position = data.rooms.filter((r) => r.place === place.iri).length;
        await createRoom(queryClient, place, trimmed, roomType ?? roomTypeOf(trimmed), position);
      } else if (room) {
        const position = data.storages.filter((s) => s.room === room.iri).length;
        await createStorage(queryClient, room, trimmed, storageType, position);
      }
      router.back();
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    }
  };

  return (
    <FlowScreen>
      <StepHeader title={isRoom ? 'Nouvelle pièce' : 'Nouveau rangement'} legend={`Dans ${place?.name ?? room?.name}`} close />

      <View className="gap-5 px-5">
        <TextField
          label="Nom"
          value={name}
          onChangeText={setName}
          autoCapitalize="sentences"
          autoFocus
          placeholder={isRoom ? 'Ex. Chambre de Léa' : 'Ex. Étagère 2'}
          returnKeyType="done"
        />
        {isRoom ? (
          <>
            {suggestions.length > 0 && (
              <Chips
                label="Pièces courantes"
                options={suggestions.map((r) => ({ value: r.name, label: r.name }))}
                selected={[name.trim()]}
                onToggle={(value) => {
                  setName(value);
                  setRoomType(roomTypeOf(value));
                }}
              />
            )}
            <Chips label="Type" options={ROOM_TYPES} selected={[roomType ?? roomTypeOf(name)]} onToggle={setRoomType} />
          </>
        ) : (
          <Chips label="Type" options={STORAGE_TYPES} selected={[storageType]} onToggle={setStorageType} />
        )}
      </View>

      <ActionBar note={isRoom ? 'Tu pourras y ajouter des rangements ensuite.' : 'Tu pourras y poser des cartons ensuite.'}>
        {error && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {error}
          </Text>
        )}
        <Button label={isRoom ? 'Ajouter cette pièce' : 'Ajouter ce rangement'} onPress={save} loading={saving} disabled={name.trim() === ''} />
      </ActionBar>
    </FlowScreen>
  );
}
