// ============================================================
// Lot 04 — TENUES  (page "Maquette v2", section 08)
//
// 9 ecrans refaits. Le noeud frame est conserve a chaque fois,
// donc les reactions de prototype de niveau frame survivent.
// Aucun contenu ni action retire : seule la composition change.
//
// Les libelles cliquables sont ceux que penderie-prototype.js va
// rechercher (« Creer une tenue », « Generer », « Refuser »...) :
// les reecrire, c'est casser le prototype. Ils sont accentues,
// comme dans la table du prototype.
// ============================================================

(async function () {
  try {
    figma.notify("Lot 04 Tenues : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");
    await chargerNav();

    async function comp(id) {
      try {
        const n = await figma.getNodeByIdAsync(id);
        return (n && n.type === "COMPONENT") ? n : null;
      } catch (e) { return null; }
    }
    const PIC = {
      tshirt:  await comp("39:50"),
      jacket:  await comp("39:55"),
      coat:    await comp("39:67"),
      pants:   await comp("39:82"),
      baskets: await comp("52:2013"),
      cap:     await comp("39:109"),
      scarf:   await comp("39:115"),
      robe:    await comp("52:2003"),
      cintre:  await comp("52:2024")
    };

    const UTIL_CARTE = W - GUT * 2 - S.lg * 2;

    // ---------- briques propres aux tenues ----------

    // La tenue se lit comme une image, pas comme une liste : une piece
    // dominante et deux pieces secondaires, dans un seul bloc photo.
    function mosaique(pieces, hauteur) {
      const util = W - GUT * 2;
      const gL = Math.floor((util - S.md) * 0.58);
      const gR = util - S.md - gL;
      const hp = Math.floor((hauteur - S.md) / 2);

      const m = frame("Mosaique", { dir: "HORIZONTAL", gap: S.md, align: "MIN" });
      m.appendChild(photoBox(gL, hauteur, R.lg, pieces[0] ? pieces[0][2] : null, C.ink));
      const colD = frame("Colonne", { dir: "VERTICAL", gap: S.md });
      colD.appendChild(photoBox(gR, hp, R.md, pieces[1] ? pieces[1][2] : null, C.ink));
      colD.appendChild(photoBox(gR, hauteur - S.md - hp, R.md, pieces[2] ? pieces[2][2] : null, C.ink));
      m.appendChild(colD);
      return m;
    }

    function blocComposition(pieces, hauteur) {
      const b = frame("Composition", { dir: "VERTICAL", px: GUT });
      addFill(b, mosaique(pieces, hauteur));
      return b;
    }

    // Liste des pieces sous la mosaique : elle nomme ce que la photo
    // montre, sans ajouter d'action (une seule action par ecran).
    // Lot 24 : chaque pièce porte ses deux sorties, « Remplacer » (je veux
    // autre chose aujourd'hui) et « Je n'aime pas » (ne plus la proposer).
    function lignePiece(p, avecActions) {
      const row = frame("List/Row/" + p[0], {
        dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
        px: S.md, py: S.md, align: "CENTER", shadow: SHADOW_E1
      });
      row.appendChild(photoBox(48, 48, R.sm, p[2], C.ink));
      const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text(p[0], { font: FONT_LB, size: 16, color: C.ink }));
      g.appendChild(para(p[3] || p[1], 150, { size: 12, color: C.sub, lineHeight: 16 }));
      row.appendChild(g);
      if (avecActions) {
        const a = frame("Actions", { dir: "VERTICAL", gap: S.sm, align: "MAX" });
        a.appendChild(text("Remplacer", { font: FONT_LB, size: 12, color: C.primary }));
        a.appendChild(text("Je n'aime pas", { size: 12, color: C.sub }));
        row.appendChild(a);
      }
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return row;
    }

    // Les raisons de la suggestion, en clair
    function carteRaisons(raisons) {
      const c = card("Card/Section/Pourquoi cette tenue", { gap: S.md });
      c.appendChild(text("Pourquoi cette tenue", { font: FONT_LB, size: 12, color: C.sub }));
      for (let i = 0; i < raisons.length; i++) {
        const r = frame("Raison", { dir: "HORIZONTAL", gap: S.md, align: "MIN" });
        const pas = frame("Pastille", {
          w: 8, h: 8, radius: R.full, fill: C.primary, dir: "VERTICAL", primary: "FIXED", counter: "FIXED"
        });
        const pw = frame("Repere", { dir: "VERTICAL", pt: 6 });
        pw.appendChild(pas);
        r.appendChild(pw);
        const t = frame("Texte", { dir: "VERTICAL", gap: 2 });
        // para et non text : une raison longue revient à la ligne au lieu de déborder
        t.appendChild(para(raisons[i][0], UTIL_CARTE - 20, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 22 }));
        t.appendChild(para(raisons[i][1], UTIL_CARTE - 20, { size: 12, color: C.sub, lineHeight: 16 }));
        r.appendChild(t);
        addFill(c, r);
        try { t.layoutSizingHorizontal = "FILL"; } catch (e) {}
      }
      return c;
    }

    function carteMeteo(conseil) {
      const c = card("Card/Meteo", { gap: S.sm });
      const l = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER", justify: "SPACE_BETWEEN" });
      const g = frame("Gauche", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text("Météo · Paris", { font: FONT_LB, size: 12, color: C.sub }));
      g.appendChild(text("12° · nuageux", { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
      l.appendChild(g);
      l.appendChild(statusPill("Prise en compte", "dispo"));
      addFill(c, l);
      if (conseil) c.appendChild(para(conseil, UTIL_CARTE, { size: 12, color: C.sub, lineHeight: 18 }));
      return c;
    }

    // Carte d'une tenue enregistree : trois vignettes valent mieux
    // qu'un nom seul pour reconnaitre une tenue au premier regard.
    function carteTenue(nom, meta, pieces) {
      const c = frame("Card/Outfit/" + nom, {
        dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
        px: S.md, py: S.md, align: "CENTER", shadow: SHADOW_E1
      });
      const mini = frame("Apercus", { dir: "HORIZONTAL", gap: S.xs });
      for (let i = 0; i < 3; i++) {
        mini.appendChild(photoBox(40, 56, R.xs, pieces[i] ? pieces[i][2] : null, C.ink));
      }
      c.appendChild(mini);
      const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text(nom, { font: FONT_LB, size: 16, color: C.ink }));
      g.appendChild(para(meta, 150, { size: 12, color: C.sub, lineHeight: 16 }));
      c.appendChild(g);
      c.appendChild(text("›", { font: FONT_LB, size: 16, color: C.sub, opacity: 0.85 }));
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return c;
    }

    // ---------- donnees de reference (memes pieces partout) ----------
    const TENUE = [
      ["Veste en jean",  "Levi's · Vestes · L",      PIC.jacket],
      ["T-shirt Nike",   "Nike · Hauts · M",         PIC.tshirt],
      ["Pantalon noir",  "Zara · Pantalons · 40",    PIC.pants],
      ["Baskets Adidas", "Adidas · Chaussures · 42", PIC.baskets]
    ];
    const CONTEXTES = ["Toutes", "Travail", "Décontracté", "Soirée", "Sport"];

    // ============ 1. Ma tenue ============
    ecran("Tenue — Ma tenue", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Ma tenue", "Vendredi 12 septembre"));

      const meteo = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(meteo, carteMeteo("Une veste légère suffira en fin de journée."));
      addFill(col, meteo);

      const sec = frame("Section/Derniere suggestion", { dir: "VERTICAL", gap: S.md });
      addFill(sec, enteteSection("Dernière suggestion · Travail", "Voir la tenue ›"));
      addFill(sec, blocComposition(TENUE, 240));
      const meta = frame("Texte", { dir: "VERTICAL", px: GUT });
      meta.appendChild(text("Générée hier · 4 pièces · aucune portée cette semaine", { size: 12, color: C.sub }));
      addFill(sec, meta);
      addFill(col, sec);

      const actions = frame("Detail/Action bar", { dir: "VERTICAL", px: GUT });
      addFill(actions, bouton("Créer une tenue", "primary"));
      addFill(col, actions);

      const liste = frame("Liste", { dir: "VERTICAL", px: GUT });
      addFill(liste, lienRangee("3 tenues enregistrées", "Travail · Soirée · Sport"));
      addFill(col, liste);

      finaliser(screen, col);
      poserNav(screen, null);
    });

    // ============ 2. Préférences ============
    ecran("Tenue — Préférences", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Préférences", "Ce qui guide la suggestion"));

      // Lot 24 : contextes = familles de style ; la règle des pièces refusées
      // est corrigée (plus de délai de 30 jours) ; tout se défait.
      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, groupeChips("Contexte", ["Travail", "Quotidien", "Sport", "Soirée", "Événement", "Maison"], ["Travail"]));
      addFill(champs, groupeChips("Couleurs à privilégier", ["Neutres", "Foncées", "Claires", "Colorées"], ["Neutres"]));
      addFill(champs, champSelect("S'inspirer d'une collection (facultatif)", "Aucune"));
      addFill(col, champs);

      const meteo = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(meteo, carteMeteo("La suggestion s'adapte à la température du jour."));
      addFill(col, meteo);

      const regles = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(regles, ligneToggle("Éviter les pièces portées récemment", "Rien de porté ces 7 derniers jours s'il y a d'autres options", true));
      addFill(regles, ligneToggle("Ne plus proposer les pièces refusées", "Jusqu'à ce que tu les réactives", true));
      addFill(regles, ligneToggle("Inclure les vêtements empruntés", "Ceux qu'on t'a prêtés", false));
      addFill(regles, ligneToggle("Inclure les vêtements en vente", null, false));
      addFill(regles, lienRangee("Mes exclusions", "2 pièces · 1 couleur · 1 style · 1 contexte", "Gérer"));
      addFill(regles, lienRangee("Les catégories de style", "Travail, Quotidien, Sport, Soirée…"));
      addFill(col, regles);

      barreActions(col, bouton("Générer", "primary"), null, "Réinitialiser mes préférences",
        "Les vêtements prêtés ne sont jamais proposés.");
      finaliser(screen, col);
    });

    // ============ 3. Suggestion ============
    ecran("Tenue — Suggestion", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Ta tenue", "Travail · 12° nuageux"));
      addFill(col, blocComposition(TENUE, 300));

      const pourquoi = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(pourquoi, carteRaisons([
        ["Il fait 12 °C aujourd'hui", "Une veste suffit, pas besoin de manteau."],
        ["Journée de travail", "Styles Smart casual et Business · aucune pièce de sport."],
        ["Tu n'as pas porté cette veste cette semaine", "Veste en jean · dernière fois le 2 septembre."],
        ["Ces pièces vont bien ensemble", "Couleurs neutres, même famille de style."]
      ]));
      addFill(col, pourquoi);

      const pieces = [
        [TENUE[0][0], TENUE[0][1], TENUE[0][2], "Pas portée cette semaine"],
        [TENUE[1][0], TENUE[1][1], TENUE[1][2], "Porté il y a 9 jours"],
        [TENUE[2][0], TENUE[2][1], TENUE[2][2], "Porté il y a 12 jours"],
        [TENUE[3][0], TENUE[3][1], TENUE[3][2], "Pas portées cette semaine"]
      ];
      const sec = frame("Section/Pieces", { dir: "VERTICAL", gap: S.md });
      addFill(sec, enteteSection("4 pièces", null));
      const liste = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      for (let i = 0; i < pieces.length; i++) addFill(liste, lignePiece(pieces[i], true));
      addFill(sec, liste);
      addFill(col, sec);

      // Lot 24 : « Refuser » global remplacé par les deux actions par pièce
      barreActions(col,
        bouton("J'aime cette tenue", "primary"),
        [bouton("Nouvelle tenue", "secondary")],
        null, "« Je n'aime pas » exclut la pièce des prochaines suggestions, jusqu'à ce que tu la réactives.");
      finaliser(screen, col);
    });

    // ============ 4. Remplacer une pièce ============
    ecran("Tenue — Remplacer une pièce", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Remplacer une pièce", "Haut · 6 alternatives"));

      const actuelle = frame("Blocs", { dir: "VERTICAL", px: GUT });
      const c = card("Card/Section/Piece actuelle", { gap: S.sm });
      c.appendChild(text("Pièce actuelle", { font: FONT_LB, size: 12, color: C.sub }));
      const l = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
      l.appendChild(photoBox(56, 56, R.sm, PIC.tshirt, C.ink));
      const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text("T-shirt Nike", { font: FONT_LB, size: 16, color: C.ink }));
      g.appendChild(text("Nike · Hauts · M", { size: 12, color: C.sub }));
      l.appendChild(g);
      addFill(c, l);
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      addFill(actuelle, c);
      addFill(col, actuelle);

      const sec = frame("Section/Alternatives", { dir: "VERTICAL", gap: S.md });
      addFill(sec, enteteSection("À la place · contexte Travail", null));

      // Lot 24 : le porté récent se lit sur chaque alternative, et passe en dernier
      const largeur = Math.floor((W - GUT * 2 - S.md) / 2);
      const alternatives = [
        ["Chemise blanche", "Uniqlo · pas portée cette semaine", PIC.tshirt, true],
        ["Polo marine",     "Lacoste · porté il y a 10 jours",   PIC.tshirt, false],
        ["Pull col rond",   "COS · porté il y a 2 jours",        PIC.coat,   false],
        ["Sweat gris",      "Nike · déjà porté cette semaine",   PIC.coat,   false]
      ];
      const grille = frame("Grille", {
        dir: "HORIZONTAL", gap: S.md, gapY: S.md, wrap: true, px: GUT, primary: "FIXED"
      });
      for (let i = 0; i < alternatives.length; i++) {
        const a = alternatives[i];
        const carte = frame("Card/Garment/" + a[0], {
          dir: "VERTICAL", gap: 0, w: largeur, radius: R.md, fill: C.white,
          shadow: SHADOW_E1, primary: "AUTO", counter: "FIXED", clip: true
        });
        const ph = photoBox(largeur, Math.round(largeur * 1.1), 0, a[2], C.ink);
        carte.appendChild(ph);
        if (a[3]) overlay(ph, statusPill("Choisi", "prete", true), S.sm, S.sm);
        const b = frame("Texte", { dir: "VERTICAL", gap: 2, px: S.md, pt: S.md, pb: S.md });
        b.appendChild(para(a[0], largeur - S.md * 2, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 20 }));
        b.appendChild(para(a[1], largeur - S.md * 2, { size: 12, color: C.sub }));
        addFill(carte, b);
        grille.appendChild(carte);
      }
      addFill(sec, grille);
      addFill(col, sec);

      barreActions(col, bouton("Remplacer la pièce", "primary"), null, null,
        "Les pièces portées cette semaine passent en dernier. Aucune pièce de sport pour le contexte Travail.");
      finaliser(screen, col);
    });

    // ============ 5. Tenue enregistrée ============
    ecran("Tenue — Tenue enregistrée", function (screen) {
      const col = preparer(screen, 40);

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, toastSucces("Tenue enregistrée !", "Tu la retrouveras dans tes tenues."));
      addFill(col, zone);

      addFill(col, titrePage("Bureau décontracté", "Travail · 4 pièces · aujourd'hui"));
      addFill(col, blocComposition(TENUE, 240));

      const liste = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(liste, lienRangee("Portée aujourd'hui", "Ajoutée à l'historique des 4 pièces"));
      addFill(col, liste);

      barreActions(col,
        bouton("Voir mes tenues", "primary"),
        [bouton("Retour à l'accueil", "secondary")], null);
      finaliser(screen, col);
    });

    // ============ 6. Mes tenues ============
    ecran("Tenue — Mes tenues", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Mes tenues", "3 tenues enregistrées"));
      addFill(col, rangeeChips(CONTEXTES, 0));

      const liste = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(liste, carteTenue("Bureau décontracté", "Travail · portée 4 fois · le 8 sept.", TENUE));
      addFill(liste, carteTenue("Soirée entre amis", "Soirée · portée 2 fois · le 30 août",
        [TENUE[0], TENUE[3], TENUE[2]]));
      addFill(liste, carteTenue("Week-end sport", "Sport · jamais portée",
        [["Sweat", "", PIC.coat], ["Short", "", PIC.pants], ["Baskets", "", PIC.baskets]]));
      addFill(col, liste);

      finaliser(screen, col);
      poserNav(screen, null);
    });

    // ============ états ============
    // Meme structure pour les trois : seul le message change.
    function etatVide(screen, titreEcran, sousTitre, titre, corps, action) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage(titreEcran, sousTitre));

      const bloc = frame("Empty state", {
        dir: "VERTICAL", gap: S.lg, px: GUT, pt: S.huge, align: "CENTER", justify: "CENTER"
      });
      const rond = frame("Illustration", {
        dir: "VERTICAL", w: 120, h: 120, radius: R.full, fill: C.ink, fillOpacity: 0.04,
        align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED", clip: true
      });
      if (PIC.cintre) {
        try {
          const inst = PIC.cintre.createInstance();
          inst.rescale(70 / Math.max(inst.width, inst.height));
          nettoieVignette(inst);
          rond.appendChild(inst);
        } catch (e) {}
      }
      bloc.appendChild(rond);

      const txt = frame("Texte", { dir: "VERTICAL", gap: S.sm, align: "CENTER" });
      txt.appendChild(para(titre, W - GUT * 2,
        { font: FONT_T, size: 24, color: C.ink, lineHeight: 30, align: "CENTER" }));
      txt.appendChild(para(corps, W - GUT * 2 - S.xl,
        { size: 16, color: C.sub, lineHeight: 22, align: "CENTER" }));
      addFill(bloc, txt);

      const a = frame("Action", { dir: "VERTICAL", pt: S.sm });
      a.appendChild(bouton(action, "primary"));
      bloc.appendChild(a);
      addFill(col, bloc);
      finaliser(screen, col);
    }

    ecran("Tenue — État · Dressing insuffisant", function (screen) {
      etatVide(screen, "Ma tenue", "3 vêtements dans le dressing",
        "Pas assez de vêtements",
        "Il faut au moins un haut, un bas et une paire de chaussures pour composer une tenue.",
        "+ Ajouter un vêtement");
    });

    ecran("Tenue — État · Aucun vêtement compatible", function (screen) {
      etatVide(screen, "Ma tenue", "Travail · 12° nuageux",
        "Aucune tenue compatible",
        "Aucune combinaison ne correspond à tes préférences et à la météo du jour.",
        "Modifier mes préférences");
    });

    ecran("Tenue — État · Aucune tenue enregistrée", function (screen) {
      etatVide(screen, "Mes tenues", "0 tenue",
        "Aucune tenue enregistrée",
        "Enregistre une suggestion : tu la retrouveras ici et tu pourras la reporter en un geste.",
        "+ Créer une tenue");
    });

    rapport("Lot 04 Tenues");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
