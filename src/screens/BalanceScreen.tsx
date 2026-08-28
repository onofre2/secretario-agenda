import React, { useCallback, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { spacing, radius } from "../theme/colors";
import { useTheme } from "../context/ThemeContext";
import { formatCurrency } from "../utils/date";
import {
  getMonthlyRevenueLast12Months,
  MonthlyRevenuePoint,
  getMonthlyRevenueByClinic,
  MonthlyClinicRevenue,
  getMonthlyAttendanceByClinic,
  MonthlyClinicAttendance,
} from "../database/repositories/financialRepo";
import SimpleBarChart from "../components/SimpleBarChart";
import { calculateMonthOverMonth, calculateProjection, MonthComparison } from "../utils/balanceCalc";
import { exportBalanceAsPdf } from "../reports/exportBalancePdf";
import PrimaryButton from "../components/PrimaryButton";

const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const abbr = MONTH_ABBR[(m ?? 1) - 1] ?? month;
  return `${abbr}/${String(year).slice(2)}`;
}

function formatMonthShort(month: string): string {
  const [, m] = month.split("-").map(Number);
  return MONTH_ABBR[(m ?? 1) - 1] ?? month;
}

const CONFIDENCE_LABEL: Record<string, string> = {
  baixa: "Confiabilidade baixa",
  moderada: "Confiabilidade moderada",
  alta: "Confiabilidade alta",
};

interface ClinicMonthlyRow {
  clinicName: string;
  values: { month: string; revenue: number }[];
}

function buildClinicTable(rows: MonthlyClinicRevenue[], monthsToShow = 4): ClinicMonthlyRow[] {
  const clinicMap = new Map<string, Map<string, number>>();
  const monthsSet = new Set<string>();

  for (const r of rows) {
    monthsSet.add(r.month);
    if (!clinicMap.has(r.clinic_name)) clinicMap.set(r.clinic_name, new Map());
    clinicMap.get(r.clinic_name)!.set(r.month, r.revenue);
  }

  const months = Array.from(monthsSet).sort().slice(-monthsToShow);

  return Array.from(clinicMap.entries()).map(([clinicName, byMonth]) => ({
    clinicName,
    values: months.map((month) => ({ month, revenue: byMonth.get(month) ?? 0 })),
  }));
}

interface MonthlyAttendanceRate {
  month: string;
  present: number;
  absent: number;
  rate: number; // 0-100
}

function buildAttendanceByMonth(rows: MonthlyClinicAttendance[], monthsToShow = 6): MonthlyAttendanceRate[] {
  const byMonth = new Map<string, { present: number; absent: number }>();
  for (const r of rows) {
    if (!byMonth.has(r.month)) byMonth.set(r.month, { present: 0, absent: 0 });
    const entry = byMonth.get(r.month)!;
    entry.present += r.present;
    entry.absent += r.absent;
  }
  const months = Array.from(byMonth.keys()).sort().slice(-monthsToShow);
  return months.map((month) => {
    const { present, absent } = byMonth.get(month)!;
    const total = present + absent;
    const rate = total > 0 ? (present / total) * 100 : 0;
    return { month, present, absent, rate };
  });
}

