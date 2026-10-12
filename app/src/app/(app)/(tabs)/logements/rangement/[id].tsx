import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Breadcrumb, Loading, Missing, PossessionRow, RowCard, SectionHeader } from '@/components/places/Blocks';
import { DeleteLink } from '@/components/places/DeleteLink';
import { PlaceScreen } from '@/components/places/PlaceScreen';
import { deleteLocation, inBox, inStorage, objects, plural, usePlacesData } from '@/lib/places';

/**
 * Vue d'un rangement (Figma « Rangement — Vue rangement », 135:2660) : fil
 * d'Ariane, ses cartons (« Ouvrir le carton › »), puis tout ce qui y est
 * rangé, dans un carton ou posé à côté.
 *
 * Écarts avec la maquette : la section s'appelle « Dans ce rangement »
 * (« Posés sur l'étagère » ne va pas à une armoire) ; « Supprimer ce
 * rangement » en bas, pour un rangement vide.
 */
export default function StorageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error } = usePlacesData();
  const queryClient = useQueryClient();
  const storage = data?.storages.find((s) => s.id === id);

  if (!data) {
    return (
      <PlaceScreen title="Rangement">
        <Loading error={error} />
      </PlaceScreen>
    );
  }
  if (!storage) {
    return (
      <PlaceScreen title="Rangement">
        <Missing text="Ce rangement n'existe plus." />
      </PlaceScreen>
    );
  }

  const room = data.rooms.find((r) => r.iri === storage.room);
  const place = room && data.places.find((p) => p.iri === room.place);
  const boxes = data.boxes.filter((b) => b.storage === storage.iri);
  const contents = inStorage(data, storage);

  return (
    <PlaceScreen title={storage.name} legend={[objects(contents.length), boxes.length > 0 && plural(boxes.length, 'carton', 'cartons')].filter(Boolean).join(' · ')}>
      <Breadcrumb
        crumbs={[
          ...(place ? [{ label: place.name, onPress: () => router.navigate({ pathname: '/logements/[id]', params: { id: place.id } }) }] : []),
          ...(room ? [{ label: room.name, onPress: () => router.navigate({ pathname: '/logements/piece/[id]', params: { id: room.id } }) }] : []),
          { label: storage.name },
        ]}
      />

      {boxes.length > 0 && (
        <View className="gap-3">
          {boxes.map((box) => (
            <RowCard
              key={box.iri}
              title={box.name}
              subtitle={`${objects(inBox(data, box).length)} à l'intérieur`}
              link="Ouvrir le carton"
              onPress={() => router.push({ pathname: '/carton/[id]', params: { id: box.id } })}
            />
          ))}
        </View>
      )}

      {contents.length > 0 && (
        <View className="gap-3">
          <SectionHeader title="Dans ce rangement" aside={objects(contents.length)} />
          {contents.map((p) => {
            const box = p.box ? data.boxes.find((b) => b.iri === p.box) : undefined;

            return <PossessionRow key={p['@id']} possession={p} meta={box ? `Dans le ${box.name}` : boxes.length > 0 ? 'Posé à côté des cartons' : ''} />;
          })}
        </View>
      )}

      {contents.length === 0 && boxes.length === 0 && <Missing text="Rien n'est encore rangé ici. Choisis ce rangement quand tu ajoutes un objet." />}

      {contents.length === 0 && (
        <DeleteLink
          label="Supprimer ce rangement"
          what="ce rangement"
          name={storage.name}
          detail={boxes.length > 0 ? 'Ses cartons resteront dans la pièce.' : undefined}
          onConfirm={async () => {
            await deleteLocation(queryClient, 'storage', storage.id);
            router.back();
          }}
        />
      )}
    </PlaceScreen>
  );
}
