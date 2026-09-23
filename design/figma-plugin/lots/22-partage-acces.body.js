// ============================================================
// Lot 22 — CONFIDENTIALITÉ, PARTAGE, ABONNÉS
// (page "Maquette v2", section 09 PARTAGE PRIVÉ)
//
// Audit du brief avant construction (points 1, 2, 16) :
//   [COUVERT] privé par défaut ; objet -> Partager ; lien + QR ; qui a accès ;
//             révoquer ; aucun partage ; un abonnement seul ne donne rien (lot 20)
//   [PARTIEL] Partager : amis seulement, un réglage de commentaires global
//             -> lot 07 adapté (sections Amis / Abonnés, niveau par personne)
//             Lien de partage, Détail d'un accès, Commentaires, Accès invité
//             -> lot 07 adapté (abonnés en lecture seule, aperçu par profil)
//   [MANQUANT] choisir quoi partager (vêtement, objet, pièce, collection) ;
//             vue abonné en lecture seule ; accès refusé ; lien révoqué ou
//             expiré ; contenu indisponible             -> 5 NOUVEAUX
//             Pièce -> Partager                          -> lot 13 adapté
//
// Règles de partage (identiques pour les collections, lot 23) :
//   AMI AUTORISÉ    : voit l'élément ; commentaires visibles et possibles si autorisés
//   ABONNÉ AUTORISÉ : voit l'élément en lecture seule ; ne voit AUCUN commentaire
//   ABONNEMENT SEUL : aucun accès
//   NON AUTORISÉ    : accès refusé
//
// Les 3 écrans « Invité » sont GÉNÉRIQUES : ils servent aussi aux
// collections partagées (pas de doublon dans le lot 23).
// ============================================================

