import React, { useCallback, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { spacing, radius } from "../theme/colors";
import { useTheme } from "../context/ThemeContext";
import { formatCurrency } from "../utils/date";
import { getMonthlyRevenueLast12Months, MonthlyRevenuePoint } from "../database/repositories/financialRepo";
import SimpleBarChart from "../components/SimpleBarChart";
import { calculateMonthOverMonth, MonthComparison } from "../utils/balanceCalc";

const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const abbr = MONTH_ABBR[(m ?? 1) - 1] ?? month;
  return `${abbr}/${String(year).slice(2)}`;
}

export default function BalanceScreen() {
  const { colors } = useTheme();
  const [revenueByMonth, setRevenueByMonth] = useState<MonthlyRevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);

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
  }), [colors]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const revenue = await getMonthlyRevenueLast12Months();
      setRevenueByMonth(revenue);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const chartData = revenueByMonth.map((p) => ({ label: formatMonthLabel(p.month), value: p.revenue }));

  const momSeries = revenueByMonth.map((p) => ({ month: p.month, value: p.revenue }));
  const momComparisons: MonthComparison[] = calculateMonthOverMonth(momSeries).slice(-6).reverse();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Balanço</Text>

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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
