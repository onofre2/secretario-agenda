import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
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
  reminder?: string | null;
}

interface Props {
  schedules: ScheduleItem[];
  onReminderPress: (item: ScheduleItem) => void;
}

const CLINIC_COLORS = ["#22C55E", "#3B82F6", "#F59E0B", "#EC4899", "#A855F7", "#14B8A6", "#EF4444", "#84CC16"];

function buildClinicColorMap(schedules: ScheduleItem[]): Map<string, string> {
  const map = new Map<string, string>();
  let i = 0;
  for (const s of schedules) {
    const name = s.clinic_name ?? "?";
    if (!map.has(name)) {
      map.set(name, CLINIC_COLORS[i % CLINIC_COLORS.length]);
      i++;
    }
  }
  return map;
}

export default function WeeklyGridView({ schedules, onReminderPress }: Props) {
  const clinicColors = buildClinicColorMap(schedules);
  const clinicNames = Array.from(clinicColors.keys());

  const byDay = (weekday: number) =>
    schedules
      .filter((s) => s.weekday === weekday)
      .sort((a, b) => a.time.localeCompare(b.time));

  const clinicHours = Array.from(
    schedules.reduce((map, s) => {
      const name = s.clinic_name ?? "?";
      map.set(name, (map.get(name) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]);
  const maxHours = Math.max(1, ...clinicHours.map(([, h]) => h));

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {clinicNames.length > 0 && (
        <View style={styles.legendRow}>
          {clinicNames.map((name) => (
            <View key={name} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: clinicColors.get(name) }]} />
              <Text style={styles.legendText} numberOfLines={1}>{name}</Text>
            </View>
          ))}
        </View>
      )}

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
                items.map((item) => {
                  const clinicColor = clinicColors.get(item.clinic_name ?? "?") ?? colors.border;
                  return (
                    <View key={item.id} style={[styles.card, { borderLeftColor: clinicColor, borderLeftWidth: 5 }]}>
                      <Pressable onPress={() => onReminderPress(item)}>
                        <Text style={[styles.reminderTag, item.reminder ? styles.reminderTagActive : null]}>Lembrete</Text>
                      </Pressable>
                      <Text style={styles.cardTime}>{item.time}</Text>
                      <Text style={styles.cardPatient} numberOfLines={1}>
                        {item.patient_name ?? "?"}
                      </Text>
                      <Text style={styles.cardClinic} numberOfLines={1}>
                        {item.clinic_name ?? ""}
                      </Text>
                      <Text style={styles.cardValue}>{formatCurrency(item.session_value)}</Text>
                    </View>
                  );
                })
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.hoursSection}>
        <Text style={styles.hoursTitle}>Horas por clínica (semana)</Text>
        {clinicHours.map(([name, hours]) => (
          <View key={name} style={styles.hoursRow}>
            <Text style={styles.hoursLabel} numberOfLines={1}>{name}</Text>
            <View style={styles.hoursBarTrack}>
              <View
                style={[
                  styles.hoursBarFill,
                  { width: `${(hours / maxHours) * 100}%`, backgroundColor: clinicColors.get(name) ?? colors.primary },
                ]}
              />
            </View>
            <Text style={styles.hoursValue}>{hours}h</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const COLUMN_WIDTH = 128;

const styles = StyleSheet.create({
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: 140 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.textMuted, fontSize: 11 },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  column: { width: COLUMN_WIDTH },
  columnHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surfaceLight, borderRadius: radius.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, marginBottom: spacing.sm },
  columnHeaderText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  columnCount: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  emptySlot: { borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed", paddingVertical: spacing.md, alignItems: "center" },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  card: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm, borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderTopColor: colors.border, borderRightColor: colors.border, borderBottomColor: colors.border },
  cardTime: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  reminderTag: { color: colors.textMuted, fontSize: 10, fontWeight: "600", marginBottom: 2 },
  reminderTagActive: { color: colors.danger },
  cardPatient: { color: colors.text, fontSize: 13, fontWeight: "600", marginTop: 2 },
  cardClinic: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  cardValue: { color: colors.textMuted, fontSize: 11, marginTop: 2, fontWeight: "600" },
  hoursSection: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xl },
  hoursTitle: { color: colors.text, fontSize: 14, fontWeight: "700", marginBottom: spacing.sm },
  hoursRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs, gap: spacing.sm },
  hoursLabel: { color: colors.textMuted, fontSize: 12, width: 110 },
  hoursBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceLight, overflow: "hidden" },
  hoursBarFill: { height: 8, borderRadius: 4 },
  hoursValue: { color: colors.text, fontSize: 12, fontWeight: "600", width: 30, textAlign: "right" },
});
