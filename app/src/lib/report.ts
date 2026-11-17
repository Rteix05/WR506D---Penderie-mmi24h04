import { apiRequest } from '@/lib/api';

/**
 * Signaler un contenu à la modération (API POST /api/reports). Le
 * signalement arrive dans le back-office (et sa pré-analyse IA). On ne
 * signale que ce qu'on voit, jamais son propre contenu, et une seule fois
 * tant que le premier signalement n'est pas traité (l'API répond 409).
 */
export type ReportTarget = 'PROFILE' | 'ITEM' | 'GARMENT' | 'COMMENT' | 'LISTING' | 'COLLECTION' | 'POST';
export type ReportReason = 'SPAM' | 'INAPPROPRIATE' | 'HARASSMENT' | 'COUNTERFEIT' | 'OTHER';

export const REPORT_REASONS: ReportReason[] = ['INAPPROPRIATE', 'HARASSMENT', 'SPAM', 'COUNTERFEIT', 'OTHER'];

export async function reportContent(targetType: ReportTarget, targetId: string, reason: ReportReason, description: string): Promise<void> {
  await apiRequest(`/api/reports`, {
    method: 'POST',
    body: { targetType, targetId, reason, description: description.trim() || null },
    accept: 'application/json',
  });
}
