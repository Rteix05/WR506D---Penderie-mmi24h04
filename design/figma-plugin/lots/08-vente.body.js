// ============================================================
// Lot 08 — VENTE  (page "Maquette v2", section 10)
//
// 11 ecrans refaits (6 du parcours + 5 etats de commande).
// Le noeud frame est conserve a chaque fois, donc les reactions de
// prototype de niveau frame survivent.
//
// Libelles cliquables attendus par penderie-prototype.js :
// « Publier », « Modifier », « Retirer », « Supprimer ce vetement »,
// « Veste en cuir », « Vendu », « Acheter · 45 € », « Payer 50 € »,
// « Carte se terminant par 4242 », « Colissimo · 5 € »,
// « Validation de ta banque en cours… », « Reessayer ».
// Le prix de reference est 45 € + 5 € de livraison = 50 €.
// ============================================================

(async function () {
  try {
    figma.notify("Lot 08 Vente : demarrage...", { timeout: 1500 });
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
      coat:    await comp("39:67"),
      pants:   await comp("39:82"),
      baskets: await comp("52:2013"),
      cap:     await comp("39:109")
    };

    const UTIL_CARTE = W - GUT * 2 - S.lg * 2;

    // ---------- briques propres a la vente ----------

    // Le prix est l'information decisive d'une annonce : il est traite
    // comme un titre, pas comme une ligne de detail.
    function champValeur(label, valeur, aide) {
      const b = frame("Field/Text/" + label, { dir: "VERTICAL", gap: S.xs });
      b.appendChild(text(label, { font: FONT_LB, size: 12, color: C.sub }));
      const f = frame("Champ", {
        dir: "HORIZONTAL", fill: C.white, radius: R.sm, px: S.lg, h: 64,
        counter: "FIXED", align: "CENTER", justify: "SPACE_BETWEEN", shadow: SHADOW_E1
      });
      f.appendChild(text(valeur, { font: FONT_T, size: 32, color: C.ink, lineHeight: 38 }));
      if (aide) f.appendChild(text(aide, { size: 12, color: C.sub }));
      addFill(b, f);
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

    // Carte d'annonce : photo dominante, prix lisible sur la photo,
    // vendeur en petit. C'est ce qui la distingue de la carte objet.
    function carteArticle(a, largeur) {
      const nom = a[0], prix = a[1], vendeur = a[2], pic = a[3], pastille = a[4], tone = a[5];
      const c = frame("Card/Listing/" + nom, {
        dir: "VERTICAL", gap: 0, w: largeur, radius: R.md, fill: C.white,
        shadow: SHADOW_E1, primary: "AUTO", counter: "FIXED", clip: true
      });
      const ph = photoBox(largeur, Math.round(largeur * 1.15), 0, pic, C.ink);
      c.appendChild(ph);
      if (pastille) overlay(ph, statusPill(pastille, tone, true), S.sm, S.sm);

      const util = largeur - S.md * 2;
      const b = frame("Texte", { dir: "VERTICAL", gap: S.xs, px: S.md, pt: S.md, pb: S.md });
      b.appendChild(para(nom, util, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 20 }));
      b.appendChild(text(prix, { font: FONT_LB, size: 16, color: C.primary }));
      const v = frame("Vendeur", { dir: "HORIZONTAL", gap: S.xs, align: "CENTER" });
      v.appendChild(avatar(vendeur, nom.length % 3, 20));
      v.appendChild(text(vendeur, { size: 12, color: C.sub }));
      b.appendChild(v);
      addFill(c, b);
      return c;
    }

    function grille2(items) {
      const largeur = Math.floor((W - GUT * 2 - S.md) / 2);
      const g = frame("Grille", {
        dir: "HORIZONTAL", gap: S.md, gapY: S.md, wrap: true, px: GUT, primary: "FIXED"
      });
      for (let i = 0; i < items.length; i++) g.appendChild(carteArticle(items[i], largeur));
      return g;
    }

    function ligneVendeur(nom, i, meta) {
      const r = frame("Seller/Row", {
        dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
        px: S.md, py: S.md, align: "CENTER", justify: "SPACE_BETWEEN", shadow: SHADOW_E1
      });
      const g = frame("Gauche", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
      g.appendChild(avatar(nom, i, 48));
      const t = frame("Texte", { dir: "VERTICAL", gap: 2 });
      t.appendChild(text(nom, { font: FONT_LB, size: 16, color: C.ink }));
      t.appendChild(text(meta, { size: 12, color: C.sub }));
      g.appendChild(t);
      r.appendChild(g);
      r.appendChild(text("Voir le profil", { font: FONT_LB, size: 12, color: C.primary }));
      try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      return r;
    }

    // Total d'une commande : la derniere ligne est la seule en gras,
    // sinon l'oeil ne sait pas quel montant est le montant du.
    function carteTotal(lignes, total) {
      const c = card("Checkout/Line", { gap: S.md });
      c.appendChild(text("Total", { font: FONT_LB, size: 12, color: C.sub }));
      for (let i = 0; i < lignes.length; i++) {
        const l = frame("Ligne", { dir: "HORIZONTAL", justify: "SPACE_BETWEEN", align: "CENTER" });
        l.appendChild(text(lignes[i][0], { size: 16, color: C.sub }));
        l.appendChild(text(lignes[i][1], { size: 16, color: C.ink }));
        addFill(c, l);
      }
      const sep = figma.createRectangle();
      sep.name = "Separateur";
      sep.resize(UTIL_CARTE, 1);
      sep.fills = solid(C.ink, 0.08);
      c.appendChild(sep);
      const t = frame("Ligne", { dir: "HORIZONTAL", justify: "SPACE_BETWEEN", align: "CENTER" });
      t.appendChild(text("À payer", { font: FONT_LB, size: 16, color: C.ink }));
      t.appendChild(text(total, { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
      addFill(c, t);
      return c;
    }

    function lienDestructif(col, label) {
      const d = frame("Destructif", { dir: "HORIZONTAL", justify: "CENTER", px: GUT });
      d.appendChild(text(label, { font: FONT_LB, size: 12, color: C.error }));
      addFill(col, d);
      return d;
    }

    // Ecran d'etat de commande : meme gabarit pour les cinq, seuls le
    // ton, le message et l'action changent.
    function ecranStatut(screen, o) {
      const col = preparer(screen, 40);

      if (o.toast) {
        const z = frame("Blocs", { dir: "VERTICAL", px: GUT });
        addFill(z, o.ton === "erreur"
          ? toastInfo(o.toast, o.toastCorps, C.error)
          : toastSucces(o.toast, o.toastCorps));
        addFill(col, z);
      }
      addFill(col, titrePage(o.titre, o.sous));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteElement(o.article, o.articleMeta, o.pic, o.pastille, o.tone));
      if (o.lignes) addFill(blocs, carteSection(o.sectionTitre || "La commande", o.lignes));
      if (o.note) {
        const n = card("Card/Section/Info", { gap: S.sm });
        n.appendChild(para(o.note, UTIL_CARTE, { size: 16, color: C.sub, lineHeight: 22 }));
        addFill(blocs, n);
      }
      addFill(col, blocs);

      barreActions(col, bouton(o.primaire, "primary"),
        o.secondaire ? [bouton(o.secondaire, "secondary")] : null,
        o.destructif || null, o.piedNote || null);
      finaliser(screen, col);
    }

    // ---------- donnees de reference ----------
    const ART = "Veste en cuir";
    const VENDEUR = "Thomas";

    // ============ 1. Informations (vendeur) ============
    ecran("Vente — Informations", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Mettre en vente", "T-shirt Nike"));

      const el = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(el, carteElement("T-shirt Nike", "Nike · Hauts · M · Très bon état", PIC.tshirt, null, null));
      addFill(col, el);

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champValeur("Prix de vente", "20 €", "Neuf : 35 €"));
      addFill(champs, champSelect("État", "Très bon état"));
      addFill(champs, champTexte("Description",
        "Porté quelques fois, aucun accroc. Coupe droite, taille M.", 88));
      addFill(champs, champSelect("Visible par", "Mes amis uniquement"));
      addFill(col, champs);

      const liv = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(liv, ligneToggle("Remise en main propre", "Gratuit, chez toi ou chez l'acheteur", true));
      addFill(liv, ligneToggle("Envoi Colissimo", "5 € à la charge de l'acheteur", true));
      addFill(col, liv);

      barreActions(col, bouton("Publier", "primary"), null, null,
        "Seuls tes amis voient tes annonces. Rien n'est public.");
      finaliser(screen, col);
    });

    // ============ 2. Annonce publiée ============
    ecran("Vente — Annonce publiée", function (screen) {
      const col = preparer(screen, 40);

      const z = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(z, toastSucces("Annonce publiée !", "Tes 12 amis peuvent la voir."));
      addFill(col, z);

      addFill(col, titrePage("T-shirt Nike", "En vente · 20 €"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteElement("T-shirt Nike", "Nike · Hauts · M", PIC.tshirt, "En vente", "vente"));
      addFill(blocs, carteSection("Ton annonce", [
        ligneInfo("Prix", "20 €"),
        ligneInfo("Livraison", "Colissimo · 5 €"),
        ligneInfo("Visible par", "Mes amis"),
        ligneInfo("Publiée le", "12 sept. 2026")
      ]));
      addFill(blocs, carteSection("Depuis la publication", [
        ligneInfo("Vues", "4"),
        ligneInfo("Questions", "1")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Modifier", "primary"),
        [bouton("Partager l'annonce", "secondary")],
        "Retirer", null);
      lienDestructif(col, "Supprimer ce vêtement");
      finaliser(screen, col);
    });

    // ============ 3. À vendre chez mes amis (acheteur) ============
    ecran("Vente — À vendre chez mes amis", function (screen) {
      const col = preparer(screen, 110);
      addFill(col, barreRetour());
      addFill(col, titrePage("À vendre chez mes amis", "8 annonces · 3 nouvelles"));

      const rech = frame("Recherche", { dir: "VERTICAL", px: GUT });
      addFill(rech, champRecherche("Rechercher un article..."));
      addFill(col, rech);

      addFill(col, rangeeChips(["Tout", "Vêtements", "Objets", "Moins de 20 €"], 0));

      addFill(col, grille2([
        [ART, "45 €", VENDEUR, PIC.jacket, null, null],
        ["Console", "90 €", "Karim", PIC.baskets, null, null],
        ["Baskets Adidas", "35 €", "Julie", PIC.baskets, "Vendu", "vendu"],
        ["Lampe de bureau", "15 €", "Marc", PIC.pants, null, null]
      ]));

      finaliser(screen, col);
      poserNav(screen, null);
    });

    // ============ 4. Fiche article (acheteur) ============
    ecran("Vente — Fiche article", function (screen) {
      const col = preparer(screen, 40, 0);

      const hero = frame("Detail/Hero photo", {
        dir: "VERTICAL", w: W, h: 320, primary: "FIXED", counter: "FIXED",
        fill: C.ink, fillOpacity: 0.04, align: "CENTER", justify: "CENTER", clip: true
      });
      if (PIC.jacket) {
        try {
          const inst = PIC.jacket.createInstance();
          inst.rescale(200 / Math.max(inst.width, inst.height));
          nettoieVignette(inst);
          hero.appendChild(inst);
        } catch (e) {}
      }
      col.appendChild(hero);
      overlay(hero, boutonRetour("X"), GUT, S.xl);
      overlay(hero, statusPill("En vente", "vente", true), W - 110, S.xl);

      const tete = frame("Titre", { dir: "VERTICAL", gap: S.sm, px: GUT });
      const ligne = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER", justify: "SPACE_BETWEEN" });
      const g = frame("Gauche", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text(ART, { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
      g.appendChild(text("Zara · Vestes · L", { size: 12, color: C.sub }));
      ligne.appendChild(g);
      ligne.appendChild(text("45 €", { font: FONT_T, size: 32, color: C.primary, lineHeight: 38 }));
      addFill(tete, ligne);
      addFill(col, tete);

      const attrs = frame("Attributs", {
        dir: "HORIZONTAL", gap: S.sm, gapY: S.sm, wrap: true, px: GUT, primary: "FIXED"
      });
      const liste = ["Taille L", "Cuir", "Noir", "Très bon état"];
      for (let i = 0; i < liste.length; i++) {
        const a = frame("Garment/Attribute/" + liste[i], {
          dir: "HORIZONTAL", radius: R.full, px: S.md, h: 32,
          counter: "FIXED", align: "CENTER", fill: C.white, shadow: SHADOW_E1
        });
        a.appendChild(text(liste[i], { font: FONT_LB, size: 12, color: C.ink }));
        attrs.appendChild(a);
      }
      addFill(col, attrs);

      const vend = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(vend, ligneVendeur(VENDEUR, 0, "Ami depuis mars 2026 · 3 ventes"));
      addFill(col, vend);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      const desc = card("Card/Section/Description", { gap: S.sm });
      desc.appendChild(text("Description", { font: FONT_LB, size: 12, color: C.sub }));
      desc.appendChild(para("Achetée l'an dernier, portée une dizaine de fois. Doublure intacte, fermeture éclair d'origine.",
        UTIL_CARTE, { size: 16, color: C.ink, lineHeight: 22 }));
      addFill(blocs, desc);
      addFill(blocs, carteSection("Livraison", [
        ligneInfo("Colissimo", "5 €"),
        ligneInfo("Main propre", "Gratuit")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Acheter · 45 €", "primary"),
        [bouton("Poser une question", "secondary")], null,
        "L'argent n'est versé à Thomas qu'une fois l'article reçu.");
      finaliser(screen, col);
    });

    // ============ 5. Confirmation d'achat ============
    ecran("Vente — Confirmation d'achat", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Confirmer l'achat", ART + " · " + VENDEUR));

      const el = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(el, carteElement(ART, "Zara · Vestes · L · Très bon état", PIC.jacket, "45 €", "vente"));
      addFill(col, el);

      const choix = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(choix, lienRangee("Colissimo · 5 €", "Livré sous 3 jours ouvrés", "Modifier"));
      addFill(choix, lienRangee("Carte se terminant par 4242", "Visa · expire 08/28", "Modifier"));
      addFill(col, choix);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteTotal([["Article", "45 €"], ["Livraison", "5 €"]], "50 €"));
      addFill(col, blocs);

      barreActions(col, bouton("Payer 50 €", "primary"), null, null,
        "Tu peux annuler tant que Thomas n'a pas expédié l'article.");
      finaliser(screen, col);
    });

    // ============ 6. Achat confirmé ============
    ecran("Vente — Achat confirmé", function (screen) {
      const col = preparer(screen, 40);

      const z = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(z, toastSucces("Achat confirmé !", "Thomas a été prévenu."));
      addFill(col, z);

      addFill(col, titrePage(ART, "Commande #PND-2481"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteElement(ART, "Acheté à Thomas · 50 € payés", PIC.jacket, "Commande en cours", "encours"));
      addFill(blocs, carteSection("Ce qui se passe ensuite", [
        ligneInfo("Expédition", "Sous 2 jours"),
        ligneInfo("Livraison estimée", "17 sept. 2026"),
        ligneInfo("Versement à Thomas", "À la réception")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Suivre", "primary"),
        [bouton("Voir mes achats", "secondary")], null, null);
      finaliser(screen, col);
    });

    // ============ 7 à 11. États ============
    ecran("Vente — État · Vendu", function (screen) {
      ecranStatut(screen, {
        titre: "Baskets Adidas", sous: "Vendues le 10 septembre",
        article: "Baskets Adidas", articleMeta: "Vendues à Julie · 35 €",
        pic: PIC.baskets, pastille: "Vendu", tone: "vendu",
        sectionTitre: "La vente",
        lignes: [ligneInfo("Prix", "35 €"), ligneInfo("Acheteuse", "Julie"),
                 ligneInfo("Versement", "Reçu le 12 sept.")],
        primaire: "Voir mes ventes", secondaire: "Contacter Julie"
      });
    });

    ecran("Vente — État · Retiré", function (screen) {
      ecranStatut(screen, {
        titre: "T-shirt Nike", sous: "Annonce retirée",
        article: "T-shirt Nike", articleMeta: "Nike · Hauts · M",
        pic: PIC.tshirt, pastille: "Retiré", tone: "termine",
        sectionTitre: "L'annonce retirée",
        lignes: [ligneInfo("Prix affiché", "20 €"), ligneInfo("Vues", "4"),
                 ligneInfo("Retirée le", "12 sept. 2026")],
        note: "Le vêtement est revenu dans ton dressing, personne ne le voit plus.",
        primaire: "Remettre en vente", secondaire: "Voir le vêtement"
      });
    });

    ecran("Vente — État · Paiement en attente", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, titrePage("Paiement en cours", "Commande #PND-2481"));

      const bloc = frame("Empty state", {
        dir: "VERTICAL", gap: S.lg, px: GUT, pt: S.huge, align: "CENTER", justify: "CENTER"
      });
      const rond = frame("Loader", {
        dir: "VERTICAL", w: 96, h: 96, radius: R.full, fill: C.primary, fillOpacity: 0.12,
        align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED"
      });
      rond.appendChild(text("50 €", { font: FONT_LB, size: 16, color: C.primary }));
      bloc.appendChild(rond);

      const txt = frame("Texte", { dir: "VERTICAL", gap: S.sm, align: "CENTER" });
      txt.appendChild(para("Validation de ta banque en cours…", W - GUT * 2,
        { font: FONT_T, size: 24, color: C.ink, lineHeight: 30, align: "CENTER" }));
      txt.appendChild(para("Ne ferme pas l'application. Ça prend quelques secondes.",
        W - GUT * 2 - S.xl, { size: 16, color: C.sub, lineHeight: 22, align: "CENTER" }));
      addFill(bloc, txt);
      addFill(col, bloc);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteElement(ART, "Acheté à Thomas", PIC.jacket, "En attente", "arendre"));
      addFill(blocs, carteTotal([["Article", "45 €"], ["Livraison", "5 €"]], "50 €"));
      addFill(col, blocs);

      finaliser(screen, col);
    });

    ecran("Vente — État · Commande terminée", function (screen) {
      ecranStatut(screen, {
        toast: "Commande terminée !", toastCorps: "Thomas a reçu les 45 €.",
        titre: ART, sous: "Commande #PND-2481 · terminée",
        article: ART, articleMeta: "Reçu le 17 sept. · 50 € payés",
        pic: PIC.jacket, pastille: "Terminée", tone: "termine",
        lignes: [ligneInfo("Vendeur", "Thomas"), ligneInfo("Reçu le", "17 sept. 2026"),
                 ligneInfo("Versement", "Effectué")],
        primaire: "Voir mes achats", secondaire: "Noter Thomas"
      });
    });

    ecran("Vente — État · Paiement refusé", function (screen) {
      ecranStatut(screen, {
        ton: "erreur", toast: "Paiement refusé",
        toastCorps: "Ta banque a refusé l'opération.",
        titre: "Paiement refusé", sous: "Commande #PND-2481 · rien n'a été débité",
        article: ART, articleMeta: "Acheté à Thomas · 50 €",
        pic: PIC.jacket, pastille: "Refusé", tone: "retard",
        sectionTitre: "Ce qui s'est passé",
        lignes: [ligneInfo("Moyen", "Carte ···· 4242"), ligneInfo("Montant", "50 €"),
                 ligneInfo("Motif", "Refus banque")],
        note: "L'article reste réservé pendant 30 minutes, le temps de réessayer.",
        primaire: "Réessayer", secondaire: "Changer de carte"
      });
    });

    rapport("Lot 08 Vente");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
