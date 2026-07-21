import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme/colors";

interface Props {
  present: number;
  absent: number;
}

export default function WeekAttendanceSidebar({ present, absent }: Props) {
  const total = present + absent;
  const presentPct = total > 0 ? present / total : 0;
  const absentPct = total > 0 ? absent / total : 0;
  const maxBarHeight = 90;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Semana</Text>
      <View style={styles.barsRow}>
        <View style={styles.barColumn}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { height: Math.max(4, maxBarHeight * presentPct), backgroundColor: colors.primary }]} />
          </View>
          <Text style={styles.barValue}>{present}</Text>
          <Text style={styles.barLabel}>Presentes</Text>
        </View>
        <View style={styles.barColumn}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { height: Math.max(4, maxBarHeight * absentPct), backgroundColor: colors.danger }]} />
          </View>
          <Text style={styles.barValue}>{absent}</Text>
          <Text style={styles.barLabel}>Faltas</Text>
        </View>
      </View>
      {total > 0 && <Text style={styles.rateText}>{Math.round(presentPct * 100)}% de comparecimento</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 92, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  title: { color: colors.textMuted, fontSize: 11, fontWeight: "700", marginBottom: spacing.sm },
  barsRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" },
  barColumn: { alignItems: "center", width: 32 },
  barTrack: { width: 20, height: 90, justifyContent: "flex-end", backgroundColor: colors.surfaceLight, borderRadius: radius.sm, overflow: "hidden" },
  barFill: { width: "100%", borderRadius: radius.sm },
  barValue: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: spacing.xs },
  barLabel: { color: colors.textMuted, fontSize: 9, textAlign: "center" },
  rateText: { color: colors.textMuted, fontSize: 9, textAlign: "center", marginTop: spacing.sm },
});
