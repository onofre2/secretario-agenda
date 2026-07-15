import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme/colors";
import { formatCurrency } from "../utils/date";

interface BarDatum {
  label: string;
  value: number;
}

interface Props {
  data: BarDatum[];
  emptyMessage?: string;
}

export default function SimpleBarChart({ data, emptyMessage }: Props) {
  if (data.length === 0) {
    return <Text style={styles.empty}>{emptyMessage ?? "Sem dados neste período."}</Text>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={styles.wrapper}>
      {data.map((item) => (
        <View key={item.label} style={styles.row}>
          <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${(item.value / max) * 100}%` }]} />
          </View>
          <Text style={styles.value}>{formatCurrency(item.value)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: spacing.sm },
  row: { marginBottom: spacing.sm },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: 2 },
  barTrack: {
    height: 10,
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: colors.primary, borderRadius: radius.sm },
  value: { color: colors.text, fontSize: 12, marginTop: 2, fontWeight: "600" },
  empty: { color: colors.textMuted, textAlign: "center", paddingVertical: spacing.md },
});
