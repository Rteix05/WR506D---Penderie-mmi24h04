import { useQuery, type QueryClient } from '@tanstack/react-query';

import { apiGet, apiRequest } from '@/lib/api';

/** Une collection JSON-LD d'API Platform (préfixe hydra désactivé). */
type Page<T> = { member?: T[]; view?: { next?: string } };

/**
 * Toutes les pages d'une collection. L'API sert 30 lignes par page et
 * ignore itemsPerPage : on suit view.next jusqu'au bout (référentiels de
 * quelques centaines de lignes au plus).
 */
export async function apiGetAll<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const rows: T[] = [];
  let next: string | undefined = path;
  while (next) {
    const page: Page<T> = await apiGet<Page<T>>(next, signal);
    rows.push(...(page.member ?? []));
    next = page.view?.next;
  }

  return rows;
}

/** Ce que l'app retient d'une ligne de référentiel ou d'emplacement : son IRI et son nom. */
export type Ref = { iri: string; name: string };

type Named = { '@id': string; name: string; slug?: string };
const toRef = (row: Named): Ref => ({ iri: row['@id'], name: row.name });

// Référentiels : ils changent rarement, on les garde une heure.
const REFERENCE = { staleTime: 60 * 60 * 1000 };

/**
 * Catégorie du référentiel. parent : IRI de la catégorie mère (« Hauts »
 * pour « T-shirts »), null pour une catégorie de premier niveau.
 * sizeSystem (vêtements) : IRI de l'échelle de tailles imposée par l'API.
 */
export type Category = Ref & { slug: string; parent: string | null; sizeSystem: string | null };

type CategoryRow = Named & { parent?: { '@id': string } | null; sizeSystem?: string | null };
const toCategory = (r: CategoryRow): Category => ({ ...toRef(r), slug: r.slug ?? '', parent: r.parent?.['@id'] ?? null, sizeSystem: r.sizeSystem ?? null });

export function useGarmentCategories() {
  return useQuery({
    queryKey: ['reference', 'garment_categories'],
    queryFn: async ({ signal }) => (await apiGetAll<CategoryRow>('/api/garment_categories', signal)).map(toCategory),
    ...REFERENCE,
  });
}

export function useItemCategories() {
  return useQuery({
    queryKey: ['reference', 'item_categories'],
    queryFn: async ({ signal }) => (await apiGetAll<CategoryRow>('/api/item_categories', signal)).map(toCategory),
    ...REFERENCE,
  });
}

/** Les marques vérifiées, plus celles que le profil actif a ajoutées. */
export function useBrands() {
  return useQuery({ queryKey: ['reference', 'brands'], queryFn: async ({ signal }) => (await apiGetAll<Named>('/api/brands', signal)).map(toRef), ...REFERENCE });
}

/**
 * Ajoute une marque absente de la liste (POST /api/brands). L'API trouve ou
 * crée : « TRAPSTAR » renvoie la Trapstar existante ; sinon la marque naît
 * « non vérifiée », en attente de validation par l'admin. La liste des
 * marques est rechargée pour la proposer ensuite.
 */
export async function createBrand(queryClient: QueryClient, name: string): Promise<Ref> {
  const brand = await apiRequest<Named>('/api/brands', { method: 'POST', body: { name } });
  await queryClient.invalidateQueries({ queryKey: ['reference', 'brands'] });

  return toRef(brand);
}

export type ColorRef = Ref & { hex: string | null };

export function useColors() {
  return useQuery({
    queryKey: ['reference', 'colors'],
    queryFn: async ({ signal }) => (await apiGetAll<Named & { hex?: string }>('/api/colors', signal)).map((r) => ({ ...toRef(r), hex: r.hex ?? null })),
    ...REFERENCE,
  });
}

export function useStyles() {
  return useQuery({ queryKey: ['reference', 'styles'], queryFn: async ({ signal }) => (await apiGetAll<Named>('/api/styles', signal)).map(toRef), ...REFERENCE });
}

export type SizeSystemCode = 'EU_SHOE' | 'ALPHA' | 'WAIST_LENGTH' | 'FR_NUMERIC' | 'COLLAR' | 'BELT_CM' | 'ONE_SIZE' | 'KIDS_AGE';

/**
 * Les valeurs de taille, groupées par système (Taille lettre, Pointure…),
 * dans l'ordre du référentiel. Chaque échelle est rangée deux fois : sous
 * son code (« ALPHA », parcours d'ajout) et sous son IRI (sizeSystem d'une
 * catégorie, écran de modification).
 */
