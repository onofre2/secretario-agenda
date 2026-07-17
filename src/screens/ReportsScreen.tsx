import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing, radius } from "../theme/colors";
import { formatCurrency } from "../utils/date";
import { getRangeFor, PeriodKind } from "../utils/period";
import {
  getReportRows,
  ReportRow,
  getClinicalEvolutionRows,
  ClinicalEvolutionRow,
} from "../database/repositories/reportsRepo";
import { exportReportAsCsv } from "../reports/exportCsv";
import { exportReportAsExcel } from "../reports/exportExcel";
import { exportReportAsPdf } from "../reports/exportPdf";
import { exportClinicalEvolutionAsPdf } from "../reports/exportClinicalPdf";
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

type ReportKind = "financial" | "clinical";

export default function ReportsScreen() {
  const [reportKind, setReportKind] = useState<ReportKind>("financial");
  const [period, setPeriod] = useState<PeriodKind>("month");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [clinicalRows, setClinicalRows] = useState<ClinicalEvolutionRow[]>([]);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | "pdf" | null>(null);

  const range = getRangeFor(period);

  const load = useCallback(async () => {
    const [financial, clinical] = await Promise.all([
      getReportRows(range.start, range.end),
      getClinicalEvolutionRows(range.start, range.end),
    ]);
    setRows(financial);
    setClinicalRows(clinical);
  }, [range.start, range.end]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const fileLabel = `${period}-${range.start}-a-${range.end}`;

  const handleExportFinancial = async (format: "csv" | "xlsx" | "pdf") => {
    if (rows.length === 0) return;
    setExporting(format);
    try {
      if (format === "csv") await exportReportAsCsv(rows, fileLabel);
      if (format === "xlsx") await exportReportAsExcel(rows, fileLabel);
      if (format === "pdf") await exportReportAsPdf(rows, range.label);
    } catch (err) {
      console.error("Erro ao exportar relatório financeiro:", err);
    } finally {
      setExporting(null);
    }
  };

  const handleExportClinical = async () => {
    if (clinicalRows.length === 0) return;
    setExporting("pdf");
    try {
      await exportClinicalEvolutionAsPdf(clinicalRows, range.label);
    } catch (err) {
      console.error("Erro ao exportar evolução clínica:", err);
    } finally {
      setExporting(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.kindRow}>
        <Pressable
          style={[styles.kindChip, reportKind === "financial" && styles.kindChipActive]}
          onPress={() => setReportKind("financial")}
        >
          <Text style={[styles.kindText, reportKind === "financial" && styles.kindTextActive]}>
            💰 Financeiro
          </Text>
        </Pressable>
        <Pressable
          style={[styles.kindChip, reportKind === "clinical" && styles.kindChipActive]}
          onPress={() => setReportKind("clinical")}
        >
          <Text style={[styles.kindText, reportKind === "clinical" && styles.kindTextActive]}>
            📋 Evolução Clínica
          </Text>
        </Pressable>
      </View>

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

      {reportKind === "financial" ? (
        <>
          <Text style={styles.rangeLabel}>{range.label} · {rows.length} atendimento(s)</Text>

          <View style={styles.exportRow}>
            <PrimaryButton
              label={exporting === "pdf" ? "Gerando..." : "PDF"}
              onPress={() => handleExportFinancial("pdf")}
              disabled={rows.length === 0 || exporting !== null}
              style={styles.exportButton}
            />
            <PrimaryButton
              label={exporting === "xlsx" ? "Gerando..." : "Excel"}
              onPress={() => handleExportFinancial("xlsx")}
              disabled={rows.length === 0 || exporting !== null}
              variant="outline"
              style={styles.exportButton}
            />
            <PrimaryButton
              label={exporting === "csv" ? "Gerando..." : "CSV"}
              onPress={() => handleExportFinancial("csv")}
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
            ListEmptyComponent={<Text style={styles.empty}>Nenhum atendimento neste período.</Text>}
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
        </>
      ) : (
        <>
          <Text style={styles.rangeLabel}>
            {range.label} · {clinicalRows.length} evolução(ões)
          </Text>

          <View style={styles.exportRow}>
            <PrimaryButton
              label={exporting === "pdf" ? "Gerando..." : "Exportar PDF (só evoluções)"}
              onPress={handleExportClinical}
              disabled={clinicalRows.length === 0 || exporting !== null}
              style={styles.exportButton}
            />
          </View>
          <Text style={styles.hint}>
            Este PDF não inclui valores nem dados financeiros — só as evoluções clínicas,
            ideal para compartilhar com o paciente ou outro profissional.
          </Text>
          {exporting && <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.sm }} />}

          <FlatList
            data={clinicalRows}
            keyExtractor={(item, idx) => `${item.date}-${item.time}-${idx}`}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
            ListEmptyComponent={<Text style={styles.empty}>Nenhuma evolução registrada neste período.</Text>}
            renderItem={({ item }) => (
              <View style={styles.clinicalCard}>
                <View style={styles.clinicalHeader}>
                  <Text style={styles.rowPatient}>{item.patient_name}</Text>
                  <Text style={styles.rowDetail}>{item.date} · {item.time}</Text>
                </View>
                <Text style={styles.clinicalClinic}>{item.clinic_name}</Text>
                <Text style={styles.clinicalContent} numberOfLines={4}>
                  {item.content}
                </Text>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  kindRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  kindChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  kindChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  kindText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  kindTextActive: { color: "#0F172A" },
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
  hint: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.md, lineHeight: 16 },
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
  clinicalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clinicalHeader: { flexDirection: "row", justifyContent: "space-between" },
  clinicalClinic: { color: colors.textMuted, fontSize: 12, marginTop: 2, marginBottom: spacing.xs },
  clinicalContent: { color: colors.text, fontSize: 13, lineHeight: 18 },
});
