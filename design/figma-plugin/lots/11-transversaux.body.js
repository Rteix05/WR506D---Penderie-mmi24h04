// ============================================================
// Lot 11 — NOTIFICATIONS / RECHERCHE / ÉTATS SYSTÈME
// (page "Maquette v2", section 13)
//
// 14 ecrans refaits : 2 notifications, 3 recherche, 3 etats systeme
// et 6 modales de confirmation. Le noeud frame est conserve a chaque
// fois, donc les reactions de prototype de niveau frame survivent.
//
// Les 6 modales sont ouvertes en OVERLAY par le prototype : leur fond
// est un voile sombre et la carte est centree, pas un ecran de plus.
//
// Libelles cliquables attendus par penderie-prototype.js :
// titres de notification (« Nouvel ami », « Paiement recu », « Rappel de
// retour », « Pret en retard », « Nouveau commentaire », « Partage recu »,
// « Colis expedie », « Objet retourne »), « Regler mes notifications »,
// « Filtres », « Garage », « Perceuse Bosch », « Carton Bricolage »,
// « Etagere 2 », « Veste de pluie », « Thomas », « garage », « tondeuse »,
// « Appliquer », « + Ajouter un objet », « Une erreur est survenue »,
// « Annuler », « Supprimer », « Retirer ».
// ============================================================