(async function () {
  try {
    figma.notify("Lot 22 Partage et accès : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");
    await chargerNav();
    await chargerAmis();
    const PIC = await chargerPics();

    const SECTION = "PARTAGE";
    const LIEN = "penderie.app/p/8f3k2a";

    function blocs(col, noeuds) {
      const b = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      for (let i = 0; i < noeuds.length; i++) if (noeuds[i]) addFill(b, noeuds[i]);
      addFill(col, b);
    }

    function tuileChoix(nom, meta, pic, choisi, largeur) {
      const c = frame("Card/Pick/" + nom, {
        dir: "VERTICAL", gap: 0, w: largeur, radius: R.md, fill: C.white,
        shadow: SHADOW_E1, primary: "AUTO", counter: "FIXED", clip: true
      });
      const ph = photoBox(largeur, Math.round(largeur * 0.8), 0, pic, C.ink);
      c.appendChild(ph);
      if (choisi) overlay(ph, statusPill("Choisi", "prete", true), S.sm, S.sm);
      const b = frame("Texte", { dir: "VERTICAL", gap: 2, px: S.md, pt: S.sm, pb: S.md });
      b.appendChild(para(nom, largeur - S.md * 2, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 20 }));
      b.appendChild(para(meta, largeur - S.md * 2, { size: 12, color: C.sub }));
      addFill(c, b);
      return c;
    }

    // ============ 1. Choisir quoi partager ============
    ecranNouveau(SECTION, "Partage — Choisir quoi partager", 0, function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Que veux-tu partager ?", "Un élément à la fois, rien d'autre"));
      const champs = frame("Champs", { dir: "VERTICAL", px: GUT });
      addFill(champs, groupeChips("Type", ["Vêtement", "Objet", "Pièce", "Collection"], ["Pièce"]));
      addFill(col, champs);
      const rech = frame("Recherche", { dir: "VERTICAL", px: GUT });
      addFill(rech, champRecherche("Rechercher une pièce..."));
      addFill(col, rech);

      const largeur = Math.floor((UTIL - S.md) / 2);
      const grille = frame("Grille", { dir: "HORIZONTAL", gap: S.md, gapY: S.md, wrap: true, px: GUT, primary: "FIXED" });
      grille.appendChild(tuileChoix("Garage", "Maison principale · 34 objets", PIC.pants, true, largeur));
      grille.appendChild(tuileChoix("Chambre", "Maison principale · 28 objets", PIC.tshirt, false, largeur));
      grille.appendChild(tuileChoix("Bureau", "Maison principale · 19 objets", PIC.cap, false, largeur));
      grille.appendChild(tuileChoix("Salon", "Studio de Léa · 7 objets", PIC.coat, false, largeur));
      addFill(col, grille);

      blocs(col, [bandeauPrive("Partager une pièce montre les objets qui y sont rangés, sans leur emplacement exact. Les autres pièces restent privées.")]);
      barreActions(col, bouton("Continuer", "primary"), null, null, null);
      finaliser(screen, col);
    });

    // ============ 2. Accès abonné · lecture seule ============
    ecranNouveau(SECTION, "Partage — Accès abonné · Lecture seule", 1, function (screen) {
      const col = preparer(screen, 40, 0);
      const bande = frame("Entete", {
        dir: "VERTICAL", w: W, gap: S.md, px: GUT, pt: 56, pb: S.xl,
        align: "CENTER", primary: "AUTO", counter: "FIXED", fill: C.primary, fillOpacity: 0.06
      });
      bande.appendChild(avatar("Rafael", 0, 72));
      const t = frame("Texte", { dir: "VERTICAL", gap: S.xs, align: "CENTER" });
      t.appendChild(text("Le dressing de Rafael", { font: FONT_T, size: 32, color: C.ink, lineHeight: 38 }));
      t.appendChild(para("2 éléments partagés avec ses abonnés", UTIL, { size: 16, color: C.sub, lineHeight: 22, align: "CENTER" }));
      addFill(bande, t);
      bande.appendChild(pastillesRelation([["Abonné autorisé", "neutre"], ["Lecture seule", "neutre"]]));
      col.appendChild(bande);
      overlay(bande, boutonRetour("<"), GUT, S.xl);

      const largeur = Math.floor((UTIL - S.md) / 2);
      const grille = frame("Grille", { dir: "HORIZONTAL", gap: S.md, gapY: S.md, wrap: true, px: GUT, primary: "FIXED" });
      grille.appendChild(tuileChoix("Veste en jean", "Levi's · L", PIC.jacket, false, largeur));
      grille.appendChild(tuileChoix("Baskets Adidas", "Adidas · 42", PIC.baskets, false, largeur));
      addFill(col, grille);

      blocs(col, [
        carteSection("Ce que tu peux faire", [
          ligneInfo("Voir les éléments partagés", "Oui"),
          ligneInfo("Voir les commentaires", "Non"),
          ligneInfo("Commenter", "Non"),
          ligneInfo("Voir où c'est rangé", "Non")
        ]),
        bandeauPrive("Tu suis Rafael : il a choisi de partager ces 2 éléments avec ses abonnés. Les commentaires sont réservés à ses amis autorisés. Même vue pour une personne qui ouvre le lien sans compte.")
      ]);
      barreActions(col, bouton("Fermer", "secondary"), null, null, null);
      finaliser(screen, col);
    });

    // ============ 3. Invité · accès refusé ============
    ecranNouveau(SECTION, "Partage — Invité · Accès refusé", 2, function (screen) {
      etatAcces(screen, "X", "Accès refusé",
        "Ce contenu est privé. Seules les personnes choisies par son propriétaire peuvent le voir.",
        carteSection("Pourquoi", [
          ligneInfo("Personnes autorisées", "Pas toi"),
          ligneInfo("Tu le suis ?", "Ça ne suffit pas")
        ]),
        "Fermer",
        "Penderie est privée par défaut : ni un abonnement ni un lien transféré ne suffisent.");
    });

    // ============ 4. Invité · lien révoqué ou expiré ============
    ecranNouveau(SECTION, "Partage — Invité · Lien révoqué ou expiré", 3, function (screen) {
      etatAcces(screen, "!", "Ce lien ne fonctionne plus",
        "Il a expiré, ou son propriétaire l'a révoqué. Demande-lui un nouveau lien si besoin.",
        carteSection("Le lien", [
          ligneInfo("Adresse", LIEN),
          ligneInfo("Statut", "Expiré le 19 sept.")
        ]),
        "Fermer", null);
    });

    // ============ 5. Invité · contenu indisponible ============
    ecranNouveau(SECTION, "Partage — Invité · Contenu indisponible", 4, function (screen) {
      etatAcces(screen, "?", "Contenu indisponible",
        "Le lien est valide, mais ce qu'il montrait n'est plus accessible.",
        carteSection("Ce qui a pu se passer", [
          ligneInfo("Supprimé", "L'élément n'existe plus"),
          ligneInfo("Rendu privé", "Il n'est plus partagé"),
          ligneInfo("Vendu", "Il a quitté la penderie")
        ]),
        "Fermer", null);
    });

    rapport("Lot 22 Partage et accès");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
