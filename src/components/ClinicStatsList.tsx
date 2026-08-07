import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { spacing, radius } from "../theme/colors";
import { useTheme } from "../context/ThemeContext";

export interface ClinicStatsRow {
  clinicName: string;
  clinicColor: string;
  monthCount: number;
  dayCount: number;
  present: number;
  absent: number;
}

interface Props {
  rows: ClinicStatsRow[];
}

export default function ClinicStatsList({ rows }: Props) {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    wrapper: { gap: spacing.sm },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm },
    dot: { width: 10, height: 10, borderRadius: 5 },
    clinicName: { color: colors.text, fontSize: 15, fontWeight: "700", flex: 1 },
    statsRow: { flexDirection: "row", justifyContent: "space-between" },
    statItem: { alignItems: "center", flex: 1 },
    statLabel: { color: colors.textMuted, fontSize: 10, marginBottom: 2, textAlign: "center" },
    statValue: { fontSize: 20, fontWeight: "800" },
  }), [colors]);

  return (
    <View style={styles.wrapper}>
      {rows.map((r) => (
        <View key={r.clinicName} style={styles.card}>
          <View style={styles.nameRow}>
            <View style={[styles.dot, { backgroundColor: r.clinicColor }]} />
            <Text style={styles.clinicName} numberOfLines={1}>{r.clinicName}</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Atend. mês</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{r.monthCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Atend. dia</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>{r.dayCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Presentes</Text>
              <Text style={[styles.statValue, { color: "#22C55E" }]}>{r.present}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Ausentes</Text>
              <Text style={[styles.statValue, { color: colors.danger }]}>{r.absent}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
