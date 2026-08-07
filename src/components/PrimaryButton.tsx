import React, { useMemo } from "react";
import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { spacing, radius } from "../theme/colors";
import { useTheme } from "../context/ThemeContext";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "danger" | "outline";
  style?: ViewStyle;
  disabled?: boolean;
}

export default function PrimaryButton({ label, onPress, variant = "primary", style, disabled }: Props) {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    base: {
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: "center",
      marginTop: spacing.sm,
    },
    primary: { backgroundColor: colors.primary },
    danger: { backgroundColor: colors.danger },
    outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
    disabled: { opacity: 0.5 },
    text: { color: "#0F172A", fontSize: 16, fontWeight: "700" },
    textOutline: { color: colors.text },
  }), [colors]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        variant === "primary" && styles.primary,
        variant === "danger" && styles.danger,
        variant === "outline" && styles.outline,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.text, variant === "outline" && styles.textOutline]}>{label}</Text>
    </Pressable>
  );
}
