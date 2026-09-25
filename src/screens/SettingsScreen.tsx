import React, { useCallback, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, Switch, Alert, ActivityIndicator, ScrollView, Image, TextInput } from "react-native";
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
import { scheduleAllPendingForToday, scheduleMorningAgendaNotification, scheduleMonthlyBackupNotification, scheduleYearEndBackupNotification, scheduleFreeSlotsNotification, cancelFreeSlotsNotification } from "../notifications/scheduler";
import { WorkDay, DEFAULT_WORK_HOURS } from "../utils/freeSlots";

const WEEKDAY_LABEL: Record<number, string> = { 0: "Domingo", 1: "Segunda", 2: "Terça", 3: "Quarta", 4: "Quinta", 5: "Sexta", 6: "Sábado" };

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [leadMinutes, setLeadMinutes] = useState(String(DEFAULT_LEAD_MINUTES));
  const [therapistName, setTherapistName] = useState("");
  const [therapistProfession, setTherapistProfession] = useState("");
  const [therapistRegistration, setTherapistRegistration] = useState("");
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);
  const [signaturePath, setSignaturePath] = useState<string | null>(null);
  const [workHours, setWorkHours] = useState<WorkDay[]>(DEFAULT_WORK_HOURS);

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
    warningText: { color: colors.danger, fontSize: 13, lineHeight: 19 },
    creditFooter: { alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.xl, opacity: 0.7 },
    creditAvatar: { width: 96, height: 96, marginBottom: 4 },
    creditText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
    workRow: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 },
    workDayCol: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    workTimeCol: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
    workInput: { flex: 1, backgroundColor: colors.surfaceLight, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 12, paddingVertical: 8, textAlign: "center" },
    workSep: { color: colors.textMuted, fontSize: 13 },
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
    const wh = await getSetting(SETTINGS_KEYS.WORK_HOURS);
    if (wh) {
      try { setWorkHours(JSON.parse(wh)); } catch { /* mantem o padrao */ }
    }
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
      // Limpa os controles de idempotencia para que, ao reativar, tudo seja reagendado do zero.
      await setSetting(SETTINGS_KEYS.MORNING_NOTIFICATION_ID, "");
      await setSetting(SETTINGS_KEYS.MORNING_NOTIFICATION_TRIGGER, "");
      await setSetting(SETTINGS_KEYS.MONTHLY_BACKUP_NOTIFICATION_ID, "");
      await setSetting(SETTINGS_KEYS.MONTHLY_BACKUP_MONTH, "");
      await setSetting(SETTINGS_KEYS.YEAR_END_BACKUP_NOTIFICATION_ID, "");
      await setSetting(SETTINGS_KEYS.YEAR_END_BACKUP_YEAR, "");
    } else {
      await scheduleAllPendingForToday();
      await scheduleMorningAgendaNotification();
      await scheduleMonthlyBackupNotification();
      await scheduleYearEndBackupNotification();
    }
  };

  const toggleWorkDay = (weekday: number) => {
    setWorkHours((prev) => prev.map((w) => (w.weekday === weekday ? { ...w, enabled: w.enabled === false } : w)));
  };

  const updateWorkHour = (weekday: number, field: "start" | "end", value: string) => {
    setWorkHours((prev) => prev.map((w) => (w.weekday === weekday ? { ...w, [field]: value } : w)));
  };

  const handleSaveWorkHours = async () => {
    await setSetting(SETTINGS_KEYS.WORK_HOURS, JSON.stringify(workHours));
    await setSetting(SETTINGS_KEYS.FREE_SLOTS_WEEK, "");
    await cancelFreeSlotsNotification();
    await scheduleFreeSlotsNotification();
    Alert.alert("Salvo", "Dias de trabalho atualizados.");
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

      <Section title="Dias de trabalho" styles={styles}>
        <Text style={styles.hint}>
          Configure os dias e horarios em que voce atende. Toda segunda-feira o app avisa
          quais horarios da semana estao livres.
        </Text>
        {workHours.map((w) => (
          <View key={w.weekday} style={styles.workRow}>
            <View style={styles.workDayCol}>
              <Text style={styles.rowLabel}>{WEEKDAY_LABEL[w.weekday]}</Text>
              <Switch
                value={w.enabled}
                onValueChange={() => toggleWorkDay(w.weekday)}
                trackColor={{ false: colors.surfaceLight, true: colors.primary }}
              />
            </View>
            {w.enabled && (
              <View style={styles.workTimeCol}>
                <TextInput
                  style={styles.workInput}
                  value={w.start}
                  onChangeText={(v) => updateWorkHour(w.weekday, "start", v)}
                  placeholder="08:00"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.workSep}>as</Text>
                <TextInput
                  style={styles.workInput}
                  value={w.end}
                  onChangeText={(v) => updateWorkHour(w.weekday, "end", v)}
                  placeholder="19:00"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            )}
          </View>
        ))}
        <PrimaryButton label="Salvar dias de trabalho" onPress={handleSaveWorkHours} style={{ marginTop: 12 }} />
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

        <Section title="Aviso importante" styles={styles}>
          <Text style={styles.warningText}>
            [IMPORTANTE]{"\n\n"}
            Toda evolução clínica é individual e deve ser editada antes de imprimir.{"\n\n"}
            Final do mês — "imprima" o relatório individual (evolução) de cada paciente.{"\n\n"}
            (Para validação){"\n"}
            No campo da assinatura, coloque a data em que você está imprimindo e assinando a folha (ex.: Juiz de Fora, 31 de agosto de 2026).{"\n\n"}
            "Carimbe" (se o carimbo já não estiver impresso pelo app) e assine à caneta.{"\n\n"}
            Arquive a folha na pasta física do paciente na clínica.{"\n\n"}
            "Ou pelo gov.com.br assine virtualmente CADA documento e salve no dispositivo."
          </Text>
        </Section>

        <View style={styles.creditFooter}>
          <Image source={require("../../assets/fisionofre_novo.png")} style={styles.creditAvatar} resizeMode="contain" />
          <Text style={styles.creditText}>Desenvolvido por @fisionofre</Text>
        </View>
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
