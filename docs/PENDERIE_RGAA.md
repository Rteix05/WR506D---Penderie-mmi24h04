# Penderie — Accessibilité RGAA : audit de la maquette v2

Le RGAA s'applique à un site ou une application livrés, pas à une
maquette. Une partie de ses critères se joue pourtant au design, et se
vérifie dès maintenant : contrastes, tailles de cible, information portée
par la couleur, libellés. Le reste ne peut être constaté qu'au
développement — il est listé au §5 pour être posé comme exigence, pas
découvert à la fin.

Référence : RGAA 4.1, qui reprend WCAG 2.1 niveau AA.

---

## 1. Résumé

| | |
|---|---|
| Couples texte / fond mesurés | 27 |
| Conformes avant correction | 20 |
| **En échec avant correction** | **7** |
| Conformes après correction | 27 |
| Corrections appliquées dans le code des maquettes | 2 familles, 30 occurrences |
| Points reportés au développement | 8 |

Les échecs portaient tous sur du texte de 12 px : les pastilles de statut
et les textes atténués par opacité. Aucun titre, aucun bouton, aucun lien
n'était en défaut.

---

## 2. Contrastes — ce qui était mesuré

Méthode : ratio WCAG calculé sur la couleur **effectivement affichée**,
c'est-à-dire après composition des fonds semi-transparents sur leur
support (une pastille à 10 % sur une carte blanche n'a pas le même fond
que la même pastille sur le fond d'écran `#F8FAFC` — et c'est ce second
cas qui décide).

Seuils : **4.5:1** pour le texte courant, **3:1** au-delà de 24 px.

### Les 7 échecs

| Élément | Mesuré | Exigé |
|---|---|---|
| Métadonnée à 70 % d'opacité sur blanc | 3.59 | 4.5 |
| Métadonnée à 60 % d'opacité sur blanc | 2.88 | 4.5 |
| Chevron « › » à 70 % | 3.59 | 4.5 |
| Onglet de navigation inactif (70 %) | 3.59 | 4.5 |
| Pastille **Disponible** (vert sur vert 10 %) | 4.39 | 4.5 |
| Pastille **Prêté** (rose sur rose 12 %) | 4.20 | 4.5 |
| Pastille **En retard** (rouge sur rouge 10 %) | 4.13 | 4.5 |

Les trois pastilles échouaient de peu sur carte blanche, et plus nettement
sur le fond d'écran : 4.09 / 4.01 / 3.85.

### Ce qui passait déjà

Titre d'écran 15.99 · texte courant 16.73 · métadonnée pleine 7.58 ·
lien rose 5.08 · bouton plein 5.08 · bouton danger 4.83 · bouton désactivé
6.76 · pastille Emprunté 6.80 · pastille Terminé 6.53 · pastilles sur
photo 5.02 et 5.08 · chip active 5.08 · bandeau privé 7.01 · voile du menu
4.31.

---

## 3. Les deux corrections, et pourquoi celles-là

### Correction 1 — le libellé des pastilles est assombri, pas la charte

Baisser l'opacité de l'aplat ne suffisait pas : même à 6 %, une pastille
posée sur le fond d'écran plafonne à 4.20. Il fallait toucher à la
couleur.

Plutôt que de modifier la charte, **l'aplat garde la couleur de marque et
seul le libellé de 12 px est assombri** — de 4 à 8 %, invisible à l'œil,
suffisant pour la mesure :

| Statut | Aplat (inchangé) | Libellé avant | Libellé après | Pire ratio |
|---|---|---|---|---|
| Disponible / En cours | `#117D6F` à 10 % | `#117D6F` | **`#10786B`** | 4.51 |
| Prêté / À rendre / À vendre | `#D31D66` à 12 % | `#D31D66` | **`#C21B5E`** | 4.59 |
| En retard / Perdu | `#DC2626` à 10 % | `#DC2626` | **`#CA2323`** | 4.57 |

« Pire ratio » = le cas le plus défavorable, la pastille posée sur le fond
d'écran. Emprunté (violet) et Terminé (gris) passaient déjà, ils sont
inchangés.

Au passage, un défaut d'implémentation a été corrigé : `statusPill`
peignait l'aplat avec la couleur du texte au lieu de celle de la marque.
Sans effet visible tant que les deux étaient identiques — mais la
correction ci-dessus n'aurait pas fonctionné.

### Correction 2 — plus aucune opacité de texte sous 85 %

