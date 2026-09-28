import { QueryClient } from '@tanstack/react-query';

/**
 * Cache des requêtes vers l'API, partagé par toute l'app.
 *
 * C'est aussi la base du hors ligne « niveau 2 » décidé le 18/09 : la feature
 * hors ligne branchera un persister sur ce client pour écrire le cache sur le
 * téléphone et garder l'inventaire consultable sans réseau.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Une donnée reste « fraîche » 30 s : naviguer entre deux écrans ne
      // relance pas la même requête.
      staleTime: 30_000,
      // Réseau mobile instable : deux nouvelles tentatives avant l'erreur.
      retry: 2,
    },
  },
});
