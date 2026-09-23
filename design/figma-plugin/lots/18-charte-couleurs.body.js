// ============================================================
// Lot 18 — CHARTE : palette complète  (page « Charte Graphique »)
//
// Reprend le design EXACT de la planche « Palette couleurs » : les
// titres, les capsules arrondies, les cercles cerclés de blanc et les
// labels sont CLONÉS depuis la planche d'origine, jamais redessinés.
// Seuls la couleur, le texte et la position changent.
//
// La planche d'origine n'est pas touchée. Le script produit 4 planches
// supplémentaires, au même format 1920 × 1080, avec le même titre
// ajouré, les mêmes filets et le même numéro de page.
//
// Les 33 couleurs listées sont celles réellement employées dans les 131
// écrans : la liste est tirée du code des lots (occurrences de
// `fill: C.x` et `color: C.x` avec leur opacité), pas d'un relevé à l'œil.
// ============================================================

(async function () {
  try {
    figma.notify("Lot 18 Charte couleurs : demarrage...", { timeout: 1500 });

    await figma.loadAllPagesAsync();
    await figma.loadFontAsync(FONT_T);
    await figma.loadFontAsync(FONT_L);
    await figma.loadFontAsync(FONT_LB);

    const cible = figma.root.children.filter(function (p) {
      return /charte/i.test(p.name);
    })[0];
    if (!cible) throw new Error("page « Charte Graphique » introuvable");
    await cible.loadAsync();
    figma.currentPage = cible;
    PAGE = cible;

    const MARQUE = "penderie-charte-couleurs";

    // ---------- la planche d'origine et ses gabarits ----------
    const modele = PAGE.children.filter(function (n) {
      return n.type === "FRAME" && /palette/i.test(n.name) && /couleur/i.test(n.name);
    })[0];
    if (!modele) throw new Error("planche « Palette couleurs » introuvable");

    function enfant(nom) {
      return modele.children.filter(function (n) { return n.name === nom; })[0] || null;
    }
    const TPL_TITRE   = enfant("Couleurs primaires");   // Typolio 24
    const TPL_CAPSULE = enfant("Rectangle 4");          // capsule arrondie
    const TPL_CERCLE  = enfant("Ellipse 1");            // cercle cercle de blanc
    const TPL_LABEL   = enfant("Principale #117D6F");   // Luciole 24 centre
    if (!TPL_TITRE || !TPL_CAPSULE || !TPL_CERCLE || !TPL_LABEL) {
      throw new Error("gabarits introuvables dans la planche d'origine "
        + "(attendus : « Couleurs primaires », « Rectangle 4 », « Ellipse 1 », "
        + "« Principale #117D6F »)");
    }

    // Le decor de planche a conserver quand on vide une copie.
    const DECOR = ["Line 1", "Line 4", "Line 5", "COuleurs", "03"];

    // ---------- geometrie, calee sur la planche d'origine ----------
    const LARGEUR = modele.width, HAUTEUR = modele.height;
    const D = 192;              // diametre des cercles, comme l'original
    const ECART = 40;
    const MARGE_CAP = 36;
    const CAP_H = 300;
    const RANGEES_Y = [235, 625];       // haut des deux capsules
    const TITRES_Y  = [186, 576];

    function versRGB(hex) {
      return {
        r: parseInt(hex.substr(1, 2), 16) / 255,
        g: parseInt(hex.substr(3, 2), 16) / 255,
        b: parseInt(hex.substr(5, 2), 16) / 255
      };
    }
    // Un label blanc sur un cercle clair serait illisible : on choisit
    // l'encre ou le blanc selon la luminance du cercle tel qu'il s'affiche.
    function surClair(hex, opacite, fondCapsule) {
      const c = versRGB(hex), f = versRGB(fondCapsule);
      const m = function (k) { return c[k] * opacite + f[k] * (1 - opacite); };
      return (0.299 * m("r") + 0.587 * m("g") + 0.114 * m("b")) > 0.6;
    }

    // ---------- les couleurs, par capsule ----------
    // [titre de famille, fond de capsule, [ [nom, hex, opacite, usage], ... ] ]
    const CAPSULES = [
      ["Couleurs de marque", "#E0EAF6", [
        ["Principale",    "#D31D66", 1,    "Boutons, liens, onglet actif"],
        ["Accent 12 %",   "#D31D66", 0.12, "Pastilles Prêté, À rendre, À vendre"],
        ["Accent 8 %",    "#D31D66", 0.08, "Carte mise en avant"],
        ["Accent 6 %",    "#D31D66", 0.06, "Bandeau d'en-tête de profil"],
        ["Accent texte",  "#C21B5E", 1,    "Libellé des pastilles roses"]
      ]],
      ["Neutres", "#E0EAF6", [
        ["Secondaire",     "#1A1E24", 1,    "Titres et texte principal"],
        ["Sous-textes",    "#475569", 1,    "Métadonnées, libellés de champ"],
        ["Sous-textes 85 %", "#475569", 0.85, "Chevrons, onglets inactifs"],
        ["Fond clair",     "#F8FAFC", 1,    "Fond d'écran"],
        ["Blanc",          "#FFFFFF", 1,    "Cartes, barres, boutons secondaires"]
      ]],
      ["Teintes d'encre", "#E0EAF6", [
        ["Encre 58 %", "#1A1E24", 0.58, "Voile du menu et des modales"],
        ["Encre 10 %", "#1A1E24", 0.10, "Segment de jauge non franchi"],
        ["Encre 8 %",  "#1A1E24", 0.08, "Barres du squelette de chargement"],
        ["Encre 6 %",  "#1A1E24", 0.06, "Bouton désactivé, viseur du scan"],
        ["Encre 5 %",  "#1A1E24", 0.05, "Chip de tri"]
      ]],
      ["Teintes d'encre (suite)", "#E0EAF6", [
        ["Encre 4 %",        "#1A1E24", 0.04, "Zone photo, bandeau privé"],
        ["Sous-textes 10 %", "#475569", 0.10, "Pastilles Vendu et Terminé"],
        ["Sous-textes 50 %", "#475569", 0.50, "Picto décoratif d'état vide"]
      ]],
      ["Statuts", "#E0EAF6", [
        ["Succès",       "#117D6F", 1,    "Pastille sur photo, toast de succès"],
        ["Succès 10 %",  "#117D6F", 0.10, "Pastilles Disponible et En cours"],
        ["Succès texte", "#10786B", 1,    "Libellé Disponible et En cours"],
        ["Erreur",       "#DC2626", 1,    "Bouton destructif, toast d'erreur"],
        ["Erreur 10 %",  "#DC2626", 0.10, "Pastilles En retard et Perdu"]
      ]],
      ["Statuts (suite)", "#E0EAF6", [
        ["Erreur texte",   "#CA2323", 1,    "Libellé En retard et Perdu"],
        ["Dressing",       "#831297", 1,    "Emprunté, posé sur une photo"],
        ["Dressing 12 %",  "#831297", 0.12, "Pastille Emprunté"]
      ]],
      ["Mode sombre", "#12151A", [
        ["Fond",        "#12151A", 1, "Fond d'écran"],
        ["Surface",     "#1B1F26", 1, "Cartes et barres, plus claires que le fond"],
        ["Texte",       "#EDF1F6", 1, "Texte principal et teintes claires"],
        ["Sous-textes", "#9BA7B8", 1, "Texte secondaire"],
        ["Accent",      "#FF6098", 1, "Liens et texte d'accent"]
      ]],
      ["Mode sombre (suite)", "#12151A", [
        ["Succès",   "#43BBA9", 1, "Libellé Disponible et En cours"],
        ["Erreur",   "#FF6B6B", 1, "Libellé En retard et Perdu"],
        ["Dressing", "#CE86DE", 1, "Libellé Emprunté"]
      ]]
    ];

    // ---------- construction ----------
    // Relançable : on efface les planches produites par une execution
    // precedente, et elles seules.
    let efface = 0;
    const anciennes = PAGE.children.slice();
    for (let i = 0; i < anciennes.length; i++) {
      let mien = false;
      try { mien = anciennes[i].getPluginData(MARQUE) === "1"; } catch (e) {}
      // rattrape aussi le bloc de la premiere version, au style different
      if (mien || anciennes[i].name === "Couleurs · palette complète v2") {
        try { anciennes[i].remove(); efface++; } catch (e) {}
      }
    }

    function nouvellePlanche(index) {
      const p = modele.clone();
      p.name = "Palette couleurs · complète " + (index + 1);
      PAGE.appendChild(p);
      p.x = modele.x + (index + 1) * (LARGEUR + 240);
      p.y = modele.y;
      // on ne garde que le decor de planche
      const kids = p.children.slice();
      for (let i = 0; i < kids.length; i++) {
        if (DECOR.indexOf(kids[i].name) === -1) {
          try { kids[i].remove(); } catch (e) {}
        }
      }
      try { p.setPluginData(MARQUE, "1"); } catch (e) {}
      return p;
    }

    function poserCapsule(planche, rangee, titre, fondCapsule, couleurs) {
      const n = couleurs.length;
      const largeurCap = MARGE_CAP * 2 + n * D + (n - 1) * ECART;
      const x0 = Math.round((LARGEUR - largeurCap) / 2);
      const yCap = RANGEES_Y[rangee];

      // titre de famille : clone du titre d'origine
      const t = TPL_TITRE.clone();
      planche.appendChild(t);
      t.characters = titre;
      t.textAutoResize = "HEIGHT";
      t.resize(largeurCap, t.height);
      t.textAlignHorizontal = "CENTER";
      t.fills = solid(C.ink);
      t.x = x0;
      t.y = TITRES_Y[rangee];

      // capsule : clone du rectangle arrondi d'origine
      const cap = TPL_CAPSULE.clone();
      planche.appendChild(cap);
      cap.resize(largeurCap, CAP_H);
      cap.cornerRadius = Math.round(CAP_H / 2);
      cap.fills = solid(versRGB(fondCapsule));
      cap.x = x0;
      cap.y = yCap;

      for (let i = 0; i < n; i++) {
        const nom = couleurs[i][0], hex = couleurs[i][1];
        const op = couleurs[i][2], usage = couleurs[i][3];
        const cx = x0 + MARGE_CAP + i * (D + ECART);

        // cercle : clone de l'ellipse d'origine (garde son contour blanc)
        const c = TPL_CERCLE.clone();
        planche.appendChild(c);
        c.resize(D, D);
        // deux fonds : blanc dessous, teinte dessus — c'est ainsi que la
        // teinte apparait dans l'application, sur une carte blanche.
        c.fills = op < 1
          ? [{ type: "SOLID", color: C.white, opacity: 1 },
             { type: "SOLID", color: versRGB(hex), opacity: op }]
          : [{ type: "SOLID", color: versRGB(hex), opacity: 1 }];
        c.x = cx;
        c.y = yCap + MARGE_CAP;

        // label sur le cercle : clone du label d'origine
        const l = TPL_LABEL.clone();
        planche.appendChild(l);
        l.characters = nom + String.fromCharCode(10) + hex
          + (op < 1 ? "  " + Math.round(op * 100) + " %" : "");
        l.textAutoResize = "HEIGHT";
        l.resize(D - 16, l.height);
        l.textAlignHorizontal = "CENTER";
        const clair = op < 1 ? true : surClair(hex, 1, fondCapsule);
        l.fills = solid(clair ? C.ink : C.white);
        l.x = cx + 8;
        l.y = yCap + MARGE_CAP + Math.round((D - l.height) / 2);

        // usage sous le cercle, dans la capsule
        const u = TPL_LABEL.clone();
        planche.appendChild(u);
        u.characters = usage;
        u.fontSize = 16;
        u.lineHeight = { value: 20, unit: "PIXELS" };
        u.textAutoResize = "HEIGHT";
        u.resize(D, u.height);
        u.textAlignHorizontal = "CENTER";
        u.fills = solid(fondCapsule === "#12151A" ? C.white : C.ink, 0.85);
        u.x = cx;
        u.y = yCap + MARGE_CAP + D + 14;
        u.name = "Usage · " + nom;
      }
    }

    let planches = 0, pastilles = 0;
    for (let i = 0; i < CAPSULES.length; i += 2) {
      const planche = nouvellePlanche(planches);
      for (let r = 0; r < 2 && i + r < CAPSULES.length; r++) {
        const cap = CAPSULES[i + r];
        poserCapsule(planche, r, cap[0], cap[1], cap[2]);
        pastilles += cap[2].length;
      }
      planches++;
    }

    const resume = pastilles + " couleurs sur " + planches + " planches"
      + (efface ? " (" + efface + " ancienne(s) planche(s) remplacee(s))" : "");
    console.log("Charte : " + resume);
    figma.notify("Charte : " + resume, { timeout: 8000 });
    figma.viewport.scrollAndZoomIntoView(
      PAGE.children.filter(function (n) {
        try { return n.getPluginData(MARQUE) === "1"; } catch (e) { return false; }
      })
    );

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
