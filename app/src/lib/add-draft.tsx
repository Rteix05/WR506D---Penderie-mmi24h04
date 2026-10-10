import { useQueryClient } from '@tanstack/react-query';
import type { ImagePickerAsset } from 'expo-image-picker';
import { createContext, use, useCallback, useMemo, useState, type PropsWithChildren } from 'react';

import type { ClothKind } from '@/components/home/ClothVisual';
import { ApiError, apiGet, apiRequest, apiUpload } from '@/lib/api';
import { createBrand, type Ref } from '@/lib/reference';
import { imageFormData, type ScanResult } from '@/lib/scan';

/** État à l'ajout (enum Condition de l'API, sans « Abîmé », absent de la maquette). */
export type Condition = 'NEW' | 'EXCELLENT' | 'GOOD' | 'WORN';
export const CONDITIONS: { value: Condition; label: string }[] = [
  { value: 'NEW', label: 'Neuf' },
  { value: 'EXCELLENT', label: 'Très bon état' },
  { value: 'GOOD', label: 'Bon état' },
  { value: 'WORN', label: 'Usé' },
];

/** Usage d'un vêtement (enum GarmentUsage de l'API : UN seul usage par vêtement). */
export type Usage = 'EVERYDAY' | 'WORK' | 'SPORT' | 'EVENING';
export const USAGES: { value: Usage; label: string }[] = [
  { value: 'EVERYDAY', label: 'Quotidien' },
  { value: 'WORK', label: 'Travail' },
  { value: 'SPORT', label: 'Sport' },
  { value: 'EVENING', label: 'Soirée' },
];

/**
 * Les 12 types de la grille « C'est quoi ? » (Figma 135:2935), reliés à une
 * catégorie de vêtement de l'API (slug) et au dessin de la maquette.
 * « Autre » n'a pas de catégorie : on la choisit à l'étape suivante.
 */
export type GarmentType = { label: string; slug: string | null; art: ClothKind; sizes: 'ALPHA' | 'EU_SHOE' | 'ONE_SIZE' };
export const GARMENT_TYPES: GarmentType[] = [
  { label: 'T-shirt', slug: 't-shirts', art: 'tshirt', sizes: 'ALPHA' },
  { label: 'Chemise', slug: 'chemises', art: 'tshirt', sizes: 'ALPHA' },
  { label: 'Pull', slug: 'pulls', art: 'pull', sizes: 'ALPHA' },
  { label: 'Veste', slug: 'vestes', art: 'veste', sizes: 'ALPHA' },
  { label: 'Manteau', slug: 'manteaux', art: 'pull', sizes: 'ALPHA' },
  { label: 'Pantalon', slug: 'pantalons', art: 'pantalon', sizes: 'ALPHA' },
  { label: 'Short', slug: 'shorts', art: 'short', sizes: 'ALPHA' },
  { label: 'Robe', slug: 'robes', art: 'robe', sizes: 'ALPHA' },
  { label: 'Chaussures', slug: 'chaussures', art: 'baskets', sizes: 'EU_SHOE' },
  { label: 'Casquette', slug: 'bonnets-chapeaux', art: 'casquette', sizes: 'ONE_SIZE' },
  { label: 'Écharpe', slug: 'echarpes', art: 'echarpe', sizes: 'ONE_SIZE' },
  { label: 'Autre', slug: null, art: 'cintre', sizes: 'ALPHA' },
];

/**
 * Une marque choisie. iri null : une marque lue par le scan mais absente de
 * la liste ; elle est ajoutée (POST /api/brands) à l'enregistrement, pas
 * avant : un scan abandonné ne crée rien.
 */
export type BrandChoice = { iri: string | null; name: string };

export type Location = { place: Ref | null; room: Ref | null; storage: Ref | null; box: Ref | null };
const NO_LOCATION: Location = { place: null, room: null, storage: null, box: null };

