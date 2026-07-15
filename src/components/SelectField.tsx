import React, { useState } from "react";
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme/colors";

export interface SelectOption {
  id: number;
  label: string;
}

interface Props {
  label: string;
  value: SelectOption | null;
  options: SelectOption[];
  onSelect: (option: SelectOption) => void;
  emptyMessage?: string;
}

export default function SelectField({ label, value, options, onSelect, emptyMessage }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label} *</Text>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value ? value.label : "Toque para selecionar"}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            {options.length === 0 ? (
              <Text style={styles.empty}>{emptyMessage ?? "Nenhuma opção cadastrada ainda."}</Text>
            ) : (
              <FlatList
                data={options}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.option}
                    onPress={() => {
                      onSelect(item);
                      setOpen(false);
                    }}
                  >
                    <Text style={styles.optionText}>{item.label}</Text>
                  </Pressable>
                )}
              />
            )}
            <Pressable style={styles.closeButton} onPress={() => setOpen(false)}>
              <Text style={styles.closeText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs },
  field: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  valueText: { color: colors.text, fontSize: 16 },
  placeholderText: { color: colors.textMuted, fontSize: 16 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    maxHeight: "70%",
  },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: spacing.md },
  option: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionText: { color: colors.text, fontSize: 16 },
  empty: { color: colors.textMuted, textAlign: "center", paddingVertical: spacing.lg },
  closeButton: { marginTop: spacing.md, alignItems: "center", padding: spacing.sm },
  closeText: { color: colors.primary, fontSize: 16, fontWeight: "600" },
});
