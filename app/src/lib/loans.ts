import { useQuery, type QueryClient } from '@tanstack/react-query';

import { apiGet, apiRequest } from '@/lib/api';
import type { ConditionValue, Kind } from '@/lib/possessions';

/**
 * Le prêt d'objets (API /api/loans) : de la demande au retour.
 *
 *   REQUESTED ─accepter→ ACCEPTED ─remis→ ACTIVE ─retour confirmé→ RETURNED
 *       ├─refuser→ DECLINED      └─annuler→ CANCELLED      └─perdu→ LOST
 *
 * Le propriétaire qui prête de lui-même crée un prêt déjà ACCEPTED. Le
 * retard n'est pas un statut : c'est un prêt ACTIVE dont la date est passée
 * (overdue, calculé par l'API).
 */
export type LoanStatus = 'REQUESTED' | 'ACCEPTED' | 'ACTIVE' | 'RETURNED' | 'DECLINED' | 'CANCELLED' | 'LOST';
export type LoanRole = 'lender' | 'borrower' | 'guardian';

export type Person = { id: string; displayName: string; username: string };
export type Candidate = Person & { household: boolean };

export type LoanEvent = { type: string; actor: string | null; occurredAt: string; payload: Record<string, unknown> };

export type Loan = {
  id: string;
  status: LoanStatus;
  overdue: boolean;
  damaged: boolean;
  role: LoanRole;
  possession: { id: string; kind: Kind; '@id': string; name: string; canView: boolean; photo: string | null };
  lender: Person;
  borrower: Person;
  requestedAt: string;
  acceptedAt: string | null;
  receivedAt: string | null;
  dueDate: string | null;
  returnDeclaredAt: string | null;
  returnConfirmedAt: string | null;
  note: string | null;
  returnNote: string | null;
  conditionAtStart: ConditionValue | null;
  conditionAtReturn: ConditionValue | null;
  /** Seulement dans le détail d'un prêt et la réponse d'un geste. */
  events?: LoanEvent[];
};

export const isOpen = (loan: Loan) => loan.status === 'REQUESTED' || loan.status === 'ACCEPTED' || loan.status === 'ACTIVE';

// ---------------------------------------------------------------------------
// Lectures
// ---------------------------------------------------------------------------

/** « Mes prêts » : ce que je prête (lender) ou ce que j'emprunte (borrower), en cours et terminés. */
export function useLoans(role: 'lender' | 'borrower') {
  return useQuery({ queryKey: ['loans', 'list', role], queryFn: ({ signal }) => apiGet<Loan[]>(`/api/loans?role=${role}`, signal) });
}

export function useLoan(id: string) {
  return useQuery({ queryKey: ['loans', id], queryFn: ({ signal }) => apiGet<Loan>(`/api/loans/${id}`, signal) });
}

/** À qui je peux prêter : mes amis, et les autres profils de mon compte. */
export function useCandidates() {
  return useQuery({ queryKey: ['loans', 'candidates'], queryFn: ({ signal }) => apiGet<Candidate[]>('/api/loans/candidates', signal) });
}

/** L'historique des prêts d'un objet, pour son propriétaire (enabled : seulement s'il l'est). */
export function usePossessionLoans(iri: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['loans', 'possession', iri],
    queryFn: ({ signal }) => apiGet<Loan[]>(`/api/possessions/loans?possession=${encodeURIComponent(iri ?? '')}`, signal),
    enabled: enabled && iri !== undefined,
  });
}

// ---------------------------------------------------------------------------
// Gestes
// ---------------------------------------------------------------------------

/** Tout geste change un prêt, et souvent la disponibilité de l'objet. */
async function refresh(queryClient: QueryClient, loan: Loan): Promise<Loan> {
  queryClient.setQueryData(['loans', loan.id], loan);
  await queryClient.invalidateQueries({ queryKey: ['loans'] });
  await queryClient.invalidateQueries({ queryKey: ['inventory'] });

  return loan;
}

/** Le propriétaire prête de lui-même : le prêt naît accepté. */
export async function lend(queryClient: QueryClient, body: { possession: string; borrower: string; dueDate: string | null; note: string | null }): Promise<Loan> {
  return refresh(queryClient, await apiRequest<Loan>('/api/loans', { method: 'POST', body, accept: 'application/json' }));
}

/** Demander à emprunter un objet qu'on voit (partagé avec moi). */
export async function requestLoan(queryClient: QueryClient, body: { possession: string; note: string | null }): Promise<Loan> {
  return refresh(queryClient, await apiRequest<Loan>('/api/loans/request', { method: 'POST', body, accept: 'application/json' }));
}

export type Gesture = 'accept' | 'decline' | 'cancel' | 'received' | 'due-date' | 'declare-return' | 'confirm-return' | 'lost';

export async function loanGesture(queryClient: QueryClient, id: string, gesture: Gesture, body: Record<string, unknown> = {}): Promise<Loan> {
  const loan = await refresh(queryClient, await apiRequest<Loan>(`/api/loans/${id}/${gesture}`, { method: 'POST', body, accept: 'application/json' }));
  // Un objet rangé ailleurs au retour change de place.
  if (gesture === 'confirm-return') await queryClient.invalidateQueries({ queryKey: ['locations'] });

  return loan;
}