export type Draft = {
  kind: 'item' | 'garment';
  /** Photo prise ou importée ; envoyée après la création du bien (POST …/{id}/photos). */
  photo: ImagePickerAsset | null;
  scan: ScanResult | null;
  name: string;
  /** Description publique de l'objet ; le scan y met ce qu'il a lu (composition, entretien…). */
  description: string;
  category: Ref | null;
  condition: Condition | null;
  notes: string;
  /** Champs remplis par le scan et pas encore retouchés (pour l'indication « Rempli par le scan »). */
  fromScan: (keyof Draft)[];
  // Vêtement
  garmentType: GarmentType | null;
  brand: BrandChoice | null;
  size: Ref | null;
  /** Taille lue par le scan, en texte, tant qu'elle ne correspond à aucune valeur du référentiel. */
  sizeLabel: string;
  color: Ref | null;
  usage: Usage;
  styles: Ref[];
  location: Location;
};

const EMPTY: Draft = {
  kind: 'item',
  photo: null,
  scan: null,
  name: '',
  description: '',
  category: null,
  condition: null,
  notes: '',
  fromScan: [],
  garmentType: null,
  brand: null,
  size: null,
  sizeLabel: '',
  color: null,
  usage: 'EVERYDAY',
  styles: [],
  location: NO_LOCATION,
};

export type Created = {
  id: string;
  name: string;
  kind: Draft['kind'];
  total: number;
  /** La photo a-t-elle été enregistrée ? null : il n'y en avait pas. */
  photoSaved: boolean | null;
};

type DraftApi = {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  /** Repart d'un brouillon vide (garde la photo si demandé : « Ajouter manuellement » après un scan). */
  reset: (kind: Draft['kind'], keepPhoto?: boolean) => void;
  /**
   * Reporte la suggestion du scan dans le brouillon. onlyEmpty : ne remplit
   * que les champs encore vides (étiquette lue en cours de saisie).
   */
  applyScan: (result: ScanResult, options?: { onlyEmpty?: boolean }) => void;
  submit: () => Promise<Created>;
  created: Created | null;
};

const DraftContext = createContext<DraftApi | null>(null);

export function useDraft(): DraftApi {
  const value = use(DraftContext);
  if (value === null) {
    throw new Error('useDraft doit être utilisé dans le parcours d’ajout.');
  }

  return value;
}

/**
 * Le brouillon partagé par les écrans du parcours d'ajout (app/(app)/ajout).
 * Rien n'est envoyé à l'API avant la vérification : « Rien n'est enregistré
 * tant que tu n'as pas terminé » (maquette, résultat du scan).
 */
