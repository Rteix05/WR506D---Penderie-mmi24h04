import { createContext, use, useCallback, useMemo, useState, type PropsWithChildren } from 'react';

import type { Location } from '@/lib/add-draft';
import type { BoxType } from '@/lib/places';

/**
 * Brouillon du parcours « Créer un carton » (Figma 172:24363 à 172:24693) :
 * étiquette › emplacement › vérification. Rien n'est envoyé avant « Créer
 * ce carton ».
 */
export type BoxDraft = { name: string; type: BoxType; reference: string; location: Location };

type Api = { draft: BoxDraft; update: (patch: Partial<BoxDraft>) => void };

const Context = createContext<Api | null>(null);

export function useBoxDraft(): Api {
  const value = use(Context);
  if (value === null) throw new Error('useBoxDraft doit être utilisé dans le parcours « Créer un carton ».');

  return value;
}

export function BoxDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<BoxDraft>({ name: '', type: 'CARTON', reference: '', location: { place: null, room: null, storage: null, box: null } });
  const update = useCallback((patch: Partial<BoxDraft>) => setDraft((d) => ({ ...d, ...patch })), []);
  const value = useMemo<Api>(() => ({ draft, update }), [draft, update]);

  return <Context value={value}>{children}</Context>;
}
