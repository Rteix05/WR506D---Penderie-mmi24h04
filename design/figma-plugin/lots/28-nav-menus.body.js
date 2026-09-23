// ============================================================
// Lot 28 — NAVIGATION : ONGLETS QUI S'ÉTENDENT
// (page "Maquette v2", section 02 ACCUEIL)
//
// Constat (retour utilisateur du 14 septembre) : depuis l'accueil, rien ne
// mène au fil, aux amis, aux collections, aux prêts, aux ventes… La barre
// n'a que 4 destinations fixes pour ~30 parcours.
//
// Réponse : chaque onglet de la barre DÉPLIE un panneau qui regroupe les
// pages qui vont ensemble. Le bouton + garde son menu d'ajout.
//   Accueil    — tableau de bord, fil d'actualité, notifications, recherche
//   Inventaire — objets, dressing, tenues, collections, prêts
//   Logements  — logements, maison principale, cartons, créer un carton
//   Profil     — profil, amis et abonnés, partages, ventes et achats, paramètres
// Le back-office n'y figure pas : il n'appartient pas à l'application.
//
// Ce lot :
//   1. crée 4 écrans « Accueil — Menu · <onglet> » (overlays) ;
//   2. ajoute un chevron à TOUS les onglets déjà posés sur la page, sans
//      reconstruire les écrans (les interactions existantes sont gardées).
//      Les prochains lots le posent d'eux-mêmes (construireNav de la lib).
// Relançable : un onglet qui a déjà son chevron n'en reçoit pas un second.
// ============================================================

(async function () {
  try {
    figma.notify("Lot 28 Navigation : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");
    await chargerNav();

    const SECTION = "ACCUEIL";

    const MENUS = {
      "Accueil": ["Tout ce qui se passe", [
        ["Tableau de bord", "Ta penderie en un coup d'œil"],
        ["Fil d'actualité", "Ce que tes amis t'ont montré"],
        ["Notifications", "Prêts, ventes, partages, demandes"],
        ["Recherche", "Un objet, une pièce, un ami"]
      ]],
      "Inventaire": ["Tout ce que tu possèdes", [
        ["Mes objets", "128 objets · 8 états"],
        ["Mon dressing", "48 vêtements"],
        ["Mes tenues", "Suggestions et tenues enregistrées"],
        ["Mes collections", "4 tableaux · privés par défaut"],
        ["Mes prêts", "4 prêtés · 2 empruntés"]
      ]],
      "Logements": ["Où sont rangées tes affaires", [
        ["Mes logements", "2 logements · 9 pièces"],
        ["Maison principale", "7 pièces · 104 objets"],
        ["Mes cartons", "13 cartons actifs"],
        ["Créer un carton", "Étiquette, emplacement, contenu"]
      ]],
      "Profil": ["Toi et tes proches", [
        ["Mon profil", "Informations et profils de la famille"],
        ["Amis et abonnés", "12 amis · 5 abonnés"],
        ["Mes partages", "3 partages actifs"],
        ["À vendre chez mes amis", "8 annonces"],
        ["Achats et ventes", "Commandes, livraisons, remboursements"],
        ["Paramètres", "Notifications, confidentialité"]
      ]]
    };
    const ORDRE = ["Accueil", "Inventaire", "Logements", "Profil"];

    function rangeeMenu(label, meta) {
      const r = frame("Menu/Row/" + label, {
        dir: "HORIZONTAL", gap: S.md, radius: R.md, px: S.lg, py: S.md,
        align: "CENTER", justify: "SPACE_BETWEEN", fill: C.ink, fillOpacity: 0.03
      });
      const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text(label, { font: FONT_LB, size: 16, color: C.ink }));
      g.appendChild(text(meta, { size: 12, color: C.sub }));
      r.appendChild(g);
      r.appendChild(text("›", { font: FONT_LB, size: 16, color: C.sub, opacity: 0.85 }));
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return r;
    }

    // 1. Les 4 panneaux
    for (let k = 0; k < ORDRE.length; k++) {
      const onglet = ORDRE[k];
      ecranNouveau(SECTION, "Accueil — Menu · " + onglet, k, function (screen) {
        const olds = screen.children.slice();
        for (let i = 0; i < olds.length; i++) olds[i].remove();
        screen.layoutMode = "NONE";
        screen.fills = solid(C.ink, 0.55);
        screen.clipsContent = true;
        screen.resize(W, H);

        const voile = frame("Voile", { w: W, h: H - NAVH });
        voile.fills = [];
        screen.appendChild(voile);
        voile.x = 0; voile.y = 0;

        const p = frame("Menu/Panel/" + onglet, {
          dir: "VERTICAL", gap: S.sm, w: W - S.md * 2, px: S.lg, pt: S.xl, pb: S.lg,
          radius: R.lg, fill: C.white, shadow: SHADOW_E2, counter: "FIXED"
        });
        const t = frame("Titre", { dir: "VERTICAL", gap: 2, pb: S.sm });
        t.appendChild(text(onglet, { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
        t.appendChild(text(MENUS[onglet][0], { size: 12, color: C.sub }));
        addFill(p, t);
        const rows = MENUS[onglet][1];
        for (let i = 0; i < rows.length; i++) addFill(p, rangeeMenu(rows[i][0], rows[i][1]));
        screen.appendChild(p);
        p.x = S.md;
        p.y = H - NAVH - S.md - Math.ceil(p.height) - 24;

        poserNav(screen, onglet);
      });
    }

    // 2. Chevron sur tous les onglets existants
    let patches = 0;
    const navs = PAGE.findAll(function (n) { return n.type === "FRAME" && n.name === "Nav"; });
    for (let i = 0; i < navs.length; i++) {
      const tabs = navs[i].children || [];
      for (let j = 0; j < tabs.length; j++) {
        const m = /^Nav\/Tab\/([^/]+)\/(Actif|Inactif)$/.exec(tabs[j].name);
        if (!m) continue;
        if (chevronNav(tabs[j], m[2] === "Actif")) patches++;
      }
    }
    REUSSIS.push("Chevron ajouté à " + patches + " onglet(s) sur " + navs.length + " barre(s)");

    // 3. Écrans dont le contenu dépasse la frame (l'accueil v2 : 817 px de
    //    haut pour un contenu plus long) : on les rend défilables dans le
    //    prototype au lieu de couper « Prêts en cours », « Tenues »…
    let defilables = 0;
    const ecrans = PAGE.findAll(function (n) {
      return n.type === "FRAME" && n.parent && n.parent.type === "SECTION";
    });
    for (let i = 0; i < ecrans.length; i++) {
      const e = ecrans[i];
      const contenu = (e.children || []).filter(function (k) { return k.name === "Contenu"; })[0];
      if (contenu && contenu.height > e.height + 1 && e.overflowDirection !== "VERTICAL") {
        try { e.overflowDirection = "VERTICAL"; defilables++; } catch (err) {}
      }
    }
    REUSSIS.push(defilables + " écran(s) rendu(s) défilable(s)");

    rapport("Lot 28 Navigation");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
