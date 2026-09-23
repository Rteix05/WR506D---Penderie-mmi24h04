// ============================================================
// Lot 19 — RANGER LES ÉCRANS ÉCHAPPÉS  (page « Maquette v2 »)
//
// Une Section Figma capture ses enfants par la géométrie : un écran
// reconstruit qui déborde des limites de sa section en sort tout seul,
// sans erreur ni avertissement. Après une relance complète des lots, on
// retrouve donc des écrans posés à la racine de la page.
//
// Ce script les remet dans la bonne section — déduite du préfixe de leur
// nom — et les repose au bout de la rangée. Il ne modifie aucun contenu.
// À relancer après chaque grosse relance des lots.
// ============================================================

(async function () {
  try {
    figma.notify("Lot 19 Rangement : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");

    // Préfixe de nom d'écran -> numéro de section
    const SECTIONS = {
      "authentification": "01",
      "accueil": "02",
      "objet": "03",
      "logement": "04", "rangement": "04",
      "vêtement": "05", "vetement": "05",
      "tenue": "06",
      "prêt": "07", "pret": "07",
      "amis": "08", "abonnés": "08", "abonnes": "08",
      "partage": "09",
      "vente": "10",
      "paiement": "11", "livraison": "11",
      "compte": "12",
      "notifications": "13", "recherche": "13", "système": "13", "systeme": "13",
      "admin": "14",           // lot 26
      "collection": "15",      // lot 23
      "fil": "16"              // lot 27
    };

    function sectionNumero(nom) {
      const prefixe = norme(String(nom).split("—")[0]);
      return SECTIONS[prefixe] || null;
    }

    const sections = {};
    for (let i = 0; i < PAGE.children.length; i++) {
      const n = PAGE.children[i];
      if (n.type !== "SECTION") continue;
      const m = /^(\d{2})/.exec(n.name.trim());
      if (m) sections[m[1]] = n;
    }

    // Les écrans posés à la racine : tout ce qui est une FRAME au premier
    // niveau de la page (les écrans rangés sont enfants d'une Section).
    const echappes = PAGE.children.filter(function (n) { return n.type === "FRAME"; });

    const ranges = [], orphelins = [];
    for (let i = 0; i < echappes.length; i++) {
      const f = echappes[i];
      const num = sectionNumero(f.name);
      const sec = num ? sections[num] : null;
      if (!sec) { orphelins.push(f.name); continue; }

      // Position : au bout de la rangée, alignée sur les écrans déjà là.
      // On lit les coordonnées des frères pour rester dans leur repère,
      // quel qu'il soit.
      let droite = null, ligne = null;
      const freres = sec.children || [];
      for (let j = 0; j < freres.length; j++) {
        const k = freres[j];
        if (k.type !== "FRAME") continue;
        if (droite == null || k.x + k.width > droite) droite = k.x + k.width;
        if (ligne == null || k.y > ligne) ligne = k.y;
      }

      sec.appendChild(f);
      if (droite != null) { f.x = droite + 50; f.y = ligne; }
      ranges.push(f.name + "  ->  " + sec.name);
    }

    const lignes = ["RANGEMENT DES SECTIONS", ranges.length + " ecran(s) remis en place", ""];
    for (let i = 0; i < ranges.length; i++) lignes.push("OK    " + ranges[i]);
    if (orphelins.length) {
      lignes.push("");
      for (let i = 0; i < orphelins.length; i++) {
        lignes.push("A CLASSER  " + orphelins[i] + " (prefixe inconnu)");
      }
    }
    console.log(lignes.join(String.fromCharCode(10)));
    figma.notify(ranges.length + " ecran(s) remis dans leur section"
      + (orphelins.length ? " · " + orphelins.length + " a classer a la main" : ""),
      { timeout: 8000 });

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