export default function BalanceScreen() {
  const { colors } = useTheme();
  const [revenueByMonth, setRevenueByMonth] = useState<MonthlyRevenuePoint[]>([]);
  const [clinicRows, setClinicRows] = useState<MonthlyClinicRevenue[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<MonthlyClinicAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md },
    title: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: spacing.md },
    sectionCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
    sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: spacing.sm },
    momRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    momMonth: { color: colors.text, fontSize: 14, fontWeight: "600" },
    momValue: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    momChangeUp: { color: "#16A34A", fontSize: 14, fontWeight: "700" },
    momChangeDown: { color: "#DC2626", fontSize: 14, fontWeight: "700" },
    momChangeNeutral: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
    projValue: { color: colors.primary, fontSize: 26, fontWeight: "700", marginTop: spacing.xs },
    projRange: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
    projConfidence: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm, fontStyle: "italic" },
    clinicBlock: { marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    clinicName: { color: colors.text, fontSize: 14, fontWeight: "700", marginBottom: spacing.xs },
    clinicMonthsRow: { flexDirection: "row", gap: spacing.sm },
    clinicMonthCol: { flex: 1, alignItems: "center", backgroundColor: colors.surfaceLight, borderRadius: radius.sm, paddingVertical: spacing.xs },
    clinicMonthLabel: { color: colors.textMuted, fontSize: 11 },
    clinicMonthValue: { color: colors.text, fontSize: 12, fontWeight: "600", marginTop: 2 },
    attendanceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    attendanceMonth: { color: colors.text, fontSize: 14, fontWeight: "600" },
    attendanceCount: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    attendanceRateHigh: { color: "#16A34A", fontSize: 16, fontWeight: "700" },
    attendanceRateLow: { color: "#DC2626", fontSize: 16, fontWeight: "700" },
  }), [colors]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [revenue, byClinic, byAttendance] = await Promise.all([
        getMonthlyRevenueLast12Months(),
        getMonthlyRevenueByClinic(),
        getMonthlyAttendanceByClinic(),
      ]);
      setRevenueByMonth(revenue);
      setClinicRows(byClinic);
      setAttendanceRows(byAttendance);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await exportBalanceAsPdf();
    } catch (err) {
      console.error("Erro ao exportar balanco:", err);
    } finally {
      setExportingPdf(false);
    }
  };

  const chartData = revenueByMonth.map((p) => ({ label: formatMonthLabel(p.month), value: p.revenue }));

  const momSeries = revenueByMonth.map((p) => ({ month: p.month, value: p.revenue }));
  const momComparisons: MonthComparison[] = calculateMonthOverMonth(momSeries).slice(-6).reverse();
  const projection = calculateProjection(momSeries);

  const clinicTable = buildClinicTable(clinicRows);
  const attendanceByMonth = buildAttendanceByMonth(attendanceRows).reverse();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Balanço</Text>

        <PrimaryButton
          label={exportingPdf ? "Gerando PDF..." : "📄 Exportar Balanço (PDF)"}
          onPress={handleExportPdf}
          disabled={exportingPdf || loading}
        />
        {exportingPdf && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />}

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Receita mensal (últimos 12 meses)</Text>
              <SimpleBarChart data={chartData} emptyMessage="Ainda não há dados suficientes." />
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Variação mês a mês</Text>
              {momComparisons.length === 0 ? (
                <Text style={styles.momValue}>Ainda não há dados suficientes.</Text>
              ) : (
                momComparisons.map((c) => (
                  <View key={c.month} style={styles.momRow}>
                    <View>
                      <Text style={styles.momMonth}>{formatMonthLabel(c.month)}</Text>
                      <Text style={styles.momValue}>{formatCurrency(c.value)}</Text>
                    </View>
                    {c.changePct === null ? (
                      <Text style={styles.momChangeNeutral}>—</Text>
                    ) : (
                      <Text style={c.changePct > 0 ? styles.momChangeUp : c.changePct < 0 ? styles.momChangeDown : styles.momChangeNeutral}>
                        {c.changePct > 0 ? "▲" : c.changePct < 0 ? "▼" : "•"} {Math.abs(c.changePct).toFixed(1)}%
                      </Text>
                    )}
                  </View>
                ))
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Projeção do próximo mês</Text>
              {projection === null ? (
                <Text style={styles.momValue}>É preciso de pelo menos 2 meses de histórico para projetar.</Text>
              ) : (
                <>
                  <Text style={styles.momMonth}>{formatMonthLabel(projection.nextMonth)}</Text>
                  <Text style={styles.projValue}>{formatCurrency(projection.estimate)}</Text>
                  <Text style={styles.projRange}>
                    Faixa estimada: {formatCurrency(projection.low)} – {formatCurrency(projection.high)}
                  </Text>
                  <Text style={styles.projConfidence}>{CONFIDENCE_LABEL[projection.confidence]}</Text>
                </>
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Comparativo por clínica</Text>
              {clinicTable.length === 0 ? (
                <Text style={styles.momValue}>Ainda não há dados suficientes.</Text>
              ) : (
                clinicTable.map((row) => (
                  <View key={row.clinicName} style={styles.clinicBlock}>
                    <Text style={styles.clinicName}>{row.clinicName}</Text>
                    <View style={styles.clinicMonthsRow}>
                      {row.values.map((v) => (
                        <View key={v.month} style={styles.clinicMonthCol}>
                          <Text style={styles.clinicMonthLabel}>{formatMonthShort(v.month)}</Text>
                          <Text style={styles.clinicMonthValue}>{formatCurrency(v.revenue)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Taxa de comparecimento mensal</Text>
              {attendanceByMonth.length === 0 ? (
                <Text style={styles.momValue}>Ainda não há dados suficientes.</Text>
              ) : (
                attendanceByMonth.map((a) => (
                  <View key={a.month} style={styles.attendanceRow}>
                    <View>
                      <Text style={styles.attendanceMonth}>{formatMonthLabel(a.month)}</Text>
                      <Text style={styles.attendanceCount}>{a.present} presenças · {a.absent} faltas</Text>
                    </View>
                    <Text style={a.rate >= 70 ? styles.attendanceRateHigh : styles.attendanceRateLow}>
                      {Math.round(a.rate)}%
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
