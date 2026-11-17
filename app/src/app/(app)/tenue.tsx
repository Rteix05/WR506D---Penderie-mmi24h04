import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import type { TFunction } from 'i18next';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClothVisual } from '@/components/home/ClothVisual';
import { EmptyState } from '@/components/inventory/EmptyState';
import { BackButton } from '@/components/ui/BackButton';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { ApiError, mediaSource } from '@/lib/api';
import {
  OCCASIONS,
  acceptOutfit,
  nextOutfit,
  pieceArt,
  suggestOutfit,
  swapPiece,
  useCurrentOutfit,
  type Occasion,
  type OutfitPiece,
  type OutfitSuggestion,
  type Reason,
} from '@/lib/outfit';

/**
 * « Ta tenue » (maquette suggestion-v2) : la tenue proposée pour
 * l'occasion choisie, d'après la météo du jour, les goûts et ce qui a été
 * porté récemment ; l'IA choisit parmi les meilleures tenues des règles.
 *
 * « Pourquoi cette tenue » met en phrases les raisons renvoyées par l'API.
 * Chaque pièce se remplace, ou s'écarte (« Je n'aime pas ») des prochaines
 * suggestions ; « J'aime cette tenue » l'ajoute au dressing ; « Nouvelle
 * tenue » en propose une autre.
 */
