import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Modal, ScrollView, StyleSheet, Pressable } from "react-native";
import { colors, spacing, radius } from "../theme/colors";
import FormInput from "./FormInput";
import PrimaryButton from "./PrimaryButton";
import SelectField, { SelectOption } from "./SelectField";
import { listClinics } from "../database/repositories/clinicsRepo";
import { createAppointment, markPresent, markAbsent } from "../database/repositories/appointmentsRepo";

interface Props {
  visible: boolean;
  patientId: number | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function RetroactiveAppointmentModal({ visible, patientId, onClose, onSaved }: Props) {
  const [clinics, setClinics] = useState<SelectOption[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<SelectOption | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [sessionValue, setSessionValue] = useState("");
  const [status, setStatus] = useState<"present" | "absent">("present");
  const [saving, setSaving] = useState(false);

  const loadClinics = useCallback(async () => {
    const list = await listClinics();
    setClinics(list.map((c) => ({ id: c.id, label: c.name })));
  }, []);

  useEffect(() => {
    if (visible) loadClinics();
  }, [visible, loadClinics]);

  const resetForm = () => {
    setSelectedClinic(null);
    setDate("");
    setTime("");
    setSessionValue("");
    setStatus("present");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
  const isValidTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

  const canSave =
    !!patientId &&
    !!selectedClinic &&
    isValidDate(date) &&
    isValidTime(time) &&
    sessionValue.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || !patientId || !selectedClinic) return;
    setSaving(true);
    try {
      const appointmentId = await createAppointment({
        patient_id: patientId,
        clinic_id: selectedClinic.id,
        date,
        time,
        session_value: Number(sessionValue.replace(",", ".")),
      });

      if (status === "present") {
        await markPresent(appointmentId);
      } else {
        await markAbsent(appointmentId);
      }

      resetForm();
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
        <Text style={styles.title}>Atendimento retroativo</Text>
        <Text style={styles.hint}>
          Use isso para registrar sessões que aconteceram antes de você começar a
          usar o app — assim o histórico e o financeiro ficam completos.
        </Text>

        <SelectField
          label="Clínica"
          value={selectedClinic}
          options={clinics}
          onSelect={setSelectedClinic}
          emptyMessage="Cadastre uma clínica primeiro, na aba Clínicas."
        />

        <FormInput
          label="Data (AAAA-MM-DD)"
          required
          value={date}
          onChangeText={setDate}
          placeholder="2026-06-15"
          keyboardType="numbers-and-punctuation"
        />
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

        <Text style={styles.label}>O paciente compareceu? *</Text>
        <View style={styles.statusRow}>
          <Pressable
            style={[styles.statusChip, status === "present" && styles.statusChipPresent]}
            onPress={() => setStatus("present")}
          >
            <Text style={[styles.statusText, status === "present" && styles.statusTextActive]}>
              🟢 Presente
            </Text>
          </Pressable>
          <Pressable
            style={[styles.statusChip, status === "absent" && styles.statusChipAbsent]}
            onPress={() => setStatus("absent")}
          >
            <Text style={[styles.statusText, status === "absent" && styles.statusTextActive]}>
              🔴 Ausente
            </Text>
          </Pressable>
        </View>

        <PrimaryButton
          label={saving ? "Salvando..." : "Salvar atendimento"}
          onPress={handleSave}
          disabled={!canSave || saving}
        />
        <PrimaryButton label="Cancelar" variant="outline" onPress={handleClose} />
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { color: colors.text, fontSize: 20, fontWeight: "700", marginBottom: spacing.xs },
  hint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md, lineHeight: 18 },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs },
  statusRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  statusChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipPresent: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusChipAbsent: { backgroundColor: colors.danger, borderColor: colors.danger },
  statusText: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
  statusTextActive: { color: "#0F172A" },
});
