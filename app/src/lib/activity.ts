import { useQuery } from '@tanstack/react-query';

import { activeProfileId, apiGet } from '@/lib/api';

/** GET /api/me/activity : les chiffres du profil actif (écran « Mon activité »). */
export type Activity = {
  inventory: { items: number; garments: number; addedThisMonth: number };
  loans: { lent: number; overdue: number; borrowed: number; returned: number };
  sales: { onSale: number; sold: number; bought: number };
  /** rate : part des scans entièrement reconnus, en %, null sans aucun scan. */
  scans: { total: number; recognised: number; rate: number | null };
};

export function useActivity() {
  return useQuery({
    queryKey: ['activity', activeProfileId()],
    queryFn: ({ signal }) => apiGet<Activity>('/api/me/activity', signal),
  });
}
