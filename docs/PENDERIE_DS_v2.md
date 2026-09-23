# Penderie — Design System v2 (refonte UI)

Statut : brouillon, à confronter à la page « Components » dès que l'accès lecture Figma est rétabli.
Périmètre : UI uniquement. Aucune modification d'UX, de parcours, de règle métier ni de prototype.
RGAA : audité et corrigé, voir `PENDERIE_RGAA.md`.
Mode sombre : palette définie au §8, appliquée pour l'instant au seul écran d'accueil.

---

## 1. Couleurs — la charte est conservée telle quelle

Aucune couleur nouvelle. Ce qui change, c'est la **hiérarchie d'usage**.

| Rôle | Valeur | Usage v2 |
|---|---|---|
| `primary` | `#D31D66` | Accent unique : CTA principal, actif de nav, statut « Prêté »/« À rendre », liens. **Un seul aplat primary par écran.** |
| `primary/12` | `#D31D66` @ 12 % | Fonds de chips sélectionnées, halo d'icône, surfaces d'accent |
| `primary/08` | `#D31D66` @ 8 % | Survol, fond de ligne active |
| `ink` (secondaire) | `#1A1E24` | Titres et texte principal |
| `ink/70` | `#1A1E24` @ 70 % | Texte courant |
| `ink/45` | `#1A1E24` @ 45 % | Métadonnées, labels, infos secondaires |
| `surface` | `#FFFFFF` | Cartes, feuilles, barres |
| `bg` | `#F8FAFC` | Fond d'écran |
| `main` | `#117D6F` | Succès, statut « Disponible », « En cours » |
| `main/10` | `#EAF6F6` | Fond de succès / disponible |
| `cloth` | `#831297` | Dressing / « Emprunté » |
| `cloth-light` | `#E5C5EB` | Fond emprunté |
| `error` | `#DC2626` | Erreur, « En retard », « Perdu » |
| `muted` | `#475569` | « Vendu », « Terminé », neutre inactif |

**Règle de bordure :** plus de contour par défaut. Une carte se distingue par sa surface blanche sur `bg`, pas par un trait. Bordure `ink @ 8 %` réservée aux champs de formulaire et aux chips non sélectionnées.

---

