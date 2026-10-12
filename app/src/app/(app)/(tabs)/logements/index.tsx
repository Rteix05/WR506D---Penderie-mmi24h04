import { router } from 'expo-router';
import { View } from 'react-native';

import { EmptyState } from '@/components/inventory/EmptyState';
import { Grid, Loading, RowCard, TileCard } from '@/components/places/Blocks';
import { PlaceScreen } from '@/components/places/PlaceScreen';
import { inPlace, objects, plural, usePlacesData } from '@/lib/places';

/**
 * « Mes logements » (Figma « Logement — Mes logements », 135:2549) : les
 * logements en grille (le principal d'abord), puis « Ajouter un logement ».
 *
 * Écart avec la maquette : pas de bloc « Sans logement ». Pour l'API, tout
 * objet a une pièce (obligatoire à l'ajout) : il n'y a jamais d'objet
 * « à ranger » hors logement.
 */
export default function PlacesScreen() {
  const { data, error } = usePlacesData();
  const addPlace = () => router.push('/nouveau-logement/type');

  if (!data) {
    return (
      <PlaceScreen title="Mes logements">
        <Loading error={error} />
      </PlaceScreen>
    );
  }

  const stored = data.possessions.filter((p) => p.room).length;
  const legend = `${plural(data.places.length, 'logement', 'logements')} · ${plural(stored, 'objet rangé', 'objets rangés')}`;

  return (
    <PlaceScreen title="Mes logements" legend={legend}>
      {data.places.length === 0 ? (
        <EmptyState
          icon="search"
          title="Aucun logement"
          text="Ajoute ton logement et ses pièces : tu sauras toujours où sont rangées tes affaires."
          action={{ label: 'Ajouter un logement', glyph: '+', onPress: addPlace }}
        />
      ) : (
        <>
          <Grid
            items={data.places}
            keyOf={(p) => p.iri}
            render={(place, i) => {
              const rooms = data.rooms.filter((r) => r.place === place.iri).length;

              return (
                <TileCard
                  title={place.name}
                  meta={`${plural(rooms, 'pièce', 'pièces')} · ${objects(inPlace(data, place).length)}`}
                  accent={i === 0}
                  onPress={() => router.push({ pathname: '/logements/[id]', params: { id: place.id } })}
                />
              );
            }}
          />
          <View>
            <RowCard title="+ Ajouter un logement" subtitle="Maison, appartement, cave, bureau" onPress={addPlace} />
          </View>
        </>
      )}
    </PlaceScreen>
  );
}
