import { useQuery, type QueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import type { Location } from '@/lib/add-draft';
import { apiGet, apiRequest } from '@/lib/api';
import type { Kind } from '@/lib/possessions';

/**
 * Déplacer (API POST /api/…/move) : un objet, un vêtement, un carton avec
 * tout ce qu'il contient. L'API garde la trace de l'emplacement quitté
 * (GET /api/possessions/moves).
 */
export type Movable = Kind | 'box';

export type Move = {
  room: { '@id': string; name: string; place: string };
  storage: { '@id': string; name: string } | null;
  box: { '@id': string; name: string } | null;
  movedBy: string;
  reason: 'MANUAL_MOVE' | 'BOX_MOVED' | 'LOAN_RETURN' | 'INITIAL';
  movedAt: string;
};

export const MOVE_REASON: Record<Move['reason'], string> = {
  MANUAL_MOVE: 'Déplacé',
  BOX_MOVED: 'Son carton a bougé',
  LOAN_RETURN: 'Rangé au retour d’un prêt',
  INITIAL: 'Premier rangement',
};

const PATH: Record<Movable, string> = { item: '/api/items', garment: '/api/garments', box: '/api/boxes' };

/**
 * Range ailleurs. Pour un objet, un conteneur impose sa pièce et son
 * rangement ; pour un carton, il n'y a pas de niveau conteneur.
 */
export async function move(queryClient: QueryClient, kind: Movable, id: string, to: Location): Promise<void> {
  if (!to.room) throw new Error('Choisis au moins une pièce.');
  const body = kind === 'box' ? { room: to.room.iri, storage: to.storage?.iri ?? null } : to.box ? { box: to.box.iri } : { room: to.room.iri, storage: to.storage?.iri ?? null };
  await apiRequest(`${PATH[kind]}/${id}/move`, { method: 'POST', body, accept: 'application/json' });
  await Promise.all(['inventory', 'locations', 'moves'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
}

/** Les emplacements quittés par un objet, du plus récent au plus ancien. */
export function useMoves(iri: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['moves', iri],
    queryFn: ({ signal }) => apiGet<Move[]>(`/api/possessions/moves?possession=${encodeURIComponent(iri ?? '')}`, signal),
    enabled: enabled && iri !== undefined,
  });
}

/** « Maison › Garage › Étagère 2 › Carton Bricolage » d'un emplacement quitté. */
export function movePath(m: Move): string {
  return [m.room.place, m.room.name, m.storage?.name, m.box?.name].filter(Boolean).join(' › ');
}

/** Ouvre « Déplacer » (modale) pour un bien ou un carton, avec son emplacement actuel. */
export function openMove(kind: Movable, id: string, name: string, from: string | null) {
  router.push({ pathname: '/deplacer', params: { kind, id, name, ...(from ? { from } : {}) } });
}
