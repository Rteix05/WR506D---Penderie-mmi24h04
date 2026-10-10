import { useQuery, type QueryClient } from '@tanstack/react-query';

import type { ClothKind } from '@/components/home/ClothVisual';
import { apiGet, apiRequest } from '@/lib/api';
import type { Usage } from '@/lib/add-draft';
import { apiGetAll, type Category, type Locations } from '@/lib/reference';

/**
 * Les objets et vêtements tels que l'API les renvoie (GET /api/items,
 * /api/garments). Les relations arrivent en IRI : les noms se retrouvent
 * dans les référentiels (catégories, marques…) et les emplacements.
 */
export type Kind = 'item' | 'garment';

export type Availability = 'AVAILABLE' | 'LENT' | 'BORROWED' | 'LOST' | 'SOLD';
export type ConditionValue = 'NEW' | 'EXCELLENT' | 'GOOD' | 'WORN' | 'DAMAGED';

export type Possession = {
  '@id': string;
  id: string;
  name: string;
  description?: string | null;
  /** Privé : seulement pour le propriétaire. */
  notes?: string | null;
  availability: Availability;
  condition?: ConditionValue | null;
  category?: string | null;
  /** Emplacement : absent si celui qui regarde n'a pas le droit de le voir. */
  room?: string;
  storage?: string | null;
  box?: string | null;
  photos?: string[];
  /** Droits de celui qui regarde : ADMIN = propriétaire (modifier, supprimer). */
  access?: 'ADMIN' | 'EDIT' | 'VIEW';
  // Vêtement
  brand?: string | null;
  size?: string | null;
  sizeLabel?: string | null;
  usage?: Usage;
  colors?: string[];
  styles?: string[];
};

export const PATH: Record<Kind, string> = { item: '/api/items', garment: '/api/garments' };

/**
 * Toute la liste, toutes pages suivies. L'API n'a ni recherche ni filtre
 * sur ces collections : l'app filtre et trie elle-même (quelques centaines
 * de lignes au plus pour une personne).
 */
export function usePossessions(kind: Kind) {
  return useQuery({ queryKey: ['inventory', kind, 'list'], queryFn: ({ signal }) => apiGetAll<Possession>(PATH[kind], signal) });
}

export function usePossession(kind: Kind, id: string) {
  return useQuery({ queryKey: ['inventory', kind, id], queryFn: ({ signal }) => apiGet<Possession>(`${PATH[kind]}/${id}`, signal) });
}

/** PATCH (merge-patch) : seuls les champs envoyés changent, null vide un champ. */
export async function updatePossession(queryClient: QueryClient, kind: Kind, id: string, patch: Record<string, unknown>): Promise<Possession> {
  const saved = await apiRequest<Possession>(`${PATH[kind]}/${id}`, { method: 'PATCH', body: patch });
  queryClient.setQueryData(['inventory', kind, id], saved);
  await queryClient.invalidateQueries({ queryKey: ['inventory'] });

  return saved;
}

/** Suppression douce côté API (deletedAt) : l'objet disparaît des listes. */
export async function deletePossession(queryClient: QueryClient, kind: Kind, id: string): Promise<void> {
  await apiRequest(`${PATH[kind]}/${id}`, { method: 'DELETE' });
  queryClient.removeQueries({ queryKey: ['inventory', kind, id] });
  await queryClient.invalidateQueries({ queryKey: ['inventory'] });
}

// ---------------------------------------------------------------------------
// Libellés
// ---------------------------------------------------------------------------

/**
 * Statut d'un bien (enum Availability), avec les couleurs des pastilles de
 * la maquette : vert « Disponible », rose « Prêté », violet « Emprunté »,
 * gris « Vendu ». Sur une carte, la pastille est pleine (solid) ; sur une
 * fiche, teintée (tint, text).
 */
export const AVAILABILITY: Record<Availability, { label: string; solid: string; tint: string; text: string }> = {
  AVAILABLE: { label: 'Disponible', solid: 'bg-[#10786B]', tint: 'bg-main/10 dark:bg-main-night/15', text: 'text-[#10786B] dark:text-main-night' },
  LENT: { label: 'Prêté', solid: 'bg-[#C21B5E]', tint: 'bg-primary/[0.12]', text: 'text-[#C21B5E] dark:text-primary-night' },
  BORROWED: { label: 'Emprunté', solid: 'bg-cloth', tint: 'bg-cloth/[0.12]', text: 'text-cloth dark:text-cloth-night' },
  LOST: { label: 'Perdu', solid: 'bg-error', tint: 'bg-error/10', text: 'text-error dark:text-error-night' },
  SOLD: { label: 'Vendu', solid: 'bg-muted', tint: 'bg-muted/[0.12]', text: 'text-muted dark:text-muted-night' },
};

