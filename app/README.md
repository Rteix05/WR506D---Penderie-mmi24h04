# Penderie — App mobile

Application mobile de Penderie : **Expo SDK 57 (React Native 0.86) + TypeScript + expo-router + NativeWind + React Query**.
Les choix techniques et leurs raisons sont détaillés dans `docs/PENDERIE_STACK_TECHNIQUE.html`, le design system dans `docs/PENDERIE_DS_v2.md`.

## Prérequis

- Node.js 22 (ou plus récent) et npm.
- Sur le téléphone : l'app **Expo Go**, pour ouvrir le projet en scannant un QR code.
- L'API lancée (voir `api/README.md`) pour que l'écran d'accueil affiche « Connectée ».

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

## Structure

```
app/
├── src/
│   ├── app/            écrans (expo-router : un fichier = une route)
│   │   ├── _layout.tsx racine : fournisseur React Query, navigation
│   │   └── index.tsx   écran provisoire : état de la connexion à l'API
│   ├── lib/
│   │   ├── api.ts          appels à l'API Symfony
│   │   └── query-client.ts cache React Query (base du hors ligne)
│   └── global.css      point d'entrée Tailwind
├── assets/             icônes et splash (encore ceux d'Expo)
├── app.json            configuration Expo (nom, schéma, plugins)
└── tailwind.config.js  jetons du design system
```

`AGENTS.md` et `CLAUDE.md` viennent du modèle Expo : ce sont des consignes pour les assistants IA, notamment « vérifier la doc de la version du SDK plutôt que se fier à sa mémoire ».
