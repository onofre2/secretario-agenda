import React, { useCallback, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, Switch, Alert, ActivityIndicator, ScrollView, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { spacing, radius } from "../theme/colors";
import { useTheme } from "../context/ThemeContext";
import PrimaryButton from "../components/PrimaryButton";
import FormInput from "../components/FormInput";
import { getSetting, setSetting, SETTINGS_KEYS } from "../database/repositories/settingsRepo";
import { pickSignatureImage, removeSignatureImage } from "../utils/signatureImport";
import { exportBackup, restoreBackup, markBackupDone } from "../backup/backupService";
import { DEFAULT_LEAD_MINUTES } from "../notifications/config";
import * as Notifications from "expo-notifications";
import { scheduleAllPendingForToday, scheduleMorningAgendaNotification } from "../notifications/scheduler";

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [leadMinutes, setLeadMinutes] = useState(String(DEFAULT_LEAD_MINUTES));
  const [therapistName, setTherapistName] = useState("");
  const [therapistProfession, setTherapistProfession] = useState("");
  const [therapistRegistration, setTherapistRegistration] = useState("");
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);
  const [signaturePath, setSignaturePath] = useState<string | null>(null);

  const styles = useMemo(() => StyleSheet.create({
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
    signaturePreview: { width: "100%", height: 80, marginVertical: spacing.sm, backgroundColor: colors.surfaceLight, borderRadius: radius.sm },
  }), [colors]);

  const load = useCallback(async () => {
    const lead = await getSetting(SETTINGS_KEYS.NOTIFICATION_LEAD_MINUTES);
    if (lead) setLeadMinutes(lead);
    const notifEnabled = await getSetting(SETTINGS_KEYS.NOTIFICATIONS_ENABLED);
    setNotificationsEnabled(notifEnabled !== "0");
    const sig = await getSetting(SETTINGS_KEYS.SIGNATURE_IMAGE_PATH);
    setSignaturePath(sig);
    const tn = await getSetting(SETTINGS_KEYS.THERAPIST_NAME);
    if (tn) setTherapistName(tn);
    const tp = await getSetting(SETTINGS_KEYS.THERAPIST_PROFESSION);
    if (tp) setTherapistProfession(tp);
    const tr = await getSetting(SETTINGS_KEYS.THERAPIST_REGISTRATION);
    if (tr) setTherapistRegistration(tr);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSaveTherapistInfo = async () => {
    await setSetting(SETTINGS_KEYS.THERAPIST_NAME, therapistName.trim());
    await setSetting(SETTINGS_KEYS.THERAPIST_PROFESSION, therapistProfession.trim());
    await setSetting(SETTINGS_KEYS.THERAPIST_REGISTRATION, therapistRegistration.trim());
    Alert.alert("Salvo", "Dados do terapeuta atualizados. Aparecerão no rodapé dos PDFs.");
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await setSetting(SETTINGS_KEYS.NOTIFICATIONS_ENABLED, value ? "1" : "0");
    if (!value) {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } else {
      await scheduleAllPendingForToday();
      await scheduleMorningAgendaNotification();
    }
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
      await markBackupDone();
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

  const handlePickSignature = async () => {
    const ok = await pickSignatureImage();
    if (ok) {
      const sig = await getSetting(SETTINGS_KEYS.SIGNATURE_IMAGE_PATH);
      setSignaturePath(sig);
    }
  };

  const handleRemoveSignature = async () => {
    await removeSignatureImage();
    setSignaturePath(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md }}>
      <Section title="Aparência" styles={styles}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Modo escuro</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.surfaceLight, true: colors.primary }}
          />
        </View>
        <Text style={styles.hint}>
          Alterna entre tema escuro e claro em todo o aplicativo.
        </Text>
      </Section>

      <Section title="Notificações" styles={styles}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Ativar notificações</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.surfaceLight, true: colors.primary }}
            />
          </View>
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

      <Section title="Backup e Restauração" styles={styles}>
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

        <Section title="Dados do terapeuta" styles={styles}>
          <Text style={styles.hint}>
            Aparecem no rodapé dos PDFs de Financeiro e Evolução.
          </Text>
          <FormInput label="Nome" value={therapistName} onChangeText={setTherapistName} />
          <FormInput label="Profissão" value={therapistProfession} onChangeText={setTherapistProfession} placeholder="Ex: Fisioterapeuta" />
          <FormInput label="Número de registro" value={therapistRegistration} onChangeText={setTherapistRegistration} placeholder="Ex: CREFITO 12345-F" />
          <PrimaryButton label="Salvar dados do terapeuta" onPress={handleSaveTherapistInfo} />
        </Section>

        <Section title="Assinatura digital" styles={styles}>
          <Text style={styles.hint}>
            A assinatura escolhida aparece automaticamente no rodapé dos PDFs de Financeiro e
            Evolução, na aba Relatórios.
          </Text>
          {signaturePath && (
            <Image source={{ uri: signaturePath }} style={styles.signaturePreview} resizeMode="contain" />
          )}
          <PrimaryButton
            label={signaturePath ? "Trocar assinatura" : "Escolher assinatura"}
            onPress={handlePickSignature}
          />
          {signaturePath && (
            <PrimaryButton label="Remover assinatura" onPress={handleRemoveSignature} variant="outline" />
          )}
        </Section>
    </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children, styles }: { title: string; children: React.ReactNode; styles: ReturnType<typeof StyleSheet.create> }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
