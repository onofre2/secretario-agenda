import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing } from "../theme/colors";

interface Props {
  title: string;
  description: string;
}

export function PlaceholderScreen({ title, description }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Text style={styles.soon}>🚧 Em construção</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: "700", marginBottom: spacing.sm },
  description: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginBottom: spacing.md },
  soon: { color: colors.warning, fontSize: 14 },
});
