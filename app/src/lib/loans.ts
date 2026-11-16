import { useQuery, type QueryClient } from '@tanstack/react-query';

import i18n, { dateLocale } from '@/i18n';
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
      return { label: i18n.t('loans:badge.requested'), ...pink };
    case 'ACCEPTED':
      return { label: i18n.t('loans:badge.accepted'), ...pink };
    case 'ACTIVE':
      if (loan.overdue) return { label: i18n.t('loans:badge.overdue'), ...red };
      if (loan.returnDeclaredAt) return { label: i18n.t('loans:badge.returnDeclared'), ...pink };
      return { label: i18n.t('loans:badge.active'), ...green };
    case 'RETURNED':
      return { label: i18n.t(loan.damaged ? 'loans:badge.returnedDamaged' : 'loans:badge.returned'), ...grey };
    case 'DECLINED':
      return { label: i18n.t('loans:badge.declined'), ...grey };
    case 'CANCELLED':
      return { label: i18n.t('loans:badge.cancelled'), ...grey };
    case 'LOST':
      return { label: i18n.t('loans:badge.lost'), ...red };
  }
}

/** « 20 sept. », ou « 20 sept. 2027 » hors de l'année en cours. */
export function shortDate(iso: string, now = new Date()): string {
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  const sameYear = date.getFullYear() === now.getFullYear();

  return date.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

/**
 * La ligne d'une carte de prêt, du point de vue de celui qui regarde :
 * « Prêté à Thomas · retour 20 sept. », « Emprunté à Karim · rendu le 2 sept. ».
 */
export function loanLine(loan: Loan): string {
  const lending = loan.role !== 'borrower';
  const name = lending ? loan.borrower.displayName : loan.lender.displayName;

  switch (loan.status) {
    case 'REQUESTED':
      return i18n.t(lending ? 'loans:line.lentRequested' : 'loans:line.borrowedRequested', { name });
    case 'RETURNED':
      if (loan.returnConfirmedAt) {
        return i18n.t(lending ? 'loans:line.lentReturned' : 'loans:line.borrowedReturned', { name, date: shortDate(loan.returnConfirmedAt) });
      }

      return i18n.t(lending ? 'loans:line.lentReturnedNoDate' : 'loans:line.borrowedReturnedNoDate', { name });
    case 'DECLINED':
      return i18n.t(lending ? 'loans:line.lentDeclined' : 'loans:line.borrowedDeclined', { name });
    case 'CANCELLED':
      return i18n.t(lending ? 'loans:line.lentCancelled' : 'loans:line.borrowedCancelled', { name });
    case 'LOST':
      return i18n.t(lending ? 'loans:line.lentLost' : 'loans:line.borrowedLost', { name });
    default:
      return loan.dueDate
        ? i18n.t(lending ? 'loans:line.lentDue' : 'loans:line.borrowedDue', { name, date: shortDate(loan.dueDate) })
        : i18n.t(lending ? 'loans:line.lentNoDue' : 'loans:line.borrowedNoDue', { name });
  }
}

/** Les lignes du journal d'un prêt, en français. */
const EVENT_KEYS: Record<string, string> = {
  REQUESTED: 'events.requested',
  ACCEPTED: 'events.accepted',
  DECLINED: 'events.declined',
  RECEIVED: 'events.received',
  REMINDER_SENT: 'events.reminderSent',
  DUE_DATE_CHANGED: 'events.dueDateChanged',
  RETURN_DECLARED: 'events.returnDeclared',
  RETURNED: 'events.returned',
  DAMAGE_REPORTED: 'events.damageReported',
  DECLARED_LOST: 'events.declaredLost',
  CANCELLED: 'events.cancelled',
};

export function eventLabel(type: string): string {
  const key = EVENT_KEYS[type];

  return key ? i18n.t(`loans:${key}`) : type;
}

// ---------------------------------------------------------------------------
// Date de retour
// ---------------------------------------------------------------------------

export type DueChoice = 'week' | 'two-weeks' | 'month' | 'none' | 'other';

export function dueChoices(): { value: DueChoice; label: string }[] {
  return [
    { value: 'week', label: i18n.t('loans:due.week') },
    { value: 'two-weeks', label: i18n.t('loans:due.twoWeeks') },
    { value: 'month', label: i18n.t('loans:due.month') },
    { value: 'none', label: i18n.t('loans:due.none') },
    { value: 'other', label: i18n.t('loans:due.other') },
  ];
}

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
