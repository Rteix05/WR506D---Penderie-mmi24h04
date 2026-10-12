# Penderie — App mobile

Application mobile de Penderie : **Expo SDK 57 (React Native 0.86) + TypeScript + expo-router + NativeWind + React Query**.
Les choix techniques et leurs raisons sont détaillés dans `docs/PENDERIE_STACK_TECHNIQUE.html`, le design system dans `docs/PENDERIE_DS_v2.md`.

## Prérequis

- Node.js 22 (ou plus récent) et npm.
- Sur le téléphone : l'app **Expo Go**, pour ouvrir le projet en scannant un QR code.
- L'API lancée (voir `api/README.md`) : sans elle, on reste bloqué sur l'écran de connexion.

## Démarrer

```bash
cd app
npm install
npx expo start
```

- Téléphone réel : scanner le QR code avec Expo Go (Android) ou l'appareil photo (iOS). Le téléphone et le poste doivent être sur le même Wi-Fi.
- Version web : touche `w` dans le terminal.

### Adresse de l'API

Elle se règle dans `EXPO_PUBLIC_API_URL`. Le fichier `.env` commité vaut `http://localhost:8080`, ce qui marche pour le web et le simulateur iOS. **Sur un téléphone réel, `localhost` désigne le téléphone** : créer un `.env.local` (ignoré par git) avec l'IP du poste.

```bash
# app/.env.local
EXPO_PUBLIC_API_URL=http://192.168.1.42:8080
```

IP du poste sous Windows : `ipconfig`, ligne « Adresse IPv4 » de la carte Wi-Fi. Émulateur Android : `http://10.0.2.2:8080`.

## Commandes

```bash
npx expo install <paquet>   # TOUJOURS à la place de npm install : choisit la version compatible avec le SDK
npx tsc --noEmit            # vérification TypeScript
npx expo lint               # ESLint
npx expo-doctor             # diagnostic des dépendances et de la configuration
```

## Styles : NativeWind et design system

Les écrans se stylent avec des classes Tailwind (`className="bg-bg px-5"`) que NativeWind convertit en styles natifs. Les jetons du DS v2 sont dans `tailwind.config.js` :

| DS v2 | Classe |
|---|---|
| Couleurs `primary`, `ink`, `surface`, `bg`, `main`, `cloth`, `error`, `muted` | `bg-primary`, `text-ink`, `text-ink/70`… |
| Mode sombre (section 8) | variante `-night` : `bg-bg dark:bg-bg-night` |
| Rayons 8 / 12 / 16 / 24 / 999 | `rounded-xs` / `-sm` / `-md` / `-lg` / `-full` (les autres rayons n'existent pas) |
| Typo 48 / 32 / 24 / 16 / 12 | `text-h1` / `text-h3` / `text-h4` / `text-body` / `text-legend` |
| Échelle 4 pt, gouttière 20 | échelle Tailwind native : `p-1` = 4 px… `px-5` = 20 px |

NativeWind est en **v4.2.7** (Tailwind 3.4), la version stable. La v5 (Tailwind 4) est encore en release candidate.

## Connexion et session

L'app a deux mondes, séparés dans `src/app/_layout.tsx` par `Stack.Protected` :

- **`(auth)`** — connexion (`/connexion`) et inscription (`/inscription`), visibles seulement déconnecté ;
- **`(app)`** — l'app elle-même (onglets), visible seulement connecté.

Quand l'état change (connexion, déconnexion, session expirée), Expo Router bascule seul vers le monde autorisé : aucun écran ne fait de redirection à la main.

| Quoi | Où | Comment |
|---|---|---|
| Jetons | `lib/session.ts` | jeton d'accès (15 min) + jeton de rafraîchissement (30 j, usage unique) dans le trousseau chiffré (`expo-secure-store`) ; `localStorage` sur la version web, qui ne sert qu'au développement |
| Requêtes | `lib/api.ts` → `apiRequest()` | ajoute `Authorization` et `X-Profile` ; sur un 401, rafraîchit le jeton **une seule fois pour toutes les requêtes en attente** (sinon le jeton à usage unique serait refusé au deuxième appel) puis rejoue la requête ; si le rafraîchissement est refusé, déconnexion |
| État de connexion | `lib/auth.tsx` → `SessionProvider`, `useSessionStatus()` | `loading` (écran de démarrage affiché) → `signedIn` / `signedOut` |
| Qui suis-je | `lib/auth.tsx` → `useMe()`, `useActiveProfile()` | `GET /api/me` : compte, profils, profil actif |
| Profil actif | `useSwitchProfile()` | mémorise le profil, l'envoie en `X-Profile`, et vide le cache pour que chaque écran recharge ses données vues par ce profil. Si le profil mémorisé n'est plus utilisable (403), retour au profil par défaut |

La déconnexion est locale (on oublie les jetons) : l'API n'a pas encore de route de révocation.

## Navigation

D'après Figma (fichier « WR506D - Penderie », page « Maquette v2 ») : barre **Accueil · Inventaire · [+] · Logements · Profil**.

- Un onglet ne change pas de page : il **déplie un panneau** (écrans `Accueil — Menu · <onglet>`, lot 28 du prototype) par-dessus la page, sur un voile. Le même onglet ou le voile le referme, un autre onglet bascule sur son panneau. Ce sont les lignes du panneau qui mènent aux pages ; celles qui ne sont pas encore construites portent « Bientôt ».
- Le « + » central ouvre l'ajout (pour l'instant le test du scan, en modale).
- Code : `components/nav/` — `sections.ts` (contenu des panneaux), `NavBar.tsx`, `NavMenu.tsx` ; `app/(app)/(tabs)/_layout.tsx` les assemble (la barre par défaut de `Tabs` est remplacée).

