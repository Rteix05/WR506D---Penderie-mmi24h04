import { Text, View } from 'react-native';

const TONE = {
  success: { box: 'bg-main-tint dark:bg-main-night/15', dot: 'bg-main', glyph: 'v' },
  error: { box: 'bg-error/10 dark:bg-error-night/15', dot: 'bg-error', glyph: 'i' },
  // Information neutre (« Pré-rempli par le scan ») : la teinte de l'accent.
  info: { box: 'bg-primary/[0.08]', dot: 'bg-primary', glyph: 'i' },
} as const;

/**
 * Bandeau de la maquette (« Objet ajouté ! », « Impossible d'identifier cet
 * objet ») : fond teinté, rayon 16, pastille ronde avec « v » ou « i »,
 * titre Luciole Bold 16 et ligne Luciole 12. Annoncé au lecteur d'écran.
 */
export function Banner({ tone, title, text }: { tone: keyof typeof TONE; title: string; text?: string }) {
  const t = TONE[tone];

  return (
    <View accessibilityRole="alert" className={`mx-5 flex-row items-center gap-3 rounded-md px-4 py-3 ${t.box}`}>
      <View className={`h-8 w-8 items-center justify-center rounded-full ${t.dot}`}>
        <Text className="font-luciole-bold text-legend text-white">{t.glyph}</Text>
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{title}</Text>
        {text && <Text className="font-luciole text-legend text-ink/70 dark:text-ink-night/70">{text}</Text>}
      </View>
    </View>
  );
}

/** Pastille de statut (« Disponible », « Sûr à 92 % ») : fond teinté, texte Luciole Bold 12. */
export function Pill({ label, tone = 'main' }: { label: string; tone?: 'main' | 'primary' }) {
  return (
    <View className={`rounded-full px-2 py-1 ${tone === 'main' ? 'bg-main-tint dark:bg-main-night/15' : 'bg-primary/[0.12]'}`}>
      <Text className={`font-luciole-bold text-legend ${tone === 'main' ? 'text-[#10786B] dark:text-main-night' : 'text-primary dark:text-primary-night'}`}>{label}</Text>
    </View>
  );
}
