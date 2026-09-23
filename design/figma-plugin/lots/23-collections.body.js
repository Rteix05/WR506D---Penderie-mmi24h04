// ============================================================
// Lot 23 — COLLECTIONS / MOODBOARDS
// (page "Maquette v2", section NOUVELLE « 15 — COLLECTIONS »)
//
// Audit avant construction : la notion de collection n'existait nulle part
// [MANQUANT] ; seuls le partage (lot 22) et la fiche objet (lot 02) sont
// réutilisés. Les états visiteur « accès refusé » et « lien révoqué /
// contenu indisponible » NE SONT PAS dupliqués : ce sont les écrans
// génériques « Partage — Invité · … » du lot 22.
//
// 16 écrans NOUVEAUX :
//   rangée 1 — créer : Mes collections, État vide, Créer · Informations,
//              Créer · Éléments, Créer · Moodboard, Collection créée
//   rangée 2 — gérer : Vue, Modifier, Couverture, Supprimer (overlay),
//              Ajouter à une collection, Ajoutée
//   rangée 3 — partager : Partager, Lien et QR, Vue ami, Vue abonné
//
// Le moodboard est une grille libre de 6 colonnes à unités carrées :
// une pièce dominante, des tailles mêlées, du blanc — un tableau, pas une
// liste. Même brique (moodboard() de la lib) pour la couverture des cartes.
//
// Règles rendues visibles :
//   - une collection ne crée pas d'objet, elle les référence
//   - un objet peut être dans plusieurs collections
//   - retirer un élément ou supprimer la collection ne supprime jamais l'objet
//   - privée par défaut ; ami autorisé = commentaires selon permission ;
//     abonné autorisé = lecture seule, sans commentaires ; abonnement seul = rien
// ============================================================

