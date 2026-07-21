import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing, radius } from "../theme/colors";
import { formatCurrency } from "../utils/date";
import { getRangeFor, PeriodKind } from "../utils/period";
import {
  getSummary,
  getRevenueByClinic,
  getRevenueTrend,
  FinancialSummary,
  RevenueTrendPoint,
} from "../database/repositories/financialRepo";
import { exportFinancialScreenAsPdf } from "../reports/exportFinancialPdf";
import SimpleBarChart from "../components/SimpleBarChart";
import PrimaryButton from "../components/PrimaryButton";

const PERIODS: { key: PeriodKind; label: string }[] = [
  { key: "day", label: "Diário" },
  { key: "week", label: "Semanal" },
  { key: "month", label: "Mensal" },
];

export default function FinancialScreen() {
  const [period, setPeriod] = useState<PeriodKind>("week");
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [byClinic, setByClinic] = useState<{ clinic_name: string; total: number }[]>([]);
  const [trend, setTrend] = useState<RevenueTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  const load = useCallback(async () => {
    const range = getRangeFor(period);
    const [s, clinics, trendData] = await Promise.all([
      getSummary(range.start, range.end),
      getRevenueByClinic(range.start, range.end) as Promise<{ clinic_name: string; total: number }[]>,
      getRevenueTrend(range.start, range.end),
    ]);
    setSummary(s);
    setByClinic(clinics);
    setTrend(trendData);
    setLoading(false);
  }, [period]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const range = getRangeFor(period);
  const attendanceRate =
    summary && summary.presentCount + summary.absentCount > 0
      ? Math.round((summary.presentCount / (summary.presentCount + summary.absentCount)) * 100)
      : 0;

  const handleExportPdf = async () => {
    if (!summary) return;
    setExportingPdf(true);
    try {
      await exportFinancialScreenAsPdf(summary, byClinic, trend, range.label);
    } catch (err) {
      console.error("Erro ao exportar tela financeira:", err);
    } finally {
      setExportingPdf(false);
    }
  };

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
        <Text style={styles.sectionTitle}>Tendência de receita</Text>
        <SimpleBarChart
          data={trend.map((t) => ({ label: t.date.slice(5), value: t.revenue }))}
          emptyMessage="Nenhuma receita registrada neste período."
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Receita por clínica</Text>
        <SimpleBarChart
          data={byClinic.map((c) => ({ label: c.clinic_name, value: c.total }))}
          emptyMessage="Nenhuma receita registrada neste período."
        />
      </View>

      <PrimaryButton
        label={exportingPdf ? "Gerando PDF..." : "📄 Exportar tela financeira (PDF)"}
        onPress={handleExportPdf}
        disabled={!summary || exportingPdf}
        style={{ marginTop: spacing.lg }}
      />
      {exportingPdf && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />}
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
  periodChip: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.surfaceLight, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  periodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { color: colors.textMuted, fontWeight: "600" },
  periodTextActive: { color: "#0F172A" },
  rangeLabel: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm, marginBottom: spacing.md, textTransform: "capitalize" },
  cardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  card: { width: "47%", backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardLabel: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.xs },
  cardValue: { fontSize: 20, fontWeight: "700" },
  section: { marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: spacing.xs },
});
