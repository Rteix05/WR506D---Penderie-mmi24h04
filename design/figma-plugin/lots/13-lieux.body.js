// ============================================================
// Lot 13 — LOGEMENTS & RANGEMENTS  (page "Maquette v2", section 04)
//
// 13 ecrans refaits : 4 d'ajout de logement, 3 de navigation dans les
// lieux, 6 de rangements et de cartons. Le noeud frame est conserve a
// chaque fois, donc les reactions de niveau frame survivent.
//
// Libelles cliquables attendus par penderie-prototype.js :
// « Continuer », « Ajouter ce logement », « Modifier »,
// « Maison principale », « + Ajouter un logement », « Garage »,
// « Etagere 2 », « Cartons », « Ouvrir le carton › », « Perceuse Bosch »,
// « Voir tout », « Carton 1 », « Ajouter un objet », « T-shirt Nike »,
// « Voir les 12 objets › », « Supprimer ce carton ».
// ============================================================

(async function () {
  try {
    figma.notify("Lot 13 Lieux : demarrage...", { timeout: 1500 });
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

    const UTIL_CARTE = W - GUT * 2 - S.lg * 2;
    const OBJ = "Perceuse Bosch";

    // ---------- briques propres aux lieux ----------

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
          const s = frame("Separateur", {
            dir: "VERTICAL", align: "CENTER", justify: "CENTER", h: 32, counter: "FIXED"
          });
          s.appendChild(text("›", { font: FONT_LB, size: 12, color: C.sub, opacity: 0.85 }));
          b.appendChild(s);
        }
      }
      return b;
    }

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

    // Tuile de lieu : un lieu n'a pas de photo, donc c'est le compte
    // d'objets qui porte la tuile, avec une initiale en guise de visuel.
    function tuileLieu(nom, meta, largeur, actif) {
      const c = frame("Card/Place/" + nom, {
        dir: "VERTICAL", gap: S.md, w: largeur, radius: R.md,
        fill: C.white, px: S.md, py: S.md, shadow: SHADOW_E1,
        primary: "AUTO", counter: "FIXED"
      });
      const rond = frame("Illustration", {
        w: 48, h: 48, radius: R.md, dir: "VERTICAL", align: "CENTER", justify: "CENTER",
        primary: "FIXED", counter: "FIXED",
        fill: actif ? C.primary : C.ink, fillOpacity: actif ? 0.12 : 0.05
      });
      rond.appendChild(text(nom.slice(0, 1).toUpperCase(),
        { font: FONT_LB, size: 16, color: actif ? C.primary : C.sub }));
      c.appendChild(rond);
      const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
      g.appendChild(para(nom, largeur - S.md * 2, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 20 }));
      g.appendChild(para(meta, largeur - S.md * 2, { size: 12, color: C.sub, lineHeight: 16 }));
      addFill(c, g);
      return c;
    }

    function grilleLieux(items) {
      const largeur = Math.floor((W - GUT * 2 - S.md) / 2);
      const g = frame("Grille", {
        dir: "HORIZONTAL", gap: S.md, gapY: S.md, wrap: true, px: GUT, primary: "FIXED"
      });
      for (let i = 0; i < items.length; i++) {
        g.appendChild(tuileLieu(items[i][0], items[i][1], largeur, items[i][2]));
      }
      return g;
    }

    function carteObjetLigne(nom, meta, statut, tone, pic) {
      return carteListe(nom, meta, statut, tone, pic, "Card/Object");
    }

    // Carton : le nombre d'objets est l'information utile, l'etiquette
    // le nom. On evite la photo, un carton ressemble a un carton.
    function carteCarton(nom, meta, compte, largeur) {
      const c = frame("Card/Place/" + nom, {
        dir: "VERTICAL", gap: S.md, w: largeur, radius: R.md,
        fill: C.white, px: S.md, py: S.md, shadow: SHADOW_E1,
        primary: "AUTO", counter: "FIXED"
      });
      const tete = frame("Ligne", { dir: "HORIZONTAL", justify: "SPACE_BETWEEN", align: "CENTER" });
      const rond = frame("Illustration", {
        w: 40, h: 40, radius: R.sm, fill: C.primary, fillOpacity: 0.12,
        dir: "VERTICAL", align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED"
      });
      rond.appendChild(text("[]", { font: FONT_LB, size: 14, color: C.primary }));
      tete.appendChild(rond);
      tete.appendChild(text(compte, { font: FONT_LB, size: 12, color: C.sub }));
      addFill(c, tete);
      const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
      g.appendChild(para(nom, largeur - S.md * 2, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 20 }));
      g.appendChild(para(meta, largeur - S.md * 2, { size: 12, color: C.sub, lineHeight: 16 }));
      addFill(c, g);
      return c;
    }

    function sectionListe(col, titre, lien, rangees) {
      const sec = frame("Section/" + titre, { dir: "VERTICAL", gap: S.md });
      addFill(sec, enteteSection(titre, lien));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      for (let i = 0; i < rangees.length; i++) addFill(l, rangees[i]);
      addFill(sec, l);
      addFill(col, sec);
      return sec;
    }

    // ============ 1. Ajout · Type ============
    ecran("Logement — Ajout · Type", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, jauge(4, 0));
      addFill(col, titrePage("C'est quoi ?", "Étape 1 sur 4"));

      addFill(col, grilleLieux([
        ["Maison", "Plusieurs pièces, un garage, une cave", true],
        ["Appartement", "Quelques pièces, une cave", false],
        ["Studio", "Une pièce à vivre", false],
        ["Cave ou box", "Un seul espace de stockage", false],
        ["Bureau", "Ton lieu de travail", false],
        ["Autre", "À toi de le nommer", false]
      ]));

      barreActions(col, bouton("Continuer", "primary"), null, null,
        "Le type sert juste à te proposer les bonnes pièces ensuite.");
      finaliser(screen, col);
    });

    // ============ 2. Ajout · Informations ============
    ecran("Logement — Ajout · Informations", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, jauge(4, 1));
      addFill(col, titrePage("Ton logement", "Étape 2 sur 4"));

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Nom", "Maison principale"));
      addFill(champs, champSelect("Type", "Maison"));
      addFill(champs, champSelect("Adresse (facultatif)", "12 rue des Lilas, Paris"));
      addFill(champs, groupeChips("Qui y a accès",
        ["Moi seul", "Ma famille", "Mes colocataires"], ["Ma famille"]));
      addFill(col, champs);

      const blocs = frame("Blocs", { dir: "VERTICAL", px: GUT });
      const c = card("Card/Section/Info", { gap: S.sm });
      c.appendChild(para("L'adresse ne sert qu'à toi : elle n'est jamais montrée à tes amis, même sur un objet partagé.",
        UTIL_CARTE, { size: 16, color: C.sub, lineHeight: 22 }));
      addFill(blocs, c);
      addFill(col, blocs);

      barreActions(col, bouton("Continuer", "primary"), null, null, null);
      finaliser(screen, col);
    });

    // ============ 3. Ajout · Pièces ============
    ecran("Logement — Ajout · Pièces", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, jauge(4, 2));
      addFill(col, titrePage("Quelles pièces ?", "Étape 3 sur 4 · 7 sélectionnées"));

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, groupeChips("Pièces à vivre",
        ["Salon", "Cuisine", "Salle à manger", "Bureau"], ["Salon", "Cuisine", "Bureau"]));
      addFill(champs, groupeChips("Chambres",
        ["Chambre", "Chambre 2", "Chambre enfant"], ["Chambre"]));
      addFill(champs, groupeChips("Rangement",
        ["Garage", "Cave", "Grenier", "Buanderie", "Dressing"], ["Garage", "Cave", "Grenier"]));
      addFill(col, champs);

      const ajout = frame("Liste", { dir: "VERTICAL", px: GUT });
      addFill(ajout, lienRangee("+ Ajouter une pièce", "Si elle n'est pas dans la liste"));
      addFill(col, ajout);

      barreActions(col, bouton("Continuer", "primary"), null, null,
        "Tu pourras ajouter des pièces et des rangements plus tard.");
      finaliser(screen, col);
    });

    // ============ 4. Ajout · Vérification ============
    ecran("Logement — Ajout · Vérification", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, jauge(4, 3));
      addFill(col, titrePage("Vérifie ton logement", "Étape 4 sur 4"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteSection("Le logement", [
        ligneInfo("Nom", "Maison principale"),
        ligneInfo("Type", "Maison"),
        ligneInfo("Accès", "Ma famille")
      ]));
      const p = card("Card/Section/Pieces", { gap: S.sm });
      p.appendChild(text("7 pièces", { font: FONT_LB, size: 12, color: C.sub }));
      p.appendChild(para("Salon · Cuisine · Bureau · Chambre · Garage · Cave · Grenier",
        UTIL_CARTE, { size: 16, color: C.ink, lineHeight: 22 }));
      addFill(blocs, p);
      addFill(col, blocs);

      barreActions(col,
        bouton("Ajouter ce logement", "primary"),
        [bouton("Modifier", "secondary")], null, null);
      finaliser(screen, col);
    });

    // ============ 5. Mes logements ============
    ecran("Logement — Mes logements", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Mes logements", "2 logements · 128 objets rangés"));

      addFill(col, grilleLieux([
        ["Maison principale", "7 pièces · 104 objets", true],
        ["Studio de Léa", "2 pièces · 24 objets", false]
      ]));

      const ajout = frame("Liste", { dir: "VERTICAL", px: GUT });
      addFill(ajout, lienRangee("+ Ajouter un logement", "Maison, appartement, cave, bureau"));
      addFill(col, ajout);

      sectionListe(col, "Sans logement", "4 objets", [
        carteObjetLigne("Casque JBL", "Aucun rangement défini", "À ranger", "arendre", PIC.baskets),
        carteObjetLigne("Ballon", "Aucun rangement défini", "À ranger", "arendre", PIC.baskets)
      ]);

      finaliser(screen, col);
      poserNav(screen, "Logements");
    });

    // ============ 6. Vue logement ============
    ecran("Logement — Vue logement", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Maison principale", "7 pièces · 104 objets"));
      addFill(col, filAriane(["Maison principale"]));

      addFill(col, grilleLieux([
        ["Garage", "3 rangements · 34 objets", true],
        ["Chambre", "2 rangements · 28 objets", false],
        ["Bureau", "2 rangements · 19 objets", false],
        ["Cuisine", "1 rangement · 12 objets", false],
        ["Salon", "1 rangement · 7 objets", false],
        ["Cave", "2 rangements · 4 objets", false]
      ]));

      const ajout = frame("Liste", { dir: "VERTICAL", px: GUT });
      addFill(ajout, lienRangee("+ Ajouter une pièce", "Grenier, buanderie, dressing..."));
      addFill(col, ajout);

      finaliser(screen, col);
      poserNav(screen, "Logements");
    });

    // ============ 7. Vue pièce ============
    ecran("Logement — Vue pièce", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Garage", "3 rangements · 34 objets"));
      addFill(col, filAriane(["Maison principale", "Garage"]));

      sectionListe(col, "Rangements", null, [
        lienRangee("Étagère 2", "12 objets · 1 carton"),
        lienRangee("Étagère 1", "9 objets"),
        lienRangee("Établi", "13 objets")
      ]);

      sectionListe(col, "Cartons", "Voir tout", [
        lienRangee("Carton Bricolage", "Étagère 2 · 12 objets"),
        lienRangee("Carton Camping", "Étagère 1 · 8 objets")
      ]);

      const ajout = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(ajout, lienRangee("+ Ajouter un rangement", "Étagère, placard, penderie..."));
      // lot 22 : une pièce se partage comme un objet
      addFill(ajout, lienRangee("Partager cette pièce", "Privée · personne n'y a accès"));
      addFill(col, ajout);

      finaliser(screen, col);
      poserNav(screen, "Logements");
    });

    // ============ 8. Vue rangement ============
    ecran("Rangement — Vue rangement", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Étagère 2", "12 objets · 1 carton"));
      addFill(col, filAriane(["Maison principale", "Garage", "Étagère 2"]));

      const blocs = frame("Blocs", { dir: "VERTICAL", px: GUT });
      const c = card("Card/Place/Carton Bricolage", { gap: S.md });
      const l = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER", justify: "SPACE_BETWEEN" });
      const g = frame("Gauche", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text("Carton Bricolage", { font: FONT_LB, size: 16, color: C.ink }));
      g.appendChild(text("12 objets à l'intérieur", { size: 12, color: C.sub }));
      l.appendChild(g);
      l.appendChild(text("Ouvrir le carton ›", { font: FONT_LB, size: 12, color: C.primary }));
      addFill(c, l);
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      addFill(blocs, c);
      addFill(col, blocs);

      sectionListe(col, "Posés sur l'étagère", "12 objets", [
        carteObjetLigne(OBJ, "Dans le Carton Bricolage", "Disponible", "dispo", PIC.pants),
        carteObjetLigne("Scie sauteuse", "Posée à côté du carton", "Disponible", "dispo", PIC.coat),
        carteObjetLigne("Boîte à vis", "Posée à côté du carton", "Disponible", "dispo", PIC.baskets)
      ]);

      finaliser(screen, col);
      poserNav(screen, "Logements");
    });

    // ============ 9. Mes cartons ============
    ecran("Rangement — Mes cartons", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Mes cartons", "13 cartons actifs · 96 objets"));

      const sec = frame("Section/Recents", { dir: "VERTICAL", gap: S.md });
      addFill(sec, enteteSection("Récemment ouverts", "Voir tout"));
      const largeur = Math.floor((W - GUT * 2 - S.md) / 2);
      const g = frame("Grille", {
        dir: "HORIZONTAL", gap: S.md, gapY: S.md, wrap: true, px: GUT, primary: "FIXED"
      });
      g.appendChild(carteCarton("Carton Bricolage", "Garage › Étagère 2", "12 objets", largeur));
      g.appendChild(carteCarton("Carton Camping", "Garage › Étagère 1", "8 objets", largeur));
      g.appendChild(carteCarton("Carton Hiver", "Cave › Étagère 1", "23 objets", largeur));
      g.appendChild(carteCarton("Carton Déco", "Grenier", "14 objets", largeur));
      addFill(sec, g);
      addFill(col, sec);

      const ajout = frame("Liste", { dir: "VERTICAL", px: GUT });
      addFill(ajout, lienRangee("+ Créer un carton", "Étiquette, emplacement, contenu"));
      addFill(col, ajout);

      finaliser(screen, col);
      poserNav(screen, "Logements");
    });

    // ============ 10. Tous mes cartons ============
    ecran("Rangement — Tous mes cartons", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Tous mes cartons", "13 cartons · 96 objets"));

      const rech = frame("Recherche", { dir: "VERTICAL", px: GUT });
      addFill(rech, champRecherche("Rechercher un carton..."));
      addFill(col, rech);

      addFill(col, rangeeChips(["Tous", "Garage", "Cave", "Grenier", "Bureau"], 0));

      const liste = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(liste, lienRangee("Carton 1", "Garage › Étagère 2 · 12 objets"));
      addFill(liste, lienRangee("Carton Bricolage", "Garage › Étagère 2 · 12 objets"));
      addFill(liste, lienRangee("Carton Camping", "Garage › Étagère 1 · 8 objets"));
      addFill(liste, lienRangee("Carton Hiver", "Cave › Étagère 1 · 23 objets"));
      addFill(liste, lienRangee("Carton Déco", "Grenier · 14 objets"));
      addFill(liste, lienRangee("Carton Papiers", "Bureau › Étagère haute · 6 objets"));
      addFill(col, liste);

      finaliser(screen, col);
      poserNav(screen, "Logements");
    });

    // ============ 11. Fiche carton ============
    ecran("Rangement — Fiche carton", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Carton 1", "Garage › Étagère 2 · 12 objets"));
      addFill(col, filAriane(["Maison principale", "Garage", "Étagère 2", "Carton 1"]));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteSection("Le carton", [
        ligneInfo("Étiquette", "Carton 1"),
        ligneInfo("Emplacement", "Garage › Étagère 2"),
        ligneInfo("Objets", "12"),
        ligneInfo("Fermé le", "3 sept. 2026")
      ]));
      addFill(col, blocs);

      sectionListe(col, "Ce qu'il contient", "Voir les 12 objets ›", [
        carteObjetLigne(OBJ, "Outils", "Disponible", "dispo", PIC.pants),
        carteObjetLigne("T-shirt Nike", "Vêtements", "Disponible", "dispo", PIC.tshirt),
        carteObjetLigne("Boîte à vis", "Outils", "Disponible", "dispo", PIC.baskets)
      ]);

      barreActions(col,
        bouton("Ajouter un objet", "primary"),
        [bouton("Déplacer le carton", "secondary")],
        "Supprimer ce carton", null);
      finaliser(screen, col);
    });

    // ============ 12. Carton · Aperçu ============
    ecran("Rangement — Carton · Aperçu", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Carton Bricolage", "Garage › Étagère 2"));
      addFill(col, filAriane(["Maison principale", "Garage", "Étagère 2", "Carton Bricolage"]));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      const c = card("Card/Place/Apercu", { gap: S.md });
      const tete = frame("Ligne", { dir: "HORIZONTAL", justify: "SPACE_BETWEEN", align: "CENTER" });
      const g = frame("Gauche", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text("12 objets", { font: FONT_T, size: 32, color: C.ink, lineHeight: 38 }));
      g.appendChild(text("dont 1 prêté", { size: 12, color: C.sub }));
      tete.appendChild(g);
      tete.appendChild(statusPill("Fermé", "termine"));
      addFill(c, tete);
      c.appendChild(para("Outils, visserie et petit matériel de bricolage.",
        UTIL_CARTE, { size: 16, color: C.sub, lineHeight: 22 }));
      addFill(blocs, c);
      addFill(col, blocs);

      sectionListe(col, "Aperçu du contenu", "Voir les 12 objets ›", [
        carteObjetLigne(OBJ, "Outils · Bosch", "Disponible", "dispo", PIC.pants),
        carteObjetLigne("Scie sauteuse", "Outils · Makita", "Prêté", "prete", PIC.coat),
        carteObjetLigne("Boîte à vis", "Visserie", "Disponible", "dispo", PIC.baskets)
      ]);

      barreActions(col,
        bouton("Ajouter un objet", "primary"),
        [bouton("Déplacer le carton", "secondary")],
        "Supprimer ce carton", null);
      finaliser(screen, col);
    });

    // ============ 13. Carton · Contenu ============
    ecran("Rangement — Carton · Contenu", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Contenu du carton", "Carton Bricolage · 12 objets"));

      const rech = frame("Recherche", { dir: "VERTICAL", px: GUT });
      addFill(rech, champRecherche("Rechercher dans ce carton..."));
      addFill(col, rech);

      addFill(col, rangeeChips(["Tous", "Outils", "Visserie", "Prêtés"], 0));

      const liste = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(liste, carteObjetLigne(OBJ, "Outils · Bosch", "Disponible", "dispo", PIC.pants));
      addFill(liste, carteObjetLigne("Scie sauteuse", "Outils · Makita · chez Thomas", "Prêté", "prete", PIC.coat));
      addFill(liste, carteObjetLigne("Boîte à vis", "Visserie · 200 pièces", "Disponible", "dispo", PIC.baskets));
      addFill(liste, carteObjetLigne("Niveau à bulle", "Outils · Stanley", "Disponible", "dispo", PIC.jacket));
      addFill(liste, carteObjetLigne("Mètre ruban", "Outils · 5 m", "Disponible", "dispo", PIC.baskets));
      addFill(col, liste);

      finaliser(screen, col);
      poserNav(screen, "Logements");
    });

    rapport("Lot 13 Lieux");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
