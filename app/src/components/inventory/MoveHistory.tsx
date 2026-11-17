import { Text, View } from 'react-native';

import { Section } from '@/components/inventory/Detail';
import { shortDate } from '@/lib/loans';
import { MOVE_REASON, movePath, useMoves } from '@/lib/moves';

/**
 * « Où était-ce avant le déménagement ? » (MDD, LocationHistory) : les
 * emplacements quittés par un bien, les plus récents d'abord, pour qui voit
 * où il est rangé. Rien tant qu'il n'a jamais bougé.
 */
export function MoveHistory({ iri, enabled }: { iri: string; enabled: boolean }) {
  const moves = useMoves(iri, enabled);
  const list = moves.data ?? [];
  if (list.length === 0) return null;

  return (
    <Section title="Emplacements précédents" gap="gap-3">
      {list.slice(0, 5).map((m, i) => (
        <View key={`${m.movedAt}-${i}`} className="gap-0.5">
          <Text className="font-luciole-bold text-legend text-ink dark:text-ink-night">{movePath(m)}</Text>
          <Text className="font-luciole text-legend text-muted dark:text-muted-night">
            {`${MOVE_REASON[m.reason]} le ${shortDate(m.movedAt)} · ${m.movedBy}`}
          </Text>
        </View>
      ))}
    </Section>
  );
}
