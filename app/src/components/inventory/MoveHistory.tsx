import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Section } from '@/components/inventory/Detail';
import { shortDate } from '@/lib/loans';
import { movePath, moveReason, useMoves } from '@/lib/moves';

/**
 * « Où était-ce avant le déménagement ? » (MDD, LocationHistory) : les
 * emplacements quittés par un bien, les plus récents d'abord, pour qui voit
 * où il est rangé. Rien tant qu'il n'a jamais bougé.
 */
export function MoveHistory({ iri, enabled }: { iri: string; enabled: boolean }) {
  const { t } = useTranslation('inventory');
  const moves = useMoves(iri, enabled);
  const list = moves.data ?? [];
  if (list.length === 0) return null;

  return (
    <Section title={t('history.previous')} gap="gap-3">
      {list.slice(0, 5).map((m, i) => (
        <View key={`${m.movedAt}-${i}`} className="gap-0.5">
          <Text className="font-luciole-bold text-legend text-ink dark:text-ink-night">{movePath(m)}</Text>
          <Text className="font-luciole text-legend text-muted dark:text-muted-night">
            {t('history.line', { reason: moveReason(m.reason), date: shortDate(m.movedAt), by: m.movedBy })}
          </Text>
        </View>
      ))}
    </Section>
  );
}