export function useSizes() {
  return useQuery({
    queryKey: ['reference', 'sizes'],
    queryFn: async ({ signal }) => {
      const [systems, values] = await Promise.all([
        apiGetAll<{ '@id': string; code: SizeSystemCode }>('/api/size_systems', signal),
        apiGetAll<{ '@id': string; sizeSystem: string; label: string; sortOrder: number }>('/api/size_values', signal),
      ]);
      const bySystem = new Map<SizeSystemCode | string, Ref[]>();
      for (const system of systems) {
        const scale = values
          .filter((v) => v.sizeSystem === system['@id'])
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((v) => ({ iri: v['@id'], name: v.label }));
        bySystem.set(system.code, scale);
        bySystem.set(system['@id'], scale);
      }

      return bySystem;
    },
    ...REFERENCE,
  });
}

// ---------------------------------------------------------------------------
// Emplacements : logement › pièce › rangement › conteneur
// ---------------------------------------------------------------------------

/** Un emplacement tel que l'app le garde : son IRI, son nom, son identifiant (routes) et son type d'API. */
type Located = Ref & { id: string; type: string };

/** address : privée, renvoyée seulement aux membres du logement. */
export type Place = Located & { primary: boolean; address: string | null };
export type Room = Located & { place: string; position: number };
export type Storage = Located & { room: string; position: number };
/**
 * reference : le code ou l'étiquette collée dessus. sealed : carton fermé
 * (l'API ne l'envoie pas encore : toujours false pour l'instant).
 */
export type Box = Located & { room: string; storage: string | null; reference: string | null; sealed: boolean };

export type Locations = { places: Place[]; rooms: Room[]; storages: Storage[]; boxes: Box[] };

type LocatedRow = Named & { id: string; type: string };
const toLocated = (row: LocatedRow) => ({ ...toRef(row), id: row.id, type: row.type });
const byPosition = <T extends { position: number; name: string }>(a: T, b: T) => a.position - b.position || a.name.localeCompare(b.name, 'fr');

/** Tous les emplacements visibles du profil, en une requête par niveau. */
export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async ({ signal }): Promise<Locations> => {
      const [places, rooms, storages, boxes] = await Promise.all([
        apiGetAll<LocatedRow & { primary?: boolean; address?: string | null }>('/api/places', signal),
        apiGetAll<LocatedRow & { place: string; position?: number }>('/api/rooms', signal),
        apiGetAll<LocatedRow & { room: string; position?: number }>('/api/storages', signal),
        apiGetAll<LocatedRow & { room: string; storage?: string | null; reference?: string | null; isSealed?: boolean; sealed?: boolean }>('/api/boxes', signal),
      ]);

      return {
        // Le logement principal d'abord, puis dans l'ordre de création.
        places: places.map((p) => ({ ...toLocated(p), primary: p.primary ?? false, address: p.address ?? null })).sort((a, b) => Number(b.primary) - Number(a.primary)),
        rooms: rooms.map((r) => ({ ...toLocated(r), place: r.place, position: r.position ?? 0 })).sort(byPosition),
        storages: storages.map((s) => ({ ...toLocated(s), room: s.room, position: s.position ?? 0 })).sort(byPosition),
        boxes: boxes.map((b) => ({ ...toLocated(b), room: b.room, storage: b.storage ?? null, reference: b.reference ?? null, sealed: b.isSealed ?? b.sealed ?? false })),
      };
    },
  });
}

/**
 * Création rapide d'un emplacement depuis l'étape « Où tu le ranges ? » :
 * on ne demande que le nom, le type prend la valeur « Autre » (ou Maison /
 * Carton). Le parcours complet de création de logement viendra à part.
 */
export async function createLocation(level: 'place' | 'room' | 'storage' | 'box', name: string, parent: { place?: string; room?: string; storage?: string | null }): Promise<Ref> {
  const body =
    level === 'place'
      ? { name, type: 'HOUSE' }
      : level === 'room'
        ? { name, type: 'OTHER', place: parent.place }
        : level === 'storage'
          ? { name, type: 'OTHER', room: parent.room }
          : { name, type: 'CARTON', room: parent.room, ...(parent.storage ? { storage: parent.storage } : {}) };
  const path = { place: '/api/places', room: '/api/rooms', storage: '/api/storages', box: '/api/boxes' }[level];
  const created = await apiRequest<Named>(path, { method: 'POST', body });

  return toRef(created);
}
