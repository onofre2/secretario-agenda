import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { colors, spacing, radius } from "../theme/colors";
import { formatCurrency } from "../utils/date";
import { TodayAppointment } from "../database/repositories/appointmentsRepo";

interface Props {
  appointment: TodayAppointment;
  onMarkPresent: (id: number) => Promise<void>;
  onMarkAbsent: (id: number) => Promise<void>;
}

export default function AppointmentCard({ appointment, onMarkPresent, onMarkAbsent }: Props) {
  const [busy, setBusy] = useState(false);

  const handlePress = async (action: (id: number) => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action(appointment.id);
    } finally {
      setBusy(false);
    }
  };

  const isPending = appointment.status === "pending";
  const isPresent = appointment.status === "present";
  const isAbsent = appointment.status === "absent";

  return (
    <View style={[styles.card, isAbsent && styles.cardAbsent, isPresent && styles.cardPresent]}>
      <View style={styles.header}>
        <Text style={styles.time}>{appointment.time}</Text>
        <Text style={styles.value}>{formatCurrency(appointment.session_value)}</Text>
      </View>
      <Text style={styles.patient}>{appointment.patient_name}</Text>
      <Text style={styles.clinic}>{appointment.clinic_name}</Text>

      {busy ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
      ) : isPending ? (
        <View style={styles.buttonsRow}>
          <Pressable
            style={[styles.button, styles.presentButton]}
            onPress={() => handlePress(onMarkPresent)}
          >
            <Text style={styles.buttonText}>🟢 Presente</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.absentButton]}
            onPress={() => handlePress(onMarkAbsent)}
          >
            <Text style={styles.buttonText}>🔴 Ausente</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.statusLabel}>
          {isPresent ? "✅ Presença registrada" : "❌ Falta registrada"}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPresent: { borderColor: colors.primary },
  cardAbsent: { borderColor: colors.danger, opacity: 0.7 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  time: { color: colors.primary, fontSize: 20, fontWeight: "700" },
  value: { color: colors.textMuted, fontSize: 16 },
  patient: { color: colors.text, fontSize: 18, fontWeight: "600" },
  clinic: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.sm },
  buttonsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
  presentButton: { backgroundColor: colors.primary },
  absentButton: { backgroundColor: colors.danger },
  buttonText: { color: "#0F172A", fontSize: 16, fontWeight: "700" },
  statusLabel: { color: colors.textMuted, fontSize: 14, marginTop: spacing.sm },
});
