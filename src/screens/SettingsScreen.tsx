import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Switch, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing, radius } from "../theme/colors";
import PrimaryButton from "../components/PrimaryButton";
import { getSetting, setSetting, SETTINGS_KEYS } from "../database/repositories/settingsRepo";
import { exportBackup, restoreBackup } from "../backup/backupService";
import { DEFAULT_LEAD_MINUTES } from "../notifications/config";

export default function SettingsScreen() {
  const [darkMode, setDarkMode] = useState(true);
  const [leadMinutes, setLeadMinutes] = useState(String(DEFAULT_LEAD_MINUTES));
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);

  const load = useCallback(async () => {
    const theme = await getSetting(SETTINGS_KEYS.THEME);
    setDarkMode(theme !== "light");
    const lead = await getSetting(SETTINGS_KEYS.NOTIFICATION_LEAD_MINUTES);
    if (lead) setLeadMinutes(lead);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleToggleTheme = async (value: boolean) => {
    setDarkMode(value);
    await setSetting(SETTINGS_KEYS.THEME, value ? "dark" : "light");
  };

  const handleSaveLeadMinutes = async () => {
    const parsed = Number(leadMinutes);
    if (!parsed || parsed < 1) return;
    await setSetting(SETTINGS_KEYS.NOTIFICATION_LEAD_MINUTES, String(parsed));
    Alert.alert("Salvo", "Antecedência dos lembretes atualizada.");
  };

  const handleBackup = async () => {
    setBusy("backup");
    try {
      await exportBackup();
    } catch (err) {
      Alert.alert("Erro ao gerar backup", String(err));
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async () => {
    Alert.alert(
      "Restaurar backup",
      "Isso substitui TODOS os dados atuais pelos dados do arquivo escolhido. Essa ação não pode ser desfeita. Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Restaurar",
          style: "destructive",
          onPress: async () => {
            setBusy("restore");
            try {
              const result = await restoreBackup();
              if (result === "restored") {
                Alert.alert("Restaurado", "Backup restaurado com sucesso. Reabra o app para garantir que tudo carregou corretamente.");
              }
            } catch (err) {
              Alert.alert("Erro ao restaurar", String(err));
            } finally {
              setBusy(null);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <Section title="Aparência">
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Modo escuro</Text>
          <Switch
            value={darkMode}
            onValueChange={handleToggleTheme}
            trackColor={{ false: colors.surfaceLight, true: colors.primary }}
          />
        </View>
        <Text style={styles.hint}>
          Preferência salva. A troca visual completa para modo claro entra numa
          próxima atualização — hoje o app usa o tema escuro em todas as telas.
        </Text>
      </Section>

      <Section title="Notificações">
        <Text style={styles.rowLabel}>Antecedência do lembrete (minutos)</Text>
        <View style={styles.leadRow}>
          <View style={styles.leadInputBox}>
            <Text style={styles.leadValue}>{leadMinutes} min</Text>
          </View>
          <PrimaryButton label="Salvar" onPress={handleSaveLeadMinutes} style={{ flex: 1 }} />
        </View>
        <Text style={styles.hint}>
          Valor atual usado ao agendar lembretes é sempre {DEFAULT_LEAD_MINUTES} minutos por
          padrão nesta versão; o ajuste acima fica salvo para uso no próximo módulo de
          notificações configuráveis.
        </Text>
      </Section>

      <Section title="Backup e Restauração">
        <Text style={styles.hint}>
          Gera um arquivo com todos os dados (pacientes, clínicas, agenda, financeiro,
          evoluções clínicas) para guardar em local seguro.
        </Text>
        <PrimaryButton
          label={busy === "backup" ? "Gerando..." : "Exportar backup"}
          onPress={handleBackup}
          disabled={busy !== null}
        />
        <PrimaryButton
          label={busy === "restore" ? "Restaurando..." : "Restaurar backup"}
          onPress={handleRestore}
          variant="outline"
          disabled={busy !== null}
        />
        {busy && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />}
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { color: colors.text, fontSize: 15 },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs, lineHeight: 16 },
  leadRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs, alignItems: "center" },
  leadInputBox: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leadValue: { color: colors.text, fontSize: 16 },
});
