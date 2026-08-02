import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme/colors";
import { formatCurrency } from "../utils/date";
import { getSetting, setSetting, SETTINGS_KEYS } from "../database/repositories/settingsRepo";

interface Props {
  monthRevenue: number;
}

export default function MonthlyGoalCard({ monthRevenue }: Props) {
  const [goal, setGoal] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    (async () => {
      const stored = await getSetting(SETTINGS_KEYS.MONTHLY_GOAL);
      if (stored) setGoal(Number(stored));
    })();
  }, []);

  const handleSave = async () => {
    const parsed = Number(inputValue.replace(",", "."));
    if (!parsed || parsed <= 0) return;
    await setSetting(SETTINGS_KEYS.MONTHLY_GOAL, String(parsed));
    setGoal(parsed);
    setEditing(false);
  };

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyGoal = goal ? goal / daysInMonth : 0;
  const weeklyGoal = dailyGoal * 7;
  const remainingDays = Math.max(daysInMonth - now.getDate() + 1, 1);
  const remainingAmount = goal ? Math.max(goal - monthRevenue, 0) : 0;
  const perDayNeeded = remainingAmount / remainingDays;
  const progressPct = goal ? Math.min((monthRevenue / goal) * 100, 100) : 0;

  if (!goal || editing) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.title}>Meta financeira mensal</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ex: 3000"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={inputValue}
            onChangeText={setInputValue}
          />
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
        <Text style={styles.title}>Meta financeira mensal</Text>
        <Pressable onPress={() => { setInputValue(String(goal)); setEditing(true); }}>
          <Text style={styles.editLink}>Editar</Text>
        </Pressable>
      </View>

      <Text style={styles.progressText}>
        {formatCurrency(monthRevenue)} de {formatCurrency(goal)} ({Math.round(progressPct)}%)
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Meta diária</Text>
          <Text style={styles.metaValue}>{formatCurrency(dailyGoal)}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Meta semanal</Text>
          <Text style={styles.metaValue}>{formatCurrency(weeklyGoal)}</Text>
        </View>
      </View>

      {remainingAmount > 0 ? (
        <Text style={styles.hint}>
          Faltam {formatCurrency(remainingAmount)} — cerca de {formatCurrency(perDayNeeded)}/dia nos próximos {remainingDays} dias.
        </Text>
      ) : (
        <Text style={styles.hintDone}>Meta batida! 🎉</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 16, fontWeight: "700" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  editLink: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  inputRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  input: { flex: 1, backgroundColor: colors.surfaceLight, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.md, justifyContent: "center" },
  saveBtnText: { color: "#0F172A", fontWeight: "700" },
  progressText: { color: colors.text, fontSize: 13, fontWeight: "600", marginBottom: spacing.xs },
  progressTrack: { height: 10, backgroundColor: colors.surfaceLight, borderRadius: radius.sm, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: radius.sm },
  metaRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  metaCol: { flex: 1 },
  metaLabel: { color: colors.textMuted, fontSize: 12 },
  metaValue: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 2 },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
  hintDone: { color: colors.primary, fontSize: 13, fontWeight: "600", marginTop: spacing.sm },
});
