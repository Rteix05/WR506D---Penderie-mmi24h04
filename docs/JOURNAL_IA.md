# Journal d'utilisation de l'IA — Penderie

Ce journal trace l'usage de l'IA dans le projet, à deux niveaux :

1. **L'IA comme outil de développement** : Claude Code (modèle Claude d'Anthropic), utilisé dans le terminal sur le dépôt. Pour chaque séance, le journal donne la demande (le prompt, mot pour mot quand il est conservé), ce que l'IA a produit, ce qui a été vérifié ou corrigé, et les PR qui en sont sorties.
2. **L'IA dans le produit** : les modèles de vision appelés par l'API (scan d'un objet, lecture d'une étiquette, look du jour). Pour ces appels, le journal donne le modèle, la consigne (le prompt) et la manière dont la réponse est contrôlée.

Règles suivies avec l'outil de développement :

- **Une PR par sujet**, et jamais l'API et l'app dans la même branche.
- **Tout passe par une PR relue et mergée par l'étudiant**. L'IA n'écrit jamais directement dans `develop`.
- **L'IA vérifie avant de livrer** : tests PHPUnit côté API ; `tsc`, `expo lint` et export web côté app. Le journal signale ce qui n'a pas pu être vérifié (tests sur téléphone).
- **Les écrans sont comparés à la maquette Figma avant d'être codés.** Les écarts sont écrits dans la PR.
- **Pas de modèle payant dans le produit** : uniquement des modèles gratuits (`:free`) d'OpenRouter.

---

## L'IA dans le produit

### Scan d'un objet ou d'un vêtement, lecture d'une étiquette

- **Où** : `api/src/Service/Scan/ScanAnalyzer.php` (consigne) et `OpenRouterVision.php` (appel).
- **Modèles** : la chaîne `OPENROUTER_SCAN_MODELS`, que des modèles gratuits.
  - Choix du 05/10 : 2 Gemma, un Qwen, un Nemotron.
  - Le 06/10, le Qwen est devenu payant et a été remplacé par `dots-3-note-preview:free`.
  - Les modèles sont essayés dans l'ordre. On passe au suivant si le modèle répond « quota dépassé » (429), s'il a été retiré (404), s'il est en panne, s'il met plus de 30 s ou s'il ne renvoie pas de JSON.
- **Consigne (photo)**, résumée :
  - « Identifie l'objet principal de la photo. S'il se porte, type = GARMENT ; sinon ITEM » ;
  - le modèle répond uniquement en JSON (nom, description, catégorie, marque, couleurs, taille, composition, entretien, pays, confiance) ;
  - il doit choisir la catégorie et les couleurs dans **nos** listes de slugs et de couleurs, fournies dans la consigne ;
  - « N'invente rien : une information absente vaut null ».
- **Consigne (étiquette)** : « Recopie ce qui est écrit sur l'étiquette cousue : marque, taille, composition, entretien en mots, pays. »
- **Contrôle de la réponse** :
  - seules les valeurs du bon type sont gardées ;
  - une catégorie ou une couleur hors de nos listes est écartée ;
  - une marque inconnue reste en texte, et l'app propose de la créer ;
  - chaque scan, réussi ou non, est tracé dans la table `scan` (modèle qui a répondu, échecs des précédents) pour mesurer la fiabilité.

### Look du jour (12/10)

- **Où** : `api/src/Service/Dressing/LookTagDetector.php`. Même chaîne de modèles gratuits que le scan.
- **Ce que reçoit le modèle** :
  - un gros plan découpé par l'app autour du point que l'utilisateur a posé sur sa photo ;
  - la liste numérotée de ses vêtements (80 au plus) : nom, catégorie, couleurs, marque.
- **Consigne** (extrait) :

  > La photo est un gros plan découpé dans une photo de tenue : le vêtement, la chaussure ou l'accessoire porté AU CENTRE de l'image est celui à identifier. Ignore le reste.
  > Voici les vêtements déjà enregistrés dans son dressing, numérotés : […]
  > Si le vêtement du centre est l'un d'eux (même type, mêmes couleurs, même marque si visible), réponds avec son numéro dans "match". Dans le doute, ne choisis pas : match = null.
  > Si match = null, décris le vêtement pour pouvoir l'ajouter au dressing.
  > Réponds UNIQUEMENT avec un objet JSON […] N'invente rien.

