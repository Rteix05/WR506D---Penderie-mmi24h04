import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ActionBar, FlowScreen } from '@/components/add/FlowScreen';
import { ProfileAvatar } from '@/components/profiles/ProfileCard';
import { BackButton } from '@/components/ui/BackButton';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { MODES, PERMISSION_GROUPS, profileKind, savePermissions, useAccountProfile, usePermissions, type PermissionKey, type PermissionMode } from '@/lib/profiles';

/**
 * « Autorisations » (Figma « Compte — Autorisations parentales »,
 * 135:6057) : le profil en tête, puis les autorisations par thème
 * (ranger, prêts, relations, vendre et acheter) et « Enregistrer ».
 *
 * La maquette montre des interrupteurs ; le modèle de données a trois
 * modes, que l'écran propose tous : Oui, Avec mon accord (une demande
 * arrive au tuteur), Non. Une autorisation modifiée par rapport à la
 * règle du type de profil est signalée « Réglé par toi ». Le profil
 * lui-même voit ses autorisations sans pouvoir les changer.
 */
export default function PermissionsScreen() {
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  const profile = useAccountProfile(id);
  const permissions = usePermissions(id);
  const queryClient = useQueryClient();
  const [changes, setChanges] = useState<Partial<Record<PermissionKey, PermissionMode>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editable = permissions.data?.canManage ?? false;

  const current = useMemo(() => {
    const map = new Map(permissions.data?.permissions.map((p) => [p.permission, p]) ?? []);

    return (key: PermissionKey) => {
      const p = map.get(key);
      const mode = changes[key] ?? p?.mode ?? 'DENIED';

      return { mode, custom: p ? mode !== p.default : false };
    };
  }, [permissions.data, changes]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await savePermissions(queryClient, id, changes);
      setChanges({});
      router.back();
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    }
  };
  const changed = Object.keys(changes).length > 0;

  return (
    <FlowScreen>
      <View className="flex-row px-5">
        <BackButton onPress={created ? () => router.dismissTo('/profils') : undefined} />
      </View>
      <View className="px-5">
        <ScreenTitle title="Autorisations" legend={profile.data ? [profile.data.displayName, profileKind(profile.data).toLowerCase(), profile.data.type === 'CHILD' ? `${profile.data.age} ans` : null].filter(Boolean).join(' · ') : undefined} />
      </View>

      {created && <Banner tone="success" title="Profil créé !" text="Vérifie ce qu'il a le droit de faire : les réglages par défaut sont déjà appliqués." />}

      {profile.data && (
        <View style={E1} className="mx-5 flex-row items-center gap-3 rounded-md bg-surface px-4 py-3 dark:bg-surface-night">
          <ProfileAvatar name={profile.data.displayName} />
          <View className="flex-1">
            <Text className="font-luciole-bold text-[18px] text-ink dark:text-ink-night">{profile.data.displayName}</Text>
            <Text className="font-luciole text-legend text-muted dark:text-muted-night">
              {profile.data.guardian ? `Géré par ${profile.data.guardian.displayName}` : profileKind(profile.data)}
            </Text>
          </View>
          {profile.data.type === 'CHILD' && (
            <View className="rounded-full bg-primary/[0.12] px-2 py-1">
              <Text className="font-luciole-bold text-legend text-primary dark:text-primary-night">Surveillé</Text>
            </View>
          )}
        </View>
      )}

      {permissions.isPending && <ActivityIndicator className="py-6" />}
      {permissions.isError && <Text className="px-5 font-luciole text-body text-error dark:text-error-night">{permissions.error.message}</Text>}
      {permissions.data && !editable && <Banner tone="info" title="Réglé par ton tuteur" text="Demande-lui si tu veux en changer une." />}

      {permissions.data &&
        PERMISSION_GROUPS.map((group) => (
          <View key={group.title} className="gap-3 px-5">
            <Text accessibilityRole="header" className="font-luciole-bold text-body text-ink dark:text-ink-night">
              {group.title}
            </Text>
            {group.items.map((item) => {
              const { mode, custom } = current(item.key);

              return (
                <View key={item.key} style={E1} className="gap-3 rounded-md bg-surface px-4 py-3 dark:bg-surface-night">
                  <View className="gap-0.5">
                    <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{item.title}</Text>
                    <Text className="font-luciole text-legend text-muted dark:text-muted-night">{custom ? `${item.text} · Réglé par toi` : item.text}</Text>
                  </View>
                  <View accessibilityRole="radiogroup" accessibilityLabel={item.title} className="flex-row gap-2">
                    {MODES.map((m) => {
                      const on = m.value === mode;

                      return (
                        <Pressable
                          key={m.value}
                          accessibilityRole="radio"
                          aria-selected={on} aria-disabled={!editable}
                          disabled={!editable}
                          onPress={() => setChanges((c) => ({ ...c, [item.key]: m.value }))}
                          hitSlop={{ top: 6, bottom: 6 }}
                          className={`h-8 items-center justify-center rounded-full px-3 ${on ? (m.value === 'DENIED' ? 'bg-ink dark:bg-ink-night' : m.value === 'ALLOWED' ? 'bg-main' : 'bg-cloth') : 'bg-ink/[0.06] dark:bg-ink-night/[0.1]'} ${!editable && !on ? 'opacity-50' : ''}`}>
                          <Text className={`font-luciole-bold text-legend ${on ? 'text-white dark:text-bg-night' : 'text-muted dark:text-muted-night'}`}>{m.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        ))}

      {editable && (
        <ActionBar note="Avec ton accord : chaque demande arrive chez toi avant d'être faite. Tu peux revenir sur ces réglages à tout moment.">
          {error && (
            <Text accessibilityRole="alert" className="text-center font-luciole text-legend text-error dark:text-error-night">
              {error}
            </Text>
          )}
          <Button label="Enregistrer" onPress={save} loading={saving} disabled={!changed} />
        </ActionBar>
      )}
    </FlowScreen>
  );
}
