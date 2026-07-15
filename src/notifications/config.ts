import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const APPOINTMENT_CATEGORY = "APPOINTMENT_ACTIONS";
export const DEFAULT_LEAD_MINUTES = 10;

export const NotificationAction = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  SNOOZE: "SNOOZE",
} as const;

/**
 * Deve ser chamado uma vez, no boot do app, antes de agendar qualquer notificação.
 */
export async function configureNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  await Notifications.setNotificationCategoryAsync(APPOINTMENT_CATEGORY, [
    {
      identifier: NotificationAction.PRESENT,
      buttonTitle: "🟢 Presente",
      options: { opensAppToForeground: false },
    },
    {
      identifier: NotificationAction.ABSENT,
      buttonTitle: "🔴 Ausente",
      options: { opensAppToForeground: false },
    },
    {
      identifier: NotificationAction.SNOOZE,
      buttonTitle: "Adiar 5 min",
      options: { opensAppToForeground: false },
    },
  ]);

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("appointments", {
      name: "Compromissos",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  }

  await requestNotificationPermissions();
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}