(async function () {
  try {
    figma.notify("Lot 23 Collections : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");
    await chargerNav();
    await chargerAmis();
    const P = await chargerPics();

    const SECTION = "COLLECTIONS";
    sectionAssuree("15 — COLLECTIONS", SECTION);

    const NOM = "Mon style — été 2026";
    const META = "12 éléments · créée le 12 septembre";
    const DESC = "Des pièces légères, du denim et des baskets blanches. Ce que je veux porter cet été.";

    // Le tableau de référence : [col, rang, largeur, hauteur, photo, teinte, étiquette]
    const MOOD = [
      [0, 0, 4, 4, P.jacket,  null,      "À la une"],
      [4, 0, 2, 2, P.baskets, null,      null],
      [4, 2, 2, 3, P.tshirt,  C.primary, null],
      [0, 4, 2, 2, P.cap,     C.main,    null],
      [2, 4, 2, 2, P.pants,   null,      null],
      [4, 5, 2, 3, null,      C.cloth,   "Inspiration"],
      [0, 6, 4, 2, P.scarf,   C.primary, "Souvenir"]
    ];

    function blocs(col, noeuds) {
      const b = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      for (let i = 0; i < noeuds.length; i++) if (noeuds[i]) addFill(b, noeuds[i]);
      addFill(col, b);
    }

    // Titre de collection : court, en Typolio, la meta en dessous
    function titreCollection(col, sous) {
      addFill(col, titrePage(NOM, sous || META));
    }

    function tuileSelection(pic, nom, choisi, cote) {
      const c = frame("Card/Pick/" + nom, { dir: "VERTICAL", gap: S.xs, w: cote, primary: "AUTO", counter: "FIXED" });
      const ph = photoBox(cote, cote, R.md, pic, choisi ? C.primary : C.ink);
      c.appendChild(ph);
      const rond = frame("Selection", {
        w: 24, h: 24, radius: R.full, fill: choisi ? C.primary : C.white,
        dir: "VERTICAL", align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED",
        shadow: SHADOW_E1
      });
      if (choisi) rond.appendChild(text("v", { font: FONT_LB, size: 12, color: C.white }));
      overlay(ph, rond, cote - 32, 8);
      c.appendChild(para(nom, cote, { size: 12, color: C.sub, lineHeight: 16 }));
      return c;
    }

    function grilleSelection(items, cols) {
      const cote = Math.floor((UTIL - S.md * (cols - 1)) / cols);
      const g = frame("Grille", { dir: "HORIZONTAL", gap: S.md, gapY: S.md, wrap: true, px: GUT, primary: "FIXED" });
      for (let i = 0; i < items.length; i++) g.appendChild(tuileSelection(items[i][0], items[i][1], items[i][2], cote));
      return g;
    }

    // Rangée « collection » : vignette de couverture + nom + état de sélection
    function rangeeCollection(nom, meta, pics, choisi) {
      const r = frame("Card/Collection row/" + nom, {
        dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
        px: S.md, py: S.md, align: "CENTER", justify: "SPACE_BETWEEN", shadow: SHADOW_E1
      });
      const g = frame("Gauche", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
      const mini = moodboard([
        [0, 0, 1, 2, pics[0], null, null],
        [1, 0, 1, 1, pics[1], C.primary, null],
        [1, 1, 1, 1, pics[2], null, null]
      ], 56, 2, "Couverture");
      g.appendChild(mini.node);
      const t = frame("Texte", { dir: "VERTICAL", gap: 2 });
      t.appendChild(text(nom, { font: FONT_LB, size: 16, color: C.ink }));
      t.appendChild(para(meta, 170, { size: 12, color: C.sub, lineHeight: 16 }));
      g.appendChild(t);
      r.appendChild(g);
      r.appendChild(choisi ? statusPill("Choisi", "arendre")
        : frame("Radio", { w: 20, h: 20, radius: R.full, fill: C.ink, fillOpacity: 0.08,
                           dir: "VERTICAL", primary: "FIXED", counter: "FIXED" }));
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return r;
    }

    function editeurOutils() {
      const b = frame("Moodboard/Outils", {
        dir: "HORIZONTAL", gap: S.lg, radius: R.full, fill: C.white, px: S.lg, h: 40,
        counter: "FIXED", align: "CENTER", shadow: SHADOW_E2
      });
      b.appendChild(text("Agrandir", { font: FONT_LB, size: 12, color: C.ink }));
      b.appendChild(text("Mettre à la une", { font: FONT_LB, size: 12, color: C.ink }));
      b.appendChild(text("Retirer", { font: FONT_LB, size: 12, color: C.error }));
      return b;
    }

    function poignee() {
      const h = frame("Moodboard/Poignee", { w: 12, h: 12, radius: 3, fill: C.white });
      h.strokes = solid(C.primary);
      h.strokeWeight = 2;
      return h;
    }

    function badgeRetirer() {
      const b = frame("Moodboard/Retirer", {
        w: 24, h: 24, radius: R.full, fill: C.white, shadow: SHADOW_E1,
        dir: "VERTICAL", align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED"
      });
      b.appendChild(text("X", { font: FONT_LB, size: 12, color: C.ink }));
      return b;
    }

    const COLLECTIONS = [
      [NOM, "12 éléments", [P.jacket, P.baskets, P.tshirt], "Partagée", "encours"],
      ["Bricolage", "8 éléments", [P.pants, P.coat, P.cap], "Privée", "neutre"],
      ["Voyage au Portugal", "6 éléments", [P.robe, P.scarf, P.baskets], "Privée", "neutre"],
      ["À vendre", "3 éléments", [P.coat, P.jacket, P.tshirt], "Privée", "neutre"]
    ];

    // ============ RANGÉE 1 — CRÉER ============

    // 1. Mes collections
    ecranNouveau(SECTION, "Collection — Mes collections", 0, function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Mes collections", "4 collections · privées par défaut"));
      const largeur = Math.floor((UTIL - S.md) / 2);
      const g = frame("Grille", { dir: "HORIZONTAL", gap: S.md, gapY: S.md, wrap: true, px: GUT, primary: "FIXED" });
      const creer = frame("Card/Collection/Créer", {
        dir: "VERTICAL", gap: S.sm, w: largeur, h: 250, radius: R.md,
        fill: C.primary, fillOpacity: 0.04, align: "CENTER", justify: "CENTER",
        primary: "FIXED", counter: "FIXED"
      });
      creer.strokes = solid(C.primary, 0.5);
      creer.strokeWeight = 1.5;
      creer.dashPattern = [6, 4];
      creer.appendChild(text("+", { font: FONT_T, size: 32, color: C.primary }));
      creer.appendChild(text("+ Créer une collection", { font: FONT_LB, size: 12, color: C.primary }));
      g.appendChild(creer);
      for (let i = 0; i < COLLECTIONS.length; i++) {
        const c = COLLECTIONS[i];
        g.appendChild(carteCollection(c[0], c[1], c[2], c[3], c[4], largeur));
      }
      addFill(col, g);
      blocs(col, [bandeauPrive("Une collection réunit des éléments de ta penderie sans les déplacer ni les copier.")]);
      finaliser(screen, col);
      poserNav(screen, null);
    });

    // 2. État vide
    ecranNouveau(SECTION, "Collection — État · Aucune collection", 1, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Mes collections", "0 collection"));
      const bloc = frame("Empty state", { dir: "VERTICAL", gap: S.lg, px: GUT, pt: S.huge, align: "CENTER" });
      const mini = moodboard([
        [0, 0, 2, 2, P.jacket, null, null],
        [2, 0, 1, 1, P.baskets, C.primary, null],
        [2, 1, 1, 1, null, C.main, null]
      ], 180, 3, "Illustration");
      bloc.appendChild(mini.node);
      const txt = frame("Texte", { dir: "VERTICAL", gap: S.sm, align: "CENTER" });
      txt.appendChild(para("Crée ton premier tableau", UTIL, { font: FONT_T, size: 24, color: C.ink, lineHeight: 30, align: "CENTER" }));
      txt.appendChild(para("Réunis des vêtements, des objets et des photos autour d'une idée : un style, un voyage, une pièce à décorer.",
        UTIL - S.xl, { size: 16, color: C.sub, lineHeight: 22, align: "CENTER" }));
      addFill(bloc, txt);
      const a = frame("Action", { dir: "VERTICAL", pt: S.sm });
      a.appendChild(bouton("+ Créer une collection", "primary"));
      bloc.appendChild(a);
      addFill(col, bloc);
      finaliser(screen, col);
    });

    // 3. Créer · Informations
    ecranNouveau(SECTION, "Collection — Créer · Informations", 2, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, jauge(3, 0));
      addFill(col, titrePage("Nouvelle collection", "Étape 1 sur 3"));
      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Nom", NOM));
      addFill(champs, champTexte("Description (facultatif)", DESC, 88));
      addFill(col, champs);
      blocs(col, [
        carteSection("Couverture", [
          ligneInfo("Par défaut", "Composition automatique"),
          ligneInfo("Modifiable", "À tout moment")
        ]),
        carteSection("Visibilité", [
          ligneInfo("Au départ", "Privée : toi seul"),
          ligneInfo("Partage", "Après la création")
        ])
      ]);
      barreActions(col, bouton("Continuer", "primary"), null, null, null);
      finaliser(screen, col);
    });

    // 4. Créer · Éléments
    ecranNouveau(SECTION, "Collection — Créer · Éléments", 3, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, jauge(3, 1));
      addFill(col, titrePage("Ajoute des éléments", "Étape 2 sur 3 · 6 sélectionnés"));
      addFill(col, ongletsN(["Mes objets", "Mon dressing", "Photos"], 1));
      const rech = frame("Recherche", { dir: "VERTICAL", px: GUT });
      addFill(rech, champRecherche("Rechercher dans mon dressing..."));
      addFill(col, rech);
      addFill(col, grilleSelection([
        [P.jacket, "Veste en jean", true], [P.baskets, "Baskets Adidas", true], [P.tshirt, "T-shirt Nike", true],
        [P.cap, "Casquette NY", true], [P.pants, "Pantalon beige", true], [P.scarf, "Foulard soie", true],
        [P.coat, "Manteau d'hiver", false], [P.robe, "Robe noire", false], [P.cintre, "Chemise en lin", false]
      ], 3));
      blocs(col, [bandeauPrive("Les éléments restent dans ton inventaire : la collection ne fait que les réunir. Un même élément peut être dans plusieurs collections.")]);
      barreActions(col, bouton("Continuer", "primary"), null, null, null);
      finaliser(screen, col);
    });

    // 5. Créer · Moodboard (éditeur)
    ecranNouveau(SECTION, "Collection — Créer · Moodboard", 4, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, jauge(3, 2));
      addFill(col, titrePage("Ton tableau", "Étape 3 sur 3 · glisse, agrandis, mets à la une"));
      const mb = blocMoodboard(MOOD, "Moodboard/Éditeur");
      const sel = mb.boxes[1];                 // les baskets sont sélectionnées
      sel.strokes = solid(C.primary);
      sel.strokeWeight = 3;
      const plan = sel.parent;
      const coins = [[sel.x - 6, sel.y - 6], [sel.x + sel.width - 6, sel.y - 6],
                     [sel.x - 6, sel.y + sel.height - 6], [sel.x + sel.width - 6, sel.y + sel.height - 6]];
      for (let i = 0; i < coins.length; i++) {
        const p = poignee();
        plan.appendChild(p);
        p.x = coins[i][0]; p.y = coins[i][1];
      }
      const outils = editeurOutils();
      plan.appendChild(outils);
      outils.x = UTIL - outils.width;
      outils.y = sel.y + sel.height + 10;
      addFill(col, mb.node);
      blocs(col, [carteSection("Couverture", [ligneInfo("Utilisée", "Ce tableau, en miniature")])]);
      barreActions(col, bouton("Enregistrer la collection", "primary"), null, null,
        "Retirer un élément du tableau ne le supprime pas de ton inventaire.");
      finaliser(screen, col);
    });

    // 6. Collection créée
    ecranNouveau(SECTION, "Collection — Créée · Confirmation", 5, function (screen) {
      const col = preparer(screen, 40);
      blocs(col, [toastSucces("Collection créée !", "Privée : toi seul la vois pour l'instant.")]);
      const mb = blocMoodboard(MOOD, "Moodboard");
      addFill(col, mb.node);
      titreCollection(col);
      blocs(col, [bandeauPrive("Privée par défaut. Partage-la avec des amis ou des abonnés quand tu veux.")]);
      barreActions(col, bouton("Partager", "primary"), [bouton("Modifier", "secondary")], null, null);
      finaliser(screen, col);
    });

    // ============ RANGÉE 2 — GÉRER ============

    // 7. Vue de la collection (propriétaire)
    ecranNouveau(SECTION, "Collection — Vue", 0, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      const mb = blocMoodboard(MOOD, "Moodboard");
      addFill(col, mb.node);
      titreCollection(col);
      const d = frame("Texte", { dir: "VERTICAL", gap: S.sm, px: GUT });
      d.appendChild(para(DESC, UTIL, { size: 16, color: C.ink, lineHeight: 22 }));
      const pills = frame("Statuts", { dir: "HORIZONTAL", gap: S.xs });
      pills.appendChild(statusPill("Partagée avec 2 personnes", "encours"));
      d.appendChild(pills);
      addFill(col, d);
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, lienRangee("+ Ajouter des éléments", "Objets, vêtements, photos"));
      // lot 27 : commentaires côté propriétaire et publication dans le fil
      addFill(l, lienRangee("Commentaires", "3 commentaires de tes amis autorisés"));
      addFill(l, lienRangee("Publier dans le fil", "Montrer la collection à qui tu choisis"));
      addFill(l, ligneToggle("Inspiration pour mes tenues", "Les vêtements de cette collection peuvent guider les suggestions", false));
      addFill(col, l);
      barreActions(col, bouton("Partager", "primary"), [bouton("Modifier", "secondary")], null, null);
      finaliser(screen, col);
    }, 1);

    // 8. Modifier
    ecranNouveau(SECTION, "Collection — Modifier", 1, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Modifier la collection", "Glisse pour réorganiser · X pour retirer"));
      const mb = blocMoodboard(MOOD, "Moodboard/Édition");
      for (let i = 0; i < mb.boxes.length; i++) {
        const b = mb.boxes[i];
        overlay(b, badgeRetirer(), b.width - 30, 6);
      }
      addFill(col, mb.node);
      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Nom", NOM));
      addFill(champs, champTexte("Description", DESC, 72));
      addFill(col, champs);
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, lienRangee("+ Ajouter des éléments", "Objets, vêtements, photos"));
      addFill(l, lienRangee("Couverture", "Composition automatique", "Changer"));
      addFill(l, lienRangee("Qui peut la voir", "Thomas (ami) · Paul (abonné)", "Gérer"));
      addFill(col, l);
      barreActions(col, bouton("Enregistrer", "primary"), null, "Supprimer la collection",
        "Retirer un élément ne le supprime jamais de ton inventaire.");
      finaliser(screen, col);
    }, 1);

    // 9. Couverture
    ecranNouveau(SECTION, "Collection — Modifier la couverture", 2, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Couverture", NOM));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, lienRangee("Composition automatique", "Les 3 premiers éléments du tableau", "Revenir"));
      addFill(col, l);
      addFill(col, enteteSection("Ou choisis une image", null));
      addFill(col, grilleSelection([
        [P.jacket, "Veste en jean", true], [P.baskets, "Baskets Adidas", false], [P.tshirt, "T-shirt Nike", false],
        [P.cap, "Casquette NY", false], [P.pants, "Pantalon beige", false], [P.scarf, "Foulard soie", false]
      ], 3));
      barreActions(col, bouton("Utiliser cette image", "primary"), null, null, null);
      finaliser(screen, col);
    }, 1);

    // 10. Supprimer (overlay)
    ecranNouveau(SECTION, "Collection — Confirmation · Supprimer", 3, function (screen) {
      modale(screen,
        "Supprimer la collection ?",
        "« " + NOM + " » disparaît. Les 12 éléments restent dans ta penderie, à leur place.",
        "Supprimer",
        "Les personnes avec qui elle était partagée n'y ont plus accès : leur lien affichera « Contenu indisponible ».");
    }, 1);

    // 11. Ajouter à une collection (depuis une fiche objet)
    ecranNouveau(SECTION, "Collection — Ajouter à une collection", 4, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Ajouter à une collection", "Plusieurs choix possibles"));
      blocs(col, [carteElement("Perceuse Bosch", "Maison principale › Garage", P.pants, "Disponible", "dispo")]);
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, rangeeCollection("Bricolage", "8 éléments · déjà dedans", [P.pants, P.coat, P.cap], true));
      addFill(l, rangeeCollection("Camping", "5 éléments", [P.coat, P.cap, P.baskets], true));
      addFill(l, rangeeCollection(NOM, "12 éléments", [P.jacket, P.baskets, P.tshirt], false));
      addFill(l, rangeeCollection("À vendre", "3 éléments", [P.coat, P.jacket, P.tshirt], false));
      addFill(l, lienRangee("+ Créer une collection", "Elle contiendra cet objet"));
      addFill(col, l);
      barreActions(col, bouton("Valider", "primary"), null, null,
        "L'objet ne bouge pas : il apparaît simplement dans les collections choisies.");
      finaliser(screen, col);
    }, 1);

    // 12. Ajoutée
    ecranNouveau(SECTION, "Collection — Ajoutée · Confirmation", 5, function (screen) {
      const col = preparer(screen, 40);
      blocs(col, [toastSucces("Ajoutée à 2 collections !", "La perceuse reste à sa place dans ta penderie.")]);
      addFill(col, titrePage("Perceuse Bosch", "Dans 2 collections"));
      const largeur = Math.floor((UTIL - S.md) / 2);
      const g = frame("Grille", { dir: "HORIZONTAL", gap: S.md, px: GUT });
      g.appendChild(carteCollection("Bricolage", "9 éléments", [P.pants, P.coat, P.cap], "Privée", "neutre", largeur));
      g.appendChild(carteCollection("Camping", "6 éléments", [P.coat, P.cap, P.baskets], "Privée", "neutre", largeur));
      addFill(col, g);
      barreActions(col, bouton("Voir la collection", "primary"), [bouton("Retour à l'objet", "secondary")], null, null);
      finaliser(screen, col);
    }, 1);

    // ============ RANGÉE 3 — PARTAGER ============

    // 13. Partager une collection (+ permissions)
    ecranNouveau(SECTION, "Collection — Partager", 0, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Partager la collection", "Choisis qui, et ce qu'ils peuvent faire"));
      blocs(col, [carteElement(NOM, "12 éléments · privée", P.jacket, null, null)]);
      const amis = frame("Section/Amis", { dir: "VERTICAL", gap: S.md });
      addFill(amis, enteteSection("Amis", "12 amis"));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, rangeeAcces("Thomas", "Ami", 0, "Commentaires", true));
      addFill(l, rangeeAcces("Julie", "Amie", 1, "Commentaires", false));
      addFill(amis, l);
      addFill(col, amis);
      const abos = frame("Section/Abonnés", { dir: "VERTICAL", gap: S.md });
      addFill(abos, enteteSection("Abonnés autorisés", "5 abonnés"));
      const l2 = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l2, rangeeAcces("Paul", "Abonné", 2, "Lecture seule", true));
      addFill(l2, rangeeAcces("Chloé", "Abonnée", 1, "Lecture seule", false));
      addFill(abos, l2);
      addFill(col, abos);
      const r = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(r, ligneToggle("Autoriser les commentaires", "Amis choisis uniquement · jamais les abonnés", true));
      addFill(r, ligneToggle("Créer un lien et un QR code", "Mêmes règles que ci-dessus", true));
      addFill(col, r);
      barreActions(col, bouton("Partager", "primary"), null, null,
        "Tes abonnés non choisis ne voient rien, même s'ils te suivent.");
      finaliser(screen, col);
    }, 2);

    // 14. Lien et QR
    ecranNouveau(SECTION, "Collection — Lien et QR", 1, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Lien de la collection", NOM));
      blocs(col, [carteLien("penderie.app/c/ete-2026", "Expire le 12 octobre 2026"), carteQR("À scanner pour ouvrir la collection")]);
      const acces = frame("Section/Acces", { dir: "VERTICAL", gap: S.md });
      addFill(acces, enteteSection("Qui a accès", "2 personnes"));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, rangeeAcces("Thomas", "Ami", 0, "Commentaires", false));
      addFill(l, rangeeAcces("Paul", "Abonné", 2, "Lecture seule", false));
      addFill(acces, l);
      addFill(col, acces);
      const ap = frame("Section/Apercu", { dir: "VERTICAL", gap: S.md });
      addFill(ap, enteteSection("Aperçu : ce que voit…", null));
      const la = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(la, lienRangee("Un ami autorisé", "Le tableau et les commentaires"));
      addFill(la, lienRangee("Un abonné autorisé", "Le tableau, en lecture seule"));
      addFill(la, lienRangee("Une personne non autorisée", "Accès refusé"));
      addFill(ap, la);
      addFill(col, ap);
      barreActions(col, bouton("Copier", "primary"), null, "Révoquer le lien", null);
      finaliser(screen, col);
    }, 2);

    // 15. Vue ami autorisé
    ecranNouveau(SECTION, "Collection — Vue ami", 2, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      const mb = blocMoodboard(MOOD, "Moodboard");
      addFill(col, mb.node);
      addFill(col, titrePage(NOM, "Collection de Rafael · 12 éléments"));
      const d = frame("Texte", { dir: "VERTICAL", gap: S.sm, px: GUT });
      d.appendChild(para(DESC, UTIL, { size: 16, color: C.ink, lineHeight: 22 }));
      d.appendChild(pastillesRelation([["Ami autorisé", "encours"], ["Commentaires autorisés", "encours"]]));
      addFill(col, d);
      const fil = frame("Section/Commentaires", { dir: "VERTICAL", gap: S.md });
      addFill(fil, enteteSection("Commentaires", "2"));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, commentaire("Julie", 1, "La veste avec les baskets blanches, parfait pour Lisbonne !", "hier", false));
      addFill(l, commentaire("Rafael", 0, "C'est exactement l'idée.", "il y a 2 h", true));
      addFill(fil, l);
      addFill(col, fil);
      const champs = frame("Champs", { dir: "VERTICAL", px: GUT });
      addFill(champs, champTexte("Ton commentaire", "Écrire un commentaire...", 72));
      addFill(col, champs);
      barreActions(col, bouton("Publier", "primary"), null, null,
        "Seuls Rafael et ses amis autorisés voient ces commentaires.");
      finaliser(screen, col);
    }, 2);

    // 16. Vue abonné autorisé
    ecranNouveau(SECTION, "Collection — Vue abonné", 3, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      const mb = blocMoodboard(MOOD, "Moodboard");
      addFill(col, mb.node);
      addFill(col, titrePage(NOM, "Collection de Rafael · 12 éléments"));
      const d = frame("Texte", { dir: "VERTICAL", gap: S.sm, px: GUT });
      d.appendChild(para(DESC, UTIL, { size: 16, color: C.ink, lineHeight: 22 }));
      d.appendChild(pastillesRelation([["Abonné autorisé", "neutre"], ["Lecture seule", "neutre"]]));
      addFill(col, d);
      blocs(col, [bandeauPrive("Rafael a partagé ce tableau avec toi en lecture seule. Les commentaires sont réservés à ses amis autorisés.")]);
      barreActions(col, bouton("Fermer", "secondary"), null, null, null);
      finaliser(screen, col);
    }, 2);

    rapport("Lot 23 Collections");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
