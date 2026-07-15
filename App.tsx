import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initDatabase } from "./src/database/db";
import RootNavigator from "./src/navigation/RootNavigator";
import { colors } from "./src/theme/colors";
import { configureNotifications } from "./src/notifications/config";
import { scheduleAllPendingForToday } from "./src/notifications/scheduler";
import { useNotificationResponseListener } from "./src/notifications/responseHandler";

export default function App() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useNotificationResponseListener();

  useEffect(() => {
    initDatabase()
      .then(async () => {
        await configureNotifications();
        await scheduleAllPendingForToday();
        setStatus("ready");
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg(String(err));
        setStatus("error");
      });
  }, []);

  if (status === "loading") {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <Text style={styles.error}>❌ Erro ao iniciar banco de dados</Text>
        <Text style={styles.errorDetail}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  error: { color: colors.danger, fontSize: 16, fontWeight: "700", marginBottom: 8 },
  errorDetail: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
});
