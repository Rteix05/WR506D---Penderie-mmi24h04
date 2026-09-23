// ============================================================
// Lot 26 — BACK-OFFICE  (page "Maquette v2", section NOUVELLE « 14 — BACK-OFFICE »)
//
// Audit avant construction (point 20) : [MANQUANT] en totalité.
//
// 11 écrans DESKTOP de 1440 px. Même design system que l'app (couleurs,
// Typolio + Luciole, cartes blanches sans bordure, pastilles de statut,
// boutons), mais une UX de bureau : barre latérale sombre, tableaux,
// filtres, recherche, indicateurs, fiches détaillées, modale.
// La barre latérale sombre et la pastille ADMIN le distinguent de
// l'application au premier coup d'œil ; il n'apparaît dans aucune
// navigation utilisateur.
//
//   Connexion · Tableau de bord · Utilisateurs · Fiche utilisateur (profils
//   et sous-comptes) · Signalements (objets, contenus, commentaires) ·
//   Détail d'un signalement · Confirmation · Suspendre un compte (overlay) ·
//   Ventes et transactions · Litiges et remboursements · Détail d'un
//   litige · Catégories (objets, vêtements, styles, états)
//
// Volontairement absent : statistiques avancées, gestion des rôles, export.
// Le brief demande de couvrir les besoins réels, pas un back-office géant.
// Aucun écran ne manipule d'argent : Stripe rembourse, l'admin décide.
// ============================================================