export const STATUS_FILTERS: { value: Availability | null; label: string }[] = [
  { value: null, label: 'tous' },
  { value: 'AVAILABLE', label: 'disponibles' },
  { value: 'LENT', label: 'prêtés' },
  { value: 'BORROWED', label: 'empruntés' },
  { value: 'LOST', label: 'perdus' },
  { value: 'SOLD', label: 'vendus' },
];

export const CONDITION_LABEL: Record<ConditionValue, string> = {
  NEW: 'Neuf',
  EXCELLENT: 'Très bon état',
  GOOD: 'Bon état',
  WORN: 'Usé',
  DAMAGED: 'Abîmé',
};

export const USAGE_LABEL: Record<Usage, string> = { EVERYDAY: 'Quotidien', WORK: 'Travail', SPORT: 'Sport', EVENING: 'Soirée' };

export type Sort = 'recent' | 'old' | 'name';
export const SORTS: { value: Sort; label: string }[] = [
  { value: 'recent', label: 'récents' },
  { value: 'old', label: 'anciens' },
  { value: 'name', label: 'A → Z' },
];

/** Tri local. Les UUID v7 commencent par la date de création : l'ordre des id est l'ordre d'ajout. */
export function sortPossessions<T extends Possession>(list: T[], sort: Sort): T[] {
  const copy = [...list];
  if (sort === 'name') return copy.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

  return copy.sort((a, b) => (a.id < b.id ? 1 : -1) * (sort === 'recent' ? 1 : -1));
}

/** Recherche sans accents ni casse : « echarpe » trouve « Écharpe ». */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// ---------------------------------------------------------------------------
// Catégories et emplacements
// ---------------------------------------------------------------------------

/** La catégorie de premier niveau (« Hauts » pour « T-shirts ») : celle des filtres de la liste. */
export function rootCategory(categories: Category[] | undefined, iri: string | null | undefined): Category | null {
  if (!categories || !iri) return null;
  const byIri = new Map(categories.map((c) => [c.iri, c]));
  let current = byIri.get(iri) ?? null;
  while (current?.parent && byIri.has(current.parent)) current = byIri.get(current.parent)!;

  return current;
}

/** « Maison principale › Garage › Étagère 2 › Carton Bricolage », ou null si l'emplacement est caché. */
export function locationOf(locations: Locations | undefined, p: Possession): string | null {
  if (!p.room) return null;
  const room = locations?.rooms.find((r) => r.iri === p.room);
  const place = room && locations?.places.find((pl) => pl.iri === room.place);
  const storage = p.storage ? locations?.storages.find((s) => s.iri === p.storage) : undefined;
  const box = p.box ? locations?.boxes.find((b) => b.iri === p.box) : undefined;
  const parts = [place?.name, room?.name, storage?.name, box?.name].filter(Boolean);

  return parts.length > 0 ? parts.join(' › ') : null;
}

export function roomName(locations: Locations | undefined, p: Possession): string | null {
  return locations?.rooms.find((r) => r.iri === p.room)?.name ?? null;
}

// ---------------------------------------------------------------------------
// Illustration
// ---------------------------------------------------------------------------

/** Dessin d'un vêtement selon sa catégorie (slug de la catégorie ou de sa mère). */
const GARMENT_ART: [RegExp, ClothKind][] = [
  // Chaussures d'abord : « baskets » contient « bas ».
  [/chaussures|baskets|bottes|sandales|chaussons/, 'baskets'],
  [/t-shirts|tops|hauts|chemises|hauts-sport|enfant-hauts|enfant-bodies/, 'tshirt'],
  [/pulls|sweats/, 'pull'],
  [/vestes|blazers|manteaux|doudounes|impermeables|costumes|tailleurs|enfant-manteaux/, 'veste'],
  [/shorts/, 'short'],
  [/jeans|pantalons|joggings|bas|enfant-bas/, 'pantalon'],
  [/robes|jupes|combinaisons|enfant-robes/, 'robe'],
  [/bonnets-chapeaux/, 'casquette'],
  [/echarpes|gants|accessoires/, 'echarpe'],
];

/**
 * Illustration de la maquette quand le bien n'a pas de photo. Pour un
 * vêtement, le dessin de sa catégorie. Pour un objet, la maquette n'a pas
 * de dessins d'objets : elle reprend ceux des vêtements (baskets,
 * casquette…) ; on en tire un, toujours le même pour un objet donné.
 */
export function artOf(kind: Kind, p: Possession, categories: Category[] | undefined): ClothKind {
  if (kind === 'item') {
    const pool: ClothKind[] = ['baskets', 'casquette', 'veste', 'pantalon'];
    const sum = [...p.id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

    return pool[sum % pool.length];
  }
  const category = categories?.find((c) => c.iri === p.category);
  const root = rootCategory(categories, p.category);
  for (const slug of [category?.slug, root?.slug]) {
    const hit = slug && GARMENT_ART.find(([pattern]) => pattern.test(slug));
    if (hit) return hit[1];
  }

  return 'cintre';
}
