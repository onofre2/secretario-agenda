import React, { useCallback, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { spacing, radius } from "../theme/colors";
import { useTheme } from "../context/ThemeContext";
import { getMonthlyRevenueLast12Months, MonthlyRevenuePoint } from "../database/repositories/financialRepo";

export default function BalanceScreen() {
  const { colors } = useTheme();
  const [revenueByMonth, setRevenueByMonth] = useState<MonthlyRevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md },
    title: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: spacing.md },
    placeholder: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginTop: spacing.xl },
  });

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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Balanço</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.placeholder}>
            {revenueByMonth.length} meses de dados carregados. Gráficos e comparativos em construção.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