export function DraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [created, setCreated] = useState<Created | null>(null);
  const queryClient = useQueryClient();

  // Un champ retouché à la main n'est plus « rempli par le scan ».
  const update = useCallback(
    (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch, fromScan: d.fromScan.filter((key) => !(key in patch)) })),
    [],
  );

  const reset = useCallback((kind: Draft['kind'], keepPhoto = false) => {
    setCreated(null);
    setDraft((d) => ({ ...EMPTY, kind, photo: keepPhoto ? d.photo : null, location: d.location }));
  }, []);

  const applyScan = useCallback((result: ScanResult, { onlyEmpty = false }: { onlyEmpty?: boolean } = {}) => {
    const s = result.suggestion;
    if (!s) return;
    // Ce que l'étiquette dit et que le modèle de données n'a pas en champ
    // (composition, entretien, pays) part dans la description, modifiable.
    const label = [
      s.composition.length > 0 && `Composition : ${s.composition.map((p) => (p.percent === null ? p.material : `${p.percent} % ${p.material}`)).join(', ')}`,
      s.care.length > 0 && `Entretien : ${s.care.join(', ')}`,
      s.madeIn && `Fabriqué en ${s.madeIn}`,
    ].filter(Boolean);
    const description = [s.description, ...label].filter(Boolean).join('\n');
    const patch: Partial<Draft> = {
      kind: s.type === 'GARMENT' ? 'garment' : 'item',
      ...(s.name ? { name: s.name } : {}),
      ...(description ? { description } : {}),
      ...(s.category ? { category: { iri: s.category.iri, name: s.category.name } } : {}),
      // Une marque absente de la liste (sans IRI) est gardée par son nom :
      // elle sera ajoutée à l'enregistrement.
      ...(s.brand?.name ? { brand: { iri: s.brand.iri ?? null, name: s.brand.name } } : {}),
      ...(s.colors[0] ? { color: { iri: s.colors[0].iri, name: s.colors[0].name } } : {}),
      ...(s.size ? { sizeLabel: s.size } : {}),
    };
    setDraft((d) => {
      const isEmpty = (key: keyof Draft) => d[key] === null || d[key] === '';
      const kept = onlyEmpty ? Object.fromEntries(Object.entries(patch).filter(([key]) => key !== 'kind' && isEmpty(key as keyof Draft))) : patch;
      const filled = Object.keys(kept).filter((k) => k !== 'kind') as (keyof Draft)[];

      return { ...d, ...kept, scan: d.scan ?? result, fromScan: [...new Set([...(onlyEmpty ? d.fromScan : []), ...filled])] };
    });
  }, []);

  const submit = useCallback(async (): Promise<Created> => {
    const d = draft;
    const loc = d.location;
    if (!loc.room) throw new Error('Choisis au moins une pièce.');
    const where = { room: loc.room.iri, ...(loc.storage ? { storage: loc.storage.iri } : {}), ...(loc.box ? { box: loc.box.iri } : {}) };
    const common = {
      name: d.name.trim(),
      ...where,
      ...(d.description.trim() ? { description: d.description.trim() } : {}),
      ...(d.condition ? { condition: d.condition } : {}),
      ...(d.notes.trim() ? { notes: d.notes.trim() } : {}),
    };

    // Marque lue par le scan, absente de la liste : on l'ajoute maintenant.
    // Si l'API la refuse (nom illisible), le vêtement est enregistré sans.
    let brand = d.kind === 'garment' ? (d.brand?.iri ?? null) : null;
    if (d.kind === 'garment' && d.brand && !d.brand.iri) {
      brand = await createBrand(queryClient, d.brand.name).then(
        (created) => created.iri,
        () => null,
      );
    }
    const body =
      d.kind === 'item'
        ? { ...common, ...(d.category ? { category: d.category.iri } : {}) }
        : {
            ...common,
            category: d.category?.iri,
            usage: d.usage,
            ...(brand ? { brand } : {}),
            ...(d.size ? { size: d.size.iri } : d.sizeLabel.trim() ? { sizeLabel: d.sizeLabel.trim().slice(0, 20) } : {}),
            colors: d.color ? [d.color.iri] : [],
            styles: d.styles.map((s) => s.iri),
          };
    const path = d.kind === 'item' ? '/api/items' : '/api/garments';

    let saved: { id: string; name: string };
    try {
      saved = await apiRequest(path, { method: 'POST', body });
    } catch (error) {
      // La taille doit appartenir à l'échelle de la catégorie (règle de l'API).
      // Pour un type « Autre » ou une catégorie venue du scan, l'app ne la
      // connaît pas : on garde alors la taille en texte libre (sizeLabel).
      if (!(error instanceof ApiError && error.violations.size && d.size && 'size' in body)) throw error;
      const { size: _size, ...rest } = body;
      saved = await apiRequest(path, { method: 'POST', body: { ...rest, sizeLabel: d.size.name } });
    }
    // La photo part une fois le bien créé (il faut son identifiant). Un échec
    // ici n'annule pas l'ajout : la confirmation le signale.
    let photoSaved: boolean | null = null;
    if (d.photo) {
      try {
        await apiUpload(`${path}/${saved.id}/photos`, await imageFormData(d.photo));
        photoSaved = true;
      } catch {
        photoSaved = false;
      }
    }
    const count = await apiGet<{ totalItems?: number }>(path);
    const result = { id: saved.id, name: saved.name, kind: d.kind, total: count.totalItems ?? 0, photoSaved };
    setCreated(result);
    // L'accueil (compteurs, derniers ajouts) et les emplacements récents se rechargent.
    await queryClient.invalidateQueries({ queryKey: ['inventory'] });

    return result;
  }, [draft, queryClient]);

  const value = useMemo(() => ({ draft, update, reset, applyScan, submit, created }), [draft, update, reset, applyScan, submit, created]);

  return <DraftContext value={value}>{children}</DraftContext>;
}

/** « Maison principale › Garage › Étagère 2 › Carton Bricolage » */
export function locationPath(location: Location): string {
  return [location.place, location.room, location.storage, location.box]
    .filter((r): r is Ref => r !== null)
    .map((r) => r.name)
    .join(' › ');
}
