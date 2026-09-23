// ============================================================
// Lot 15 — CRÉER UN CARTON  (page "Maquette v2", section 04)
//
// 5 écrans NOUVEAUX : le parcours manquait, alors que la bulle
// « Cartons » du menu d'ajout le promet (« Créer un carton de
// rangement »). Même grammaire que les trois autres parcours d'ajout :
// 4 étapes jaugées puis une confirmation.
//
// Ce lot CRÉE des frames (ecranNouveau) au lieu d'en reconstruire.
// Il est relançable : au 2e passage les frames sont retrouvées par leur
// nom et simplement refaites, elles ne se dupliquent pas.
//
// Libellés cliquables cablés dans penderie-prototype-v2.js :
// « Continuer » x3, « Scanner les objets », « Créer le carton »,
// « Modifier », « Carton créé ! », « Voir le carton ».
// ============================================================

(async function () {
  try {
    figma.notify("Lot 15 Carton : demarrage...", { timeout: 1500 });
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
      coat:    await comp("39:67")
    };

    const SECTION = "LOGEMENTS";
    const UTIL_CARTE = W - GUT * 2 - S.lg * 2;
    const ETIQ = "Carton Bricolage";
    const LOC = "Maison principale › Garage › Étagère 2";

    // ---------- briques ----------

    function jauge(total, courant) {
      const b = frame("Jauge", { dir: "HORIZONTAL", gap: S.xs, px: GUT });
      for (let i = 0; i < total; i++) {
        const t = frame("Segment", {
          h: 4, radius: R.full, dir: "VERTICAL", primary: "FIXED", counter: "FIXED",
          fill: i <= courant ? C.primary : C.ink, fillOpacity: i <= courant ? 1 : 0.10
        });
        addFill(b, t);
      }
      return b;
    }

    function filAriane(chemin) {
      const b = frame("Nav/Breadcrumb", {
        dir: "HORIZONTAL", gap: S.xs, gapY: S.xs, wrap: true, px: GUT, primary: "FIXED"
      });
      for (let i = 0; i < chemin.length; i++) {
        const dernier = i === chemin.length - 1;
        const p = frame("Chip/Category/" + chemin[i], {
          dir: "HORIZONTAL", radius: R.full, px: S.md, h: 32, counter: "FIXED", align: "CENTER",
          fill: dernier ? C.primary : C.white, shadow: dernier ? null : SHADOW_E1
        });
        p.appendChild(text(chemin[i], { font: FONT_LB, size: 12, color: dernier ? C.white : C.sub }));
        b.appendChild(p);
        if (!dernier) {
          const sp = frame("Separateur", {
            dir: "VERTICAL", align: "CENTER", justify: "CENTER", h: 32, counter: "FIXED"
          });
          sp.appendChild(text("›", { font: FONT_LB, size: 12, color: C.sub, opacity: 0.85 }));
          b.appendChild(sp);
        }
      }
      return b;
    }

    // Le carton n'a pas de photo : c'est son étiquette qui l'identifie,
    // donc elle est traitée comme un titre et non comme un champ de plus.
    function carteEtiquette(etiquette, contenu, compte) {
      const c = card("Card/Place/Carton", { gap: S.md });
      const l = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER", justify: "SPACE_BETWEEN" });
      const rond = frame("Illustration", {
        w: 48, h: 48, radius: R.sm, fill: C.primary, fillOpacity: 0.12,
        dir: "VERTICAL", align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED"
      });
      rond.appendChild(text("[]", { font: FONT_LB, size: 16, color: C.primary }));
      l.appendChild(rond);
      const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text(etiquette, { font: FONT_LB, size: 16, color: C.ink }));
      g.appendChild(para(contenu, 150, { size: 12, color: C.sub, lineHeight: 16 }));
      l.appendChild(g);
      if (compte) l.appendChild(statusPill(compte, "encours"));
      addFill(c, l);
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return c;
    }

    // Rangée d'objet à mettre dans le carton : l'état « Ajouté » se lit
    // en pastille, comme partout ailleurs dans l'app.
    function ligneObjet(nom, meta, pic, ajoute) {
      const r = frame("Card/Object/" + nom, {
        dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
        px: S.md, py: S.md, align: "CENTER", justify: "SPACE_BETWEEN", shadow: SHADOW_E1
      });
      const g = frame("Gauche", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
      g.appendChild(photoBox(48, 48, R.sm, pic, C.ink));
      const t = frame("Texte", { dir: "VERTICAL", gap: 2 });
      t.appendChild(text(nom, { font: FONT_LB, size: 16, color: C.ink }));
      t.appendChild(para(meta, 170, { size: 12, color: C.sub, lineHeight: 16 }));
      g.appendChild(t);
      r.appendChild(g);
      r.appendChild(ajoute ? statusPill("Ajouté", "encours")
                           : text("+", { font: FONT_LB, size: 16, color: C.primary }));
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return r;
    }

    const CONTENU = [
      ["Perceuse Bosch", "Outils · Bosch", PIC.pants],
      ["Boîte à vis", "Visserie · 200 pièces", PIC.baskets],
      ["Niveau à bulle", "Outils · Stanley", PIC.jacket]
    ];

    // ============ 1. Informations ============
    ecranNouveau(SECTION, "Rangement — Création · Informations", 0, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, jauge(4, 0));
      addFill(col, titrePage("Un nouveau carton", "Étape 1 sur 4"));

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Étiquette", ETIQ));
      addFill(champs, groupeChips("Ce qu'il contient",
        ["Outils", "Vêtements", "Déco", "Papiers", "Camping", "Autre"], ["Outils"]));
      addFill(champs, champSelect("Couleur d'étiquette", "Rose"));
      addFill(champs, champTexte("Note (facultatif)",
        "Petit matériel de bricolage, à ne pas ouvrir par les enfants.", 72));
      addFill(col, champs);

      const blocs = frame("Blocs", { dir: "VERTICAL", px: GUT });
      const c = card("Card/Section/Info", { gap: S.sm });
      c.appendChild(text("À quoi sert l'étiquette", { font: FONT_LB, size: 12, color: C.sub }));
      c.appendChild(para("C'est le mot que tu liras sur le carton, et celui que tu chercheras dans six mois. Un nom précis vaut mieux qu'un numéro.",
        UTIL_CARTE, { size: 16, color: C.sub, lineHeight: 22 }));
      addFill(blocs, c);
      addFill(col, blocs);

      barreActions(col, bouton("Continuer", "primary"), null, null, null);
      finaliser(screen, col);
    });

    // ============ 2. Emplacement ============
    ecranNouveau(SECTION, "Rangement — Création · Emplacement", 1, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, jauge(4, 1));
      addFill(col, titrePage("Où tu le poses ?", "Étape 2 sur 4"));

      const fil = frame("Blocs", { dir: "VERTICAL", px: GUT });
      const c = card("Card/Section/Chemin", { gap: S.sm });
      c.appendChild(text("Emplacement choisi", { font: FONT_LB, size: 12, color: C.sub }));
      c.appendChild(para(LOC, UTIL_CARTE, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 22 }));
      addFill(fil, c);
      addFill(col, fil);

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Logement", "Maison principale"));
      addFill(champs, champSelect("Pièce", "Garage"));
      addFill(champs, champSelect("Rangement", "Étagère 2"));
      addFill(col, champs);

      const rec = frame("Section/Recents", { dir: "VERTICAL", gap: S.md });
      addFill(rec, enteteSection("Emplacements récents", null));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, lienRangee("Garage › Étagère 2", "1 carton déjà posé ici"));
      addFill(l, lienRangee("Cave › Étagère 1", "1 carton déjà posé ici"));
      addFill(l, lienRangee("Grenier", "1 carton déjà posé ici"));
      addFill(rec, l);
      addFill(col, rec);

      barreActions(col, bouton("Continuer", "primary"), null, null,
        "Un carton se pose sur un rangement, jamais directement dans une pièce.");
      finaliser(screen, col);
    });

    // ============ 3. Contenu ============
    ecranNouveau(SECTION, "Rangement — Création · Contenu", 2, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, jauge(4, 2));
      addFill(col, titrePage("Qu'est-ce que tu mets dedans ?", "Étape 3 sur 4 · 3 objets"));

      const scan = frame("Detail/Action bar", { dir: "VERTICAL", px: GUT });
      addFill(scan, bouton("Scanner les objets", "secondary"));
      addFill(col, scan);

      const rech = frame("Recherche", { dir: "VERTICAL", px: GUT });
      addFill(rech, champRecherche("Chercher dans mon inventaire..."));
      addFill(col, rech);

      const dedans = frame("Section/Dedans", { dir: "VERTICAL", gap: S.md });
      addFill(dedans, enteteSection("Dans le carton", "3 objets"));
      const l1 = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      for (let i = 0; i < CONTENU.length; i++) {
        addFill(l1, ligneObjet(CONTENU[i][0], CONTENU[i][1], CONTENU[i][2], true));
      }
      addFill(dedans, l1);
      addFill(col, dedans);

      const sug = frame("Section/Suggestions", { dir: "VERTICAL", gap: S.md });
      addFill(sug, enteteSection("Déjà rangés sur l'Étagère 2", "9 objets"));
      const l2 = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l2, ligneObjet("Scie sauteuse", "Outils · Makita", PIC.coat, false));
      addFill(l2, ligneObjet("Mètre ruban", "Outils · 5 m", PIC.baskets, false));
      addFill(l2, ligneObjet("Clé à molette", "Outils · Facom", PIC.pants, false));
      addFill(sug, l2);
      addFill(col, sug);

      barreActions(col, bouton("Continuer", "primary"), null, null,
        "Tu peux créer le carton vide et le remplir plus tard.");
      finaliser(screen, col);
    });

    // ============ 4. Vérification ============
    ecranNouveau(SECTION, "Rangement — Création · Vérification", 3, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, jauge(4, 3));
      addFill(col, titrePage("Vérifie ton carton", "Étape 4 sur 4"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteEtiquette(ETIQ, "Outils · étiquette rose", "3 objets"));
      addFill(col, blocs);

      addFill(col, filAriane(["Maison principale", "Garage", "Étagère 2"]));

      const sec = frame("Section/Contenu", { dir: "VERTICAL", gap: S.md });
      addFill(sec, enteteSection("Ce qu'il contient", "3 objets"));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      for (let i = 0; i < CONTENU.length; i++) {
        addFill(l, ligneObjet(CONTENU[i][0], CONTENU[i][1], CONTENU[i][2], true));
      }
      addFill(sec, l);
      addFill(col, sec);

      // La conséquence est dite avant l'action : les 3 objets changent de
      // localisation en même temps que le carton est créé.
      const suite = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(suite, carteSection("À la création", [
        ligneInfo("Statut", "Fermé"),
        ligneInfo("Les 3 objets", "Passent dans le carton"),
        ligneInfo("Leur localisation", "Garage › Étagère 2")
      ]));
      addFill(col, suite);

      barreActions(col,
        bouton("Créer le carton", "primary"),
        [bouton("Modifier", "secondary")], null, null);
      finaliser(screen, col);
    });

    // ============ 5. Confirmation ============
    ecranNouveau(SECTION, "Rangement — Création · Confirmation", 4, function (screen) {
      const col = preparer(screen, 40);

      const z = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(z, toastSucces("Carton créé !", "14 cartons actifs dans ta penderie."));
      addFill(col, z);

      addFill(col, titrePage(ETIQ, "Garage › Étagère 2 · 3 objets"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteEtiquette(ETIQ, "Outils · étiquette rose", "Fermé"));
      addFill(blocs, carteSection("Le carton", [
        ligneInfo("Emplacement", "Garage › Étagère 2"),
        ligneInfo("Objets", "3"),
        ligneInfo("Créé le", "12 sept. 2026")
      ]));
      addFill(blocs, carteSection("Et maintenant", [
        ligneInfo("Ajouter un objet", "Il rejoint le carton"),
        ligneInfo("Déplacer le carton", "Les objets suivent"),
        ligneInfo("Chercher", "« Bricolage » retrouve le carton")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Voir le carton", "primary"),
        [bouton("Créer un autre carton", "secondary")], null, null);
      finaliser(screen, col);
    });

    rapport("Lot 15 Carton");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
