import { useQuery, type QueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';

import type { ClothKind } from '@/components/home/ClothVisual';
import i18n from '@/i18n';
import { activeProfileId, apiGet, apiRequest } from '@/lib/api';

/**
 * Les suggestions de tenues (API /api/outfit-suggestions, écran « Ta
 * tenue »). Le moteur est côté API : règles (météo, occasion, goûts,
 * porté récemment), puis l'IA qui choisit parmi les meilleures tenues.
 * L'app donne l'occasion, la position si l'utilisateur l'accepte, et sa
 * langue ; elle met les raisons en phrases.
 */
export type Occasion = 'EVERYDAY' | 'WORK' | 'SPORT' | 'EVENING';
export type WeatherKind = 'SUNNY' | 'CLOUDY' | 'RAIN' | 'SNOW' | 'WIND';
export type Slot = 'outer' | 'top' | 'bottom' | 'dress' | 'shoes' | 'warmAccessory';

export type Forecast = { temperature: number; min: number; max: number; weather: WeatherKind; rainChance: number; place: string | null };

export type Reason =
  | { code: 'weather'; temperature: number; min: number; max: number; weather: WeatherKind; wet: boolean; place: string | null; outer: string | null; outerCategory: string | null }
  | { code: 'noWeather' }
  | { code: 'occasion'; occasion: Occasion; styles: string[] }
  | { code: 'notWorn'; garment: string; days: number | null }
  | { code: 'harmony'; kind: 'neutral' | 'oneAccent' | 'contrast' | 'busy' }
  | { code: 'liked'; style: string | null }
  | { code: 'ai'; text: string };

export type OutfitPiece = {
  id: string;
  name: string;
  category: string | null;
  categorySlug: string | null;
  slot: Slot | null;
  photo: string | null;
  lastWornAt: string | null;
  daysSinceWorn: number | null;
};

export type OutfitSuggestion = {
  id: string;
  occasion: Occasion;
  status: string;
  generatedAt: string;
  forecast: Forecast | null;
  source: 'AI' | 'RULES';
  model: string | null;
  reasons: Reason[];
  pieces: OutfitPiece[];
};

export const OCCASIONS: Occasion[] = ['EVERYDAY', 'WORK', 'SPORT', 'EVENING'];

const key = () => ['outfit-suggestion', activeProfileId()];

/** La suggestion du jour encore ouverte (null s'il n'y en a pas). */
export function useCurrentOutfit() {
  return useQuery({
    queryKey: key(),
    queryFn: async ({ signal }) => (await apiGet<{ suggestion: OutfitSuggestion | null }>('/api/outfit-suggestions/current', signal)).suggestion,
  });
}

/**
 * La position, si l'utilisateur l'accepte, pour la météo du jour : précision
 * faible (la ville suffit), la dernière connue d'abord. Refus ou délai : on
 * s'en passe, l'API prend alors la ville du logement.
 */
async function position(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    let permission = await Location.getForegroundPermissionsAsync();
    if (permission.status === 'undetermined') permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return null;
    const known = await Location.getLastKnownPositionAsync({ maxAge: 3 * 3600 * 1000 });
    const found =
      known ??
      (await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ]));

    return found ? { latitude: found.coords.latitude, longitude: found.coords.longitude } : null;
  } catch {
    return null;
  }
}

const language = () => (['fr', 'en', 'ja'].includes(i18n.language) ? i18n.language : 'fr');

async function post(path: string, body: Record<string, unknown>): Promise<OutfitSuggestion> {
  return (await apiRequest<{ suggestion: OutfitSuggestion }>(path, { method: 'POST', body, accept: 'application/json' })).suggestion;
}

/** Une tenue pour cette occasion. */
export async function suggestOutfit(queryClient: QueryClient, occasion: Occasion): Promise<OutfitSuggestion> {
  const suggestion = await post('/api/outfit-suggestions', { occasion, locale: language(), ...((await position()) ?? {}) });
  queryClient.setQueryData(key(), suggestion);

  return suggestion;
}

/** « Nouvelle tenue » : même occasion, d'autres pièces. */
export async function nextOutfit(queryClient: QueryClient, id: string): Promise<OutfitSuggestion> {
  const suggestion = await post(`/api/outfit-suggestions/${id}/next`, { locale: language(), ...((await position()) ?? {}) });
  queryClient.setQueryData(key(), suggestion);

  return suggestion;
}

/** « Remplacer » une pièce ; avec dislike (« Je n'aime pas »), elle est aussi écartée des prochaines suggestions. */
export async function swapPiece(queryClient: QueryClient, id: string, garment: string, dislike: boolean): Promise<OutfitSuggestion> {
  const suggestion = await post(`/api/outfit-suggestions/${id}/swap`, { garment, dislike });
  queryClient.setQueryData(key(), suggestion);

  return suggestion;
}

/** « J'aime cette tenue » : elle rejoint le dressing ; la suggestion du jour est close. */
export async function acceptOutfit(queryClient: QueryClient, id: string): Promise<{ id: string; name: string }> {
  const { outfit } = await apiRequest<{ outfit: { id: string; name: string } }>(`/api/outfit-suggestions/${id}/accept`, { method: 'POST', body: {}, accept: 'application/json' });
  queryClient.setQueryData(key(), null);

  return outfit;
}

/** Le dessin d'une pièce sans photo : d'après sa catégorie, sinon sa place dans la tenue. */
export function pieceArt(piece: OutfitPiece): ClothKind {
  const slug = piece.categorySlug ?? '';
  if (/pulls|sweats/.test(slug)) return 'pull';
  if (/shorts/.test(slug)) return 'short';
  if (/robes|jupes|combinaisons/.test(slug)) return 'robe';
  if (/bonnets/.test(slug)) return 'casquette';

  return ({ outer: 'veste', top: 'tshirt', bottom: 'pantalon', dress: 'robe', shoes: 'baskets', warmAccessory: 'echarpe' } as const)[piece.slot ?? 'top'] ?? 'cintre';
}