(async function () {
  try {
    figma.notify("Lot 11 Transversaux : demarrage...", { timeout: 1500 });
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
      coat:    await comp("39:67")
    };

    const UTIL_CARTE = W - GUT * 2 - S.lg * 2;

    // ---------- briques transversales ----------

    // notif() et modale() sont dans la lib depuis le lot 20 (abonnes).

    // Resultat de recherche : le type est dit par le libelle de section,
    // pas repete sur chaque ligne.
    function resultat(nom, meta, pic) {
      const r = frame("List/Row/" + nom, {
        dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
        px: S.md, py: S.md, align: "CENTER", justify: "SPACE_BETWEEN", shadow: SHADOW_E1
      });
      const g = frame("Gauche", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
      g.appendChild(photoBox(40, 40, R.sm, pic, C.ink));
      const t = frame("Texte", { dir: "VERTICAL", gap: 2 });
      t.appendChild(text(nom, { font: FONT_LB, size: 16, color: C.ink }));
      t.appendChild(para(meta, 200, { size: 12, color: C.sub, lineHeight: 16 }));
      g.appendChild(t);
      r.appendChild(g);
      r.appendChild(text("›", { font: FONT_LB, size: 16, color: C.sub, opacity: 0.85 }));
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return r;
    }

    // Champ de recherche rempli : la requete est un vrai texte, c'est
    // elle que le prototype cible pour rejouer une autre recherche.
    function champRempli(requete) {
      const f = frame("Field/Search", {
        dir: "HORIZONTAL", gap: S.sm, fill: C.white, radius: R.sm,
        px: S.lg, h: 48, counter: "FIXED", align: "CENTER",
        justify: "SPACE_BETWEEN", shadow: SHADOW_E1
      });
      const g = frame("Gauche", { dir: "HORIZONTAL", gap: S.sm, align: "CENTER" });
      g.appendChild(text("o-", { font: FONT_LB, size: 14, color: C.sub, opacity: 0.85 }));
      g.appendChild(text(requete, { size: 16, color: C.ink }));
      f.appendChild(g);
      f.appendChild(text("X", { font: FONT_LB, size: 12, color: C.sub, opacity: 0.85 }));
      return f;
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

    function etatVide(screen, titreEcran, sousTitre, titre, corps, action, avecFAB) {
      const col = preparer(screen, avecFAB ? 110 : 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage(titreEcran, sousTitre));

      const bloc = frame("Empty state", {
        dir: "VERTICAL", gap: S.lg, px: GUT, pt: S.huge, align: "CENTER", justify: "CENTER"
      });
      const rond = frame("Illustration", {
        dir: "VERTICAL", w: 120, h: 120, radius: R.full, fill: C.ink, fillOpacity: 0.04,
        align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED", clip: true
      });
      rond.appendChild(text("o-", { font: FONT_LB, size: 32, color: C.sub, opacity: 0.5 }));
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
      if (avecFAB) poserNav(screen, null);
    }

    // ============ 1. Notifications ============
    ecran("Notifications — Liste", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Notifications", "7 non lues"));

      const act = frame("Filtres", { dir: "HORIZONTAL", px: GUT, justify: "SPACE_BETWEEN", align: "CENTER" });
      act.appendChild(text("Tout marquer comme lu", { font: FONT_LB, size: 12, color: C.primary }));
      act.appendChild(text("Régler mes notifications", { size: 12, color: C.sub }));
      addFill(col, act);

      // Les 4 notifications de relation (lot 20) : les noms suivent les
      // listes Mes abonnes / Mes abonnements, et Julie est celle de
      // l'ecran « Amis — Demande reçue ».
      sectionListe(col, "Aujourd'hui", null, [
        // lot 25 : une demande sociale d'un profil enfant arrive chez le parent
        notif("Demande pour Noé", "Noé a reçu une demande d'ami de Hugo. Elle attend ta décision.",
          "il y a 10 min", "arendre", true),
        notif("Demande d'ami", "Julie t'a envoyé une demande d'ami.",
          "il y a 20 min", "encours", true),
        notif("Nouvel abonné", "Paul s'est abonné à toi.", "il y a 40 min", "arendre", true),
        notif("Prêt en retard", "La tondeuse prêtée à Julie devait revenir le 5 septembre.",
          "il y a 1 h", "retard", true),
        notif("Nouvel ami", "Julie a accepté ta demande.", "il y a 3 h", "encours", true),
        notif("Colis expédié", "Ta Veste en cuir est partie de chez Thomas.",
          "il y a 5 h", "arendre", true),
        notif("Nouveau commentaire", "Thomas a commenté ta Veste en jean partagée.",
          "il y a 6 h", "arendre", true)
      ]);

      sectionListe(col, "Cette semaine", "Tout voir", [
        notif("Abonnement mutuel", "Chloé et toi vous suivez maintenant mutuellement.",
          "hier", "arendre", false),
        notif("Nouvelle abonnée", "Sarah s'est abonnée à toi.", "il y a 2 j", "arendre", false),
        notif("Paiement reçu", "Julie t'a payé 35 € pour les Baskets Adidas.",
          "hier", "encours", false),
        notif("Rappel de retour", "La perceuse prêtée à Thomas revient le 20 septembre.",
          "hier", "arendre", false),
        notif("Partage reçu", "Thomas partage son dressing avec toi.",
          "il y a 2 j", "arendre", false),
        notif("Objet retourné", "Karim t'a rendu la scie sauteuse.", "il y a 3 j", "termine", false)
      ]);

      finaliser(screen, col);
      poserNav(screen, null);
    });

    ecran("Notifications — État · Vide", function (screen) {
      etatVide(screen, "Notifications", "Rien de neuf",
        "Aucune notification",
        "Les retours de prêt, les ventes et les partages de tes amis arrivent ici.",
        "Régler mes notifications", false);
    });

    // ============ 2. Recherche ============
    ecran("Recherche — Résultats", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("Recherche", "7 résultats pour « garage »"));

      const rech = frame("Recherche", { dir: "VERTICAL", px: GUT });
      addFill(rech, champRempli("garage"));
      addFill(col, rech);

      const filtres = frame("Filtres", { dir: "HORIZONTAL", gap: S.sm, px: GUT, align: "CENTER" });
      const chipF = frame("Chip/Sort/Filtres", {
        dir: "HORIZONTAL", gap: S.xs, radius: R.full, px: S.md, h: 32,
        counter: "FIXED", align: "CENTER", fill: C.ink, fillOpacity: 0.05
      });
      chipF.appendChild(text("Filtres", { size: 12, color: C.sub }));
      chipF.appendChild(text("v", { font: FONT_LB, size: 12, color: C.sub, opacity: 0.85 }));
      filtres.appendChild(chipF);
      filtres.appendChild(text("Tout · Objets · Lieux · Vêtements · Amis", { size: 12, color: C.sub, opacity: 0.85 }));
      addFill(col, filtres);

      sectionListe(col, "Lieux", null, [
        resultat("Garage", "Maison principale · 34 objets", null)
      ]);
      sectionListe(col, "Rangements", null, [
        resultat("Étagère 2", "Maison principale › Garage · 12 objets", null),
        resultat("Carton Bricolage", "Garage › Étagère 2 · 8 objets", null)
      ]);
      sectionListe(col, "Objets", "4 résultats", [
        resultat("Perceuse Bosch", "Garage › Étagère 2 › Carton Bricolage", PIC.pants),
        resultat("Veste de pluie", "Garage › Portemanteau", PIC.coat)
      ]);
      sectionListe(col, "Amis", null, [
        rangeeAmi("Thomas", "2 objets rangés dans son garage", 0, null)
      ]);

      finaliser(screen, col);
      poserNav(screen, null);
    });

    ecran("Recherche — Filtres", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Filtres", "Recherche « garage »"));

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, groupeChips("Type",
        ["Tout", "Objets", "Vêtements", "Lieux", "Rangements", "Amis"], ["Tout"]));
      addFill(champs, groupeChips("Statut",
        ["Disponible", "Prêté", "Emprunté", "En vente", "Vendu"], ["Disponible"]));
      addFill(champs, champSelect("Logement", "Tous mes logements"));
      addFill(champs, champSelect("Ajouté", "N'importe quand"));
      addFill(col, champs);

      const actions = frame("Detail/Action bar", { dir: "HORIZONTAL", gap: S.md, px: GUT });
      addFill(actions, bouton("Réinitialiser", "secondary"));
      addFill(actions, bouton("Appliquer", "primary"));
      addFill(col, actions);
      finaliser(screen, col);
    });

    ecran("Recherche — État · Aucun résultat", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Recherche", "Aucun résultat"));

      const rech = frame("Recherche", { dir: "VERTICAL", px: GUT });
      addFill(rech, champRempli("tondeuse"));
      addFill(col, rech);

      const bloc = frame("Empty state", {
        dir: "VERTICAL", gap: S.lg, px: GUT, pt: S.huge, align: "CENTER", justify: "CENTER"
      });
      const rond = frame("Illustration", {
        dir: "VERTICAL", w: 120, h: 120, radius: R.full, fill: C.ink, fillOpacity: 0.04,
        align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED", clip: true
      });
      rond.appendChild(text("o-", { font: FONT_LB, size: 32, color: C.sub, opacity: 0.5 }));
      bloc.appendChild(rond);
      const txt = frame("Texte", { dir: "VERTICAL", gap: S.sm, align: "CENTER" });
      txt.appendChild(para("Rien ne correspond à « tondeuse »", W - GUT * 2,
        { font: FONT_T, size: 24, color: C.ink, lineHeight: 30, align: "CENTER" }));
      txt.appendChild(para("Cet objet n'est peut-être pas encore dans ta penderie, ou il porte un autre nom.",
        W - GUT * 2 - S.xl, { size: 16, color: C.sub, lineHeight: 22, align: "CENTER" }));
      addFill(bloc, txt);
      addFill(col, bloc);

      sectionListe(col, "Essaie plutôt", null, [
        lienRangee("tondeuse", "Chercher chez mes amis", "Chercher"),
        lienRangee("Ajouter « tondeuse »", "Créer l'objet dans ta penderie", "+")
      ]);

      finaliser(screen, col);
    });

    // ============ 3. États système ============
    ecran("Système — Erreur", function (screen) {
      const col = preparer(screen, 40);

      const z = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(z, toastInfo("Une erreur est survenue",
        "Ta dernière action n'a pas été enregistrée.", C.error));
      addFill(col, z);

      addFill(col, titrePage("Ça n'a pas marché", "Rien n'a été perdu"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      const c = card("Card/Section/Info", { gap: S.sm });
      c.appendChild(para("La connexion s'est interrompue pendant l'enregistrement. Tes informations sont conservées : réessaie, tu retrouveras l'écran tel que tu l'avais laissé.",
        UTIL_CARTE, { size: 16, color: C.ink, lineHeight: 22 }));
      addFill(blocs, c);
      addFill(blocs, carteSection("Détail technique", [
        ligneInfo("Code", "NET-503"),
        ligneInfo("Heure", "14 h 02")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Réessayer", "primary"),
        [bouton("Revenir en arrière", "secondary")], null, null);
      finaliser(screen, col);
    });

    // Chargement : des blocs gris a la forme du contenu attendu, pas un
    // sablier — l'ecran suivant ne « saute » pas quand les donnees arrivent.
    ecran("Système — Chargement", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());

      const titre = frame("Titre de page", { dir: "VERTICAL", gap: S.sm, px: GUT });
      const t1 = frame("Squelette", { w: 180, h: 32, radius: R.xs, fill: C.ink, fillOpacity: 0.08, dir: "VERTICAL", primary: "FIXED", counter: "FIXED" });
      const t2 = frame("Squelette", { w: 120, h: 12, radius: R.xs, fill: C.ink, fillOpacity: 0.06, dir: "VERTICAL", primary: "FIXED", counter: "FIXED" });
      titre.appendChild(t1);
      titre.appendChild(t2);
      addFill(col, titre);

      const largeur = Math.floor((W - GUT * 2 - S.md) / 2);
      const grille = frame("Grille", {
        dir: "HORIZONTAL", gap: S.md, gapY: S.md, wrap: true, px: GUT, primary: "FIXED"
      });
      for (let i = 0; i < 6; i++) {
        const c = frame("Loader/Skeleton carte", {
          dir: "VERTICAL", gap: 0, w: largeur, radius: R.md, fill: C.white,
          shadow: SHADOW_E1, primary: "AUTO", counter: "FIXED", clip: true
        });
        c.appendChild(frame("Photo", {
          w: largeur, h: Math.round(largeur * 1.1), fill: C.ink, fillOpacity: 0.06,
          dir: "VERTICAL", primary: "FIXED", counter: "FIXED"
        }));
        const b = frame("Texte", { dir: "VERTICAL", gap: S.sm, px: S.md, pt: S.md, pb: S.md });
        b.appendChild(frame("Squelette", { w: largeur - S.md * 2, h: 12, radius: R.xs, fill: C.ink, fillOpacity: 0.08, dir: "VERTICAL", primary: "FIXED", counter: "FIXED" }));
        b.appendChild(frame("Squelette", { w: Math.round((largeur - S.md * 2) * 0.6), h: 10, radius: R.xs, fill: C.ink, fillOpacity: 0.06, dir: "VERTICAL", primary: "FIXED", counter: "FIXED" }));
        addFill(c, b);
        grille.appendChild(c);
      }
      addFill(col, grille);

      const note = frame("Texte", { dir: "VERTICAL", px: GUT, align: "CENTER" });
      note.appendChild(para("Chargement de ta penderie...", W - GUT * 2,
        { size: 12, color: C.sub, align: "CENTER" }));
      addFill(col, note);

      finaliser(screen, col);
      poserNav(screen, null);
    });

    ecran("Système — Inventaire vide", function (screen) {
      etatVide(screen, "Mes objets", "0 objet",
        "Ta penderie est vide",
        "Ajoute ton premier objet : tu sauras toujours où il est rangé et à qui tu l'as prêté.",
        "+ Ajouter un objet", true);
    });

    // ============ 4. Modales de confirmation ============
    ecran("Système — Confirmation · Supprimer un objet", function (screen) {
      modale(screen, "Supprimer cet objet ?",
        "La Perceuse Bosch, sa photo et son historique de prêts seront définitivement effacés.",
        "Supprimer",
        "Un prêt est en cours : Thomas en sera informé.");
    });

    ecran("Système — Confirmation · Supprimer un vêtement", function (screen) {
      modale(screen, "Supprimer ce vêtement ?",
        "Le T-shirt Nike disparaîtra de ton dressing, avec son historique de port.",
        "Supprimer",
        "Il fait partie de 2 tenues enregistrées, qui seront incomplètes.");
    });

    ecran("Système — Confirmation · Supprimer un carton", function (screen) {
      modale(screen, "Supprimer ce carton ?",
        "Le Carton Bricolage sera effacé, mais pas les objets qu'il contient.",
        "Supprimer",
        "Les 8 objets remonteront dans Garage › Étagère 2.");
    });

    ecran("Système — Confirmation · Supprimer un logement", function (screen) {
      modale(screen, "Supprimer ce logement ?",
        "Maison principale, ses 7 pièces et ses rangements seront effacés.",
        "Supprimer",
        "104 objets perdront leur localisation. Ils resteront dans ton inventaire, sans rangement.");
    });

    ecran("Système — Confirmation · Retirer un ami", function (screen) {
      modale(screen, "Retirer Thomas de tes amis ?",
        "Vous ne verrez plus vos penderies respectives et les partages en cours seront révoqués.",
        "Retirer",
        "2 prêts sont en cours entre vous : ils restent visibles jusqu'à leur retour.");
    });

    ecran("Système — Confirmation · Retirer un partage", function (screen) {
      modale(screen, "Retirer ce partage ?",
        "Thomas ne verra plus la Veste en jean, et le lien copié cessera de fonctionner.",
        "Retirer",
        "Ses 2 commentaires seront conservés, mais lui seul ne les verra plus.");
    });

    rapport("Lot 11 Transversaux");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
