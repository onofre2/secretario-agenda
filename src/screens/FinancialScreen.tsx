import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing, radius } from "../theme/colors";
import { formatCurrency } from "../utils/date";
import { getRangeFor, PeriodKind } from "../utils/period";
import { getSummary, getRevenueByClinic, FinancialSummary } from "../database/repositories/financialRepo";
import SimpleBarChart from "../components/SimpleBarChart";

const PERIODS: { key: PeriodKind; label: string }[] = [
  { key: "day", label: "Diário" },
  { key: "week", label: "Semanal" },
  { key: "month", label: "Mensal" },
];

export default function FinancialScreen() {
  const [period, setPeriod] = useState<PeriodKind>("week");
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [byClinic, setByClinic] = useState<{ clinic_name: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const range = getRangeFor(period);
    const [s, clinics] = await Promise.all([
      getSummary(range.start, range.end),
      getRevenueByClinic(range.start, range.end) as Promise<{ clinic_name: string; total: number }[]>,
    ]);
    setSummary(s);
    setByClinic(clinics);
    setLoading(false);
  }, [period]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const range = getRangeFor(period);
  const attendanceRate =
    summary && summary.presentCount + summary.absentCount > 0
      ? Math.round((summary.presentCount / (summary.presentCount + summary.absentCount)) * 100)
      : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
    >
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => setPeriod(p.key)}
            style={[styles.periodChip, period === p.key && styles.periodChipActive]}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.rangeLabel}>{range.label}</Text>

      <View style={styles.cardsGrid}>
        <SummaryCard label="Receita" value={formatCurrency(summary?.revenue ?? 0)} color={colors.primary} />
        <SummaryCard label="Perda por faltas" value={formatCurrency(summary?.loss ?? 0)} color={colors.danger} />
        <SummaryCard label="Atendimentos" value={String(summary?.appointmentsCount ?? 0)} color={colors.text} />
        <SummaryCard label="Comparecimento" value={`${attendanceRate}%`} color={colors.warning} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Receita por clínica</Text>
        <SimpleBarChart
          data={byClinic.map((c) => ({ label: c.clinic_name, value: c.total }))}
          emptyMessage="Nenhuma receita registrada neste período."
        />
      </View>
    </ScrollView>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  periodRow: { flexDirection: "row", gap: spacing.sm },
  periodChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { color: colors.textMuted, fontWeight: "600" },
  periodTextActive: { color: "#0F172A" },
  rangeLabel: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    textTransform: "capitalize",
  },
  cardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  card: {
    width: "47%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.xs },
  cardValue: { fontSize: 20, fontWeight: "700" },
  section: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: spacing.xs },
});
