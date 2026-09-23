// Penderie — renomme la carte de prêt de l'Accueil v2
// « Card/Loan/Ballon » -> « Card/Loan/Ponceuse Makita »
// À coller dans Scripter puis Run. Relançable sans risque.
//
// La carte est cherchée par son NOM dans l'écran « Accueil — Tableau de
// bord » de la page « Maquette v2 » (et non par identifiant, qui peut ne
// pas être trouvé tant que la page n'est pas chargée).

const NOUVEAU = "Card/Loan/Ponceuse Makita";

await figma.loadAllPagesAsync();
const page = figma.root.children.find(p => p.name === "Maquette v2");
if (!page) {
  figma.notify("Page « Maquette v2 » introuvable", { error: true });
} else {
  await page.loadAsync();
  const accueil = page.findOne(n => n.type === "FRAME" && n.name === "Accueil — Tableau de bord");
  if (!accueil) {
    figma.notify("Écran « Accueil — Tableau de bord » introuvable", { error: true });
  } else {
    const deja = accueil.findOne(n => n.name === NOUVEAU);
    const carte = accueil.findOne(n => n.type === "FRAME" && n.name === "Card/Loan/Ballon");
    if (deja && !carte) {
      figma.notify("Déjà renommée : " + NOUVEAU);
    } else if (!carte) {
      figma.notify("Aucun calque « Card/Loan/Ballon » dans l'accueil", { error: true });
    } else {
      carte.name = NOUVEAU;
      figma.notify("Renommée : Card/Loan/Ballon -> " + NOUVEAU);
      // bonus : montrer la carte (sans risque si le changement de page est refusé)
      try {
        if (figma.setCurrentPageAsync) await figma.setCurrentPageAsync(page);
        else figma.currentPage = page;
        page.selection = [carte];
        figma.viewport.scrollAndZoomIntoView([carte]);
      } catch (e) {}
    }
  }
}
