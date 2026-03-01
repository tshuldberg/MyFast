import * as Notifications from 'expo-notifications';
import type { NotificationPreferences } from '@myfast/shared';

const SOURCE_KEY = 'myfast-fast';
const CHANNEL_ID = 'fast-milestones';

/** Configure notification handler for foreground display */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Fast Milestones',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: '#14B8A6',
  });
}

/** Request notification permissions. Returns true if granted. */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule start/progress/complete notifications for an active fast.
 */
export async function scheduleFastMilestoneNotifications(
  startedAt: string,
  targetHours: number,
  protocol: string,
  preferences: NotificationPreferences,
): Promise<string[]> {
  await ensureAndroidChannel();

  const scheduledIds: string[] = [];
  const startTime = new Date(startedAt);
  const now = new Date();
  const targetMs = targetHours * 3600 * 1000;

  const checkpoints: Array<{
    key: keyof NotificationPreferences;
    percent: number;
    title: string;
    body: string;
  }> = [
    {
      key: 'fastStart',
      percent: 0,
      title: 'Fast started',
      body: `${protocol} is underway. Stay hydrated and keep going.`,
    },
    {
      key: 'progress25',
      percent: 0.25,
      title: "You're 25% through",
      body: 'Great start. Keep the momentum going.',
    },
    {
      key: 'progress50',
      percent: 0.5,
      title: "You're halfway there",
      body: 'You are 50% through your fast.',
    },
    {
      key: 'progress75',
      percent: 0.75,
      title: "You're 75% there",
      body: 'Keep going. You are close to your target.',
    },
    {
      key: 'fastComplete',
      percent: 1,
      title: 'Fast complete',
      body: `You reached your ${targetHours}h target. Time to eat when you are ready.`,
    },
  ];

  for (const checkpoint of checkpoints) {
    if (!preferences[checkpoint.key]) {
      continue;
    }

    const fireAt = checkpoint.percent === 0
      ? new Date(now.getTime() + 2_000)
      : new Date(startTime.getTime() + targetMs * checkpoint.percent);

    if (fireAt <= now) {
      continue;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: checkpoint.title,
        body: checkpoint.body,
        sound: true,
        data: {
          source: SOURCE_KEY,
          milestone: checkpoint.key,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        ...(CHANNEL_ID ? { channelId: CHANNEL_ID } : {}),
      },
    });

    scheduledIds.push(id);
  }

  return scheduledIds;
}

/**
 * Cancel all scheduled notifications for active MyFast milestones.
 */
export async function cancelFastMilestoneNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    scheduled
      .filter(
        (item) =>
          (item.content.data as { source?: string } | undefined)?.source === SOURCE_KEY,
      )
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

/**
 * Cancel all scheduled notifications from MyFast.
 * Useful for cleanup when the app is reset.
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