- **Contrôle de la réponse** :
  - un numéro hors de la liste est ignoré, et le point est alors traité comme un vêtement nouveau ;
  - la description d'un vêtement nouveau passe par la même normalisation que le scan ;
  - l'utilisateur confirme ou corrige toujours le résultat : rien n'est lié à un vêtement sans son accord.
- **Limite connue** : le modèle ne voit pas les photos du dressing, seulement leur description. Les modèles gratuits refusent plusieurs images dans une même requête.

---

## Séances avec l'outil de développement

> Les séances d'avant le 12/10 sont reconstituées à partir des notes de suivi (les prompts n'avaient pas été conservés mot pour mot). Depuis le 12/10, les prompts sont recopiés tels quels.

### 05 et 06/10 — Scan par IA

- **Demande** (résumée) : brancher le scan sur une IA, Gemma en priorité, uniquement des modèles gratuits, avec au moins 4 modèles de secours.
- **Produit** :
  - l'appel OpenRouter avec la chaîne de modèles ;
  - les consignes photo et étiquette ;
  - la trace des scans ;
  - un faux OpenRouter pour les tests (le premier modèle répond toujours « quota dépassé », pour tester les modèles de secours).
- **Corrigé en cours de route** : un modèle est devenu payant ; les modèles `inkling:free` répondent 403 en dehors de leur environnement. La liste a été ajustée à partir du catalogue réel d'OpenRouter.
- **Vérifié** : premier scan réussi depuis l'iPhone (une veste Stone Island reconnue).

### 09/10 — App : connexion, navigation, parcours d'ajout (PR #24 à #27)

- **Demande** (résumée) : commencer l'app par la connexion et la navigation, puis le parcours d'ajout, en suivant la maquette Figma.
- **Produit** :
  - écrans de connexion et d'inscription ;
  - les 4 onglets et le bouton « + » ;
  - l'accueil ;
  - le parcours d'ajout d'un objet ou d'un vêtement (13 écrans), avec le scan qui pré-remplit les champs ;
  - l'envoi des photos.
- **Corrigé** : l'étudiant a signalé que la maquette n'avait pas été respectée. Depuis, chaque écran est comparé à Figma avant d'être codé.

### 10/10 — Titres coupés sur iOS, inventaire (PR #28, #29)

- **Produit** :
  - correction de la police Typolio, dont les titres étaient coupés sur iOS ;
  - Mes objets et Mon dressing (recherche, filtres, tri), les fiches, la modification et la suppression.