L'accueil (`(tabs)/index.tsx`) suit l'écran `Accueil — Tableau de bord` avec les vraies données de l'API (compteurs, derniers ajouts). Les illustrations de vêtements sont les SVG de Figma (`assets/images/figma/`).

## Parcours d'ajout

D'après Figma (parcours « Objet » et « Vêtement — Ajout ») : `app/(app)/ajout/`, une modale qui empile ses étapes et partage un brouillon (`lib/add-draft.tsx`). Rien n'est envoyé à l'API avant « Ajouter » à la vérification.

```
« + » → Scanner ─ scan › analyse ─┬─ resultat › objet/… ou vetement/infos (selon ce que l'IA voit)
                                  └─ echec (réessayer, ou saisir à la main avec la photo)
        Vêtements et Objets › « Tu ajoutes quoi ? » ─┬─ Objet    → scan
                                                     └─ Vêtement → vetement/type › infos › emplacement › verification › confirmation
objet/infos › emplacement › verification › confirmation
```

- Référentiels (catégories, marques, couleurs, styles, tailles) et emplacements : `lib/reference.ts`, toutes les pages lues (l'API sert 30 lignes par page).
- « Où tu le ranges ? » (`components/add/LocationStep.tsx`) : Logement › Pièce › Rangement › Conteneur en cascade, création à la volée d'un niveau manquant, emplacements récents.
- Écarts imposés par l'API, signalés dans chaque écran : pas de marque ni de souvenir pour un objet, un seul usage par vêtement. La photo est envoyée juste après la création (`POST …/{id}/photos`).

## Inventaire

D'après Figma (« Objet — Mes objets », « Vêtement — Dressing », les fiches et « Vêtement — Modification ») :

- **Mes objets** (`(tabs)/objets.tsx`) et **Mon dressing** (`(tabs)/dressing.tsx`) : recherche, puces de catégorie (les catégories de premier niveau réellement utilisées), statut, tri (récents, anciens, A → Z), grille de cartes ; quinconce 230 / 170 pour le dressing. On y arrive par le panneau Inventaire ou les cartes de l'accueil.
- **Fiches** (`objet/[id].tsx`, `vetement/[id].tsx`) : photo ou illustration, statut, attributs, emplacement complet, détails, notes (propriétaire seulement).
- **Modifier** (`modifier.tsx`, modale) : PATCH en merge-patch ; la taille d'un vêtement se choisit dans l'échelle de sa catégorie (`sizeSystem`). **Supprimer** : suppression douce côté API, après confirmation.
- L'API n'a ni recherche ni filtre sur `/api/items` et `/api/garments` : l'app lit toutes les pages et filtre elle-même (`lib/possessions.ts`).
- En attente de routes d'API (une alerte « bientôt » le dit) : Prêter, Partager, Vendre, Déplacer ; l'historique des prêts et de port n'est pas affiché.

## Logements

D'après Figma (section « 04 · Logements & rangements ») : on descend **logement › pièce › rangement › carton**. Les pages de l'onglet (`(tabs)/logements/`) forment une pile dans l'onglet : la barre reste en dessous, le retour remonte d'un niveau, le fil d'Ariane permet de sauter plusieurs niveaux.

- **Mes logements** (`logements/index.tsx`) : grille des logements (le principal d'abord), pièces et objets de chacun, « Ajouter un logement ».
- **Vue logement** (`logements/[id].tsx`, `principal` ouvre le logement principal) : grille des pièces, « Ajouter une pièce ».
- **Vue pièce** (`logements/piece/[id].tsx`) : rangements, cartons, objets posés sans rangement, « Ajouter un rangement ».
- **Vue rangement** (`logements/rangement/[id].tsx`) : ses cartons et tout ce qui y est rangé.
- **Mes cartons**, **Tous mes cartons** (`logements/cartons/`) : derniers cartons, puis recherche (nom, code, pièce, et nom des objets dedans) et puces par pièce.
- **Fiche carton** (`carton/[id]/index.tsx`) et **contenu** (`carton/[id]/contenu.tsx`) : nombre d'objets, aperçu, « Ajouter un objet » (le parcours d'ajout s'ouvre avec l'emplacement du carton déjà choisi, paramètre `at`).
- Parcours **Ajouter un logement** (`nouveau-logement/`, 4 étapes : type, nom et adresse, pièces, vérification) et **Créer un carton** (`nouveau-carton/`, 3 étapes : étiquette, emplacement, vérification). Ajout rapide d'une pièce ou d'un rangement : `nouvel-emplacement.tsx`.
- Supprimer un logement, une pièce, un rangement ou un carton : seulement s'il est vide (l'API refuse sinon).
- L'API ne fournit pas de compteurs : `lib/places.ts` réunit les emplacements et tous les biens et compte lui-même.
- En attente de routes d'API : déplacer un carton, partager une pièce, inviter des colocataires (« Qui y a accès »).

