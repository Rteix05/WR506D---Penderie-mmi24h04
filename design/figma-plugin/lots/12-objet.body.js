// ============================================================
// Lot 12 — OBJET : ajout, statuts, déplacement
// (page "Maquette v2", section 03)
//
// 8 ecrans refaits. Le noeud frame est conserve a chaque fois,
// donc les reactions de prototype de niveau frame survivent.
//
// Libelles cliquables attendus par penderie-prototype.js :
// « Prendre une photo », « Importer une photo », « Ajouter manuellement »,
// « Continuer », « Modifier », « Ajouter cet objet », « Objet ajoute ! »,
// « Confirmer ».
// Objet de reference : Perceuse Bosch, Maison principale › Garage ›
// Etagere 2 › Carton Bricolage.
// ============================================================

(async function () {
  try {
    figma.notify("Lot 12 Objet : demarrage...", { timeout: 1500 });
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
    const OBJ_PIC = PIC.pants;                    // vignette de substitution
    const LOC = "Maison principale › Garage › Étagère 2 › Carton Bricolage";

    // ---------- briques propres a l'objet ----------

    function carteElement(nom, meta, pic, pastille, tone) {
      const c = card("Card/Section/Element", { gap: S.md });
      const l = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
      l.appendChild(photoBox(56, 56, R.sm, pic, C.ink));
      const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text(nom, { font: FONT_LB, size: 16, color: C.ink }));
      g.appendChild(para(meta, 170, { size: 12, color: C.sub, lineHeight: 16 }));
      l.appendChild(g);
      if (pastille) l.appendChild(statusPill(pastille, tone));
      addFill(c, l);
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return c;
    }

    // Fil d'Ariane du rangement : c'est la promesse de l'app (« je sais
    // ou est mon objet »), il est donc lisible et non tronque.
    function filAriane(chemin, actif) {
      const b = frame("Nav/Breadcrumb", {
        dir: "HORIZONTAL", gap: S.xs, gapY: S.xs, wrap: true, px: GUT, primary: "FIXED"
      });
      for (let i = 0; i < chemin.length; i++) {
        const dernier = i === chemin.length - 1;
        const p = frame("Chip/Category/" + chemin[i], {
          dir: "HORIZONTAL", radius: R.full, px: S.md, h: 32, counter: "FIXED", align: "CENTER",
          fill: dernier && actif ? C.primary : C.white,
          shadow: dernier && actif ? null : SHADOW_E1
        });
        p.appendChild(text(chemin[i], {
          font: FONT_LB, size: 12, color: dernier && actif ? C.white : C.sub
        }));
        b.appendChild(p);
        if (!dernier) {
          const s = frame("Separateur", { dir: "VERTICAL", align: "CENTER", justify: "CENTER", h: 32, counter: "FIXED" });
          s.appendChild(text("›", { font: FONT_LB, size: 12, color: C.sub, opacity: 0.85 }));
          b.appendChild(s);
        }
      }
      return b;
    }

    // Etapes d'un parcours d'ajout : 4 traits, celui en cours en primary.
    // Moins bavard qu'un « Étape 2 sur 4 » repete a chaque fois.
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

    function zonePhoto(hauteur, pic, legende) {
      const z = frame("Field/Upload photo", {
        dir: "VERTICAL", gap: S.md, w: W - GUT * 2, h: hauteur, radius: R.lg,
        fill: C.ink, fillOpacity: 0.04, align: "CENTER", justify: "CENTER",
        primary: "FIXED", counter: "FIXED", clip: true
      });
      if (pic) {
        try {
          const inst = pic.createInstance();
          inst.rescale((hauteur * 0.5) / Math.max(inst.width, inst.height));
          nettoieVignette(inst);
          z.appendChild(inst);
        } catch (e) {}
      }
      if (legende) z.appendChild(text(legende, { size: 12, color: C.sub }));
      return z;
    }

    // ============ 1. Scanner ============
    ecran("Objet — Scanner", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Ajouter un objet", "Prends-le en photo, on remplit le reste"));

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      const viseur = frame("Photo", {
        dir: "VERTICAL", gap: S.md, w: W - GUT * 2, h: 360, radius: R.lg,
        fill: C.ink, fillOpacity: 0.06, align: "CENTER", justify: "CENTER",
        primary: "FIXED", counter: "FIXED", clip: true
      });
      const cadre = frame("Cadre", {
        w: 180, h: 180, radius: R.md, dir: "VERTICAL", primary: "FIXED", counter: "FIXED"
      });
      cadre.strokes = solid(C.white, 0.9);
      cadre.strokeWeight = 3;
      viseur.appendChild(cadre);
      viseur.appendChild(text("Cadre l'objet", { font: FONT_LB, size: 12, color: C.sub }));
      addFill(zone, viseur);
      addFill(col, zone);

      const aide = frame("Blocs", { dir: "VERTICAL", px: GUT });
      const c = card("Card/Section/Aide", { gap: S.sm });
      c.appendChild(text("Ce que la photo permet", { font: FONT_LB, size: 12, color: C.sub }));
      c.appendChild(para("Le nom, la marque et la catégorie sont reconnus automatiquement. Tu pourras tout corriger à l'étape suivante.",
        UTIL_CARTE, { size: 16, color: C.ink, lineHeight: 22 }));
      addFill(aide, c);
      addFill(col, aide);

      barreActions(col,
        bouton("Prendre une photo", "primary"),
        [bouton("Importer une photo", "secondary")], null, null);

      const manuel = frame("Lien", { dir: "HORIZONTAL", justify: "CENTER", px: GUT });
      manuel.appendChild(text("Ajouter manuellement", { font: FONT_LB, size: 16, color: C.primary }));
      addFill(col, manuel);
      finaliser(screen, col);
    });

    // ============ 2. Résultat du scan ============
    ecran("Objet — Résultat du scan", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("On a reconnu", "Vérifie avant de continuer"));

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, zonePhoto(240, OBJ_PIC, null));
      addFill(col, zone);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      const c = card("Card/Section/Reconnaissance", { gap: S.md });
      const l = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER", justify: "SPACE_BETWEEN" });
      const g = frame("Gauche", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text(OBJ, { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
      g.appendChild(text("Outils · Perceuse sans fil", { size: 12, color: C.sub }));
      l.appendChild(g);
      l.appendChild(statusPill("Sûr à 92 %", "encours"));
      addFill(c, l);
      addFill(blocs, c);

      addFill(blocs, carteSection("Ce qu'on a rempli", [
        ligneInfo("Nom", OBJ),
        ligneInfo("Marque", "Bosch"),
        ligneInfo("Catégorie", "Outils"),
        ligneInfo("État", "Très bon état")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Continuer", "primary"),
        [bouton("Modifier", "secondary")], null,
        "Rien n'est enregistré tant que tu n'as pas terminé.");
      finaliser(screen, col);
    });

    // ============ 3. Informations ============
    ecran("Objet — Informations", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, jauge(4, 0));
      addFill(col, titrePage("Ton objet", "Étape 1 sur 4"));

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, zonePhoto(160, OBJ_PIC, "Changer la photo"));
      addFill(col, zone);

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Nom", OBJ));
      addFill(champs, champSelect("Marque", "Bosch"));
      addFill(champs, champSelect("Catégorie", "Outils"));
      addFill(champs, groupeChips("État",
        ["Neuf", "Très bon état", "Bon état", "Usé"], ["Très bon état"]));
      addFill(champs, champTexte("Note (facultatif)",
        "Les mèches sont dans la boîte bleue.", 72));
      // lot 21 : le souvenir a son propre champ, distinct de la note pratique
      addFill(champs, champTexte("Souvenir (facultatif)",
        "Offerte par mon grand-père pour mon premier appartement.", 72));
      addFill(col, champs);

      barreActions(col, bouton("Continuer", "primary"), null, null, null);
      finaliser(screen, col);
    });

    // ============ 4. Localisation ============
    ecran("Objet — Localisation", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, jauge(4, 1));
      addFill(col, titrePage("Où tu le ranges ?", "Étape 2 sur 4"));

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
      addFill(champs, champSelect("Conteneur", "Carton Bricolage"));
      addFill(col, champs);

      const rec = frame("Section/Recents", { dir: "VERTICAL", gap: S.md });
      addFill(rec, enteteSection("Emplacements récents", null));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, lienRangee("Garage › Étagère 2", "12 objets rangés ici"));
      addFill(l, lienRangee("Bureau › Étagère haute", "5 objets rangés ici"));
      addFill(rec, l);
      addFill(col, rec);

      barreActions(col, bouton("Continuer", "primary"), null, null,
        "Tu pourras déplacer l'objet à tout moment.");
      finaliser(screen, col);
    });

    // ============ 5. Vérification ============
    ecran("Objet — Vérification", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, jauge(4, 2));
      addFill(col, titrePage("Vérifie ton objet", "Étape 3 sur 4"));

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, zonePhoto(200, OBJ_PIC, null));
      addFill(col, zone);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteSection("L'objet", [
        ligneInfo("Nom", OBJ),
        ligneInfo("Marque", "Bosch"),
        ligneInfo("Catégorie", "Outils"),
        ligneInfo("État", "Très bon état")
      ]));
      const loc = card("Card/Section/Localisation", { gap: S.sm });
      loc.appendChild(text("Localisation", { font: FONT_LB, size: 12, color: C.sub }));
      loc.appendChild(para(LOC, UTIL_CARTE, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 22 }));
      addFill(blocs, loc);
      addFill(blocs, carteSection("À l'ajout", [
        ligneInfo("Statut", "Disponible"),
        ligneInfo("Visible par", "Toi seul")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Ajouter cet objet", "primary"),
        [bouton("Modifier", "secondary")], null, null);
      finaliser(screen, col);
    });

    // ============ 6. Confirmation ============
    ecran("Objet — Confirmation", function (screen) {
      const col = preparer(screen, 40);

      const z = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(z, toastSucces("Objet ajouté !", "129 objets dans ta penderie."));
      addFill(col, z);

      addFill(col, titrePage(OBJ, "Disponible · Garage"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteElement(OBJ, LOC, OBJ_PIC, "Disponible", "dispo"));
      addFill(blocs, carteSection("Et maintenant", [
        ligneInfo("Prêter", "À un ami, en 3 étapes"),
        ligneInfo("Vendre", "Visible par tes amis"),
        ligneInfo("Déplacer", "Si tu le ranges ailleurs")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Voir l'objet", "primary"),
        [bouton("Ajouter un autre objet", "secondary")], null, null);
      finaliser(screen, col);
    });

    // ============ 7. Statuts ============
    // Ecran de reference : les 8 etats metier d'un objet (lot 21), leur
    // sens et les actions qu'ils permettent. Il sert d'aide, pas de filtre.
    // « Deplace » n'y figure pas : c'est une action, pas un etat.
    ecran("Objet — Statuts", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Les états", "Ce que chaque état permet"));

      const statuts = [
        ["À ranger",   "aranger",   "Chez toi, sans emplacement précis.", "Ranger · Prêter · Vendre", "4 objets"],
        ["Disponible", "dispo",     "Chez toi, à son emplacement.", "Prêter · Vendre · Déplacer · Partager", "104 objets"],
        ["Prêté",      "prete",     "Chez un ami, avec une date de retour.", "Marquer comme rendu · Signaler un problème", "4 objets"],
        ["Emprunté",   "emprunte",  "Chez toi, mais il appartient à quelqu'un d'autre.", "Rendre · jamais de prêt ni de vente", "2 objets"],
        ["Perdu",      "perdu",     "Introuvable. Il reste dans ton historique.", "Marquer comme retrouvé", "1 objet"],
        ["Endommagé",  "endommage", "Abîmé, souvent au retour d'un prêt.", "Marquer comme réparé · pas de prêt", "1 objet"],
        ["À vendre",   "vente",     "Mis en vente par toi, visible par tes amis.", "Modifier · Retirer · pas de prêt", "3 objets"],
        ["Vendu",      "vendu",     "Parti chez un ami acheteur.", "Consulter l'historique", "11 objets"]
      ];
      const liste = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      for (let i = 0; i < statuts.length; i++) {
        const s = statuts[i];
        const c = frame("Card/Section/Statut", {
          dir: "VERTICAL", gap: S.xs, radius: R.md, fill: C.white,
          px: S.lg, py: S.lg, shadow: SHADOW_E1
        });
        const tete = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER", justify: "SPACE_BETWEEN" });
        tete.appendChild(statusPill(s[0], s[1]));
        tete.appendChild(text(s[4], { size: 12, color: C.sub }));
        addFill(c, tete);
        c.appendChild(para(s[2], UTIL_CARTE, { size: 16, color: C.ink, lineHeight: 22 }));
        c.appendChild(para("Actions : " + s[3], UTIL_CARTE, { size: 12, color: C.sub, lineHeight: 16 }));
        addFill(liste, c);
      }
      addFill(col, liste);

      barreActions(col, bouton("Filtrer par statut", "primary"), null, null,
        "« Déplacer » n'est pas un état : l'emplacement change, l'état reste.");
      finaliser(screen, col);
    });

    // ============ 8. Déplacer ============
    ecran("Objet — Déplacer", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Déplacer l'objet", OBJ));

      const el = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(el, carteElement(OBJ, "Disponible · à déplacer", OBJ_PIC, "Disponible", "dispo"));
      addFill(col, el);

      const avant = frame("Section/Avant", { dir: "VERTICAL", gap: S.md });
      addFill(avant, enteteSection("Aujourd'hui", null));
      addFill(avant, filAriane(["Maison principale", "Garage", "Étagère 2", "Carton Bricolage"], false));
      addFill(col, avant);

      // lot 21 : l'exemple change de logement (2 logements dans Mes logements)
      const apres = frame("Section/Apres", { dir: "VERTICAL", gap: S.md });
      addFill(apres, enteteSection("Nouvel emplacement", null));
      addFill(apres, filAriane(["Studio de Léa", "Salon", "Placard"], true));
      addFill(col, apres);

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Logement", "Studio de Léa"));
      addFill(champs, champSelect("Pièce", "Salon"));
      addFill(champs, champSelect("Rangement", "Placard"));
      addFill(champs, champSelect("Conteneur", "Aucun"));
      addFill(col, champs);

      barreActions(col, bouton("Confirmer", "primary"), null, null,
        "Le nouvel emplacement devient tout de suite l'emplacement actuel. L'état ne change pas. Le Carton Bricolage passera de 12 à 11 objets.");
      finaliser(screen, col);
    });

    rapport("Lot 12 Objet");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
