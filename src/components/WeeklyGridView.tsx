import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Modal } from "react-native";
import { spacing, radius } from "../theme/colors";
import { useTheme } from "../context/ThemeContext";
import { WEEKDAYS } from "../utils/weekdays";
import { formatCurrency } from "../utils/date";
import { getClinicColor } from "../utils/clinicColors";

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

function buildClinicColorMap(schedules: ScheduleItem[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of schedules) {
    const name = s.clinic_name ?? "?";
    if (!map.has(name)) {
      map.set(name, getClinicColor(name));
    }
  }
  return map;
}

function groupByTime(items: ScheduleItem[]): ScheduleItem[][] {
  const map = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    const key = item.time;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.values());
}

export default function WeeklyGridView({ schedules, onReminderPress }: Props) {
  const { colors } = useTheme();
  const clinicColors = buildClinicColorMap(schedules);
  const clinicNames = Array.from(clinicColors.keys());
  const [groupModal, setGroupModal] = useState<ScheduleItem[] | null>(null);

  const byDay = (weekday: number) =>
    schedules
      .filter((s) => s.weekday === weekday)
      .sort((a, b) => a.time.localeCompare(b.time));

  const clinicHours = Array.from(
    (() => {
      const seenSlots = new Set<string>();
      const counts = new Map<string, number>();
      for (const s of schedules) {
        const name = s.clinic_name ?? "?";
        const slotKey = `${s.weekday}-${s.time}-${name}`;
        if (!seenSlots.has(slotKey)) {
          seenSlots.add(slotKey);
          counts.set(name, (counts.get(name) ?? 0) + 1);
        }
      }
      return counts;
    })()
  ).sort((a, b) => b[1] - a[1]);
  const maxHours = Math.max(1, ...clinicHours.map(([, h]) => h));
  const clinicAppointmentCounts = new Map<string, number>();
  for (const s of schedules) {
    const name = s.clinic_name ?? "?";
    clinicAppointmentCounts.set(name, (clinicAppointmentCounts.get(name) ?? 0) + 1);
  }

  const dayRevenue = WEEKDAYS.map((day) => ({
    label: day.short,
    value: schedules.filter((s) => s.weekday === day.value).reduce((sum, s) => sum + s.session_value, 0),
    count: schedules.filter((s) => s.weekday === day.value).length,
  })).filter((d) => d.count > 0);
  const bestDay = dayRevenue.length > 0 ? dayRevenue.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const worstDay = dayRevenue.length > 0 ? dayRevenue.reduce((a, b) => (b.value < a.value ? b : a)) : null;

  const styles = useMemo(() => StyleSheet.create({
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
    groupCard: { borderLeftWidth: 5, borderLeftColor: colors.primary, alignItems: "flex-start" },
    groupCardCount: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 2 },
    groupCardHint: { color: colors.primary, fontSize: 10, marginTop: 4, fontWeight: "600" },
    hoursSection: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xl },
    hoursTitle: { color: colors.text, fontSize: 14, fontWeight: "700", marginBottom: spacing.sm },
    hoursRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs, gap: spacing.sm },
    hoursLabel: { color: colors.textMuted, fontSize: 12, width: 110 },
    hoursBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceLight, overflow: "hidden" },
    hoursBarFill: { height: 8, borderRadius: 4 },
    hoursValue: { color: colors.text, fontSize: 12, fontWeight: "600", width: 90, textAlign: "right" },
    dayStatsSection: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.xl },
    dayStatsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
    dayStatCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.border },
    dayStatLabel: { color: colors.textMuted, fontSize: 11 },
    dayStatDay: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 2 },
    dayStatValue: { fontSize: 13, fontWeight: "700", marginTop: 2 },
    dayListRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
    dayListLabel: { color: colors.textMuted, fontSize: 13 },
    dayListValue: { color: colors.text, fontSize: 13, fontWeight: "600" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: spacing.lg },
    modalContent: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, width: "100%", maxWidth: 340, borderWidth: 1, borderColor: colors.border },
    modalTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginBottom: spacing.sm },
    modalItem: { backgroundColor: colors.surfaceLight, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm },
    modalCloseBtn: { marginTop: spacing.sm, paddingVertical: spacing.sm, alignItems: "center", backgroundColor: colors.surfaceLight, borderRadius: radius.sm },
    modalCloseText: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  }), [colors]);

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
          const groups = groupByTime(items);
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
                groups.map((group) => {
                  if (group.length === 1) {
                    const item = group[0];
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
                  }

                  const totalValue = group.reduce((sum, i) => sum + i.session_value, 0);
                  const groupKey = `${group[0].weekday}-${group[0].time}`;
                  return (
                    <Pressable
                      key={groupKey}
                      style={[styles.card, styles.groupCard]}
                      onPress={() => setGroupModal(group)}
                    >
                      <Text style={styles.cardTime}>{group[0].time}</Text>
                      <Text style={styles.groupCardCount}>{group.length} pacientes</Text>
                      <Text style={styles.cardValue}>{formatCurrency(totalValue)}</Text>
                      <Text style={styles.groupCardHint}>Toque para ver</Text>
                    </Pressable>
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
            <Text style={styles.hoursValue}>{hours}h · {clinicAppointmentCounts.get(name) ?? 0} atend.</Text>
          </View>
        ))}
      </View>

        {bestDay && worstDay && (
          <View style={styles.dayStatsSection}>
            <Text style={styles.hoursTitle}>Melhor dia de receita e pior dia de Receita da semana</Text>
            <View style={styles.dayStatsRow}>
              <View style={styles.dayStatCard}>
                <Text style={styles.dayStatLabel}>Melhor dia</Text>
                <Text style={styles.dayStatDay}>{bestDay.label}</Text>
                <Text style={[styles.dayStatValue, { color: colors.primary }]}>{formatCurrency(bestDay.value)}</Text>
              </View>
              <View style={styles.dayStatCard}>
                <Text style={styles.dayStatLabel}>Pior dia</Text>
                <Text style={styles.dayStatDay}>{worstDay.label}</Text>
                <Text style={[styles.dayStatValue, { color: colors.danger }]}>{formatCurrency(worstDay.value)}</Text>
              </View>
            </View>
          </View>
        )}

        {dayRevenue.length > 0 && (
          <View style={styles.dayStatsSection}>
            <Text style={styles.hoursTitle}>Receita por dia da semana</Text>
            {dayRevenue.map((d) => (
              <View key={d.label} style={styles.dayListRow}>
                <Text style={styles.dayListLabel}>{d.label}</Text>
                <Text style={styles.dayListValue}>{formatCurrency(d.value)}</Text>
              </View>
            ))}
          </View>
        )}

      <Modal
        visible={groupModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setGroupModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setGroupModal(null)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              {groupModal?.[0]?.time} · {groupModal?.length} pacientes
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {groupModal?.map((item) => {
                const clinicColor = clinicColors.get(item.clinic_name ?? "?") ?? colors.border;
                return (
                  <View key={item.id} style={[styles.modalItem, { borderLeftColor: clinicColor, borderLeftWidth: 4 }]}>
                    <Pressable onPress={() => onReminderPress(item)}>
                      <Text style={[styles.reminderTag, item.reminder ? styles.reminderTagActive : null]}>Lembrete</Text>
                    </Pressable>
                    <Text style={styles.cardPatient}>{item.patient_name ?? "?"}</Text>
                    <Text style={styles.cardClinic}>{item.clinic_name ?? ""}</Text>
                    <Text style={styles.cardValue}>{formatCurrency(item.session_value)}</Text>
                  </View>
                );
              })}
            </ScrollView>
            <Pressable style={styles.modalCloseBtn} onPress={() => setGroupModal(null)}>
              <Text style={styles.modalCloseText}>Fechar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const COLUMN_WIDTH = 128;
