import React, { useMemo } from "react";
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { spacing, radius } from "../theme/colors";
import { useTheme } from "../context/ThemeContext";

interface DetailRow {
  label: string;
  value: string;
}

interface Props {
  visible: boolean;
  title: string;
  rows: DetailRow[];
  onClose: () => void;
}

export default function FinancialDetailModal({ visible, title, rows, onClose }: Props) {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.lg,
    },
    title: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: spacing.md },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLabel: { color: colors.textMuted, fontSize: 14 },
    rowValue: { color: colors.text, fontSize: 14, fontWeight: "600" },
    closeButton: {
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      alignItems: "center",
    },
    closeButtonText: { color: colors.primary, fontWeight: "700" },
  }), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {rows.map((row, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
          </ScrollView>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Fechar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
