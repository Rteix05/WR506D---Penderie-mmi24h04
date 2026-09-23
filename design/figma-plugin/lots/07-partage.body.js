// ============================================================
// Lot 07 — PARTAGE PRIVÉ  (page "Maquette v2", section 09)
//
// 9 ecrans refaits. Le noeud frame est conserve a chaque fois,
// donc les reactions de prototype de niveau frame survivent.
// Aucun contenu ni action retire : seule la composition change.
//
// Libelles cliquables attendus par penderie-prototype.js :
// « Partager », « Copier », « Revoquer », « Lien copie ! »,
// « Voir les commentaires (3) », « Veste en jean », « Tout revoquer »,
// « Modifier », « Acces revoque », « Partager un element ».
// ============================================================

(async function () {
  try {
    figma.notify("Lot 07 Partage : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");
    await chargerNav();
    await chargerAmis();

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
      coat:    await comp("39:67"),
      cintre:  await comp("52:2024")
    };

    const UTIL_CARTE = W - GUT * 2 - S.lg * 2;
    const LIEN = "penderie.app/p/8f3k2a";

    // ---------- briques propres au partage ----------

    // Le partage est prive par defaut : chaque ecran le rappelle une
    // fois, sinon rien ne distingue « partage » de « publie ».
    function bandeauPrive(texte) {
      const b = frame("Badge/Private", {
        dir: "HORIZONTAL", gap: S.md, radius: R.md, px: S.lg, py: S.md,
        align: "CENTER", fill: C.ink, fillOpacity: 0.04
      });
      const rond = frame("Pastille", {
        w: 32, h: 32, radius: R.full, fill: C.ink, fillOpacity: 0.08,
        dir: "VERTICAL", align: "CENTER", justify: "CENTER",
        primary: "FIXED", counter: "FIXED"
      });
      rond.appendChild(text("o", { font: FONT_LB, size: 14, color: C.ink }));
      b.appendChild(rond);
      b.appendChild(para(texte, W - GUT * 2 - S.lg * 2 - 44, { size: 12, color: C.sub, lineHeight: 16 }));
      return b;
    }

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

    // Carte lien : l'URL est l'objet de l'ecran, elle occupe la largeur
    // et se lit d'un coup ; l'action de copie reste dans la barre basse.
    function carteLien(expire) {
      const c = card("Card/Section/Lien", { gap: S.sm });
      c.appendChild(text("Lien de partage", { font: FONT_LB, size: 12, color: C.sub }));
      const boite = frame("Champ", {
        dir: "HORIZONTAL", radius: R.sm, px: S.md, py: S.md, align: "CENTER",
        fill: C.ink, fillOpacity: 0.04
      });
      boite.appendChild(para(LIEN, UTIL_CARTE - S.md * 2, { font: FONT_LB, size: 16, color: C.ink }));
      addFill(c, boite);
      c.appendChild(text(expire, { size: 12, color: C.sub }));
      return c;
    }

    function carteQR() {
      const c = card("Card/QR", { gap: S.md, align: "CENTER" });
      const carre = frame("Photo", {
        w: 140, h: 140, radius: R.md, fill: C.ink, fillOpacity: 0.06,
        dir: "VERTICAL", align: "CENTER", justify: "CENTER",
        primary: "FIXED", counter: "FIXED", clip: true
      });
      carre.appendChild(text("QR", { font: FONT_LB, size: 16, color: C.sub, opacity: 0.85 }));
      c.appendChild(carre);
      c.appendChild(text("À scanner en face à face", { size: 12, color: C.sub }));
      return c;
    }

    // Carte de partage : ce qui est partage, avec qui, jusqu'a quand.
    // Meme rangee que partout ailleurs, seul le nom de calque change.
    function cartePartage(objet, ligne, statut, tone, pic) {
      return carteListe(objet, ligne, statut, tone, pic, "Card/Share");
    }

    function commentaire(nom, i, texte, date, aMoi) {
      const r = frame("Detail/Comment/" + nom, {
        dir: "HORIZONTAL", gap: S.md, radius: R.md, px: S.md, py: S.md,
        align: "MIN", fill: aMoi ? C.primary : C.white, fillOpacity: aMoi ? 0.06 : 1,
        shadow: aMoi ? null : SHADOW_E1
      });
      r.appendChild(avatar(nom, i, 40));
      const g = frame("Texte", { dir: "VERTICAL", gap: S.xs });
      const tete = frame("Ligne", { dir: "HORIZONTAL", gap: S.sm, align: "CENTER", justify: "SPACE_BETWEEN" });
      tete.appendChild(text(nom, { font: FONT_LB, size: 16, color: C.ink }));
      tete.appendChild(text(date, { size: 12, color: C.sub, opacity: 0.85 }));
      addFill(g, tete);
      g.appendChild(para(texte, W - GUT * 2 - S.md * 2 - 40 - S.md,
        { size: 16, color: C.ink, lineHeight: 22 }));
      r.appendChild(g);
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return r;
    }

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

    // ============ 1. Partager ============
    ecran("Partage — Partager", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Partager", "Choisis quoi, et avec qui"));

      const quoi = frame("Blocs", { dir: "VERTICAL", gap: S.sm, px: GUT });
      addFill(quoi, carteElement("Veste en jean", "Levi's · Vestes · L", PIC.jacket, null, null));
      const changer = frame("Lien", { dir: "HORIZONTAL", justify: "MAX" });
      changer.appendChild(text("Changer ›", { font: FONT_LB, size: 12, color: C.primary }));
      addFill(quoi, changer);
      addFill(col, quoi);

      // Lot 22 : amis et abonnés sont deux groupes distincts, et le niveau
      // d'accès se lit sur chaque personne. Un abonné est toujours en
      // lecture seule : c'est une règle, pas un réglage.
      const amis = frame("Section/Amis", { dir: "VERTICAL", gap: S.md });
      addFill(amis, enteteSection("Amis", "12 amis"));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, rangeeAcces("Thomas", "Ami", 0, "Commentaires", true));
      addFill(l, rangeeAcces("Julie", "Ami", 1, "Commentaires", false));
      addFill(amis, l);
      addFill(col, amis);

      const abos = frame("Section/Abonnés", { dir: "VERTICAL", gap: S.md });
      addFill(abos, enteteSection("Abonnés", "5 abonnés"));
      const l2 = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l2, rangeeAcces("Paul", "Abonné", 2, "Lecture seule", true));
      addFill(l2, rangeeAcces("Sarah", "Abonnée", 2, "Lecture seule", false));
      addFill(abos, l2);
      addFill(col, abos);

      const reglages = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(reglages, ligneToggle("Autoriser les commentaires", "Amis choisis uniquement · jamais les abonnés", true));
      addFill(reglages, ligneToggle("Masquer la localisation", "Le rangement reste privé", true));
      addFill(reglages, ligneToggle("Créer un lien de partage", "Même règles : le lien ne donne pas plus", false));
      addFill(col, reglages);

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Expire dans", "7 jours"));
      addFill(col, champs);

      barreActions(col, bouton("Partager", "primary"), null, null,
        "Seules les personnes choisies verront cet élément. Tes abonnés non choisis ne voient rien.");
      finaliser(screen, col);
    });

    // ============ 2. Lien de partage ============
    ecran("Partage — Lien de partage", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Lien de partage", "Veste en jean · expire dans 7 jours"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteLien("Expire le 19 septembre 2026"));
      addFill(blocs, carteQR());
      addFill(col, blocs);

      const acces = frame("Section/Acces", { dir: "VERTICAL", gap: S.md });
      addFill(acces, enteteSection("Qui a accès", "2 personnes"));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, rangeeAcces("Thomas", "Ami · 0 vue", 0, "Commentaires", false));
      addFill(l, rangeeAcces("Paul", "Abonné · 0 vue", 2, "Lecture seule", false));
      addFill(acces, l);
      addFill(col, acces);

      // Lot 22 : ce que voit chaque profil de visiteur, avant d'envoyer le lien
      const apercu = frame("Section/Apercu", { dir: "VERTICAL", gap: S.md });
      addFill(apercu, enteteSection("Aperçu : ce que voit…", null));
      const la = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(la, lienRangee("Un ami autorisé", "L'élément et les commentaires"));
      addFill(la, lienRangee("Un abonné autorisé", "L'élément, en lecture seule"));
      addFill(la, lienRangee("Une personne non autorisée", "Accès refusé"));
      addFill(apercu, la);
      addFill(col, apercu);

      const p = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(p, bandeauPrive("Le lien ne donne accès qu'à cet élément, et cesse de fonctionner à l'expiration."));
      addFill(col, p);

      barreActions(col,
        bouton("Copier", "primary"),
        [bouton("Modifier le partage", "secondary")],
        "Révoquer", null);
      finaliser(screen, col);
    });

    // ============ 3. Lien copié ============
    ecran("Partage — Lien copié", function (screen) {
      const col = preparer(screen, 40);

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, toastSucces("Lien copié !", "Colle-le où tu veux, il expire dans 7 jours."));
      addFill(col, zone);

      addFill(col, titrePage("Lien de partage", "Veste en jean"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteLien("Expire le 19 septembre 2026"));
      addFill(blocs, carteSection("Ce partage", [
        ligneInfo("Élément", "Veste en jean"),
        ligneInfo("Accès", "Thomas"),
        ligneInfo("Commentaires", "Autorisés")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Voir mes partages", "primary"), null,
        "Révoquer", null);
      finaliser(screen, col);
    });

    // ============ 4. Accès invité ============
    ecran("Partage — Accès invité", function (screen) {
      const col = preparer(screen, 40, 0);

      const bande = frame("Entete", {
        dir: "VERTICAL", w: W, gap: S.md, px: GUT, pt: 56, pb: S.xl,
        align: "CENTER", primary: "AUTO", counter: "FIXED",
        fill: C.primary, fillOpacity: 0.06
      });
      bande.appendChild(avatar("Rafael", 0, 72));
      const t = frame("Texte", { dir: "VERTICAL", gap: S.xs, align: "CENTER" });
      t.appendChild(text("Le dressing de Rafael", { font: FONT_T, size: 32, color: C.ink, lineHeight: 38 }));
      t.appendChild(para("3 éléments partagés avec toi", W - GUT * 2,
        { size: 16, color: C.sub, lineHeight: 22, align: "CENTER" }));
      addFill(bande, t);
      // lot 22 : cette vue est celle d'un AMI autorisé (abonné : autre écran)
      bande.appendChild(pastillesRelation([["Ami autorisé", "encours"], ["Commentaires autorisés", "encours"]]));
      col.appendChild(bande);

      const p = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(p, bandeauPrive("Tu vois seulement ce que Rafael a choisi de partager avec toi. Le reste de sa penderie reste privé."));
      addFill(col, p);

      const largeur = Math.floor((W - GUT * 2 - S.md) / 2);
      const elements = [
        ["Veste en jean", "Levi's · L", PIC.jacket],
        ["T-shirt Nike", "Nike · M", PIC.tshirt],
        ["Baskets Adidas", "Adidas · 42", PIC.baskets]
      ];
      const grille = frame("Grille", {
        dir: "HORIZONTAL", gap: S.md, gapY: S.md, wrap: true, px: GUT, primary: "FIXED"
      });
      for (let i = 0; i < elements.length; i++) {
        const e = elements[i];
        const c = frame("Card/Garment/" + e[0], {
          dir: "VERTICAL", gap: 0, w: largeur, radius: R.md, fill: C.white,
          shadow: SHADOW_E1, primary: "AUTO", counter: "FIXED", clip: true
        });
        c.appendChild(photoBox(largeur, Math.round(largeur * 1.2), 0, e[2], C.ink));
        const b = frame("Texte", { dir: "VERTICAL", gap: 2, px: S.md, pt: S.md, pb: S.md });
        b.appendChild(para(e[0], largeur - S.md * 2, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 20 }));
        b.appendChild(para(e[1], largeur - S.md * 2, { size: 12, color: C.sub }));
        addFill(c, b);
        grille.appendChild(c);
      }
      addFill(col, grille);

      barreActions(col, bouton("Voir les commentaires (3)", "primary"), null, null,
        "Rafael et ses amis autorisés voient tes commentaires. Ses abonnés ne les voient pas.");
      finaliser(screen, col);
    });

    // ============ 5. Mes partages ============
    ecran("Partage — Mes partages", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Mes partages", "3 partages actifs"));

      const liste = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(liste, cartePartage("Veste en jean", "Avec Thomas · expire dans 7 jours",
        PIC.jacket, "Actif", "encours"));
      addFill(liste, cartePartage("Mon dressing", "Avec Julie · sans expiration",
        PIC.tshirt, "Actif", "encours"));
      addFill(liste, cartePartage("Perceuse Bosch", "Lien de partage · expire demain",
        PIC.pants, "Expire bientôt", "arendre"));
      addFill(col, liste);

      const sec = frame("Section/Termines", { dir: "VERTICAL", gap: S.md });
      addFill(sec, enteteSection("Terminés", "Tout voir"));
      const l2 = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l2, cartePartage("Manteau d'hiver", "Avec Marc · révoqué le 2 sept.",
        PIC.coat, "Révoqué", "termine"));
      addFill(sec, l2);
      addFill(col, sec);

      finaliser(screen, col);
      poserNav(screen, null);
    });

    // ============ 6. Détail d'un accès ============
    ecran("Partage — Détail d'un accès", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Détail du partage", "Veste en jean"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteElement("Veste en jean", "Levi's · Vestes · L", PIC.jacket, "Actif", "encours"));
      addFill(blocs, carteSection("Ce partage", [
        ligneInfo("Partagé le", "12 sept. 2026"),
        ligneInfo("Expire le", "19 sept. 2026"),
        ligneInfo("Commentaires", "Amis uniquement"),
        ligneInfo("Localisation", "Masquée")
      ]));
      addFill(col, blocs);

      const acces = frame("Section/Acces", { dir: "VERTICAL", gap: S.md });
      addFill(acces, enteteSection("Qui a accès", "3 personnes"));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, rangeeAmi("Thomas", "Ami · commentaires · 3 vues",
        0, text("Révoquer", { font: FONT_LB, size: 12, color: C.error })));
      addFill(l, rangeeAmi("Julie", "Amie · commentaires · aucune vue", 1, null));
      addFill(l, rangeeAmi("Paul", "Abonné · lecture seule · 1 vue", 2, null));
      addFill(acces, l);
      addFill(col, acces);

      barreActions(col,
        bouton("Modifier", "primary"), null,
        "Tout révoquer", null);
      finaliser(screen, col);
    });

    // ============ 7. Accès révoqué ============
    ecran("Partage — Accès révoqué", function (screen) {
      const col = preparer(screen, 40);

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, toastInfo("Accès révoqué", "Thomas ne voit plus cet élément.", C.error));
      addFill(col, zone);

      addFill(col, titrePage("Veste en jean", "Plus aucun partage actif"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteElement("Veste en jean", "Levi's · Vestes · L", PIC.jacket, "Privé", "termine"));
      addFill(blocs, carteSection("Ce qui a été révoqué", [
        ligneInfo("Personne", "Thomas"),
        ligneInfo("Le", "12 sept. 2026"),
        ligneInfo("Lien", "Désactivé")
      ]));
      addFill(blocs, bandeauPrive("Le lien copié ne fonctionne plus, même s'il a été transmis."));
      addFill(col, blocs);

      barreActions(col, bouton("Voir mes partages", "primary"), null, null, null);
      finaliser(screen, col);
    });

    // ============ 8. Commentaires ============
    ecran("Partage — Commentaires", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Commentaires", "Veste en jean · 3 commentaires"));

      const el = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(el, carteElement("Veste en jean", "Partagée avec Thomas et Julie", PIC.jacket, null, null));
      addFill(col, el);

      const fil = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(fil, commentaire("Thomas", 0, "Elle est vraiment très bien, tu la prêterais ?", "il y a 2 h", false));
      addFill(fil, commentaire("Rafael", 0, "Oui, dis-moi quand tu la veux.", "il y a 1 h", true));
      addFill(fil, commentaire("Julie", 1, "Je la trouve parfaite pour la soirée de samedi.", "il y a 20 min", false));
      addFill(col, fil);

      const saisie = frame("Champs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(saisie, champTexte("Ton commentaire", "Écrire un commentaire...", 72));
      addFill(col, saisie);

      barreActions(col, bouton("Publier", "primary"), null, null,
        "Seuls tes amis autorisés voient et écrivent des commentaires. Tes abonnés ne voient jamais cette zone.");
      finaliser(screen, col);
    });

    // ============ 9. État · Aucun partage ============
    ecran("Partage — État · Aucun partage", function (screen) {
      etatVide(screen, "Mes partages", "0 partage actif",
        "Tu ne partages rien",
        "Ta penderie est privée par défaut. Partage un vêtement ou un objet pour qu'un ami puisse le voir.",
        "Partager un élément");
    });

    rapport("Lot 07 Partage");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