export default function OutfitScreen() {
  const { t } = useTranslation('outfit');
  const queryClient = useQueryClient();
  const current = useCurrentOutfit();
  const [occasion, setOccasion] = useState<Occasion>('EVERYDAY');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const run = async (what: string, action: () => Promise<unknown>) => {
    setBusy(what);
    setError(null);
    try {
      await action();
    } catch (e) {
      // 422 au premier essai : le dressing ne permet aucune tenue (ni haut + bas, ni robe).
      if (e instanceof ApiError && e.status === 422 && what === 'suggest') setEmpty(true);
      else setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const s = current.data;

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-6 pb-12 pt-5">
        <View className="flex-row px-5">
          <BackButton close />
        </View>

        <View className="px-5">
          <ScreenTitle title={t('title')} legend={s ? legend(t, s) : t('legend')} />
        </View>

        {error && <Banner tone="error" title={t('error')} text={error} />}

        {current.isPending && <ActivityIndicator className="pt-8" />}

        {saved && (
          <View className="gap-4">
            <Banner tone="success" title={t('saved.title')} text={t('saved.text', { name: saved })} />
            <View className="px-5">
              <Button label={t('saved.close')} variant="secondary" onPress={() => router.back()} />
            </View>
          </View>
        )}

        {!saved && current.data === null && busy !== 'suggest' && !empty && (
          <Picker
            occasion={occasion}
            onChange={setOccasion}
            onSuggest={() => run('suggest', () => suggestOutfit(queryClient, occasion))}
          />
        )}

        {empty && (
          <EmptyState
            icon="hanger"
            title={t('empty.title')}
            text={t('empty.text')}
            action={{ label: t('empty.action'), glyph: '+', onPress: () => router.replace('/ajout/vetement/type') }}
          />
        )}

        {(busy === 'suggest' || busy === 'next') && <Composing />}

        {!saved && s && busy !== 'suggest' && busy !== 'next' && (
          <Outfit
            s={s}
            busy={busy}
            onSwap={(piece, dislike) => run(`${dislike ? 'dislike' : 'swap'}:${piece.id}`, () => swapPiece(queryClient, s.id, piece.id, dislike))}
            onAccept={() => run('accept', async () => setSaved((await acceptOutfit(queryClient, s.id)).name))}
            onNext={() => run('next', () => nextOutfit(queryClient, s.id))}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** « Travail · 12 °C, nuageux » */
function legend(t: TFunction<'outfit'>, s: OutfitSuggestion): string {
  const parts = [t(`occasion.${s.occasion}`)];
  if (s.forecast) parts.push(t('weatherLine', { temperature: s.forecast.temperature, weather: t(`weather.${s.forecast.weather}`) }));

  return parts.join(' · ');
}

/** Avant la première tenue : pour quelle occasion ? */
function Picker({ occasion, onChange, onSuggest }: { occasion: Occasion; onChange: (o: Occasion) => void; onSuggest: () => void }) {
  const { t } = useTranslation('outfit');

  return (
    <View className="gap-4 px-5">
      <Text accessibilityRole="header" className="font-luciole-bold text-body text-ink dark:text-ink-night">
        {t('picker.question')}
      </Text>
      <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-3">
        {OCCASIONS.map((o) => {
          const on = o === occasion;

          return (
            <Pressable
              key={o}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => onChange(o)}
              style={on ? undefined : E1}
              className={`min-h-[56px] w-[47%] justify-center rounded-md px-4 py-3 active:opacity-80 ${on ? 'bg-primary' : 'bg-surface dark:bg-surface-night'}`}>
              <Text className={`font-luciole-bold text-body ${on ? 'text-white' : 'text-ink dark:text-ink-night'}`}>{t(`occasion.${o}`)}</Text>
              <Text className={`font-luciole text-legend ${on ? 'text-white/85' : 'text-muted dark:text-muted-night'}`}>{t(`picker.hint.${o}`)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Button label={t('picker.go')} onPress={onSuggest} />
      <Text className="text-center font-luciole text-legend text-muted dark:text-muted-night">{t('picker.note')}</Text>
    </View>
  );
}

/** Pendant la composition : la météo, les règles, puis l'IA (quelques secondes). */
function Composing() {
  const { t } = useTranslation('outfit');

  return (
    <View accessible accessibilityLabel={t('composing.title')} className="items-center gap-3 px-5 pt-10">
      <ActivityIndicator />
      <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{t('composing.title')}</Text>
      <Text className="text-center font-luciole text-legend text-muted dark:text-muted-night">{t('composing.text')}</Text>
    </View>
  );
}

function Outfit({
  s,
  busy,
  onSwap,
  onAccept,
  onNext,
}: {
  s: OutfitSuggestion;
  busy: string | null;
  onSwap: (piece: OutfitPiece, dislike: boolean) => void;
  onAccept: () => void;
  onNext: () => void;
}) {
  const { t } = useTranslation('outfit');
  const [big, ...rest] = s.pieces;

  return (
    <View className="gap-6">
      {/* La mosaïque : la première pièce en grand, les deux suivantes à côté. */}
      <View className="h-[300px] flex-row gap-3 px-5">
        {big && <Tile piece={big} big />}
        {rest.length > 0 && (
          <View className="w-[42%] gap-3">
            {rest.slice(0, 2).map((p) => (
              <Tile key={p.id} piece={p} />
            ))}
          </View>
        )}
      </View>

      <View style={E1} className="mx-5 gap-4 rounded-md bg-surface p-4 dark:bg-surface-night">
        <Text accessibilityRole="header" className="font-luciole-bold text-legend text-muted dark:text-muted-night">
          {t('why')}
        </Text>
        {s.reasons.map((r, i) => {
          const { title, detail } = sentence(t, r);

          return (
            <View key={i} className="flex-row gap-3">
              <View className="mt-2 h-2 w-2 rounded-full bg-primary" />
              <View className="flex-1 gap-0.5">
                <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{title}</Text>
                {detail ? <Text className="font-luciole text-legend text-muted dark:text-muted-night">{detail}</Text> : null}
              </View>
            </View>
          );
        })}
      </View>

      <View className="gap-3">
        <Text accessibilityRole="header" className="px-5 font-luciole-bold text-body text-ink dark:text-ink-night">
          {t('pieces', { count: s.pieces.length })}
        </Text>
        {s.pieces.map((p) => (
          <PieceRow key={p.id} piece={p} busy={busy} onSwap={onSwap} />
        ))}
      </View>

      <View className="gap-3 px-5">
        <Button label={t('accept')} onPress={onAccept} loading={busy === 'accept'} disabled={busy !== null} />
        <Button label={t('next')} variant="secondary" onPress={onNext} disabled={busy !== null} />
        <Text className="text-center font-luciole text-legend text-muted dark:text-muted-night">{t('footer')}</Text>
      </View>
    </View>
  );
}

function Tile({ piece, big = false }: { piece: OutfitPiece; big?: boolean }) {
  return (
    <View accessible accessibilityLabel={piece.name} className="flex-1 items-center justify-center overflow-hidden rounded-md bg-ink/[0.05] dark:bg-ink-night/[0.08]">
      {piece.photo ? (
        <Image source={mediaSource(piece.photo)} style={{ width: '100%', height: '100%' }} contentFit="cover" accessible={false} />
      ) : (
        <ClothVisual kind={pieceArt(piece)} scale={big ? 3 : 2} />
      )}
    </View>
  );
}

function PieceRow({ piece, busy, onSwap }: { piece: OutfitPiece; busy: string | null; onSwap: (piece: OutfitPiece, dislike: boolean) => void }) {
  const { t } = useTranslation('outfit');
  const worn = piece.daysSinceWorn === null ? t('worn.never') : piece.daysSinceWorn === 0 ? t('worn.today') : t('worn.days', { count: piece.daysSinceWorn });

  return (
    <View style={E1} className="mx-5 flex-row items-center gap-3 rounded-md bg-surface p-3 dark:bg-surface-night">
      <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-xs bg-ink/[0.05] dark:bg-ink-night/[0.08]">
        {piece.photo ? <Image source={mediaSource(piece.photo)} style={{ width: 48, height: 48 }} contentFit="cover" accessible={false} /> : <ClothVisual kind={pieceArt(piece)} scale={0.8} />}
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{piece.name}</Text>
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">{[piece.category, worn].filter(Boolean).join(' · ')}</Text>
      </View>
      <View className="items-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('swapA11y', { name: piece.name })}
          disabled={busy !== null}
          onPress={() => onSwap(piece, false)}
          hitSlop={6}
          className="min-h-[32px] justify-center active:opacity-60">
          {busy === `swap:${piece.id}` ? <ActivityIndicator /> : <Text className="font-luciole-bold text-legend text-primary dark:text-primary-night">{t('swap')}</Text>}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dislikeA11y', { name: piece.name })}
          disabled={busy !== null}
          onPress={() => onSwap(piece, true)}
          hitSlop={6}
          className="min-h-[32px] justify-center active:opacity-60">
          {busy === `dislike:${piece.id}` ? <ActivityIndicator /> : <Text className="font-luciole text-legend text-muted dark:text-muted-night">{t('dislike')}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

/** Une raison de l'API en phrase : un titre et une précision. */
function sentence(t: TFunction<'outfit'>, r: Reason): { title: string; detail: string | null } {
  switch (r.code) {
    case 'weather': {
      const heavy = r.outerCategory !== null && /manteaux|doudounes/.test(r.outerCategory);
      const detail = r.outer === null ? t('reason.weather.noLayer') : r.wet ? t('reason.weather.wet', { outer: r.outer }) : heavy ? t('reason.weather.coat', { outer: r.outer }) : t('reason.weather.layer', { outer: r.outer });

      return { title: t('reason.weather.title', { temperature: r.temperature, weather: t(`weather.${r.weather}`) }), detail: r.place ? `${detail} (${r.place})` : detail };
    }
    case 'noWeather':
      return { title: t('reason.noWeather.title'), detail: t('reason.noWeather.detail') };
    case 'occasion':
      return {
        title: t(`reason.occasion.${r.occasion}`),
        detail: r.styles.length > 0 ? t('reason.occasion.styles', { styles: r.styles.join(', ') }) : null,
      };
    case 'notWorn':
      return { title: t('reason.notWorn.title'), detail: r.days === null ? t('reason.notWorn.never', { garment: r.garment }) : t('reason.notWorn.days', { garment: r.garment, count: r.days }) };
    case 'harmony':
      return { title: t(`reason.harmony.${r.kind}.title`), detail: t(`reason.harmony.${r.kind}.detail`) };
    case 'liked':
      return { title: t('reason.liked.title'), detail: r.style };
    case 'ai':
      return { title: t('reason.ai.title'), detail: r.text };
  }
}
