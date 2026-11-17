import { createContext, use, useCallback, useMemo, useState, type PropsWithChildren } from 'react';

import type { Candidate, DueChoice } from '@/lib/loans';
import type { Kind } from '@/lib/possessions';

/**
 * Brouillon du parcours « Prêter » (maquette, lot 05) : ami › informations
 * › vérification. Rien n'est envoyé avant « Confirmer le prêt ».
 */
export type LoanDraft = {
  possession: { kind: Kind; id: string; iri: string; name: string } | null;
  borrower: Candidate | null;
  due: DueChoice;
  /** « Autre date », saisie JJ/MM/AAAA. */
  otherDate: string;
  note: string;
};

type Api = { draft: LoanDraft; update: (patch: Partial<LoanDraft>) => void };

const Context = createContext<Api | null>(null);

export function useLoanDraft(): Api {
  const value = use(Context);
  if (value === null) throw new Error('useLoanDraft doit être utilisé dans le parcours « Prêter ».');

  return value;
}

export function LoanDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<LoanDraft>({ possession: null, borrower: null, due: 'two-weeks', otherDate: '', note: '' });
  const update = useCallback((patch: Partial<LoanDraft>) => setDraft((d) => ({ ...d, ...patch })), []);
  const value = useMemo<Api>(() => ({ draft, update }), [draft, update]);

  return <Context value={value}>{children}</Context>;
}