// ---------------------------------------------------------------------------
// Libellés
// ---------------------------------------------------------------------------

/** Pastille d'un prêt (maquette, lot 05) : « En cours », « En retard », « À rendre », « Terminé »… */
export function loanBadge(loan: Loan): { label: string; tint: string; text: string } {
  const pink = { tint: 'bg-primary/[0.12]', text: 'text-[#C21B5E] dark:text-primary-night' };
  const grey = { tint: 'bg-muted/[0.12]', text: 'text-muted dark:text-muted-night' };
  const red = { tint: 'bg-error/10', text: 'text-error dark:text-error-night' };
  const green = { tint: 'bg-main/10 dark:bg-main-night/15', text: 'text-[#10786B] dark:text-main-night' };

  switch (loan.status) {
    case 'REQUESTED':
      return { label: 'Demandé', ...pink };
    case 'ACCEPTED':
      return { label: 'À remettre', ...pink };
    case 'ACTIVE':
      if (loan.overdue) return { label: 'En retard', ...red };
      if (loan.returnDeclaredAt) return { label: 'Rendu ?', ...pink };
      return { label: 'En cours', ...green };
    case 'RETURNED':
      return { label: loan.damaged ? 'Rendu abîmé' : 'Terminé', ...grey };
    case 'DECLINED':
      return { label: 'Refusé', ...grey };
    case 'CANCELLED':
      return { label: 'Annulé', ...grey };
    case 'LOST':
      return { label: 'Perdu', ...red };
  }
}

/** « 20 sept. », ou « 20 sept. 2027 » hors de l'année en cours. */
export function shortDate(iso: string, now = new Date()): string {
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  const sameYear = date.getFullYear() === now.getFullYear();

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

/**
 * La ligne d'une carte de prêt, du point de vue de celui qui regarde :
 * « Prêté à Thomas · retour 20 sept. », « Emprunté à Karim · rendu le 2 sept. ».
 */
export function loanLine(loan: Loan): string {
  const lending = loan.role !== 'borrower';
  const who = lending ? `Prêté à ${loan.borrower.displayName}` : `Emprunté à ${loan.lender.displayName}`;
  const when = (() => {
    switch (loan.status) {
      case 'REQUESTED':
        return lending ? 'demande à valider' : 'demande envoyée';
      case 'RETURNED':
        return loan.returnConfirmedAt ? `rendu le ${shortDate(loan.returnConfirmedAt)}` : 'rendu';
      case 'DECLINED':
        return 'demande refusée';
      case 'CANCELLED':
        return 'annulé';
      case 'LOST':
        return 'perdu';
      default:
        return loan.dueDate ? `retour ${shortDate(loan.dueDate)}` : 'retour non défini';
    }
  })();

  return `${loan.status === 'REQUESTED' && !lending ? `Demandé à ${loan.lender.displayName}` : who} · ${when}`;
}

/** Les lignes du journal d'un prêt, en français. */
export const EVENT_LABEL: Record<string, string> = {
  REQUESTED: 'Demande envoyée',
  ACCEPTED: 'Prêt accepté',
  DECLINED: 'Demande refusée',
  RECEIVED: 'Objet remis',
  REMINDER_SENT: 'Rappel envoyé',
  DUE_DATE_CHANGED: 'Date de retour changée',
  RETURN_DECLARED: 'Retour déclaré',
  RETURNED: 'Retour confirmé',
  DAMAGE_REPORTED: 'Dommage constaté',
  DECLARED_LOST: 'Déclaré perdu',
  CANCELLED: 'Prêt annulé',
};

// ---------------------------------------------------------------------------
// Date de retour
// ---------------------------------------------------------------------------

export type DueChoice = 'week' | 'two-weeks' | 'month' | 'none' | 'other';

export const DUE_CHOICES: { value: DueChoice; label: string }[] = [
  { value: 'week', label: '1 semaine' },
  { value: 'two-weeks', label: '2 semaines' },
  { value: 'month', label: '1 mois' },
  { value: 'none', label: 'Pas de date' },
  { value: 'other', label: 'Autre date' },
];

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** « 05/11/2026 » → « 2026-11-05 », ou null si la date n'existe pas. */
export function parseFrenchDate(input: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (date.getDate() !== Number(day) || date.getMonth() !== Number(month) - 1) return null;

  return iso(date);
}

/**
 * La date de retour choisie, au format de l'API (AAAA-MM-JJ), null pour
 * « Pas de date », ou undefined si « Autre date » est invalide ou passée.
 */
export function dueDateOf(choice: DueChoice, other: string, today = new Date()): string | null | undefined {
  const days = { week: 7, 'two-weeks': 14, month: 30 } as const;
  if (choice === 'none') return null;
  if (choice !== 'other') {
    const date = new Date(today);
    date.setDate(date.getDate() + days[choice]);

    return iso(date);
  }
  const parsed = parseFrenchDate(other);

  return parsed !== null && parsed >= iso(today) ? parsed : undefined;
}
