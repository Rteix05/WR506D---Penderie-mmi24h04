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
- Écarts imposés par l'API, signalés dans chaque écran : pas de photo enregistrée (pas de route d'upload), pas de marque ni de souvenir pour un objet, un seul usage par vêtement.

## Structure

```
app/
├── src/
│   ├── app/                      écrans (expo-router : un fichier = une route)
│   │   ├── _layout.tsx           racine : React Query, session, (auth) / (app)
│   │   ├── (auth)/               connexion, inscription
│   │   └── (app)/
│   │       ├── (tabs)/           accueil (tableau de bord), mon profil
│   │       ├── ajouter.tsx       « Tu ajoutes quoi ? »
│   │       └── ajout/            parcours d'ajout (scan, objet, vêtement)
│   ├── components/
│   │   ├── home/ClothVisual.tsx  illustrations de vêtements (SVG Figma)
│   │   ├── nav/                  barre, panneaux, icônes de la barre
│   │   └── ui/                   Button, TextField, MenuRow, ScreenTitle (DS v2)
│   ├── lib/
│   │   ├── api.ts                appels à l'API, jetons, rafraîchissement
│   │   ├── auth.tsx              état de session, /api/me, profil actif
│   │   ├── inventory.ts          compteurs et derniers ajouts de l'accueil
│   │   ├── session.ts            stockage chiffré de la session
│   │   ├── scan.ts               envoi d'une photo au scan
│   │   └── query-client.ts       cache React Query (base du hors ligne)
│   └── global.css                point d'entrée Tailwind
├── assets/                       icônes et splash (encore ceux d'Expo)
├── app.json                      configuration Expo (nom, schéma, plugins)
└── tailwind.config.js            jetons du design system
```

`AGENTS.md` et `CLAUDE.md` viennent du modèle Expo : ce sont des consignes pour les assistants IA, notamment « vérifier la doc de la version du SDK plutôt que se fier à sa mémoire ».