## 2. Espacement — échelle 4 pt

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56`

- Gouttière d'écran : **20** (gauche/droite, constante partout)
- Entre sections : **32**
- Titre de section → contenu : **12**
- Padding interne de carte : **12** (carte visuelle) / **16** (carte d'info)
- Gap de grille : **12**
- Hauteur de respiration en bas d'écran : **56** (au-dessus de la nav)

Interdits : valeurs hors échelle, marges asymétriques non justifiées.

---

## 3. Rayons

| Token | Valeur | Usage |
|---|---|---|
| `r-xs` | 8 | Chips, badges, petits champs |
| `r-sm` | 12 | Champs de formulaire, boutons secondaires |
| `r-md` | 16 | Cartes, boutons pleins |
| `r-lg` | 24 | Photos, tuiles du dressing, modales |
| `r-full` | 999 | Avatars, pastilles de statut, FAB |

Un écran n'utilise jamais plus de trois rayons différents.

---

## 4. Typographie — styles EXISTANTS conservés

Aucun style nouveau. L'échelle du fichier est 48 / 32 / 24 (Typolio) + 16 / 12 (Luciole).
Ce qui change, c'est **où** on les emploie : aujourd'hui les titres de carte sont en 24, ils descendent en 16 bold.

| Style Figma | Police / taille | Usage v2 |
|---|---|---|
| `title h1 r` | Typolio 48 | Splash, onboarding uniquement |
| `title h3 r` | Typolio 32 | Titre d'écran / « Bonjour <prénom> ». **Un seul par écran.** |
| `sub h4 r` | Typolio 24 | Nom sur une fiche objet/vêtement (hero) |
| `corps 16 bold` | Luciole 16 Bold | Titres de section, titres de carte, libellés de bouton |
| `corps 16` | Luciole 16 | Texte courant, valeurs de champ |
| `legend bold` | Luciole 12 Bold | Badges de statut, onglets de nav, labels |
| `legend regular` | Luciole 12 | Métadonnées, catégories, dates, prix secondaires |

Les variantes `underline` restent réservées aux liens et à l'élément actif d'un fil d'Ariane.

---

## 5. Élévation

- `e-0` : aucune ombre — défaut pour les cartes (elles reposent sur `bg`)
- `e-1` : `0 1 2 rgba(26,30,36,.06)` — carte détachable, chip flottante
- `e-2` : `0 4 12 rgba(26,30,36,.08)` — FAB, barre de nav, feuille modale
- `e-3` : `0 12 32 rgba(26,30,36,.12)` — modale plein écran

Jamais plus d'un niveau d'élévation visible simultanément dans une même zone.

---

## 6. Catalogue de composants (page Components v2)

Organisation par sections Figma, nommage `Catégorie / Composant / Variante`.

### Navigation
- `Nav / Tab` — 5 onglets : Accueil · Inventaire · Dressing · Logements · Paramètres. Variants `État = Actif | Inactif`
- `Nav / Header` — variants `Type = Titre | Titre+Retour | Titre+Action | Recherche | Transparent (sur photo)`
- `Nav / FAB` — variants `État = Fermé | Ouvert`
- `Nav / Breadcrumb` — fil d'Ariane des localisations

### Boutons
- `Button / Primary` — `État = Default | Pressed | Disabled | Loading`
- `Button / Secondary` (contour) — mêmes états
- `Button / Ghost` — mêmes états
- `Button / Icon` — `Taille = S | M`, `État = Default | Actif | Disabled`
- `Button / Destructive`

### Champs / formulaires
- `Field / Text` — `État = Default | Rempli | Focus | Erreur | Disabled`
- `Field / Select`
- `Field / Search`
- `Field / Textarea`
- `Field / Stepper`
- `Field / Toggle` — `État = On | Off | Disabled`
- `Field / Upload photo` — `État = Vide | Rempli`

### Cards
- `Card / Object` — `Statut = Disponible | Prêté | Emprunté | En vente | Vendu | Perdu`
- `Card / Garment` (dressing, format portrait, photo dominante)
- `Card / Outfit` (composition, mosaïque de pièces)
- `Card / Loan` — `Statut = En cours | À rendre | En retard | Terminé`
- `Card / Listing` (vente) — prix, état, vendeur
- `Card / Place` (logement / pièce / rangement / carton)
- `Card / Friend`
- `Card / Order` (achat / vente en cours)

### Chips / filtres
- `Chip / Filter` — `État = Sélectionné | Non sélectionné | Disabled`
- `Chip / Category` (avec icône)
- `Chip / Sort`
- `Chip / Removable`

### Badges / statuts
- `Status / Object` — 6 variantes (couleurs § 1)
- `Status / Loan` — 4 variantes
- `Status / Order` — En attente | Payé | Expédié | Reçu | Problème | Remboursé
- `Badge / Count` (notifications)
- `Badge / Private` (cadenas — lisibilité du caractère privé de l'app)

### Listes
- `List / Row` — `Type = Simple | Avec icône | Avec avatar | Avec valeur | Navigable`
- `List / Section header`
- `List / Divider`

### Fiches
- `Detail / Hero photo` — `Type = Photo | Placeholder | Galerie`
- `Detail / Info row`
- `Detail / Action bar` — 1 action principale + secondaires en ghost
- `Detail / History item`

### Modales
- `Modal / Sheet` (bas d'écran)
- `Modal / Confirm` — `Ton = Neutre | Destructif`
- `Modal / Filter`

### Notifications
- `Toast / Succès` · `Toast / Erreur` · `Toast / Info`
  (règle le doublon actuel « Message pop / État3 » ×2)
- `Notification / Row` — `État = Lu | Non lu`

### Profil
- `Avatar` — `Taille = S | M | L`, `Type = Photo | Initiales`
- `Profile / Header`
- `Profile / Stat` (discret, pas de dashboard)

### Dressing
- `Garment / Thumb` (issu du set `Vetements` 39:124 — conservé et étendu, jamais dupliqué)
- `Garment / Attribute` (marque, taille, couleur, style, état)
- `Outfit / Slot`

### Inventaire
- `Object / Thumb`
- `Object / Location path`

### Vente
- `Price` — `Type = Simple | Barré | Total`
- `Seller / Row`
- `Checkout / Line` — Article → Prix → Livraison → Total

### Autres
- `Empty state` — `Type = Dressing | Inventaire | Recherche | Filtre | Prêts | Tenues | Amis | Notifications`
- `Loader` — `Type = Écran | Inline | Skeleton carte`
- `Photo` — `Ratio = 1:1 | 3:4 | 16:9`, `État = Chargée | Placeholder`

---

## 7. Règles transversales

1. **Auto-layout partout.** Aucun positionnement absolu sauf superposition intentionnelle (badge sur photo).
2. **La photo est l'élément fort** sur Inventaire, Dressing, Tenues, Vente. Ratio 3:4 en dressing, 1:1 en inventaire.
3. **Une seule action principale par écran**, en `Button / Primary`. Le reste en secondaire ou ghost.
4. **Les informations secondaires** passent en `Body-S` ou `Caption`, couleur `ink/45`.
5. **Pas de dashboard** : l'accueil montre des objets, pas des chiffres.
6. **Cohérence de statut** : la même couleur signifie la même chose partout dans l'app.

---

## 8. Mode sombre

Palette dérivée de la charte, vérifiée au contraste : 23 couples
texte/fond, tous au-dessus de 4.5:1 (méthode dans `PENDERIE_RGAA.md`).

| Rôle | Clair | Sombre | Remarque |
|---|---|---|---|
| Fond d'écran | `#F8FAFC` | `#12151A` | Presque noir, biaisé froid comme `ink` |
| Surface (cartes, barres) | `#FFFFFF` | `#1B1F26` | **Plus claire que le fond** : en sombre, l'élévation passe par la surface, pas par l'ombre |
| Texte principal | `#1A1E24` | `#EDF1F6` | |
| Texte secondaire | `#475569` | `#9BA7B8` | |
| Accent — texte et liens | `#D31D66` | `#FF6098` | Le rose de la charte tombe à 2.6:1 sur fond sombre |
| Accent — aplat de bouton | `#D31D66` | `#D31D66` | **Inchangé** : le texte blanc dessus tient déjà 5.08:1 |
| Succès / disponible | `#117D6F` | `#43BBA9` | texte ; l'aplat reste `#117D6F` |
| Erreur / retard | `#DC2626` | `#FF6B6B` | texte ; l'aplat reste `#DC2626` |
| Dressing / emprunté | `#831297` | `#CE86DE` | texte ; l'aplat reste `#831297` |
| Ombres | `rgba(26,30,36,.06/.10)` | noir à 24 % / 40 % | quadruplées, sinon invisibles |

**La règle qui structure tout le reste** : une couleur n'a pas la même
traduction selon qu'elle peint un texte ou une surface. Le blanc en texte
reste blanc (il est posé sur un aplat de marque) ; le blanc en surface
devient la couleur de carte. Les teintes d'encre — filets, zones photo,
boutons désactivés — s'inversent en teintes de lumière : `ink` à 4 %
devient `#EDF1F6` à 4 %.

**Ce qui n'est pas traduit** : les instances de composants (le picto « + »
du bouton flottant, les vignettes de vêtements, les avatars). Leur blanc
n'est pas une surface mais un dessin ; le repeindre le ferait disparaître.

**Portée actuelle** : `Accueil — Tableau de bord · Sombre` sur la page
Maquette v2, produit par `penderie-ui-v2-17-sombre.js`. Le script clone
l'écran clair et le repeint jeton par jeton — il ne redessine rien, et
fonctionne sur n'importe quel autre écran en changeant une constante.
