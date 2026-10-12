import { router } from 'expo-router';
import { View } from 'react-native';

import { EmptyState } from '@/components/inventory/EmptyState';
import { BoxGlyph, Grid, Loading, RowCard, SectionHeader, TileCard } from '@/components/places/Blocks';
import { PlaceScreen } from '@/components/places/PlaceScreen';
import { boxPath, inBox, objects, plural, usePlacesData } from '@/lib/places';

/** Cartons montrés en grille avant « Voir tout ». */
const RECENT = 4;

/**
 * « Mes cartons » (Figma « Rangement — Mes cartons », 135:2783) : les
 * quatre derniers cartons en grille, « Voir tout », « Créer un carton ».
 *
 * Écart avec la maquette : « Récemment ajoutés » plutôt que « Récemment
 * ouverts » : l'API ne retient pas quand un carton est ouvert. Les UUID v7
 * donnent l'ordre de création.
 */
export default function BoxesScreen() {
  const { data, error } = usePlacesData();
  const create = () => router.push('/nouveau-carton/infos');

  if (!data) {
    return (
      <PlaceScreen title="Mes cartons">
        <Loading error={error} />
      </PlaceScreen>
    );
  }

  const inside = data.possessions.filter((p) => p.box).length;
  const recent = [...data.boxes].sort((a, b) => (a.id < b.id ? 1 : -1)).slice(0, RECENT);

  return (
    <PlaceScreen title="Mes cartons" legend={`${plural(data.boxes.length, 'carton', 'cartons')} · ${objects(inside)}`}>
      {data.boxes.length === 0 ? (
        <EmptyState
          icon="search"
          title="Aucun carton"
          text="Crée un carton, colle son étiquette, et retrouve en un instant ce qu'il contient."
          action={{ label: 'Créer un carton', glyph: '+', onPress: create }}
        />
      ) : (
        <>
          <View className="gap-3">
            <SectionHeader
              title="Récemment ajoutés"
              aside={data.boxes.length > RECENT ? 'Voir tout' : undefined}
              onAside={() => router.push('/logements/cartons/tous')}
            />
            <Grid
              items={recent}
              keyOf={(b) => b.iri}
              render={(box) => (
                <TileCard
                  title={box.name}
                  meta={boxPath(data, box)}
                  aside={objects(inBox(data, box).length)}
                  accent
                  glyph={<BoxGlyph />}
                  onPress={() => router.push({ pathname: '/carton/[id]', params: { id: box.id } })}
                />
              )}
            />
          </View>
          <View className="gap-3">
            {data.boxes.length <= RECENT && data.boxes.length > 1 && <RowCard title="Tous mes cartons" subtitle="Rechercher, trier par pièce" onPress={() => router.push('/logements/cartons/tous')} />}
            <RowCard title="+ Créer un carton" subtitle="Étiquette, emplacement" onPress={create} />
          </View>
        </>
      )}
    </PlaceScreen>
  );
}
