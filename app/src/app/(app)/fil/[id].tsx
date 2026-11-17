import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { MentionList, PostCard } from '@/components/feed/PostCard';
import { ProfileAvatar } from '@/components/profiles/ProfileCard';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { addComment, deleteComment, deletePost, since, useComments, usePost, type Post, type PostComment } from '@/lib/feed';

/**
 * Une publication (Figma « Fil — Publication ») : la carte, la liste
 * numérotée des vêtements mentionnés, puis les commentaires (maquette
 * « Commentaires sur une pièce ») : la liste, « Répondre », et « Ton
 * commentaire » avec Publier. Une publication pour les abonnés se lit sans
 * commentaires (règle du MDD).
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
  const { t } = useTranslation('social');
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = () =>
    Alert.alert(t('post.deleteTitle'), t('post.deleteBody'), [
      { text: t('post.cancel'), style: 'cancel' },
      {
        text: t('post.delete'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          setError(null);
          try {
            await deletePost(queryClient, post.id);
            router.back();
          } catch (e) {
            setError(e instanceof Error ? e.message : t('post.deleteError'));
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
      {post.commentsEnabled && <Comments post={post} />}
      <ActionBar note={post.audience === 'FOLLOWERS' ? t('post.noteFollowers') : undefined}>
        {error && (
          <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
            {error}
          </Text>
        )}
        {post.canDelete && <Button label={t('post.deleteAction')} variant="secondary" onPress={remove} loading={busy} />}
      </ActionBar>
    </>
  );
}

/** Les commentaires : chaque fil (un commentaire et ses réponses), puis le champ pour écrire. */
function Comments({ post }: { post: Post }) {
  const { t } = useTranslation('social');
  const queryClient = useQueryClient();
  const comments = useComments(post.id);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = comments.data ?? [];
  const roots = list.filter((c) => c.parentId === null);
  const replies = (id: string) => list.filter((c) => c.parentId === id);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await addComment(queryClient, post.id, text, replyTo?.id ?? null);
      setText('');
      setReplyTo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('comments.sendError'));
    } finally {
      setSending(false);
    }
  };

  const remove = (comment: PostComment) =>
    Alert.alert(t('comments.deleteTitle'), t('comments.deleteBody'), [
      { text: t('post.cancel'), style: 'cancel' },
      {
        text: t('post.delete'),
        style: 'destructive',
        onPress: () => deleteComment(queryClient, post.id, comment.id).catch((e) => setError(e instanceof Error ? e.message : String(e))),
      },
    ]);

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between px-5">
        <Text accessibilityRole="header" className="font-luciole-bold text-body text-ink dark:text-ink-night">
          {t('comments.title')}
        </Text>
        <Text className="font-luciole-bold text-legend text-primary dark:text-primary-night">{list.length}</Text>
      </View>

      {comments.isPending && <ActivityIndicator />}
      {comments.isError && <Text className="px-5 font-luciole text-legend text-error dark:text-error-night">{comments.error.message}</Text>}
      {comments.data && list.length === 0 && <Text className="px-5 font-luciole text-legend text-muted dark:text-muted-night">{t('comments.empty')}</Text>}

      {roots.map((c) => (
        <View key={c.id} className="gap-2">
          <CommentCard comment={c} onReply={post.canComment ? () => setReplyTo(c) : undefined} onDelete={c.canDelete ? () => remove(c) : undefined} />
          {replies(c.id).map((r) => (
            <View key={r.id} className="pl-8">
              <CommentCard comment={r} onReply={post.canComment ? () => setReplyTo(c) : undefined} onDelete={r.canDelete ? () => remove(r) : undefined} />
            </View>
          ))}
        </View>
      ))}

      {post.canComment && (
        <View className="gap-2 px-5 pt-2">
          <Text className="font-luciole-bold text-legend text-muted dark:text-muted-night">{t('comments.yours')}</Text>
          {replyTo && (
            <View className="flex-row items-center justify-between rounded-sm bg-primary/[0.08] px-3 py-2">
              <Text className="flex-1 font-luciole text-legend text-ink dark:text-ink-night">{t('comments.replyingTo', { name: replyTo.author.displayName })}</Text>
              <Pressable accessibilityRole="button" onPress={() => setReplyTo(null)} hitSlop={8}>
                <Text className="font-luciole-bold text-legend text-primary dark:text-primary-night">{t('post.cancel')}</Text>
              </Pressable>
            </View>
          )}
          <TextInput
            accessibilityLabel={t('comments.yours')}
            value={text}
            onChangeText={setText}
            placeholder={replyTo ? t('comments.replyPlaceholder', { name: replyTo.author.displayName }) : t('comments.placeholder')}
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={1000}
            textAlignVertical="top"
            style={E1}
            className="min-h-[88px] rounded-md bg-surface px-4 py-3 font-luciole text-body text-ink dark:bg-surface-night dark:text-ink-night"
          />
          {error && (
            <Text accessibilityRole="alert" className="font-luciole text-legend text-error dark:text-error-night">
              {error}
            </Text>
          )}
          <Button label={t('comments.publish')} onPress={send} loading={sending} disabled={text.trim() === ''} />
        </View>
      )}
    </View>
  );
}

function CommentCard({ comment, onReply, onDelete }: { comment: PostComment; onReply?: () => void; onDelete?: () => void }) {
  const { t } = useTranslation('social');

  return (
    <View style={E1} className="mx-5 flex-row gap-3 rounded-md bg-surface p-4 dark:bg-surface-night">
      <ProfileAvatar name={comment.author.displayName} size={32} />
      <View className="flex-1 gap-1">
        <View className="flex-row items-baseline justify-between gap-2">
          <Text className="flex-1 font-luciole-bold text-body text-ink dark:text-ink-night">{comment.author.displayName}</Text>
          <Text className="font-luciole text-legend text-muted dark:text-muted-night">{since(comment.createdAt)}</Text>
        </View>
        <Text className="font-luciole text-body text-ink dark:text-ink-night">{comment.body}</Text>
        {(onReply || onDelete) && (
          <View className="flex-row gap-5 pt-1">
            {onReply && (
              <Pressable accessibilityRole="button" accessibilityLabel={t('comments.replyA11y', { name: comment.author.displayName })} onPress={onReply} hitSlop={8} className="active:opacity-70">
                <Text className="font-luciole-bold text-legend text-ink/70 dark:text-ink-night/70">{t('comments.reply')}</Text>
              </Pressable>
            )}
            {onDelete && (
              <Pressable accessibilityRole="button" onPress={onDelete} hitSlop={8} className="active:opacity-70">
                <Text className="font-luciole text-legend text-muted dark:text-muted-night">{t('comments.delete')}</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
