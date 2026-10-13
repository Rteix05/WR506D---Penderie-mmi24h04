import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { MentionList, PostCard } from '@/components/feed/PostCard';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { deletePost, usePost, type Post } from '@/lib/feed';

/**
 * Une publication (Figma « Fil — Publication ») : la carte, puis la liste
 * numérotée des vêtements mentionnés. Les commentaires viendront avec la
 * suite du fil.
 */
export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = usePost(id);

  return (
    <FlowScreen>
      <View className="flex-row px-5">
        <BackButton />
      </View>
      {post.isPending && <ActivityIndicator className="py-10" />}
      {post.isError && <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{post.error.message}</Text>}
      {post.data && <PostBody post={post.data} />}
    </FlowScreen>
  );
}

function PostBody({ post }: { post: Post }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = () =>
    Alert.alert('Supprimer la publication ?', 'Elle disparaît du fil, et les vêtements mentionnés redeviennent privés. Ton look reste.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          setError(null);
          try {
            await deletePost(queryClient, post.id);
            router.back();
          } catch (e) {
            setError(e instanceof Error ? e.message : "La publication n'a pas pu être supprimée.");
            setBusy(false);
          }
        },
      },
    ]);

  return (
    <>
      <View className="gap-4 px-5">
        <PostCard post={post} />
        <MentionList post={post} />
      </View>
      <ActionBar note={post.audience === 'FOLLOWERS' ? 'Tes abonnés voient cette publication sans pouvoir la commenter.' : 'Les commentaires arrivent bientôt.'}>
        {error && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {error}
          </Text>
        )}
        {post.canDelete && <Button label="Supprimer la publication" variant="secondary" onPress={remove} loading={busy} />}
      </ActionBar>
    </>
  );
}