(async function () {
  try {
    figma.notify("Lot 26 Back-office : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");
    await chargerAmis();
    const P = await chargerPics();

    const SECTION = "BACK-OFFICE";
    sectionAssuree("14 — BACK-OFFICE", SECTION);

    const DW = 1440, DH = 900, SIDE = 256, PAD = 40;
    const MAIN = DW - SIDE;             // 1184
    const INNER = MAIN - PAD * 2;       // 1104
    const TAB = INNER - 48;             // largeur utile d'un tableau dans sa carte

    const MENU = [
      ["Tableau de bord", null],
      ["Utilisateurs", null],
      ["Signalements", "7"],
      ["Ventes et transactions", null],
      ["Litiges", "3"],                  // libellé court : la pastille débordait de la barre
      ["Catégories", null]
    ];

    // ---------- structure d'un écran de back-office ----------

    function barreLaterale(actif, hauteur) {
      const s = frame("Admin/Sidebar", {
        dir: "VERTICAL", w: SIDE, h: hauteur, px: S.xl, pt: 28, pb: 28,
        primary: "FIXED", counter: "FIXED", justify: "SPACE_BETWEEN", fill: C.ink
      });
      const haut = frame("Haut", { dir: "VERTICAL", gap: S.huge });
      const logo = frame("Logo", { dir: "HORIZONTAL", gap: S.sm, align: "CENTER" });
      logo.appendChild(text("PENDERIE", { font: FONT_T, size: 24, color: C.white }));
      const pill = frame("Badge/Admin", { dir: "HORIZONTAL", radius: R.full, px: S.sm, py: 2, fill: C.primary });
      pill.appendChild(text("ADMIN", { font: FONT_LB, size: 12, color: C.white }));
      logo.appendChild(pill);
      haut.appendChild(logo);
      const menu = frame("Menu", { dir: "VERTICAL", gap: S.xs });
      for (let i = 0; i < MENU.length; i++) {
        const est = MENU[i][0] === actif;
        const it = frame("Admin/Nav/" + MENU[i][0] + (est ? "/Actif" : "/Inactif"), {
          dir: "HORIZONTAL", radius: R.sm, px: S.md, h: 44, counter: "FIXED",
          align: "CENTER", justify: "SPACE_BETWEEN", fill: C.white, fillOpacity: est ? 0.10 : 0.001
        });
        it.appendChild(text(MENU[i][0], { font: est ? FONT_LB : FONT_L, size: 16, color: C.white, opacity: est ? 1 : 0.85 }));
        if (MENU[i][1]) {
          const b = frame("Badge/Count", {
            w: 24, h: 24, radius: R.full, fill: C.primary, dir: "VERTICAL",
            align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED"
          });
          b.appendChild(text(MENU[i][1], { font: FONT_LB, size: 12, color: C.white }));
          it.appendChild(b);
        }
        addFill(menu, it);
      }
      addFill(haut, menu);
      addFill(s, haut);
      const bas = frame("Bas", { dir: "VERTICAL", gap: S.sm });
      bas.appendChild(text("Camille Durand", { font: FONT_LB, size: 16, color: C.white }));
      bas.appendChild(text("Administratrice · actions journalisées", { size: 12, color: C.white, opacity: 0.85 }));
      bas.appendChild(text("Se déconnecter", { font: FONT_LB, size: 12, color: C.white, opacity: 0.85 }));
      addFill(s, bas);
      return s;
    }

    function page(screen, actif, titre, sous, recherche, build) {
      const olds = screen.children.slice();
      for (let i = 0; i < olds.length; i++) olds[i].remove();
      screen.layoutMode = "NONE";
      screen.fills = solid(C.bg);
      screen.clipsContent = true;

      const main = frame("Admin/Main", {
        dir: "VERTICAL", gap: S.xxl, w: MAIN, px: PAD, pt: 32, pb: 56,
        primary: "AUTO", counter: "FIXED"
      });
      const top = frame("Admin/Topbar", { dir: "HORIZONTAL", align: "CENTER", justify: "SPACE_BETWEEN" });
      const tt = frame("Titre", { dir: "VERTICAL", gap: S.xs });
      tt.appendChild(text(titre, { font: FONT_T, size: 32, color: C.ink, lineHeight: 38 }));
      if (sous) tt.appendChild(text(sous, { size: 12, color: C.sub }));
      top.appendChild(tt);
      if (recherche) {
        const r = frame("Recherche", { dir: "HORIZONTAL", w: 360, counter: "AUTO", primary: "FIXED" });
        addFill(r, champRecherche(recherche));
        top.appendChild(r);
      }
      addFill(main, top);
      build(main);

      const h = Math.max(DH, Math.ceil(main.height));
      screen.resize(DW, h);
      const side = barreLaterale(actif, h);
      screen.appendChild(side);
      side.x = 0; side.y = 0;
      screen.appendChild(main);
      main.x = SIDE; main.y = 0;
    }

    function carteD(nom, o) {
      const base = { gap: S.lg, px: S.xxl, py: S.xxl };
      for (const k in (o || {})) base[k] = o[k];
      return card(nom, base);
    }

    function rangee(noeuds, gap) {
      const r = frame("Rangee", { dir: "HORIZONTAL", gap: gap == null ? S.xxl : gap, align: "MIN", w: INNER, primary: "FIXED" });
      // une colonne garde sa largeur fixe ; une carte seule se partage la place
      for (let i = 0; i < noeuds.length; i++) {
        if (noeuds[i].name === "Colonne" || noeuds[i].name === "Personne") r.appendChild(noeuds[i]);
        else addFill(r, noeuds[i]);
      }
      return r;
    }

    function colonne(largeur, noeuds) {
      const c = frame("Colonne", { dir: "VERTICAL", gap: S.xxl, w: largeur, counter: "FIXED" });
      for (let i = 0; i < noeuds.length; i++) addFill(c, noeuds[i]);
      return c;
    }

    function kpi(label, valeur, detail, tone) {
      const c = carteD("Admin/KPI/" + label, { gap: S.xs });
      c.appendChild(text(label, { font: FONT_LB, size: 12, color: C.sub }));
      c.appendChild(text(valeur, { font: FONT_T, size: 32, color: C.ink, lineHeight: 38 }));
      if (detail) {
        const p = frame("Statuts", { dir: "HORIZONTAL" });
        p.appendChild(statusPill(detail, tone || "neutre"));
        c.appendChild(p);
      }
      return c;
    }

    function filtres(items, actif) {
      const r = frame("Filtres", { dir: "HORIZONTAL", gap: S.sm, align: "CENTER" });
      for (let i = 0; i < items.length; i++) r.appendChild(chip(items[i], i === actif, false));
      return r;
    }

    // Tableau : colonnes [[libellé, largeur]], lignes [[cellule, ...]].
    // Une cellule est un texte ou un noeud (pastille, avatar + nom...).
    function tableau(nom, colonnes, lignes, pied) {
      const c = carteD("Admin/Table/" + nom, { gap: 0, py: S.md });
      const tete = frame("Entete", { dir: "HORIZONTAL", align: "CENTER", py: S.md });
      for (let i = 0; i < colonnes.length; i++) {
        const cell = frame("Cellule", { dir: "HORIZONTAL", w: colonnes[i][1], primary: "FIXED", pr: S.md });
        cell.appendChild(text(colonnes[i][0], { font: FONT_LB, size: 12, color: C.sub }));
        tete.appendChild(cell);
      }
      addFill(c, tete);
      for (let l = 0; l < lignes.length; l++) {
        const filet = frame("Filet", { h: 1, fill: C.ink, fillOpacity: 0.07, dir: "VERTICAL", primary: "FIXED", counter: "FIXED" });
        addFill(c, filet);
        const row = frame("Admin/Row/" + l, { dir: "HORIZONTAL", align: "CENTER", py: S.md });
        for (let i = 0; i < colonnes.length; i++) {
          const v = lignes[l][i];
          const cell = frame("Cellule", { dir: "HORIZONTAL", w: colonnes[i][1], primary: "FIXED", pr: S.md, align: "CENTER" });
          if (v == null) { /* vide */ }
          else if (typeof v === "string") {
            cell.appendChild(para(v, colonnes[i][1] - S.md, { font: i === 0 ? FONT_LB : FONT_L, size: i === 0 ? 16 : 12, color: i === 0 ? C.ink : C.sub, lineHeight: i === 0 ? 22 : 16 }));
          } else cell.appendChild(v);
          row.appendChild(cell);
        }
        addFill(c, row);
      }
      if (pied) {
        const p = frame("Pied", { dir: "HORIZONTAL", pt: S.md, justify: "SPACE_BETWEEN", align: "CENTER" });
        p.appendChild(text(pied, { size: 12, color: C.sub }));
        p.appendChild(text("Page suivante ›", { font: FONT_LB, size: 12, color: C.primary }));
        addFill(c, p);
      }
      return c;
    }

    function personne(nom, i, meta) {
      const g = frame("Personne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
      g.appendChild(avatar(nom, i, 36));
      const t = frame("Texte", { dir: "VERTICAL", gap: 0 });
      t.appendChild(text(nom, { font: FONT_LB, size: 16, color: C.ink }));
      if (meta) t.appendChild(text(meta, { size: 12, color: C.sub }));
      g.appendChild(t);
      return g;
    }

    function lien(label) { return text(label, { font: FONT_LB, size: 12, color: C.primary }); }
    function pill(label, tone) { return statusPill(label, tone); }

    function choixD(label, sous, actif) {
      const r = frame("List/Row/" + label, {
        dir: "HORIZONTAL", gap: S.md, radius: R.md, px: S.lg, py: S.md, align: "CENTER",
        justify: "SPACE_BETWEEN", fill: actif ? C.primary : C.ink, fillOpacity: actif ? 0.06 : 0.03
      });
      const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text(label, { font: FONT_LB, size: 16, color: C.ink }));
      if (sous) g.appendChild(text(sous, { size: 12, color: C.sub }));
      r.appendChild(g);
      if (actif) r.appendChild(statusPill("Choisi", "arendre"));
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return r;
    }

    function evenement(titre, date, detail, tone) {
      const r = frame("Detail/History item/" + titre, { dir: "HORIZONTAL", gap: S.md, align: "MIN" });
      const pw = frame("Repere", { dir: "VERTICAL", pt: 6 });
      pw.appendChild(frame("Pastille", { w: 10, h: 10, radius: R.full, fill: couleurDe(tone), dir: "VERTICAL", primary: "FIXED", counter: "FIXED" }));
      r.appendChild(pw);
      const t = frame("Texte", { dir: "VERTICAL", gap: 2 });
      const l = frame("Ligne", { dir: "HORIZONTAL", gap: S.md });
      l.appendChild(text(titre, { font: FONT_LB, size: 16, color: C.ink }));
      l.appendChild(text(date, { size: 12, color: C.sub }));
      t.appendChild(l);
      if (detail) t.appendChild(text(detail, { size: 12, color: C.sub }));
      r.appendChild(t);
      return r;
    }

    // ============ 1. Connexion ============
    ecranNouveau(SECTION, "Admin — Connexion", 0, function (screen) {
      const olds = screen.children.slice();
      for (let i = 0; i < olds.length; i++) olds[i].remove();
      screen.layoutMode = "NONE";
      screen.fills = solid(C.ink);
      screen.resize(DW, DH);
      const cadre = frame("Contenu", {
        dir: "VERTICAL", w: DW, h: DH, primary: "FIXED", counter: "FIXED", align: "CENTER", justify: "CENTER"
      });
      screen.appendChild(cadre);
      const c = frame("Admin/Login", {
        dir: "VERTICAL", gap: S.xl, w: 440, px: 40, py: 40, radius: R.lg,
        fill: C.white, shadow: SHADOW_E2, counter: "FIXED"
      });
      const logo = frame("Logo", { dir: "HORIZONTAL", gap: S.sm, align: "CENTER" });
      logo.appendChild(text("PENDERIE", { font: FONT_T, size: 24, color: C.ink }));
      const pl = frame("Badge/Admin", { dir: "HORIZONTAL", radius: R.full, px: S.sm, py: 2, fill: C.primary });
      pl.appendChild(text("ADMIN", { font: FONT_LB, size: 12, color: C.white }));
      logo.appendChild(pl);
      c.appendChild(logo);
      const tt = frame("Titre", { dir: "VERTICAL", gap: S.xs });
      tt.appendChild(text("Back-office", { font: FONT_T, size: 32, color: C.ink, lineHeight: 38 }));
      tt.appendChild(para("Réservé aux administrateurs. Cet espace n'existe pas dans l'application.", 360, { size: 12, color: C.sub, lineHeight: 16 }));
      addFill(c, tt);
      addFill(c, champSelect("E-mail professionnel", "camille@penderie.app"));
      addFill(c, champSelect("Mot de passe", "· · · · · · · · · ·"));
      addFill(c, champSelect("Code de vérification", "4 8 2 · · ·"));
      addFill(c, bouton("Se connecter", "primary"));
      c.appendChild(para("Double authentification obligatoire. Chaque action est enregistrée dans le journal.", 360, { size: 12, color: C.sub, lineHeight: 16, align: "CENTER" }));
      cadre.appendChild(c);
    }, 0, DW);

    // ============ 2. Tableau de bord ============
    ecranNouveau(SECTION, "Admin — Tableau de bord", 1, function (screen) {
      page(screen, "Tableau de bord", "Tableau de bord", "Samedi 13 septembre 2026", "Rechercher…", function (main) {
        addFill(main, rangee([
          kpi("Utilisateurs actifs", "12 480", "+312 cette semaine", "encours"),
          kpi("Signalements à traiter", "7", "2 depuis plus de 24 h", "retard"),
          kpi("Litiges ouverts", "3", "1 remboursement en attente", "arendre"),
          kpi("Ventes du mois", "1 284", "38 520 € via Stripe", "neutre")
        ]));

        // Graphique à l'échelle : 100 inscriptions = 160 px
        const vals = [42, 58, 51, 73, 66, 90, 84], jours = ["L", "M", "M", "J", "V", "S", "D"];
        const graph = carteD("Admin/Chart/Inscriptions", { gap: S.md });
        graph.appendChild(text("Nouveaux inscrits · 7 derniers jours", { font: FONT_LB, size: 12, color: C.sub }));
        graph.appendChild(text("464", { font: FONT_T, size: 32, color: C.ink, lineHeight: 38 }));
        const zone = frame("Barres", { w: 560, h: 200 });
        const bw = 48, gap = (560 - bw * 7) / 6;
        for (let i = 0; i < vals.length; i++) {
          const h = Math.round(vals[i] / 100 * 160);
          const b = frame("Barre/" + jours[i], { w: bw, h: h, radius: R.xs, fill: C.primary, fillOpacity: i === 5 ? 1 : 0.35 });
          zone.appendChild(b);
          b.x = Math.round(i * (bw + gap)); b.y = 160 - h;
          const v = text(String(vals[i]), { font: FONT_LB, size: 12, color: C.ink });
          zone.appendChild(v); v.x = b.x + bw / 2 - v.width / 2; v.y = 160 - h - 20;
          const j = text(jours[i], { size: 12, color: C.sub });
          zone.appendChild(j); j.x = b.x + bw / 2 - j.width / 2; j.y = 172;
        }
        graph.appendChild(zone);

        const todo = carteD("Admin/A traiter", { gap: S.md });
        todo.appendChild(text("À traiter en priorité", { font: FONT_LB, size: 12, color: C.sub }));
        addFill(todo, choixD("Commentaire signalé", "Sur « Veste en jean » · harcèlement · il y a 26 h", false));
        addFill(todo, choixD("Litige #PND-2419", "Écharpe non conforme · 45 €", false));
        addFill(todo, choixD("Compte @max_2014", "3 signalements · demandes à des profils enfants", false));
        addFill(main, rangee([colonne(640, [graph]), colonne(INNER - 640 - S.xxl, [todo])]));

        addFill(main, tableau("Dernières transactions", [
          ["Commande", 180], ["Article", 240], ["Vendeur → Acheteur", 260], ["Montant", 120], ["Paiement", 256]
        ], [
          ["#PND-2481", "Veste en cuir", "Thomas → Mathis", "50 €", pill("Payé", "encours")],
          ["#PND-2477", "Baskets Adidas", "Mathis → Julie", "35 €", pill("Payé", "encours")],
          ["#PND-2466", "Lampe de bureau", "Karim → Léa", "15 €", pill("Remboursé", "termine")]
        ], null));
      });
    }, 0, DW);

    // ============ 3. Utilisateurs ============
    ecranNouveau(SECTION, "Admin — Utilisateurs", 2, function (screen) {
      page(screen, "Utilisateurs", "Utilisateurs", "12 480 comptes · 1 204 avec un profil enfant", "Nom, e-mail, pseudo…", function (main) {
        addFill(main, filtres(["Tous", "Actifs", "Suspendus (14)", "Avec profil enfant", "Signalés"], 0));
        addFill(main, tableau("Utilisateurs", [
          ["Utilisateur", 300], ["Profils", 180], ["Inscrit le", 140], ["Objets", 100], ["Signalements", 120], ["Statut", 116], ["", 100]
        ], [
          [personne("Mathis Chhour", 0, "mathis@example.com"), "3 · dont 1 enfant", "12 mars 2026", "128", "0", pill("Actif", "encours"), lien("Voir ›")],
          [personne("Thomas Leroy", 0, "thomas.l@example.com"), "1", "2 févr. 2026", "96", "0", pill("Actif", "encours"), lien("Voir ›")],
          [personne("Julie Martin", 1, "julie.m@example.com"), "2", "20 janv. 2026", "54", "1", pill("Actif", "encours"), lien("Voir ›")],
          [personne("@max_2014", 2, "compte créé hier"), "1", "12 sept. 2026", "0", "3", pill("À vérifier", "arendre"), lien("Voir ›")],
          [personne("@promo_sneakers", 2, "spam présumé"), "1", "4 sept. 2026", "0", "9", pill("Suspendu", "retard"), lien("Voir ›")]
        ], "5 sur 12 480"));
      });
    }, 0, DW);

    // ============ 4. Fiche utilisateur ============
    ecranNouveau(SECTION, "Admin — Fiche utilisateur", 3, function (screen) {
      page(screen, "Utilisateurs", "Mathis Chhour", "Utilisateurs › Mathis Chhour", null, function (main) {
        const infos = carteD("Admin/Card/Informations", { gap: S.md });
        infos.appendChild(personne("Mathis Chhour", 0, "@mathis · mathis@example.com"));
        addFill(infos, ligneInfo("Inscrit le", "12 mars 2026"));
        addFill(infos, ligneInfo("Dernière connexion", "Aujourd'hui, 9 h 12"));
        addFill(infos, ligneInfo("Statut", "Actif"));
        const act = carteD("Admin/Card/Activite", { gap: S.md });
        act.appendChild(text("Activité", { font: FONT_LB, size: 12, color: C.sub }));
        addFill(act, ligneInfo("Objets", "128"));
        addFill(act, ligneInfo("Ventes · achats", "11 · 4"));
        addFill(act, ligneInfo("Litiges", "0"));
        addFill(act, ligneInfo("Signalements reçus", "0"));
        const actions = carteD("Admin/Card/Actions", { gap: S.md });
        actions.appendChild(text("Actions", { font: FONT_LB, size: 12, color: C.sub }));
        addFill(actions, bouton("Envoyer un message", "secondary"));
        addFill(actions, bouton("Suspendre le compte", "danger"));

        const profils = tableau("Profils et sous-comptes", [
          ["Profil", 220], ["Type", 180], ["Objets", 100], ["Contrôle parental", 212]
        ], [
          [personne("Mathis", 0, "Principal"), "Principal", "128", "—"],
          [personne("Léa", 1, "Proche"), "Famille", "42", "—"],
          [personne("Noé", 2, "9 ans"), pill("Enfant", "arendre"), "18", "Actif · code parent défini · 2 demandes en attente"]
        ], null);
        const journal = carteD("Admin/Card/Journal", { gap: S.md });
        journal.appendChild(text("Journal d'administration", { font: FONT_LB, size: 12, color: C.sub }));
        addFill(journal, evenement("Aucune sanction", "—", "Ce compte n'a jamais été averti ni suspendu.", "encours"));
        addFill(journal, evenement("Signalement émis", "2 sept.", "Commentaire de @promo_sneakers · traité", "termine"));

        addFill(main, rangee([colonne(360, [infos, act, actions]), colonne(INNER - 360 - S.xxl, [profils, journal])]));
      });
    }, 0, DW);

    // ============ 5. Signalements ============
    ecranNouveau(SECTION, "Admin — Signalements", 4, function (screen) {
      page(screen, "Signalements", "Signalements", "7 à traiter · objets, contenus et commentaires", "Rechercher…", function (main) {
        const o = frame("Onglets", { dir: "HORIZONTAL", w: 520, primary: "FIXED" });
        addFill(o, ongletsN(["Objets (3)", "Contenus (2)", "Commentaires (2)"], 2));
        addFill(main, o);
        addFill(main, filtres(["À traiter", "En cours", "Traités"], 0));
        addFill(main, tableau("Commentaires signalés", [
          ["Élément", 320], ["Auteur", 160], ["Signalé par", 150], ["Motif", 150], ["Date", 110], ["Statut", 110], ["", 56]
        ], [
          ["« Tu me la donnes ou je la prends ? »", "@max_2014", "Julie", "Harcèlement", "12 sept.", pill("À traiter", "retard"), lien("Examiner ›")],
          ["Commentaire sur « Mon style — été 2026 »", "@promo_sneakers", "Rafael", "Spam", "11 sept.", pill("En cours", "arendre"), lien("Examiner ›")]
        ], "Les commentaires ne sont visibles que des amis autorisés : un signalement vient toujours de l'un d'eux."));
      });
    }, 0, DW);

    // ============ 6. Détail d'un signalement ============
    ecranNouveau(SECTION, "Admin — Détail d'un signalement", 5, function (screen) {
      page(screen, "Signalements", "Commentaire signalé", "Signalements › Commentaires › #SIG-0192", null, function (main) {
        const contenu = carteD("Admin/Card/Contenu", { gap: S.md });
        contenu.appendChild(text("Contenu signalé", { font: FONT_LB, size: 12, color: C.sub }));
        addFill(contenu, commentaire("@max_2014", 2, "Tu me la donnes ou je la prends ?", "12 sept. · 18 h 04", false));
        const ctx = carteD("Admin/Card/Contexte", { gap: S.md });
        ctx.appendChild(text("Contexte", { font: FONT_LB, size: 12, color: C.sub }));
        addFill(ctx, ligneInfo("Publié sur", "Veste en jean · partage de Rafael"));
        addFill(ctx, ligneInfo("Visible par", "3 amis autorisés"));
        addFill(ctx, ligneInfo("Signalé par", "Julie · motif : harcèlement"));
        const hist = carteD("Admin/Card/Auteur", { gap: S.md });
        hist.appendChild(text("L'auteur", { font: FONT_LB, size: 12, color: C.sub }));
        addFill(hist, evenement("Compte créé", "11 sept.", "Aucun ami en commun avec les personnes contactées", "neutre"));
        addFill(hist, evenement("2 demandes d'ami à des profils enfants", "12 sept.", "Bloquées par les parents", "retard"));

        const dec = carteD("Admin/Card/Decision", { gap: S.md });
        dec.appendChild(text("Décision", { font: FONT_LB, size: 12, color: C.sub }));
        addFill(dec, choixD("Classer sans suite", "Le commentaire reste visible", false));
        addFill(dec, choixD("Masquer le commentaire", "Il disparaît pour tout le monde", true));
        addFill(dec, choixD("Avertir l'auteur", "Message officiel, sans sanction", false));
        addFill(dec, choixD("Suspendre le compte", "30 jours, réversible", false));
        addFill(dec, champTexte("Note interne", "Menace explicite, compte récent, contacts avec des mineurs.", 88));
        addFill(dec, bouton("Appliquer la décision", "primary"));
        dec.appendChild(para("L'auteur et Julie sont prévenus. La décision est inscrite au journal.", 360, { size: 12, color: C.sub, lineHeight: 16 }));

        addFill(main, rangee([colonne(INNER - 440 - S.xxl, [contenu, ctx, hist]), colonne(440, [dec])]));
      });
    }, 0, DW);

    // ============ 7. Confirmation · suspendre (overlay) ============
    ecranNouveau(SECTION, "Admin — Confirmation · Suspendre un compte", 6, function (screen) {
      const olds = screen.children.slice();
      for (let i = 0; i < olds.length; i++) olds[i].remove();
      screen.layoutMode = "NONE";
      screen.fills = solid(C.ink, 0.55);
      screen.resize(DW, DH);
      const cadre = frame("Contenu", { dir: "VERTICAL", w: DW, h: DH, primary: "FIXED", counter: "FIXED", align: "CENTER", justify: "CENTER" });
      screen.appendChild(cadre);
      const m = frame("Modal/Confirm", { dir: "VERTICAL", gap: S.lg, w: 520, radius: R.lg, fill: C.white, px: 32, py: 32, shadow: SHADOW_E2, counter: "FIXED" });
      m.appendChild(para("Suspendre le compte de @max_2014 ?", 456, { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
      m.appendChild(para("Il ne pourra plus se connecter pendant 30 jours. Ses commentaires sont masqués et ses demandes en attente annulées.", 456, { size: 16, color: C.sub, lineHeight: 22 }));
      const d = frame("Detail", { dir: "VERTICAL", radius: R.sm, px: S.md, py: S.md, fill: C.ink, fillOpacity: 0.04 });
      d.appendChild(para("Réversible depuis sa fiche. Les prêts en cours restent visibles de leurs propriétaires.", 424, { size: 12, color: C.sub, lineHeight: 16 }));
      addFill(m, d);
      const a = frame("Detail/Action bar", { dir: "HORIZONTAL", gap: S.md, justify: "MAX" });
      a.appendChild(bouton("Annuler", "secondary"));
      a.appendChild(bouton("Suspendre", "danger"));
      addFill(m, a);
      cadre.appendChild(m);
    }, 0, DW);

    // ============ 8. Ventes et transactions ============
    ecranNouveau(SECTION, "Admin — Ventes et transactions", 0, function (screen) {
      page(screen, "Ventes et transactions", "Ventes et transactions", "Septembre 2026 · paiements traités par Stripe", "N° de commande…", function (main) {
        addFill(main, rangee([
          kpi("Ventes du mois", "1 284", null),
          kpi("Volume", "38 520 €", null),
          kpi("Paiements réussis", "98,2 %", "23 refusés", "retard"),
          kpi("Remboursés", "6", "via Stripe", "neutre")
        ]));
        addFill(main, filtres(["Toutes", "Payées", "En livraison", "Remboursées", "En litige"], 0));
        addFill(main, tableau("Transactions", [
          ["Commande", 130], ["Article", 190], ["Vendeur → Acheteur", 200], ["Montant", 100], ["Paiement Stripe", 150], ["Livraison", 180], ["Date", 106]
        ], [
          ["#PND-2481", "Veste en cuir", "Thomas → Mathis", "50 €", pill("Payé", "encours"), "Colissimo · en transit", "12 sept."],
          ["#PND-2477", "Baskets Adidas", "Mathis → Julie", "35 €", pill("Payé", "encours"), "Main propre · remis", "10 sept."],
          ["#PND-2470", "Robe noire", "Léa → Inès", "28 €", pill("Refusé", "retard"), "—", "9 sept."],
          ["#PND-2466", "Lampe de bureau", "Karim → Léa", "15 €", pill("Remboursé", "termine"), "Colissimo · retourné", "6 sept."],
          ["#PND-2419", "Écharpe", "Sarah → Mathis", "45 €", pill("En litige", "arendre"), "Colissimo · livré", "1er sept."]
        ], "5 sur 1 284 · l'administration consulte, elle ne manipule jamais d'argent"));
      });
    }, 1, DW);

    // ============ 9. Litiges et remboursements ============
    ecranNouveau(SECTION, "Admin — Litiges et remboursements", 1, function (screen) {
      page(screen, "Litiges", "Litiges et remboursements", "3 litiges ouverts · 6 remboursements ce mois-ci", "N° de commande…", function (main) {
        const o = frame("Onglets", { dir: "HORIZONTAL", w: 420, primary: "FIXED" });
        addFill(o, ongletsN(["Litiges (3)", "Remboursements (6)"], 0));
        addFill(main, o);
        addFill(main, tableau("Litiges", [
          ["Commande", 140], ["Motif", 240], ["Acheteur", 150], ["Vendeur", 150], ["Montant", 100], ["Ouvert le", 120], ["Statut", 156]
        ], [
          ["#PND-2419", "Article non conforme à l'annonce", "Mathis", "Sarah", "45 €", "3 sept.", pill("Décision attendue", "retard")],
          ["#PND-2402", "Colis jamais reçu", "Julie", "Karim", "22 €", "30 août", pill("Enquête transporteur", "arendre")],
          ["#PND-2388", "Objet endommagé à la réception", "Inès", "Thomas", "60 €", "27 août", pill("Réponse vendeur", "arendre")]
        ], "Un litige qui se règle entre amis se clôt sans intervention."));
      });
    }, 1, DW);

    // ============ 10. Détail d'un litige ============
    ecranNouveau(SECTION, "Admin — Détail d'un litige", 2, function (screen) {
      page(screen, "Litiges", "Litige #PND-2419", "Litiges › Écharpe · 45 €", null, function (main) {
        const chrono = carteD("Admin/Card/Chronologie", { gap: S.lg });
        chrono.appendChild(text("Chronologie", { font: FONT_LB, size: 12, color: C.sub }));
        addFill(chrono, evenement("Commande payée", "1er sept.", "45 € · carte se terminant par 4242", "encours"));
        addFill(chrono, evenement("Colis livré", "2 sept.", "Colissimo · signé par Mathis", "encours"));
        addFill(chrono, evenement("Problème signalé par Mathis", "3 sept.", "« Ce n'est pas de la laine, l'étiquette dit acrylique. » · 2 photos", "retard"));
        addFill(chrono, evenement("Réponse de Sarah", "5 sept.", "« L'annonce disait laine mélangée. »", "arendre"));
        const parties = carteD("Admin/Card/Parties", { gap: S.md });
        parties.appendChild(text("Les deux parties", { font: FONT_LB, size: 12, color: C.sub }));
        const duo = frame("Parties", { dir: "HORIZONTAL", gap: 48, align: "CENTER" });
        duo.appendChild(personne("Mathis Chhour", 0, "Acheteur · 0 litige avant"));
        duo.appendChild(personne("Sarah Benali", 2, "Vendeuse · 1 litige avant"));
        addFill(parties, duo);

        const dec = carteD("Admin/Card/Decision", { gap: S.md });
        dec.appendChild(text("Décision", { font: FONT_LB, size: 12, color: C.sub }));
        addFill(dec, ligneInfo("Montant en jeu", "45 €"));
        addFill(dec, ligneInfo("Annonce", "« Laine mélangée »"));
        addFill(dec, bouton("Rembourser l'acheteur", "primary"));
        addFill(dec, bouton("Donner raison à la vendeuse", "secondary"));
        addFill(dec, bouton("Demander des justificatifs", "ghost"));
        dec.appendChild(para("Le remboursement est exécuté par Stripe. L'administration décide, elle ne manipule jamais d'argent.", 360, { size: 12, color: C.sub, lineHeight: 16 }));

        addFill(main, rangee([colonne(INNER - 420 - S.xxl, [chrono, parties]), colonne(420, [dec])]));
      });
    }, 1, DW);

    // ============ 11. Catégories ============
    ecranNouveau(SECTION, "Admin — Catégories", 3, function (screen) {
      page(screen, "Catégories", "Catégories", "Ce qui organise l'inventaire et guide les suggestions", null, function (main) {
        const objets = carteD("Admin/Card/Categories", { gap: S.md });
        objets.appendChild(text("Objets et vêtements", { font: FONT_LB, size: 12, color: C.sub }));
        const cats = [["Outils", "18 402 objets"], ["Électronique", "22 118"], ["Maison", "15 730"], ["Sport", "9 204"],
                      ["Hauts", "31 552 vêtements"], ["Bas", "19 870"], ["Chaussures", "14 311"], ["Accessoires", "8 906"]];
        for (let i = 0; i < cats.length; i++) addFill(objets, lienRangee(cats[i][0], cats[i][1], "Modifier"));
        addFill(objets, bouton("+ Ajouter une catégorie", "secondary"));

        const styles = carteD("Admin/Card/Styles", { gap: S.md });
        styles.appendChild(text("Catégories de style", { font: FONT_LB, size: 12, color: C.sub }));
        const fam = [
          ["Travail", "Professionnel · Business · Smart casual", "Exclut : Sport, Maison"],
          ["Quotidien", "Casual · Streetwear · Détente", "Exclut : Événement"],
          ["Sport", "Running · Fitness · Sport général", "Exclut : Travail, Soirée, Événement"],
          ["Soirée", "Chic · Élégant", "Exclut : Sport, Maison"],
          ["Événement", "Cérémonie · Mariage · Formel", "Exclut : Sport, Maison"],
          ["Maison", "Maison · Confort", "Exclut : Travail, Événement"]
        ];
        for (let i = 0; i < fam.length; i++) {
          const r = frame("List/Row/" + fam[i][0], { dir: "VERTICAL", gap: 2, radius: R.md, px: S.lg, py: S.md, fill: C.ink, fillOpacity: 0.03 });
          const l = frame("Ligne", { dir: "HORIZONTAL", justify: "SPACE_BETWEEN", align: "CENTER" });
          l.appendChild(text(fam[i][0], { font: FONT_LB, size: 16, color: C.ink }));
          l.appendChild(lien("Modifier"));
          addFill(r, l);
          r.appendChild(text(fam[i][1], { size: 12, color: C.sub }));
          r.appendChild(text(fam[i][2], { size: 12, color: C.sub }));
          addFill(styles, r);
        }
        addFill(styles, bouton("+ Ajouter un style", "secondary"));

        const etats = carteD("Admin/Card/Etats", { gap: S.md });
        etats.appendChild(text("États d'un objet", { font: FONT_LB, size: 12, color: C.sub }));
        const z = frame("Chips", { dir: "HORIZONTAL", gap: S.sm, gapY: S.sm, wrap: true, primary: "FIXED" });
        for (let i = 0; i < ETATS_OBJET.length; i++) z.appendChild(statusPill(ETATS_OBJET[i][0], ETATS_OBJET[i][1]));
        addFill(etats, z);
        etats.appendChild(para("Définis par les règles métier : non modifiables ici. « Déplacer » est une action, pas un état.", 300, { size: 12, color: C.sub, lineHeight: 16 }));

        const w3 = Math.floor((INNER - S.xxl * 2) / 3);
        addFill(main, rangee([colonne(w3, [objets]), colonne(w3, [styles]), colonne(INNER - w3 * 2 - S.xxl * 2, [etats])]));
      });
    }, 1, DW);

    rapport("Lot 26 Back-office");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
