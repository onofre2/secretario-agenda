import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing, radius } from "../theme/colors";
import { formatCurrency } from "../utils/date";
import { getRangeFor, PeriodKind } from "../utils/period";
import { getReportRows, ReportRow } from "../database/repositories/reportsRepo";
import { exportReportAsCsv } from "../reports/exportCsv";
import { exportReportAsExcel } from "../reports/exportExcel";
import { exportReportAsPdf } from "../reports/exportPdf";
import PrimaryButton from "../components/PrimaryButton";

const PERIODS: { key: PeriodKind; label: string }[] = [
  { key: "week", label: "Semanal" },
  { key: "month", label: "Mensal" },
  { key: "year", label: "Anual" },
];

const STATUS_LABEL: Record<string, string> = {
  present: "✅ Presente",
  absent: "❌ Ausente",
  pending: "⏳ Pendente",
};

export default function ReportsScreen() {
  const [period, setPeriod] = useState<PeriodKind>("month");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | "pdf" | null>(null);

  const range = getRangeFor(period);

  const load = useCallback(async () => {
    const data = await getReportRows(range.start, range.end);
    setRows(data);
  }, [range.start, range.end]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const fileLabel = `${period}-${range.start}-a-${range.end}`;

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    if (rows.length === 0) return;
    setExporting(format);
    try {
      if (format === "csv") await exportReportAsCsv(rows, fileLabel);
      if (format === "xlsx") await exportReportAsExcel(rows, fileLabel);
      if (format === "pdf") await exportReportAsPdf(rows, range.label);
    } catch (err) {
      console.error("Erro ao exportar relatório:", err);
    } finally {
      setExporting(null);
    }
  };

  return (
    <View style={styles.container}>
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
      <Text style={styles.rangeLabel}>{range.label} · {rows.length} atendimento(s)</Text>

      <View style={styles.exportRow}>
        <PrimaryButton
          label={exporting === "pdf" ? "Gerando..." : "PDF"}
          onPress={() => handleExport("pdf")}
          disabled={rows.length === 0 || exporting !== null}
          style={styles.exportButton}
        />
        <PrimaryButton
          label={exporting === "xlsx" ? "Gerando..." : "Excel"}
          onPress={() => handleExport("xlsx")}
          disabled={rows.length === 0 || exporting !== null}
          variant="outline"
          style={styles.exportButton}
        />
        <PrimaryButton
          label={exporting === "csv" ? "Gerando..." : "CSV"}
          onPress={() => handleExport("csv")}
          disabled={rows.length === 0 || exporting !== null}
          variant="outline"
          style={styles.exportButton}
        />
      </View>
      {exporting && <ActivityIndicator color={colors.primary} style={{ marginBottom: spacing.sm }} />}

      <FlatList
        data={rows}
        keyExtractor={(item, idx) => `${item.date}-${item.time}-${idx}`}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum atendimento neste período.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowPatient}>{item.patient_name}</Text>
              <Text style={styles.rowDetail}>
                {item.date} · {item.time} · {item.clinic_name}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.rowStatus}>{STATUS_LABEL[item.status]}</Text>
              <Text style={styles.rowValue}>{formatCurrency(item.session_value)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
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
  rangeLabel: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm, marginBottom: spacing.md },
  exportRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  exportButton: { flex: 1, marginTop: 0 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPatient: { color: colors.text, fontSize: 14, fontWeight: "600" },
  rowDetail: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  rowStatus: { color: colors.textMuted, fontSize: 12 },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 2 },
});
