# Penderie — Principes UX

Ces principes ne sont pas des intentions : ils sont déjà appliqués dans les
131 écrans de la maquette v2. Chacun est écrit avec ce qu'il donne
concrètement, et ce qu'il interdit — c'est ce qui permet de trancher quand
un nouvel écran se présente.

Périmètre : l'application Penderie (ranger, retrouver, prêter, vendre entre
amis). Ces principes priment sur le design system, qui n'en est que la
traduction visuelle.

---

## 1. Privé par défaut

**La règle.** Rien de ce que possède l'utilisateur n'est visible par
quiconque tant qu'il ne l'a pas partagé explicitement, élément par élément.
Ajouter un ami ne partage rien.

**Dans la maquette.** Un bandeau le rappelle sur chaque écran où la
question se pose : « Accepter ne partage rien : tu choisis ensuite ce que
Julie peut voir, élément par élément » (Demande reçue), « Thomas ne voit
que ce que tu lui as explicitement partagé » (Profil ami), « Tu vois
seulement ce que Rafael a choisi de partager » (Accès invité). L'écran
Confidentialité s'ouvre sur un bloc « Le principe » qui l'énonce.

**Ce que ça interdit.** Un fil d'actualité, des suggestions publiques, un
profil consultable par défaut, une annonce de vente visible hors du cercle
d'amis.

---

## 2. Une seule action principale par écran

**La règle.** Un écran, une chose à faire. Elle est en bouton plein ; tout
le reste descend en secondaire, et l'action destructive est un lien, jamais
un bouton.

**Dans la maquette.** La fiche vêtement : « Prêter » en plein, puis
Modifier / Déplacer / Vendre en contour, puis « Supprimer ce vêtement » en
lien rouge. Même barre d'actions sur les 131 écrans.

**Ce que ça interdit.** Deux boutons pleins côte à côte, un « Supprimer »
aussi visible qu'un « Enregistrer ».

---

## 3. La conséquence est annoncée avant l'action

**La règle.** Avant une action irréversible ou qui change l'état d'autre
chose, l'écran dit ce qui va se passer — en chiffres quand c'est possible.

**Dans la maquette.** « Le Carton Bricolage passera de 12 à 11 objets »
(déplacer un objet), « Les 8 objets remonteront dans Garage › Étagère 2 »
(supprimer un carton), « 104 objets perdront leur localisation »
(supprimer un logement), « L'objet passera en Prêté et sortira de tes
objets disponibles » (confirmer un prêt), « Les 3 objets passent dans le
carton » (créer un carton).

**Ce que ça interdit.** Une modale qui se contente de « Êtes-vous sûr ? ».

---

## 4. La photo porte l'objet, le texte l'explique

**La règle.** Dans les listes et les grilles, l'image est l'élément fort et
occupe la majorité de la carte. Le texte donne ce que la photo ne dit pas :
le statut, le lieu, la date.

**Dans la maquette.** Ratio 3:4 dans le dressing, 1:1 dans l'inventaire ;
la fiche s'ouvre sur une photo pleine largeur de 320 px ; la carte vêtement
ne porte que trois lignes de texte.

**Ce que ça interdit.** Une liste de noms sans visuel, une vignette de
40 px reléguée à gauche d'un pavé de texte.

---

## 5. Une couleur de statut veut dire la même chose partout

**La règle.** Les statuts sont un langage : la même couleur signifie la
même chose d'un bout à l'autre de l'application, quel que soit l'objet.

**Dans la maquette.** Vert = disponible, en cours, tout va bien. Rose
(primary) = ça t'attend, action requise (prêté, à rendre, à remettre).
Violet = emprunté, ça ne t'appartient pas. Rouge = en retard, refusé,
perdu. Gris = terminé, vendu, révoqué. Les statuts d'objet, de prêt et de
commande partagent cette grille.

**Ce que ça interdit.** Un rouge décoratif, un vert « joli » sur un état
qui n'est pas un succès.

