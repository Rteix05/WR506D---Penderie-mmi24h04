import { Text, View } from 'react-native';

import { E1 } from '@/components/ui/elevation';

/**
 * Carte d'information (lib Figma : carteSection + ligneInfo) : titre
 * Luciole Bold 12 gris, puis des lignes « libellé (12) … valeur (Bold 16) ».
 * Les lignes sans valeur ne s'affichent pas.
 */
export function InfoCard({ title, rows }: { title: string; rows: [string, string | null | undefined][] }) {
  return (
    <View style={E1} className="mx-5 gap-3 rounded-md bg-surface p-4 dark:bg-surface-night">
      <Text className="font-luciole-bold text-legend text-muted dark:text-muted-night">{title}</Text>
      {rows
        .filter((row): row is [string, string] => Boolean(row[1]))
        .map(([label, value]) => (
          <View key={label} className="flex-row items-center justify-between gap-3">
            <Text className="font-luciole text-legend text-muted dark:text-muted-night">{label}</Text>
            <Text numberOfLines={2} className="flex-1 text-right font-luciole-bold text-body text-ink dark:text-ink-night">
              {value}
            </Text>
          </View>
        ))}
    </View>
  );
}

/** Carte « Emplacement choisi » / « Localisation » : titre gris, chemin en Luciole Bold 16. */
export function PathCard({ title, path }: { title: string; path: string }) {
  return (
    <View style={E1} className="mx-5 gap-1 rounded-md bg-surface p-4 dark:bg-surface-night">
      <Text className="font-luciole-bold text-legend text-muted dark:text-muted-night">{title}</Text>
      <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{path}</Text>
    </View>
  );
}
