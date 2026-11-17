import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { answerRequest, askFriend, cancelRequest, follow, unfollow, unfriend, type Relation } from '@/lib/relations';

/**
 * Les gestes de la page profil de quelqu'un d'autre : devenir amis (ou
 * répondre à sa demande, ou retirer la sienne, ou ne plus être amis) et
 * s'abonner. L'API notifie l'autre, dans l'app et en push.
 */
export function RelationButtons({ profileId, name, relation }: { profileId: string; name: string; relation: Relation }) {
  const { t } = useTranslation('social');
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (what: string, action: () => Promise<void>) => {
    setBusy(what);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const confirmUnfriend = () =>
    Alert.alert(t('relation.unfriendTitle', { name }), t('relation.unfriendBody'), [
      { text: t('post.cancel'), style: 'cancel' },
      { text: t('relation.unfriend'), style: 'destructive', onPress: () => void run('friend', () => unfriend(queryClient, profileId)) },
    ]);

  const request = relation.request;

  return (
    <View className="w-full gap-2">
      {relation.friend ? (
        <Button label={t('relation.friends')} variant="secondary" onPress={confirmUnfriend} loading={busy === 'friend'} />
      ) : request?.direction === 'received' ? (
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button label={t('relation.accept')} onPress={() => void run('friend', () => answerRequest(queryClient, request.id, true))} loading={busy === 'friend'} />
          </View>
          <View className="flex-1">
            <Button label={t('relation.decline')} variant="secondary" onPress={() => void run('decline', () => answerRequest(queryClient, request.id, false))} loading={busy === 'decline'} />
          </View>
        </View>
      ) : request?.direction === 'sent' ? (
        <Button
          label={request.awaitingGuardian ? t('relation.awaitingGuardian') : t('relation.sent')}
          variant="secondary"
          onPress={() => void run('friend', () => cancelRequest(queryClient, request.id))}
          loading={busy === 'friend'}
        />
      ) : (
        <Button label={t('relation.add')} onPress={() => void run('friend', () => askFriend(queryClient, profileId))} loading={busy === 'friend'} />
      )}

      <Button
        label={relation.following ? t('relation.following') : relation.followsMe ? t('relation.followBack') : t('relation.follow')}
        variant={relation.following ? 'ghost' : 'secondary'}
        onPress={() => void run('follow', () => (relation.following ? unfollow(queryClient, profileId) : follow(queryClient, profileId)))}
        loading={busy === 'follow'}
      />
      {request?.direction === 'sent' && (
        <Text className="text-center font-luciole text-legend text-muted dark:text-muted-night">
          {t('relation.cancelHint')}
        </Text>
      )}
      {error && (
        <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
          {error}
        </Text>
      )}
    </View>
  );
}