---

## 6. On sait toujours où une chose est rangée

**La règle.** La localisation d'un objet est donnée en entier —
logement › pièce › rangement › conteneur — et jamais tronquée. C'est la
promesse de l'application.

**Dans la maquette.** « Maison principale › Garage › Étagère 2 › Carton
Bricolage » apparaît en entier sur la fiche objet, dans le récapitulatif
d'ajout, à la remise d'un prêt et dans les résultats de recherche. Un fil
d'Ariane accompagne toute la descente logement → pièce → rangement →
carton.

**Ce que ça interdit.** « Garage… » avec des points de suspension, un
objet enregistré sans emplacement sans que l'écran le signale.

---

## 7. Pas de tableau de bord

**La règle.** L'accueil montre des objets, pas des chiffres. Les compteurs
existent, mais en légende, jamais en gros.

**Dans la maquette.** L'accueil ouvre sur les derniers ajouts, les prêts en
cours et une suggestion de tenue. « 128 objets · 48 vêtements · 4 prêtés »
tient sur une ligne de 12 px sous le bonjour.

**Ce que ça interdit.** Des tuiles de statistiques en haut de l'accueil,
des graphiques d'usage.

---

## 8. Un état vide dit quoi faire

**La règle.** Aucun écran vide ne se contente d'être vide : il explique
pourquoi il l'est, ce qu'on y verra, et propose l'action qui le remplit.

**Dans la maquette.** Neuf états vides construits sur le même gabarit —
illustration, titre, une phrase, une action. « Penderie ne sert à rien tout
seul : ajoute un ami pour lui prêter un objet » (aucun ami), « Il faut au
moins un haut, un bas et une paire de chaussures pour composer une tenue »
(dressing insuffisant).

**Ce que ça interdit.** Une liste vide, un « Aucun résultat » seul au
milieu de l'écran.

---

## 9. Les règles métier se voient dans l'interface

**La règle.** Quand une action est impossible, elle reste visible mais
désactivée, avec la raison écrite à côté. On n'apprend pas une règle en se
heurtant à une erreur.

**Dans la maquette.** Sur la fiche d'un objet emprunté, « Prêter » est
grisé et la ligne en dessous dit « Objet emprunté : tu ne peux pas le
prêter ». Sur un vêtement prêté : « Prêt et vente indisponibles tant qu'il
est prêté ». Sur le profil enfant : « Vendre et acheter — bloqué pour un
profil enfant ».

**Ce que ça interdit.** Faire disparaître un bouton sans explication,
laisser l'utilisateur découvrir la règle dans un message d'erreur.

---

## 10. Le vocabulaire est stable

**La règle.** Un mot, une chose. Le mot choisi est celui de l'utilisateur,
pas celui du modèle de données.

**Dans la maquette.** *Objet* et *vêtement* sont les deux natures ;
*logement*, *pièce*, *rangement*, *carton* sont les quatre niveaux de
localisation ; *prêté* désigne toujours ce que j'ai donné, *emprunté* ce
qu'on m'a confié. Jamais « item », « container » ni « asset ».

**Ce que ça interdit.** Appeler « habit » ce qu'on appelle « vêtement »
ailleurs, ou « boîte » ce qu'on appelle « carton ».

---

## Vérifier qu'un écran respecte ces principes

Six questions à poser devant n'importe quel écran, avant de le considérer
comme fini :

1. Quelle est **l'action principale** ? Y en a-t-il exactement une en
   bouton plein ?
2. Si l'écran fait quelque chose d'irréversible, **la conséquence est-elle
   écrite** avant le bouton ?
3. Un statut est-il affiché ? Utilise-t-il **la couleur du langage
   commun** ?
4. Si l'écran parle d'un objet, **sa localisation est-elle complète** ?
5. Que voit l'utilisateur si cet écran est **vide** ?
6. L'écran révèle-t-il quelque chose à un tiers ? Si oui, **est-ce dit
   explicitement** ?
