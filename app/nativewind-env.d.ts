// Ajoute la prop className aux composants React Native pour TypeScript.
/// <reference types="nativewind/types" />

// Autorise « import '../global.css' » : TypeScript 6 vérifie les imports à
// effet de bord, et ce fichier n'est lu que par Metro, pas par TypeScript.
declare module '*.css';
