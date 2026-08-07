import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { spacing, radius } from "../theme/colors";
import { useTheme } from "../context/ThemeContext";
import { formatCurrency } from "../utils/date";
import { getSetting, setSetting, SETTINGS_KEYS } from "../database/repositories/settingsRepo";

interface Props {
  monthRevenue: number;
}

export default function MonthlyBreakdownCard({ monthRevenue }: Props) {
  const { colors } = useTheme();
  const [percent, setPercent] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const styles = useMemo(() => StyleSheet.create({
    wrapper: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
    title: { color: colors.text, fontSize: 18, fontWeight: "700" },
    subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    editLink: { color: colors.primary, fontSize: 13, fontWeight: "600" },
    inputRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, alignItems: "center" },
    input: { flex: 1, backgroundColor: colors.surfaceLight, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    percentSign: { color: colors.textMuted, fontSize: 16, fontWeight: "600" },
    saveBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.md, justifyContent: "center" },
    saveBtnText: { color: "#0F172A", fontWeight: "700" },
    totalValue: { color: colors.primary, fontSize: 28, fontWeight: "700", marginTop: spacing.xs, marginBottom: spacing.md },
    breakdownRow: { flexDirection: "row", gap: spacing.md },
    breakdownCol: { flex: 1 },
    breakdownLabel: { color: colors.textMuted, fontSize: 12 },
    breakdownValueNet: { color: colors.primary, fontSize: 18, fontWeight: "700", marginTop: 4 },
    breakdownValueInvest: { color: colors.warning, fontSize: 18, fontWeight: "700", marginTop: 4 },
  }), [colors]);

  useEffect(() => {
    (async () => {
      const stored = await getSetting(SETTINGS_KEYS.INVESTMENT_PERCENT);
      if (stored) setPercent(Number(stored));
    })();
  }, []);

  const handleSave = async () => {
    const parsed = Number(inputValue.replace(",", "."));
    if (isNaN(parsed) || parsed < 0 || parsed > 100) return;
    await setSetting(SETTINGS_KEYS.INVESTMENT_PERCENT, String(parsed));
    setPercent(parsed);
    setEditing(false);
  };

  const pct = percent ?? 0;
  const investmentAmount = monthRevenue * (pct / 100);
  const netAmount = monthRevenue - investmentAmount;

  if (percent === null || editing) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.title}>Ganho total do mês</Text>
        <Text style={styles.subtitle}>Defina o percentual de reserva financeira sobre a receita</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ex: 20"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={inputValue}
            onChangeText={setInputValue}
          />
          <Text style={styles.percentSign}>%</Text>
          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Salvar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Ganho total do mês</Text>
        <Pressable onPress={() => { setInputValue(String(percent)); setEditing(true); }}>
          <Text style={styles.editLink}>Editar</Text>
        </Pressable>
      </View>

      <Text style={styles.totalValue}>{formatCurrency(monthRevenue)}</Text>

      <View style={styles.breakdownRow}>
        <View style={styles.breakdownCol}>
          <Text style={styles.breakdownLabel}>Ganho profissional líquido</Text>
          <Text style={styles.breakdownValueNet}>{formatCurrency(netAmount)}</Text>
        </View>
        <View style={styles.breakdownCol}>
          <Text style={styles.breakdownLabel}>Reserva financeira ({pct}%)</Text>
          <Text style={styles.breakdownValueInvest}>{formatCurrency(investmentAmount)}</Text>
        </View>
      </View>
    </View>
  );
}
