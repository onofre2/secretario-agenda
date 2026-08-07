import React, { useMemo } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";

export default function FloatingAddButton({ onPress, style }: { onPress: () => void; style?: object }) {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    fab: {
      position: "absolute",
      right: 20,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    icon: { fontSize: 28, color: "#0F172A", fontWeight: "700", marginTop: -2 },
  }), [colors]);

  return (
    <Pressable style={[styles.fab, style]} onPress={onPress}>
      <Text style={styles.icon}>+</Text>
    </Pressable>
  );
}
