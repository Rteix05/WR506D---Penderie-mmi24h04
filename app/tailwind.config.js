/**
 * Jetons du design system Penderie v2 (docs/PENDERIE_DS_v2.md), traduits en
 * classes Tailwind utilisables dans l'app via NativeWind : className="bg-bg px-5".
 *
 * Mode sombre : chaque couleur qui change a une variante « night » (section 8
 * du DS). On l'écrit explicitement : className="text-ink dark:text-ink-night".
 * NativeWind suit le réglage clair/sombre du téléphone.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    // Rayons REMPLACÉS (pas étendus) : seules les valeurs du DS existent, un
    // « rounded-3xl » hors charte ne compile pas en style.
    borderRadius: {
      none: '0px',
      xs: '8px', // chips, badges, petits champs
      sm: '12px', // champs de formulaire, boutons secondaires
      md: '16px', // cartes, boutons pleins
      lg: '24px', // photos, tuiles du dressing, modales
      full: '9999px', // avatars, pastilles de statut, FAB
    },
    extend: {
      colors: {
        // Accent unique : CTA principal, onglet actif, « Prêté », liens.
        // Un seul aplat primary par écran. En sombre, le TEXTE rose passe en
        // night (contraste 2.6:1 sinon) ; l'aplat de bouton ne change pas.
        primary: { DEFAULT: '#D31D66', night: '#FF6098' },
        // Titres et texte principal (ink/70 et ink/45 : text-ink/70, text-ink/45).
        ink: { DEFAULT: '#1A1E24', night: '#EDF1F6' },
        // Cartes, feuilles, barres. En sombre, plus claire que le fond :
        // l'élévation passe par la surface, pas par l'ombre.
        surface: { DEFAULT: '#FFFFFF', night: '#1B1F26' },
        // Fond d'écran.
        bg: { DEFAULT: '#F8FAFC', night: '#12151A' },
        // Succès, « Disponible », « En cours ».
        main: { DEFAULT: '#117D6F', night: '#43BBA9', tint: '#EAF6F6' },
        // Dressing, « Emprunté ».
        cloth: { DEFAULT: '#831297', night: '#CE86DE', light: '#E5C5EB' },
        // Erreur, « En retard », « Perdu ».
        error: { DEFAULT: '#DC2626', night: '#FF6B6B' },
        // « Vendu », « Terminé », neutre inactif, texte secondaire.
        muted: { DEFAULT: '#475569', night: '#9BA7B8' },
      },
      // Échelle typographique du DS (section 4). Les polices Typolio (titres)
      // et Luciole (texte) seront chargées dans une feature dédiée.
      fontSize: {
        h1: ['48px', { lineHeight: '52px' }], // splash, onboarding
        h3: ['32px', { lineHeight: '38px' }], // titre d'écran, un seul par écran
        h4: ['24px', { lineHeight: '30px' }], // nom sur une fiche (hero)
        body: ['16px', { lineHeight: '22px' }], // texte courant, titres de carte en bold
        legend: ['12px', { lineHeight: '16px' }], // badges, onglets, métadonnées
      },
      // Espacement : l'échelle native de Tailwind est déjà en pas de 4 px
      // (p-1 = 4, p-2 = 8, p-3 = 12, p-4 = 16, p-5 = 20, p-6 = 24, p-8 = 32,
      // p-10 = 40, p-14 = 56) : elle couvre exactement l'échelle du DS.
      // Gouttière d'écran = px-5 ; entre sections = gap-8 ; grille = gap-3.
    },
  },
  plugins: [],
};
