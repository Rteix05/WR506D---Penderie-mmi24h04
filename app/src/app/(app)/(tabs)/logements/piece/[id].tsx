import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { soon } from '@/components/inventory/Detail';
import { Breadcrumb, Loading, Missing, PossessionRow, RowCard, SectionHeader } from '@/components/places/Blocks';
import { DeleteLink } from '@/components/places/DeleteLink';
import { PlaceScreen } from '@/components/places/PlaceScreen';
import { deleteLocation, inBox, inRoom, inStorage, objects, plural, usePlacesData } from '@/lib/places';

/** Nombre de cartons montrés avant « Voir tout ». */
const BOXES_SHOWN = 3;

/**
 * Vue d'une pièce (Figma « Logement — Vue pièce », 135:2608) : fil
 * d'Ariane, ses rangements, ses cartons (« Voir tout »), « Ajouter un
 * rangement » et « Partager cette pièce ».
 *
 * Ajouts à la maquette :
 *  - « Posés dans la pièce » : les objets rangés dans la pièce sans
 *    rangement ni carton (l'API le permet), sinon introuvables ici ;
 *  - « Supprimer cette pièce » pour une pièce vide.
 * Le partage attend sa route d'API : « Bientôt ».
 */
export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error } = usePlacesData();
  const queryClient = useQueryClient();
  const room = data?.rooms.find((r) => r.id === id);

  if (!data) {
    return (
      <PlaceScreen title="Pièce">
        <Loading error={error} />
      </PlaceScreen>
    );
  }
  if (!room) {
    return (
      <PlaceScreen title="Pièce">
        <Missing text="Cette pièce n'existe plus." />
      </PlaceScreen>
    );
  }

  const place = data.places.find((p) => p.iri === room.place);
  const storages = data.storages.filter((s) => s.room === room.iri);
  const boxes = data.boxes.filter((b) => b.room === room.iri);
  const contents = inRoom(data, room);
  const loose = contents.filter((p) => !p.storage && !p.box);

  return (
    <PlaceScreen title={room.name} legend={`${plural(storages.length, 'rangement', 'rangements')} · ${objects(contents.length)}`}>
      <Breadcrumb
        crumbs={[
          ...(place ? [{ label: place.name, onPress: () => router.navigate({ pathname: '/logements/[id]', params: { id: place.id } }) }] : []),
          { label: room.name },
        ]}
      />

      {storages.length > 0 && (
        <View className="gap-3">
          <SectionHeader title="Rangements" />
          {storages.map((storage) => {
            const n = data.boxes.filter((b) => b.storage === storage.iri).length;

            return (
              <RowCard
                key={storage.iri}
                title={storage.name}
                subtitle={[objects(inStorage(data, storage).length), n > 0 && plural(n, 'carton', 'cartons')].filter(Boolean).join(' · ')}
                onPress={() => router.push({ pathname: '/logements/rangement/[id]', params: { id: storage.id } })}
              />
            );
          })}
        </View>
      )}

      {boxes.length > 0 && (
        <View className="gap-3">
          <SectionHeader
            title="Cartons"
            aside={boxes.length > BOXES_SHOWN ? 'Voir tout' : undefined}
            onAside={() => router.push({ pathname: '/logements/cartons/tous', params: { room: room.id } })}
          />
          {boxes.slice(0, BOXES_SHOWN).map((box) => {
            const storage = data.storages.find((s) => s.iri === box.storage);

            return (
              <RowCard
                key={box.iri}
                title={box.name}
                subtitle={[storage?.name ?? 'Posé dans la pièce', objects(inBox(data, box).length)].join(' · ')}
                onPress={() => router.push({ pathname: '/carton/[id]', params: { id: box.id } })}
              />
            );
          })}
        </View>
      )}

      {loose.length > 0 && (
        <View className="gap-3">
          <SectionHeader title="Posés dans la pièce" aside={objects(loose.length)} />
          {loose.map((p) => (
            <PossessionRow key={p['@id']} possession={p} meta="Sans rangement" />
          ))}
        </View>
      )}

      <View className="gap-3">
        <RowCard
          title="+ Ajouter un rangement"
          subtitle="Étagère, placard, penderie..."
          onPress={() => router.push({ pathname: '/nouvel-emplacement', params: { level: 'storage', parent: room.id } })}
        />
        <RowCard title="Partager cette pièce" subtitle="Avec un ami ou ta famille" onPress={() => soon('Partager cette pièce')} />
      </View>

      {contents.length === 0 && (
        <DeleteLink
          label="Supprimer cette pièce"
          what="cette pièce"
          name={room.name}
          detail="Ses rangements et ses cartons vides seront supprimés avec elle."
          onConfirm={async () => {
            await deleteLocation(queryClient, 'room', room.id);
            router.back();
          }}
        />
      )}
    </PlaceScreen>
  );
}
