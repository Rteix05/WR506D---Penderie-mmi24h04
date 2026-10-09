/**
 * Élévations du DS v2 (§5), valeurs de la lib Figma
 * (design/figma-plugin/penderie-ui-v2-lib.js : SHADOW_E1, SHADOW_E2).
 * boxShadow est un style natif depuis React Native 0.76 : même rendu sur
 * iOS, Android et web, sans les props shadow* propres à iOS.
 *
 * Les cartes, champs et boutons secondaires se détachent du fond par e-1,
 * jamais par une bordure (règle de bordure du DS §1).
 */
export const E1 = { boxShadow: '0px 1px 3px rgba(26, 30, 36, 0.06)' };
export const E2 = { boxShadow: '0px 4px 14px rgba(26, 30, 36, 0.10)' };