Sur `#475569`, le seuil de 4.5:1 tombe exactement entre 75 % (4.01) et
80 % (4.54). Toutes les opacités de texte passent donc à **0.85** (5.16),
avec une marge : 30 occurrences dans la bibliothèque et les 15 lots.

Cela couvre les métadonnées atténuées, les chevrons, les libellés
d'onglets inactifs et les icônes de la barre de navigation.

**Ces corrections sont dans le code, pas encore dans le fichier Figma.**
Voir §6.

---

## 4. Autres points vérifiables en maquette

**Taille des cibles.** Le critère AA (24 × 24 px) est respecté partout.
La recommandation de 44 × 44 px ne l'est pas sur trois éléments : le
bouton de retour (40 × 40), les chips de filtre (32 de haut) et
l'interrupteur (48 × 28). Ce n'est pas une non-conformité AA, mais c'est à
corriger si l'application vise un public large — un bouton de retour est
la cible la plus utilisée de toute l'application.

**Information portée par la couleur seule.** Conforme presque partout :
chaque statut porte son libellé écrit, l'interrupteur combine position et
couleur, les chips combinent remplissage et couleur. **Une exception :
l'onglet actif de la barre de navigation ne se distingue que par sa
couleur.** À corriger par un point ou un trait sous l'onglet actif.

**Champs de formulaire.** Tous les champs portent une étiquette visible
au-dessus, sauf **le champ de recherche**, qui n'a qu'un texte indicatif.
Un texte indicatif disparaît à la saisie : il ne tient pas lieu
d'étiquette.

**Libellés d'action explicites.** Deux endroits où l'intitulé ne se
suffit pas hors contexte : l'écran *Mon compte* porte deux liens
« Gérer » côte à côte (l'un pour le profil famille, l'autre pour les
autorisations), et *Profil ami* un lien « Voir ». À la lecture par
synthèse vocale, ces trois liens sont indiscernables.

**Caractères utilisés comme icônes.** La maquette emploie des glyphes
texte en guise d'icônes : `›` pour un chevron, `v` pour un menu déroulant,
`o-` pour la loupe, `[]` pour un carton. Acceptable dans une maquette,
mais ils seront **lus à voix haute** s'ils partent tels quels en
développement.

---

## 5. À porter au développement

Ces huit points ne se constatent pas dans Figma. Ils sont à inscrire dans
les spécifications, pas à découvrir à la recette.

1. **Alternatives textuelles** — chaque photo d'objet ou de vêtement porte
   un texte de remplacement ; les images purement décoratives sont
   masquées à la synthèse vocale.
2. **Noms accessibles des boutons-icônes** — le bouton de retour
   (« Revenir à l'écran précédent »), la fermeture (« Fermer »), le
   bouton + (« Ajouter »), la loupe (« Rechercher »).
3. **Glyphes décoratifs neutralisés** — les `›`, `v`, `o-`, `[]` ne
   doivent pas être vocalisés.
4. **Hiérarchie de titres** — le titre d'écran devient un titre de niveau
   1, les en-têtes de section des titres de niveau 2. La maquette les
   distingue déjà par la taille : il faut que le code le dise aussi.
5. **Ordre de lecture et focus clavier** — l'ordre suit la colonne de
   contenu ; la barre de navigation, posée en absolu, doit venir en
   dernier et non en premier.
6. **Focus visible** — aucun état de focus n'existe dans la maquette. À
   définir : un contour de 2 px, contrasté à 3:1 avec le fond.
7. **Zoom et agrandissement du texte** — les écrans doivent tenir à 200 %
   sans perte d'information. Les cartes en deux colonnes devront passer à
   une colonne.
8. **Mouvement** — le prototype utilise des transitions de glissement et
   de fondu. Elles doivent être neutralisées si le système demande de
   réduire les animations.

---

## 6. Ce qu'il reste à faire pour que ce soit vrai dans Figma

Les corrections sont dans le code des lots, donc **pas encore dans le
fichier**. Pour les y porter :

1. Relancer les **16 lots** dans Scripter.
2. **Relancer ensuite `penderie-prototype-v2.js`** — c'est obligatoire :
   reconstruire un écran détruit les zones cliquables qu'il contient. Les
   liens de niveau écran survivent, pas ceux posés sur les boutons.

Compter une vingtaine de minutes. Tant que ce n'est pas fait, l'audit
ci-dessus décrit le code, pas la maquette.

Restent ensuite deux chantiers hors de cet audit : le **mode sombre**
(reporté depuis le début) et le **focus clavier**, qui n'a pas de sens
dans une maquette mobile mais devra exister en développement.
