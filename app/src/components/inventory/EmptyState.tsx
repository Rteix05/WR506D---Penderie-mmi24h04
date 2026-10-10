import { Text, View } from 'react-native';

import { ClothVisual } from '@/components/home/ClothVisual';
import { Button } from '@/components/ui/Button';
import { Heading } from '@/components/ui/Heading';

/**
 * État vide d'une liste (Figma « Système — Inventaire vide », 135:6477, et
 * « Vêtement — État · Aucun résultat », 135:3793) : rond de 120 encre 5 %
 * avec la loupe « o- » ou le cintre, titre h4 centré, texte, un bouton.
 */
export function EmptyState({ icon, title, text, action }: { icon: 'search' | 'hanger'; title: string; text: string; action?: { label: string; glyph?: string; onPress: () => void } }) {
  return (
    <View className="items-center gap-4 px-5 pt-8">
      <View accessible={false} className="h-[120px] w-[120px] items-center justify-center rounded-full bg-ink/[0.05] dark:bg-ink-night/[0.08]">
        {icon === 'search' ? <Text className="font-luciole-bold text-[28px] text-muted/[0.6] dark:text-muted-night">o-</Text> : <ClothVisual kind="cintre" scale={1.6} />}
      </View>
      <Heading level="h4" accessibilityRole="header" className="text-center uppercase text-ink dark:text-ink-night">
        {title}
      </Heading>
      <Text className="text-center font-luciole text-body text-muted dark:text-muted-night">{text}</Text>
      {action && (
        <View className="self-center">
          <Button label={action.label} glyph={action.glyph} onPress={action.onPress} />
        </View>
      )}
    </View>
  );
}
