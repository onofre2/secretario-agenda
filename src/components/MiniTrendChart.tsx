import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme/colors";
import { formatCurrency } from "../utils/date";

interface TrendDatum {
  label: string;
  value: number;
}

interface Props {
  data: TrendDatum[];
  emptyMessage?: string;
}

const CHART_HEIGHT = 70;

export default function MiniTrendChart({ data, emptyMessage }: Props) {
  if (data.length === 0) {
    return <Text style={styles.empty}>{emptyMessage ?? "Sem dados neste período."}</Text>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <View>
      <Text style={styles.total}>Total no período: {formatCurrency(total)}</Text>
      <View style={styles.chartRow}>
        {data.map((item) => (
          <View key={item.label} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { height: `${Math.max((item.value / max) * 100, item.value > 0 ? 6 : 0)}%` },
                ]}
              />
            </View>
            <Text style={styles.barLabel} numberOfLines={1}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  total: { color: colors.text, fontSize: 13, fontWeight: "600", marginBottom: spacing.sm },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: CHART_HEIGHT,
    gap: spacing.xs,
  },
  barCol: { flex: 1, alignItems: "center", height: "100%", justifyContent: "flex-end" },
  barTrack: {
    width: "70%",
    height: CHART_HEIGHT - 18,
    justifyContent: "flex-end",
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  barFill: { width: "100%", backgroundColor: colors.primary, borderRadius: radius.sm },
  barLabel: { color: colors.textMuted, fontSize: 9, marginTop: 4 },
  empty: { color: colors.textMuted, textAlign: "center", paddingVertical: spacing.md },
});
