import React, { useCallback, useState, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { spacing } from "../theme/colors";
import { useTheme } from "../context/ThemeContext";
import { todayISO, formatFriendlyDate, formatCurrency } from "../utils/date";
import {
  getAppointmentsByDate,
  markPresent,
  markAbsent,
  TodayAppointment,
} from "../database/repositories/appointmentsRepo";
import { generateAppointmentsForDate } from "../database/repositories/schedulesRepo";
import { scheduleAllPendingForToday, scheduleMorningAgendaNotification, scheduleYearEndBackupNotification, cleanupOrphanedNotificationsOnce, scheduleMonthlyBackupNotification } from "../notifications/scheduler";
import { speakTodaySchedule, speakEndOfDaySummary } from "../voice/voiceService";
import AppointmentCard from "../components/AppointmentCard";

export default function TodayScreen() {
  const { colors } = useTheme();
  const [appointments, setAppointments] = useState<TodayAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const date = todayISO();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
    dateLabel: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "700",
      marginBottom: spacing.xs,
      textTransform: "capitalize",
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    summaryText: { color: colors.textMuted, fontSize: 14 },
    summaryRevenue: { color: colors.primary, fontSize: 14, fontWeight: "700" },
    voiceRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
    voiceButton: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingVertical: spacing.sm,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    voiceButtonText: { color: colors.text, fontSize: 13, fontWeight: "600" },
    empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  }), [colors]);

  const load = useCallback(async () => {
    await generateAppointmentsForDate(date);
    const list = await getAppointmentsByDate(date);
    setAppointments(list);
    setLoading(false);
    await cleanupOrphanedNotificationsOnce();
    scheduleAllPendingForToday().catch((err) => console.error("Erro ao agendar notificações:", err));
    scheduleMonthlyBackupNotification().catch((err) => console.error("Erro ao agendar notificacao mensal de backup:", err));
    scheduleMorningAgendaNotification().catch((err) => console.error("Erro ao agendar notificacao matinal:", err));
    scheduleYearEndBackupNotification().catch((err) => console.error("Erro ao agendar notificacao de backup anual:", err));
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handlePresent = async (id: number) => {
    await markPresent(id);
    await load();
  };

  const handleAbsent = async (id: number) => {
    await markAbsent(id);
    await load();
  };

  const expectedRevenue = appointments.reduce(
    (sum, a) => sum + (a.status !== "absent" ? a.session_value : 0),
    0
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.dateLabel}>{formatFriendlyDate(date)}</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {appointments.length} compromisso{appointments.length !== 1 ? "s" : ""} hoje
        </Text>
        <Text style={styles.summaryRevenue}>{formatCurrency(expectedRevenue)}</Text>
      </View>

      <View style={styles.voiceRow}>
        <Pressable style={styles.voiceButton} onPress={() => speakTodaySchedule(appointments)}>
          <Text style={styles.voiceButtonText}>🔊 Ler agenda</Text>
        </Pressable>
        <Pressable style={styles.voiceButton} onPress={() => speakEndOfDaySummary(appointments)}>
          <Text style={styles.voiceButtonText}>🔊 Resumo do dia</Text>
        </Pressable>
      </View>

      <FlatList
        data={appointments}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>Nenhum compromisso para hoje.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <AppointmentCard
            appointment={item}
            onMarkPresent={handlePresent}
            onMarkAbsent={handleAbsent}
          />
        )}
      />
    </SafeAreaView>
  );
}
