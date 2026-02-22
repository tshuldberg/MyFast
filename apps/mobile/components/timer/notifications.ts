import * as Notifications from 'expo-notifications';

/** Notification identifier for fast complete */
const FAST_COMPLETE_ID = 'fast-complete';

/** Configure notification handler for foreground display */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Request notification permissions. Returns true if granted. */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule a "Fast complete" notification to fire when the target is reached.
 * Call this when a fast is started with notifyFastComplete enabled.
 */
export async function scheduleFastCompleteNotification(
  startedAt: string,
  targetHours: number,
): Promise<string | null> {
  const fireAt = new Date(new Date(startedAt).getTime() + targetHours * 3600 * 1000);
  const now = new Date();

  // Don't schedule if the target time is already in the past
  if (fireAt <= now) return null;

  const secondsUntilFire = Math.floor((fireAt.getTime() - now.getTime()) / 1000);

  const id = await Notifications.scheduleNotificationAsync({
    identifier: FAST_COMPLETE_ID,
    content: {
      title: 'Target reached!',
      body: `You've hit your ${targetHours}h fasting target. Great job!`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntilFire,
    },
  });

  return id;
}

/**
 * Cancel any scheduled fast-complete notification.
 * Call this when a fast is ended early or cancelled.
 */
export async function cancelFastCompleteNotification(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(FAST_COMPLETE_ID);
}

/**
 * Cancel all scheduled notifications from MyFast.
 * Useful for cleanup when the app is reset.
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
