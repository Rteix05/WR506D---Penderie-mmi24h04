import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { activeProfileId, apiRequest, setActiveProfileId } from '@/lib/api';
import { markRead, targetOfData } from '@/lib/notifications';

/**
 * Les notifications push, reliées à celles de l'app : l'API envoie chaque
 * notification de l'app en push (Expo Push), avec les mêmes données.
 *
 *  - à l'ouverture de l'app connectée, le téléphone s'enregistre
 *    (PUT /api/device-tokens) si l'utilisateur accepte les notifications ;
 *  - une notification reçue app ouverte rafraîchit la liste et la pastille ;
 *  - toucher un push ouvre le même écran que toucher la notification dans
 *    l'app, en passant d'abord sur le bon profil du compte, et la marque
 *    lue.
 *
 * Il faut un identifiant de projet Expo (EAS : extra.eas.projectId dans
 * app.json, posé par `npx eas-cli init`) : sans lui, pas de push, l'app
 * garde ses notifications à l'écran.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let registered: string | null = null;

function projectId(): string | null {
  const fromConfig = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;

  return fromConfig ?? Constants.easConfig?.projectId ?? null;
}

/** Enregistre ce téléphone pour le push ; renvoie le jeton, ou null (refus, simulateur, web, pas de projet EAS). */
export async function registerForPush(): Promise<string | null> {
  const id = projectId();
  if (Platform.OS === 'web' || !Device.isDevice || !id) return null;
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status === 'undetermined') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'Penderie', importance: 3 as Notifications.AndroidImportance } /* DEFAULT */);
    }
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
    await apiRequest('/api/device-tokens', { method: 'PUT', body: { token, platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID' } });
    registered = token;

    return token;
  } catch {
    return null;
  }
}

/** À la déconnexion : ce téléphone ne reçoit plus les push du compte. */
export async function forgetPushToken(): Promise<void> {
  if (!registered) return;
  try {
    await apiRequest('/api/device-tokens', { method: 'DELETE', body: { token: registered } });
  } catch {
    // Hors connexion : l'API l'oubliera quand Expo le dira désinscrit.
  }
  registered = null;
}

/** Ouvre ce dont parle un push, sur le bon profil, et le marque lu. */
async function open(data: Record<string, unknown>, queryClient: ReturnType<typeof useQueryClient>): Promise<void> {
  const profileId = typeof data.profileId === 'string' ? data.profileId : null;
  if (profileId && profileId !== activeProfileId()) {
    await setActiveProfileId(profileId);
    queryClient.clear();
  }
  if (typeof data.notificationId === 'string') void markRead(queryClient, data.notificationId).catch(() => undefined);
  const target = targetOfData(data);
  router.push(target ?? '/notifications');
}

/** À monter une fois dans l'app connectée. */
export function usePush(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    void registerForPush();
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    };
    const received = Notifications.addNotificationReceivedListener(refresh);
    const tapped = Notifications.addNotificationResponseReceivedListener((response) => {
      void open(response.notification.request.content.data ?? {}, queryClient);
    });
    // App ouverte par un push alors qu'elle était fermée.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) void open(response.notification.request.content.data ?? {}, queryClient);
    });

    return () => {
      received.remove();
      tapped.remove();
    };
  }, [queryClient]);
}