- **Signalé** : un objet supprimé reste lisible par son adresse directe (écart de l'API, noté dans la PR).

### 12/10 — Création de marque, merges (PR #30, #31)

- **Demande** : « merge les PR dans l'ordre ».
- **Produit** : l'ajout d'une marque absente de la liste, depuis le scan ou à la main ; merges de #29, #30 et #31 dans l'ordre.

### 12/10 — Onglet Logements (PR #32)

- **Prompts** :
  - « t'as fais l'inventaire et les logements ? »
  - « fais ca »
- **Produit** :
  - l'onglet Logements, d'après la section Figma « 04 · Logements & rangements » : logements, pièces, rangements, cartons, fiche d'un carton ;
  - la création d'un logement en 4 étapes et d'un carton en 3 étapes ;
  - la suppression d'un emplacement vide.
- **Vérifié** : chaque appel à l'API rejoué avec un compte de test (création puis suppression des 4 niveaux).
- **Signalé** : l'API n'envoie jamais l'état « carton fermé » (écart noté dans la PR). L'app n'a pas été testée sur téléphone.

### 12/10 — Réseau de l'école

- **Prompts** :
  - « je suis sur eduroam pour la connection »
  - « c'est bon je suis sur le partage de co »
- **Produit** : diagnostic. Eduroam isole les appareils entre eux ; l'adresse de l'API passe à celle du partage de connexion (`172.20.10.2`). Windows bloquait les connexions entrantes parce que le réseau était classé « Public » : l'IA a donné la commande pour le passer en « Privé », sans modifier elle-même ce réglage de sécurité.

### 12/10 — Look du jour (PR #33 API, #34 app)

- **Prompt** :

  > pour le look du jour , il faut qu'on puisse prendre une photo de soi , puis depuis la photo placer des point sur chaque vetement (eventuellement en JS) puis que l'IA du scan fasse un la détection des vetements (soi depuis nos vetements enregistré sur Penderie , sinon detecte un nouveau vetement , puis on doit pouvoir faire un post qui se postera en 2 slides sur Instagram ( ne gère pas le post on le fera en cours , gère juste juste l'état de look du jour

- **Analyse de l'IA avant de coder** :
  - aucun écran Figma n'existe pour cette fonctionnalité ;
  - les tenues (`Outfit`) existent dans la base mais ne sont pas exposées par l'API ;
  - le conteneur PHP n'a pas de bibliothèque d'image. Décision : **le téléphone découpe le gros plan** autour de chaque point (`expo-image-manipulator`, déjà installé), et l'API ne fait que l'analyser.
- **Produit (API, #33)** :
  - entités `DailyLook` (un look par jour) et `LookTag` (un point) ;
  - les états `TAGGING › READY › POSTED` ;
  - les routes `/api/looks` ;
  - la détection par l'IA, qui reconnaît un vêtement du dressing ou décrit un vêtement nouveau ;
  - le port noté (`WearLog`) quand le look est prêt ;
  - 7 tests ; suite complète à 203 tests OK.
- **Produit (app, #34)** :
  - la carte « Look du jour » de l'accueil ;
  - la prise de photo ;
  - la pose des points sur la photo ;
  - le choix d'un vêtement du dressing ;
  - l'ajout d'un vêtement nouveau, pré-rempli par l'IA, avec le gros plan comme photo ;
  - l'aperçu du post en 2 images (la photo avec ses points, puis la liste des vêtements) et « Marquer comme posté ».
- **Corrigé pendant la séance** :
  - la base de test n'avait pas la nouvelle migration ;
  - les erreurs métier (point hors de la photo, look déjà posté) sortaient en erreur 500 au lieu de 422 ;
  - la suppression d'un look plantait parce que la photo était effacée avant que son chemin soit lu ;
  - une règle du lint React (mise à jour d'état dans un effet) a imposé de réécrire l'écran de transition vers l'ajout.
- **Pas vérifié** : l'appareil photo et le découpage sur iPhone.

- **Autres prompts de la séance** :
  - « quand t'as fini ca lance la fonctionnalité du multi-compte » (à faire ensuite) ;
  - « pense a tenir le ASANA à jour et à remplir le journal d'utilisation de l'IA avec les prompts etc ». Ce journal a été créé à cette occasion, et 18 tâches Asana déjà livrées ont été cochées ;
  - « petite erreur UX qu'il faudra corriger après ; quand on ajoute des baskets c'est les tailles vetements qui sont proposé au lieu des pointures » (à corriger ensuite).

### 12/10 — Pointures des chaussures (PR #36)

- **Prompt** :

  > petite erreur UX qu'il faudra corriger après ; quand on ajoute des baskets c'est les tailles vetements qui sont proposé au lieu des pointures

- **Cause trouvée par l'IA** : l'échelle de tailles venait du « type » choisi à la première étape. Un vêtement reconnu par le scan saute cette étape, et l'app retombait alors sur les tailles en lettres.
- **Correction** : l'échelle vient maintenant de la catégorie, qui porte la sienne côté API. Le champ s'intitule « Pointure » pour des chaussures.
- **Vérifié** : `tsc` et lint. Pas testé sur téléphone.

### 12/10 — Profils du compte, « multi-compte » (PR #37 API, #38 app)

- **Prompts** :
  - « quand t'as fini ca lance la fonctionnalité du multi-compte »
  - Précision demandée par l'IA, réponse de l'étudiant : « le système de compte qu'on a établi dans le mdd avec les sous comptes , les comptes adultes qui sont aussi géré par nous etc ». Périmètre choisi : profils et autorisations ; le code parent et les demandes de l'enfant viendront plus tard.
- **Analyse de l'IA avant de coder** :
  - le MDD et les entités existaient déjà : `Profile` (ADULT, CHILD, RELATIVE), la tutelle, `ProfilePermission`, la politique par défaut, le voter ;
  - l'API n'exposait que la liste des profils et la suppression d'un enfant ;
  - les 5 écrans Figma de la section « Compte » ont été comparés au MDD. Écart retenu : la maquette montre des interrupteurs, mais le MDD a trois modes (autorisé, avec accord, interdit), et l'app les propose tous les trois.
- **Produit (API, #37)** :
  - `/api/account/profiles` : liste, création d'un enfant ou d'un proche, modification, lecture et réglage des autorisations ;
  - la suppression d'un proche suit la même procédure que celle d'un enfant ;
  - 7 tests ; suite complète à 203 tests OK.
- **Produit (app, #38)** : Changer de profil, fiche d'un profil, Nouveau profil, Modifier, Autorisations, et le nouvel écran « Mon profil ».
- **Pas vérifié** : les écrans sur téléphone.
