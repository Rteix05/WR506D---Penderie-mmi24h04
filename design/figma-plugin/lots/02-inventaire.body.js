// ============================================================
// Lot 02 — INVENTAIRE  (page "Maquette v2", section 03)
//
// 4 ecrans refaits. Le noeud frame est conserve a chaque fois.
// Aucun contenu ni action retire : seule la composition change.
// ============================================================

(async function () {
  try {
    figma.notify("Lot 02 Inventaire : demarrage...", { timeout: 1500 });
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
      pants:   await comp("39:82"),
      baskets: await comp("52:2013"),
      cap:     await comp("39:109")
    };

    const UTIL_CARTE = W - GUT * 2 - S.lg * 2;

    function rangeeTri(gauche, droite) {
      const row = frame("Tri", {
        dir: "HORIZONTAL", gap: S.sm, px: GUT, justify: "SPACE_BETWEEN", align: "CENTER"
      });
      function chipTri(label) {
        const c = frame("Chip/Sort/" + label, {
          dir: "HORIZONTAL", gap: S.xs, radius: R.full, px: S.md, h: 32,
          counter: "FIXED", align: "CENTER", fill: C.ink, fillOpacity: 0.05
        });
        c.appendChild(text(label, { size: 12, color: C.sub }));
        c.appendChild(text("v", { font: FONT_LB, size: 12, color: C.sub, opacity: 0.85 }));
        return c;
      }
      row.appendChild(chipTri(gauche));
      row.appendChild(chipTri(droite));
      return row;
    }

    // Carte objet : photo bord a bord en haut, statut pose dessus,
    // informations de gestion en dessous et discretes.
    function carteObjet(nom, meta, statut, tone, pic, largeur, extra) {
      const c = frame("Card/Object/" + statut + "/" + nom, {
        dir: "VERTICAL", gap: 0, w: largeur, radius: R.md, fill: C.white,
        shadow: SHADOW_E1, primary: "AUTO", counter: "FIXED", clip: true
      });
      // Fond de photo NEUTRE : la couleur du statut est portee par la
      // pastille seule, sinon la grille vire au patchwork.
      const ph = photoBox(largeur, Math.round(largeur * 1.1), 0, pic, C.ink);
      c.appendChild(ph);
      overlay(ph, statusPill(statut, tone, true), S.sm, S.sm);

      const util = largeur - S.md * 2;
      const b = frame("Texte", { dir: "VERTICAL", gap: 2, px: S.md, pt: S.md, pb: S.md });
      b.appendChild(para(nom, util, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 20 }));
      b.appendChild(para(meta, util, { size: 12, color: C.sub }));
      if (extra) b.appendChild(para(extra, util, { font: FONT_LB, size: 12, color: couleurDe(tone) }));
      addFill(c, b);
      return c;
    }

    function grille2(cartes) {
      const largeur = Math.floor((W - GUT * 2 - S.md) / 2);
      const g = frame("Grille", { dir: "VERTICAL", gap: S.md, px: GUT });
      for (let i = 0; i < cartes.length; i += 2) {
        const row = frame("Rangee", { dir: "HORIZONTAL", gap: S.md });
        const paire = [cartes[i], cartes[i + 1]];
        for (let j = 0; j < paire.length; j++) {
          if (!paire[j]) continue;
          const carte = paire[j](largeur);
          row.appendChild(carte);
          // hauteurs egales dans une rangee, sinon les bas se decalent
          // des qu'une carte a une ligne de plus
          try { carte.layoutSizingVertical = "FILL"; } catch (e) {}
        }
        g.appendChild(row);
      }
      return g;
    }

    // ============ 1. Mes objets ============
    ecran("Objet — Mes objets", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Mes objets", "128 objets · 4 prêtés · 2 empruntés"));

      const rech = frame("Recherche", { dir: "VERTICAL", px: GUT });
      addFill(rech, champRecherche("Rechercher un objet..."));
      addFill(col, rech);

      const filtres = frame("Filtres", { dir: "VERTICAL", gap: S.md });
      addFill(filtres, rangeeChips(["Tous", "Vêtements", "Outils", "Electronique", "Maison", "Autres"], 0));
      addFill(filtres, rangeeTri("Statut : tous", "Trier : recents"));
      addFill(col, filtres);

      // Lot 21 : un exemple par état utile, et l'objet emprunté est le même
      // partout (Ponceuse Makita, propriétaire Thomas).
      const objets = [
        ["Perceuse Bosch",      "Outils · Garage",        "Disponible", "dispo",    PIC.baskets, null],
        ["Appareil photo Sony", "Electronique · Bureau",  "Prêté",      "prete",    PIC.cap,     "Prêté à Thomas"],
        ["Casque JBL",          "Electronique · sans emplacement", "À ranger", "aranger", PIC.cap, null],
        ["Ponceuse Makita",     "Outils · appartient à Thomas", "Emprunté", "emprunte", PIC.baskets, "Emprunté à Thomas"],
        ["Veste en jean",       "Vêtements · Entrée",     "Disponible", "dispo",    PIC.jacket,  null],
        ["Lampe de bureau",     "Maison · Bureau",        "À vendre",   "vente",    PIC.pants,   "15 EUR"],
        ["Enceinte Marshall",   "Electronique · vendue",  "Vendu",      "vendu",    PIC.cap,     "Vendue à Julie"]
      ];
      const cartes = objets.map(function (o) {
        return function (largeur) {
          return carteObjet(o[0], o[1], o[2], o[3], o[4], largeur, o[5]);
        };
      });
      addFill(col, grille2(cartes));
      finaliser(screen, col);
      poserNav(screen, "Inventaire");
    });

    // ============ fiches objet ============
    function heroFiche(col, nom, categorie, statut, tone, pic) {
      const hero = frame("Detail/Hero photo", {
        dir: "VERTICAL", w: W, h: 300, primary: "FIXED", counter: "FIXED",
        fill: C.ink, fillOpacity: 0.04, align: "CENTER", justify: "CENTER", clip: true
      });
      if (pic) {
        try {
          const inst = pic.createInstance();
          inst.rescale(190 / Math.max(inst.width, inst.height));
          nettoieVignette(inst);
          hero.appendChild(inst);
        } catch (e) {}
      }
      col.appendChild(hero);
      overlay(hero, boutonRetour("X"), GUT, S.xl);

      const tete = frame("Titre", { dir: "VERTICAL", gap: S.sm, px: GUT });
      const ligne = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER", justify: "SPACE_BETWEEN" });
      const g = frame("Gauche", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text(nom, { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
      g.appendChild(text(categorie, { size: 12, color: C.sub }));
      ligne.appendChild(g);
      ligne.appendChild(statusPill(statut, tone));
      addFill(tete, ligne);
      addFill(col, tete);
    }

    function carteSection(titre, lignes) {
      const c = card("Card/Section/" + titre, { gap: S.md });
      c.appendChild(text(titre, { font: FONT_LB, size: 12, color: C.sub }));
      for (let i = 0; i < lignes.length; i++) addFill(c, lignes[i]);
      return c;
    }

    function blocLocalisation(titre, chemin, lien) {
      const c = card("Card/Section/Localisation", { gap: S.sm });
      c.appendChild(text(titre, { font: FONT_LB, size: 12, color: C.sub }));
      c.appendChild(para(chemin, UTIL_CARTE, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 22 }));
      if (lien) c.appendChild(text(lien, { size: 12, color: C.primary }));
      return c;
    }

    const LOC_PERCEUSE = "Maison principale › Garage › Étagère 2 › Carton Bricolage";

    ecran("Objet — Fiche · Disponible", function (screen) {
      const col = preparer(screen, 40, 0);
      heroFiche(col, "Perceuse Bosch", "Outils", "Disponible", "dispo", PIC.baskets);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, blocLocalisation("Localisation", LOC_PERCEUSE, "Déplacer l'objet ›"));
      addFill(blocs, carteSection("Détails", [
        ligneInfo("Catégorie", "Outils"),
        ligneInfo("État", "Très bon état")
      ]));
      const notes = card("Card/Section/Notes", { gap: S.sm });
      notes.appendChild(text("Notes et souvenir", { font: FONT_LB, size: 12, color: C.sub }));
      notes.appendChild(para("Les mèches sont dans la boîte bleue.",
        UTIL_CARTE, { size: 16, color: C.ink, lineHeight: 22 }));
      notes.appendChild(para("« Offerte par mon grand-père pour mon premier appartement. »",
        UTIL_CARTE, { size: 12, color: C.sub, lineHeight: 16 }));
      notes.appendChild(text("Modifier la note ›", { size: 12, color: C.primary }));
      addFill(blocs, notes);
      // lots 21 et 23 : historique des prêts et collections
      addFill(blocs, lienRangee("Historique des prêts", "3 prêts · dernier rendu le 20 juil."));
      addFill(blocs, lienRangee("Ajouter à une collection", "Dans 1 collection : Bricolage"));
      addFill(col, blocs);

      barreActions(col,
        bouton("Prêter", "primary"),
        [bouton("Modifier", "secondary"), bouton("Partager", "secondary"), bouton("Vendre", "secondary")],
        "Supprimer cet objet", null);
      finaliser(screen, col);
    });

    ecran("Objet — Fiche · Prêté", function (screen) {
      const col = preparer(screen, 40, 0);
      heroFiche(col, "Perceuse Bosch", "Outils", "Prêté", "prete", PIC.baskets);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      const pret = card("Card/Section/Pret en cours", { gap: S.md });
      pret.appendChild(text("Pret en cours", { font: FONT_LB, size: 12, color: C.sub }));
      addFill(pret, ligneInfo("Chez", "Thomas"));
      addFill(pret, ligneInfo("Prêté le", "12 septembre"));
      addFill(pret, ligneInfo("Retour prévu", "20 septembre"));
      const rappel = frame("Rappel", {
        dir: "HORIZONTAL", gap: S.sm, radius: R.xs, px: S.md, py: S.sm,
        fill: C.primary, fillOpacity: 0.08, align: "CENTER"
      });
      rappel.appendChild(text("Rappel automatique le 19 septembre", { size: 12, color: C.primary }));
      addFill(pret, rappel);
      addFill(blocs, pret);

      addFill(blocs, blocLocalisation("Localisation habituelle", LOC_PERCEUSE, null));
      addFill(blocs, carteSection("Détails", [
        ligneInfo("Catégorie", "Outils"),
        ligneInfo("État", "Très bon état")
      ]));
      addFill(blocs, lienRangee("Historique des prêts", "3 prêts · celui-ci est en cours"));
      addFill(col, blocs);

      // Lot 21 : la raison de l'absence de « Prêter » et « Vendre » est dite,
      // et un incident (perte, dommage, retard) se signale d'ici.
      barreActions(col,
        bouton("Marquer comme rendu", "primary"),
        [bouton("Rappeler Thomas", "secondary"), bouton("Modifier le prêt", "secondary")],
        "Signaler un problème",
        "Chez Thomas jusqu'au retour : ni vente ni nouveau prêt d'ici là.");
      finaliser(screen, col);
    });

    ecran("Objet — Fiche · Emprunté", function (screen) {
      const col = preparer(screen, 40, 0);
      // Lot 21 : même objet et même propriétaire que Mes objets et Mes prêts.
      // Je ne deviens jamais propriétaire d'un objet que j'ai chez moi.
      heroFiche(col, "Ponceuse Makita", "Outils · appartient à Thomas", "Emprunté", "emprunte", PIC.baskets);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      const emp = card("Card/Section/Emprunt", { gap: S.md });
      emp.appendChild(text("Objet emprunté à Thomas", { font: FONT_LB, size: 12, color: C.sub }));
      addFill(emp, ligneInfo("Propriétaire", "Thomas"));
      addFill(emp, ligneInfo("Emprunteur", "Toi"));
      addFill(emp, ligneInfo("Emprunté le", "10 septembre"));
      addFill(emp, ligneInfo("À rendre avant le", "25 septembre"));
      addFill(blocs, emp);

      addFill(blocs, blocLocalisation("Emplacement temporaire",
        "Chez toi · Maison principale › Garage › Établi", null));
      addFill(blocs, carteSection("Détails", [
        ligneInfo("Catégorie", "Outils"),
        ligneInfo("État", "Bon état")
      ]));
      addFill(col, blocs);

      // « Preter » reste present mais desactive, avec la raison
      barreActions(col,
        bouton("Rendre", "primary"),
        [bouton("Prêter", "disabled"), bouton("Vendre", "disabled")],
        null, "Tu ne peux pas prêter cet objet car il appartient à Thomas. Tu ne peux pas non plus le vendre.");
      finaliser(screen, col);
    });

    rapport("Lot 02 Inventaire");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
