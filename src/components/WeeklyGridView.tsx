import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme/colors";
import { WEEKDAYS } from "../utils/weekdays";
import { formatCurrency } from "../utils/date";

interface ScheduleItem {
  id: number;
  weekday: number;
  time: string;
  patient_name?: string;
  clinic_name?: string;
  session_value: number;
}

interface Props {
  schedules: ScheduleItem[];
}

export default function WeeklyGridView({ schedules }: Props) {
  const byDay = (weekday: number) =>
    schedules
      .filter((s) => s.weekday === weekday)
      .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <ScrollView horizontal contentContainerStyle={styles.scrollContent} showsHorizontalScrollIndicator={false}>
      {WEEKDAYS.map((day) => {
        const items = byDay(day.value);
        return (
          <View key={day.value} style={styles.column}>
            <View style={styles.columnHeader}>
              <Text style={styles.columnHeaderText}>{day.short}</Text>
              <Text style={styles.columnCount}>{items.length}</Text>
            </View>

            {items.length === 0 ? (
              <View style={styles.emptySlot}>
                <Text style={styles.emptyText}>—</Text>
              </View>
            ) : (
              items.map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.cardTime}>{item.time}</Text>
                  <Text style={styles.cardPatient} numberOfLines={1}>
                    {item.patient_name ?? "?"}
                  </Text>
                  <Text style={styles.cardClinic} numberOfLines={1}>
                    {item.clinic_name ?? ""}
                  </Text>
                  <Text style={styles.cardValue}>{formatCurrency(item.session_value)}</Text>
                </View>
              ))
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const COLUMN_WIDTH = 128;

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  column: { width: COLUMN_WIDTH },
  columnHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  columnHeaderText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  columnCount: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  emptySlot: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTime: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  cardPatient: { color: colors.text, fontSize: 13, fontWeight: "600", marginTop: 2 },
  cardClinic: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  cardValue: { color: colors.textMuted, fontSize: 11, marginTop: 2, fontWeight: "600" },
});
