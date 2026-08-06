import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { NotificationAction } from "./config";
import { snoozeAppointment } from "./scheduler";
import { markPresent, markAbsent, getAppointmentsByDate } from "../database/repositories/appointmentsRepo";
import { todayISO } from "../utils/date";
import { speakMorningAgenda } from "../voice/voiceService";

/**
 * Hook global: registra o listener de resposta a notificações uma única vez
 * (chamar em App.tsx). Trata as ações Presente/Ausente/Adiar mesmo se o app
 * estava em segundo plano — o professional não precisa abrir o app.
 */
export function useNotificationResponseListener() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
        const data = response.notification.request.content.data;
        if (data?.morningAgenda) {
          try {
            const appointments = await getAppointmentsByDate(todayISO());
            speakMorningAgenda(appointments);
          } catch (err) {
            console.error("Erro ao reproduzir agenda matinal:", err);
          }
          return;
        }

      const appointmentId = response.notification.request.content.data?.appointmentId as
        | number
        | undefined;
      if (!appointmentId) return;

      const actionId = response.actionIdentifier;
      const isActionButton = actionId !== Notifications.DEFAULT_ACTION_IDENTIFIER;

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
      } finally {
        if (isActionButton) {
          try {
            await Notifications.dismissNotificationAsync(response.notification.request.identifier);
          } catch (dismissErr) {
            console.error("Erro ao remover notificação da tela:", dismissErr);
          }
        }
      }
    });

    return () => subscription.remove();
  }, []);
}
