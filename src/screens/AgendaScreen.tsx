import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Modal, StyleSheet, Pressable, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing, radius } from "../theme/colors";
import FormInput from "../components/FormInput";
import PrimaryButton from "../components/PrimaryButton";
import FloatingAddButton from "../components/FloatingAddButton";
import SelectField, { SelectOption } from "../components/SelectField";
import { WEEKDAYS, weekdayLabel } from "../utils/weekdays";
import { formatCurrency } from "../utils/date";
import {
  listSchedules,
  createSchedule,
  pauseSchedule,
  duplicateSchedule,
  deleteSchedule,
} from "../database/repositories/schedulesRepo";
import { listPatients } from "../database/repositories/patientsRepo";
import { listClinics } from "../database/repositories/clinicsRepo";
import { Schedule, Weekday } from "../database/types";
import WeeklyGridView from "../components/WeeklyGridView";

interface ScheduleWithNames extends Schedule {
  patient_name?: string;
  clinic_name?: string;
}

export default function AgendaScreen() {
  const [schedules, setSchedules] = useState<ScheduleWithNames[]>([]);
  const [patients, setPatients] = useState<SelectOption[]>([]);
  const [clinics, setClinics] = useState<SelectOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "week">("list");

  const [selectedPatient, setSelectedPatient] = useState<SelectOption | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<SelectOption | null>(null);
  const [weekday, setWeekday] = useState<Weekday>(1);
  const [time, setTime] = useState("");
  const [sessionValue, setSessionValue] = useState("");

  const load = useCallback(async () => {
    const [scheduleList, patientList, clinicList] = await Promise.all([
      listSchedules(true),
      listPatients(),
      listClinics(),
    ]);
    const patientMap = new Map(patientList.map((p) => [p.id, p.full_name]));
    const clinicMap = new Map(clinicList.map((c) => [c.id, c.name]));
    setSchedules(
      scheduleList.map((s) => ({
        ...s,
        patient_name: patientMap.get(s.patient_id),
        clinic_name: clinicMap.get(s.clinic_id),
      }))
    );
    setPatients(patientList.map((p) => ({ id: p.id, label: p.full_name })));
    setClinics(clinicList.map((c) => ({ id: c.id, label: c.name })));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resetForm = () => {
    setSelectedPatient(null);
    setSelectedClinic(null);
    setWeekday(1);
    setTime("");
    setSessionValue("");
  };

  const openNew = () => {
    resetForm();
    setModalOpen(true);
  };

  const isValidTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

  const canSave =
    selectedPatient && selectedClinic && isValidTime(time) && sessionValue.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || !selectedPatient || !selectedClinic) return;
    setSaving(true);
    try {
      await createSchedule({
        patient_id: selectedPatient.id,
        clinic_id: selectedClinic.id,
        weekday,
        time,
        session_value: Number(sessionValue.replace(",", ".")),
        active: true,
      });
      setModalOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handlePause = async (s: ScheduleWithNames) => {
    await pauseSchedule(s.id, false);
    await load();
  };

  const handleDuplicate = async (s: ScheduleWithNames) => {
    await duplicateSchedule(s.id);
    await load();
  };

  const handleDelete = async (s: ScheduleWithNames) => {
    await deleteSchedule(s.id);
    await load();
  };

  return (
    <View style={styles.container}>
      <View style={styles.viewToggleRow}>
        <Pressable
          style={[styles.viewToggleChip, viewMode === "list" && styles.viewToggleChipActive]}
          onPress={() => setViewMode("list")}
        >
          <Text style={[styles.viewToggleText, viewMode === "list" && styles.viewToggleTextActive]}>
            Lista
          </Text>
        </Pressable>
        <Pressable
          style={[styles.viewToggleChip, viewMode === "week" && styles.viewToggleChipActive]}
          onPress={() => setViewMode("week")}
        >
          <Text style={[styles.viewToggleText, viewMode === "week" && styles.viewToggleTextActive]}>
            Semana
          </Text>
        </Pressable>
      </View>

      {viewMode === "week" ? (
        <WeeklyGridView schedules={schedules} />
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Nenhum horário recorrente cadastrado. Toque em + para adicionar.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardDay}>{weekdayLabel(item.weekday)}</Text>
                <Text style={styles.cardTime}>{item.time}</Text>
              </View>
              <Text style={styles.cardTitle}>{item.patient_name ?? "Paciente removido"}</Text>
              <Text style={styles.cardSubtitle}>
                {item.clinic_name ?? "Clínica removida"} · {formatCurrency(item.session_value)}
              </Text>
              <View style={styles.actionsRow}>
                <Pressable onPress={() => handlePause(item)}>
                  <Text style={styles.actionLink}>Pausar</Text>
                </Pressable>
                <Pressable onPress={() => handleDuplicate(item)}>
                  <Text style={styles.actionLink}>Duplicar</Text>
                </Pressable>
                <Pressable onPress={() => handleDelete(item)}>
                  <Text style={[styles.actionLink, { color: colors.danger }]}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
      <FloatingAddButton onPress={openNew} />

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <ScrollView style={styles.modalContainer} contentContainerStyle={{ padding: spacing.md }}>
          <Text style={styles.modalTitle}>Novo horário recorrente</Text>

          <SelectField
            label="Paciente"
            value={selectedPatient}
            options={patients}
            onSelect={setSelectedPatient}
            emptyMessage="Cadastre um paciente primeiro, na aba Pacientes."
          />
          <SelectField
            label="Clínica"
            value={selectedClinic}
            options={clinics}
            onSelect={setSelectedClinic}
            emptyMessage="Cadastre uma clínica primeiro, na aba Clínicas."
          />

          <Text style={styles.label}>Dia da semana *</Text>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((w) => (
              <Pressable
                key={w.value}
                onPress={() => setWeekday(w.value as Weekday)}
                style={[styles.weekdayChip, weekday === w.value && styles.weekdayChipActive]}
              >
                <Text style={[styles.weekdayText, weekday === w.value && styles.weekdayTextActive]}>
                  {w.short}
                </Text>
              </Pressable>
            ))}
          </View>

          <FormInput
            label="Horário (HH:mm)"
            required
            value={time}
            onChangeText={setTime}
            placeholder="14:00"
            keyboardType="numbers-and-punctuation"
          />
          <FormInput
            label="Valor da sessão (R$)"
            required
            value={sessionValue}
            onChangeText={setSessionValue}
            keyboardType="decimal-pad"
          />

          <PrimaryButton label={saving ? "Salvando..." : "Salvar"} onPress={handleSave} disabled={!canSave || saving} />
          <PrimaryButton label="Cancelar" variant="outline" onPress={() => setModalOpen(false)} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  viewToggleRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs },
  viewToggleChip: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.surfaceLight, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  viewToggleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  viewToggleText: { color: colors.textMuted, fontWeight: "600" },
  viewToggleTextActive: { color: "#0F172A" },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  cardDay: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  cardTime: { color: colors.text, fontSize: 14, fontWeight: "700" },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: "600", marginTop: spacing.xs },
  cardSubtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  actionsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  actionLink: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: "700", marginBottom: spacing.md },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs },
  weekdayRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  weekdayChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border },
  weekdayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  weekdayText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  weekdayTextActive: { color: "#0F172A" },
});
