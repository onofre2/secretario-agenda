import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { NotificationAction } from "./config";
import { snoozeAppointment } from "./scheduler";
import { markPresent, markAbsent } from "../database/repositories/appointmentsRepo";

/**
 * Hook global: registra o listener de resposta a notificações uma única vez
 * (chamar em App.tsx). Trata as ações Presente/Ausente/Adiar mesmo se o app
 * estava em segundo plano — o professional não precisa abrir o app.
 */
export function useNotificationResponseListener() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const appointmentId = response.notification.request.content.data?.appointmentId as
        | number
        | undefined;
      if (!appointmentId) return;

      const actionId = response.actionIdentifier;

      try {
        if (actionId === NotificationAction.PRESENT) {
          await markPresent(appointmentId);
        } else if (actionId === NotificationAction.ABSENT) {
          await markAbsent(appointmentId);
        } else if (actionId === NotificationAction.SNOOZE) {
          await snoozeAppointment(appointmentId, 5);
        }
        // Notifications.DEFAULT_ACTION_IDENTIFIER = usuário só tocou na notificação
        // (abre o app na tela Hoje via navegação padrão, nenhuma ação extra necessária)
      } catch (err) {
        console.error("Erro ao processar ação da notificação:", err);
      }
    });

    return () => subscription.remove();
  }, []);
}
