import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { InfoRow, soon } from '@/components/inventory/Detail';
import { Breadcrumb, Loading, Missing, PossessionRow, SectionHeader } from '@/components/places/Blocks';
import { DeleteLink } from '@/components/places/DeleteLink';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { Heading } from '@/components/ui/Heading';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import type { Location } from '@/lib/add-draft';
import { BOX_TYPES, boxPath, deleteLocation, inBox, labelOf, objects, usePlacesData } from '@/lib/places';

/** Objets montrés avant « Voir les N objets ». */
const PREVIEW = 3;

/**
 * Fiche d'un carton (Figma « Rangement — Carton · Aperçu », 135:2704, et
 * « Fiche carton », 135:2894, réunies) : chemin, fil d'Ariane, nombre
 * d'objets (dont prêtés) et pastille « Fermé », type et étiquette, aperçu
 * du contenu, puis « Ajouter un objet », « Déplacer », « Supprimer ».
 *
 * « Ajouter un objet » ouvre l'ajout avec l'emplacement du carton déjà
 * choisi. « Déplacer le carton » attend sa route d'API. La date de
 * fermeture n'existe pas côté API : pas de ligne « Fermé le ».
 * Supprimer : seulement un carton vide (l'API refuse sinon).
 */
export default function BoxScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error } = usePlacesData();
  const queryClient = useQueryClient();
  const box = data?.boxes.find((b) => b.id === id);

  if (!data || !box) {
    return (
      <FlowScreen>
        <View className="h-11 flex-row items-center px-5">
          <BackButton />
        </View>
        {data ? <Missing text="Ce carton n'existe plus." /> : <Loading error={error} />}
      </FlowScreen>
    );
  }

  const room = data.rooms.find((r) => r.iri === box.room);
  const storage = box.storage ? data.storages.find((s) => s.iri === box.storage) : undefined;
  const place = room && data.places.find((p) => p.iri === room.place);
  const contents = inBox(data, box);
  const lent = contents.filter((p) => p.availability === 'LENT').length;
  const path = boxPath(data, box);
  const seeAll = () => router.push({ pathname: '/carton/[id]/contenu', params: { id: box.id } });

  const at: Location = {
    place: place ? { iri: place.iri, name: place.name } : null,
    room: room ? { iri: room.iri, name: room.name } : null,
    storage: storage ? { iri: storage.iri, name: storage.name } : null,
    box: { iri: box.iri, name: box.name },
  };

  return (
    <FlowScreen>
      <View className="h-11 flex-row items-center px-5">
        <BackButton />
      </View>
      <View className="px-5">
        <ScreenTitle title={box.name} legend={[path, objects(contents.length)].filter(Boolean).join(' · ')} />
      </View>

      <Breadcrumb
        crumbs={[
          ...(place ? [{ label: place.name, onPress: () => router.navigate({ pathname: '/logements/[id]', params: { id: place.id } }) }] : []),
          ...(room ? [{ label: room.name, onPress: () => router.navigate({ pathname: '/logements/piece/[id]', params: { id: room.id } }) }] : []),
          ...(storage ? [{ label: storage.name, onPress: () => router.navigate({ pathname: '/logements/rangement/[id]', params: { id: storage.id } }) }] : []),
          { label: box.name },
        ]}
      />

      <View style={E1} className="mx-5 gap-3 rounded-md bg-surface p-4 dark:bg-surface-night">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Heading level="h3" className="uppercase text-ink dark:text-ink-night">
              {objects(contents.length)}
            </Heading>
            {lent > 0 && <Text className="font-luciole text-legend text-muted dark:text-muted-night">dont {lent} prêté{lent > 1 ? 's' : ''}</Text>}
          </View>
          {box.sealed && (
            <View className="rounded-full bg-ink/[0.08] px-2 py-1 dark:bg-ink-night/[0.12]">
              <Text className="font-luciole-bold text-legend text-muted dark:text-muted-night">Fermé</Text>
            </View>
          )}
        </View>
        <InfoRow label="Type" value={labelOf(BOX_TYPES, box.type)} />
        {box.reference && <InfoRow label="Étiquette" value={box.reference} />}
      </View>

      {contents.length > 0 ? (
        <View className="gap-3">
          <SectionHeader title="Ce qu'il contient" aside={contents.length > PREVIEW ? `Voir les ${contents.length} objets ›` : undefined} onAside={seeAll} />
          {contents.slice(0, PREVIEW).map((p) => (
            <PossessionRow key={p['@id']} possession={p} />
          ))}
        </View>
      ) : (
        <Missing text="Ce carton est vide. Ajoute un objet : il sera rangé directement dedans." />
      )}

      <ActionBar>
        <Button label="Ajouter un objet" onPress={() => router.push({ pathname: '/ajouter', params: { at: JSON.stringify(at) } })} />
        <Button label="Déplacer le carton" variant="secondary" onPress={() => soon('Déplacer le carton')} />
        {contents.length === 0 && (
          <DeleteLink
            label="Supprimer ce carton"
            what="ce carton"
            name={box.name}
            onConfirm={async () => {
              await deleteLocation(queryClient, 'box', box.id);
              router.back();
            }}
          />
        )}
      </ActionBar>
    </FlowScreen>
  );
}