## Look du jour

Une photo de soi, un point par vêtement porté, l'IA qui reconnaît chaque vêtement. Le tout prépare un post Instagram en 2 images. Il n'y a pas d'écran Figma pour cette fonctionnalité : les écrans reprennent les blocs existants (titre, cartes, barre d'actions).

- **Entrée** : la carte « Look du jour » de l'accueil. Elle mène à `look/index.tsx` : on prend la photo, ou on la choisit dans la galerie. Il y a un look par jour, et s'il existe déjà, on le reprend.
- **Les points** (`look/[id]/index.tsx`) :
  - toucher un vêtement sur la photo y pose un point ;
  - l'app découpe un gros plan carré autour du point avec `expo-image-manipulator` et l'envoie avec la position. L'IA répond pendant la requête : « reconnu dans ton dressing », « pas dans ton dressing » ou « pas reconnu » ;
  - chaque point se confirme, se désigne dans le dressing (`look/[id]/choisir.tsx`) ou s'ajoute au dressing ;
  - l'ajout passe par le parcours habituel, pré-rempli par l'IA, avec le gros plan comme photo (`ajout/look.tsx`, `Draft.lookLink`). Le vêtement créé est désigné pour le point, puis l'app revient au look.
- **Le post** (`look/[id]/post.tsx`) :
  - image 1 : la photo avec ses points numérotés ;
  - image 2 : les vêtements, avec les mêmes numéros ;
  - on peut écrire une légende ;
  - l'app ne publie rien : « Marquer comme posté » fait passer le look à l'état `POSTED`. Les états sont `TAGGING` › `READY` › `POSTED`.
- **Données** : `lib/look.ts`. La photo envoyée reste en mémoire pour découper les gros plans ; après un redémarrage, elle est retéléchargée avec le jeton.

## Profils du compte

Un compte, c'est une connexion et plusieurs profils, chacun avec sa penderie (MDD). Il y a l'adulte inscrit, ses enfants (sous tutelle) et les proches qu'il gère. Les écrans suivent la section « 12 · Compte » de Figma.

