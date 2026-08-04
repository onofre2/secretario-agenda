import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Polygon, Line, Text as SvgText } from "react-native-svg";
import { colors, spacing } from "../theme/colors";

interface RadarSeries {
  label: string;
  color: string;
  values: number[];
}

interface Props {
  axisLabels: string[];
  series: RadarSeries[];
  size?: number;
}

export default function RadarChart({ axisLabels, series, size = 260 }: Props) {
  const center = size / 2;
  const labelPadding = 36;
  const maxRadius = center - labelPadding;
  const axisCount = axisLabels.length;

  const axisMax = axisLabels.map((_, axisIndex) =>
    Math.max(1, ...series.map((s) => s.values[axisIndex] ?? 0))
  );

  const pointForAxis = (axisIndex: number, fraction: number) => {
    const angle = (-90 + (axisIndex * 360) / axisCount) * (Math.PI / 180);
    const r = maxRadius * fraction;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <View style={styles.wrapper}>
      <Svg width={size} height={size}>
        {gridLevels.map((level) => {
          const points = axisLabels
            .map((_, i) => {
              const p = pointForAxis(i, level);
              return `${p.x},${p.y}`;
            })
            .join(" ");
          return (
            <Polygon
              key={level}
              points={points}
              fill="none"
              stroke={colors.border}
              strokeWidth={1}
            />
          );
        })}

        {axisLabels.map((_, i) => {
          const p = pointForAxis(i, 1);
          return (
            <Line
              key={i}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke={colors.border}
              strokeWidth={1}
            />
          );
        })}

        {series.map((s) => {
          const points = s.values
            .map((v, i) => {
              const fraction = (v ?? 0) / axisMax[i];
              const p = pointForAxis(i, fraction);
              return `${p.x},${p.y}`;
            })
            .join(" ");
          return (
            <Polygon
              key={s.label}
              points={points}
              fill={s.color}
              fillOpacity={0.25}
              stroke={s.color}
              strokeWidth={2}
            />
          );
        })}

        {axisLabels.map((label, i) => {
          const p = pointForAxis(i, 1.18);
          return (
            <SvgText
              key={label}
              x={p.x}
              y={p.y}
              fontSize={11}
              fill={colors.textMuted}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>

      <View style={styles.legendRow}>
        {series.map((s) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText} numberOfLines={1}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md, justifyContent: "center", paddingHorizontal: spacing.sm },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: 150 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.textMuted, fontSize: 12 },
});
