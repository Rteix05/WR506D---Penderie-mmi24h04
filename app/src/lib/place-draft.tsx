import { createContext, use, useMemo, useState, type PropsWithChildren } from 'react';

import { PLACE_KINDS, roomTypeOf, type PlaceKind, type RoomType } from '@/lib/places';

/**
 * Brouillon du parcours « Ajouter un logement » (Figma 135:2402 à 135:2512) :
 * type › nom et adresse › pièces › vérification. Rien n'est envoyé avant
 * « Ajouter ce logement ».
 */
export type PlaceDraft = {
  kind: PlaceKind;
  name: string;
  address: string;
  /** Logement principal : choisi d'office à l'emplacement d'un nouvel objet. */
  primary: boolean | null;
  /** Les pièces cochées, dans l'ordre où elles seront créées. */
  rooms: string[];
  /** Les pièces tapées à la main (« Ajouter une pièce »). */
  custom: string[];
};

type Api = {
  draft: PlaceDraft;
  update: (patch: Partial<PlaceDraft>) => void;
  /** Change le type : les pièces proposées suivent, tant qu'on n'y a pas touché. */
  chooseKind: (kind: PlaceKind) => void;
  /** Les pièces à créer, avec leur type d'API. */
  roomsToCreate: { name: string; type: RoomType }[];
};

const Context = createContext<Api | null>(null);

export function usePlaceDraft(): Api {
  const value = use(Context);
  if (value === null) throw new Error('usePlaceDraft doit être utilisé dans le parcours « Ajouter un logement ».');

  return value;
}

export function PlaceDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<PlaceDraft>({ kind: PLACE_KINDS[0], name: '', address: '', primary: null, rooms: PLACE_KINDS[0].rooms, custom: [] });
  const [roomsTouched, setRoomsTouched] = useState(false);

  const value = useMemo<Api>(
    () => ({
      draft,
      update: (patch) => {
        if ('rooms' in patch || 'custom' in patch) setRoomsTouched(true);
        setDraft((d) => ({ ...d, ...patch }));
      },
      chooseKind: (kind) =>
        setDraft((d) => ({
          ...d,
          kind,
          // Le nom suit le type tant qu'il est celui d'un type (« Maison » → « Appartement »).
          name: d.name.trim() === '' || PLACE_KINDS.some((k) => k.label === d.name) ? kind.label : d.name,
          rooms: roomsTouched ? d.rooms : kind.rooms,
        })),
      roomsToCreate: draft.rooms.map((name) => ({ name, type: roomTypeOf(name) })),
    }),
    [draft, roomsTouched],
  );

  return <Context value={value}>{children}</Context>;
}