- **Mon profil** (`(tabs)/profil.tsx`) : le profil actif, « Changer de profil », les autres profils du compte et « Ajouter un profil » (pour un adulte).
- **Changer de profil** (`profils/index.tsx`, modale) : une carte par profil (« Profil enfant · 9 ans · 18 objets »), « Gérer », « Continuer ». Changer de profil vide le cache, et toute l'app repart du profil choisi (en-tête `X-Profile`).
- **Fiche d'un profil** (`profils/[id]`) : ce qu'il peut faire, sa penderie (objets, vêtements, prêts en cours), puis Utiliser, Modifier, Autorisations et Supprimer (réservé au tuteur).
- **Nouveau profil** (`profils/nouveau.tsx`) : prénom, date de naissance, type (Enfant ou Famille), puis on enchaîne sur les autorisations du profil créé.
- **Modifier** (`profils/[id]/modifier.tsx`) : le tuteur change tout ; un profil qui se modifie lui-même ne change que son nom affiché et sa bio. Un enfant devenu majeur peut passer profil famille.
- **Autorisations** (`profils/[id]/autorisations.tsx`) : chaque permission en trois modes, Oui, Avec mon accord ou Non. La maquette montre des interrupteurs, mais le modèle de données a trois modes. Le profil lui-même les voit sans pouvoir les changer.
- **Données** : `lib/profiles.ts` (API `/api/account/profiles`).
- **Écarts avec la maquette** :
  - pas d'avatar photo (initiale) ;
  - pas de « Qui est-ce ? » ni de « Partager les logements / les amis », qui n'ont pas d'équivalent dans le modèle de données ;
  - le code parent et les demandes de l'enfant viendront ensuite.

## Structure

```
app/
├── src/
│   ├── app/                      écrans (expo-router : un fichier = une route)
│   │   ├── _layout.tsx           racine : React Query, session, (auth) / (app)
│   │   ├── (auth)/               connexion, inscription
│   │   └── (app)/
│   │       ├── (tabs)/           accueil, mes objets, mon dressing, logements (pile), mon profil
│   │       ├── ajouter.tsx       « Tu ajoutes quoi ? »
│   │       ├── ajout/            parcours d'ajout (scan, objet, vêtement)
│   │       ├── objet/[id].tsx    fiche objet ; vetement/[id].tsx : fiche vêtement
│   │       ├── look/             look du jour : photo, points, post
│   │       ├── modifier.tsx      modification d'un objet ou d'un vêtement
│   │       ├── carton/[id]/      fiche et contenu d'un carton
│   │       ├── nouveau-logement/ parcours « Ajouter un logement »
│   │       ├── nouveau-carton/   parcours « Créer un carton »
│   │       ├── nouvel-emplacement.tsx  ajout rapide d'une pièce ou d'un rangement
│   │       └── profils/          profils du compte : changer, créer, modifier, autorisations
│   ├── components/
│   │   ├── home/ClothVisual.tsx  illustrations de vêtements (SVG Figma)
│   │   ├── inventory/            cartes, recherche, puces, blocs de fiche
│   │   ├── look/                 photo du look et ses points numérotés
│   │   ├── nav/                  barre, panneaux, icônes de la barre
│   │   ├── places/               cartes à initiale, lignes, fil d'Ariane (logements)
│   │   └── ui/                   Button, TextField, MenuRow, ScreenTitle (DS v2)
│   ├── lib/
│   │   ├── api.ts                appels à l'API, jetons, rafraîchissement
│   │   ├── auth.tsx              état de session, /api/me, profil actif
│   │   ├── inventory.ts          compteurs et derniers ajouts de l'accueil
│   │   ├── look.ts               look du jour : photo, gros plans, points, états
│   │   ├── possessions.ts        listes, fiches, modification, suppression
│   │   ├── places.ts             logements : libellés, compteurs, créations, suppressions
│   │   ├── place-draft.tsx       brouillon « Ajouter un logement » ; box-draft.tsx : « Créer un carton »
│   │   ├── profiles.ts           profils du compte et leurs autorisations
│   │   ├── session.ts            stockage chiffré de la session
│   │   ├── scan.ts               envoi d'une photo au scan
│   │   └── query-client.ts       cache React Query (base du hors ligne)
│   └── global.css                point d'entrée Tailwind
├── assets/                       icônes et splash (encore ceux d'Expo)
├── app.json                      configuration Expo (nom, schéma, plugins)
└── tailwind.config.js            jetons du design system
```

`AGENTS.md` et `CLAUDE.md` viennent du modèle Expo : ce sont des consignes pour les assistants IA, notamment « vérifier la doc de la version du SDK plutôt que se fier à sa mémoire ».
