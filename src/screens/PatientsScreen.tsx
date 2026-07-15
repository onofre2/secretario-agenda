import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Modal, StyleSheet, Pressable, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing, radius } from "../theme/colors";
import FormInput from "../components/FormInput";
import PrimaryButton from "../components/PrimaryButton";
import FloatingAddButton from "../components/FloatingAddButton";
import PatientTimelineModal from "../components/PatientTimelineModal";
import {
  listPatients,
  createPatient,
  updatePatient,
  deletePatient,
} from "../database/repositories/patientsRepo";
import { Patient } from "../database/types";

const emptyForm = {
  full_name: "",
  phone: "",
  email: "",
  diagnosis: "",
  treatment_goals: "",
  insurance: "",
  default_session_value: "",
  emergency_contact: "",
  observations: "",
};

export default function PatientsScreen() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [timelinePatient, setTimelinePatient] = useState<Patient | null>(null);

  const load = useCallback(async () => {
    setPatients(await listPatients());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (patient: Patient) => {
    setEditingId(patient.id);
    setForm({
      full_name: patient.full_name,
      phone: patient.phone ?? "",
      email: patient.email ?? "",
      diagnosis: patient.diagnosis ?? "",
      treatment_goals: patient.treatment_goals ?? "",
      insurance: patient.insurance ?? "",
      default_session_value:
        patient.default_session_value != null ? String(patient.default_session_value) : "",
      emergency_contact: patient.emergency_contact ?? "",
      observations: patient.observations ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) return;
    setSaving(true);
    try {
      const data = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        diagnosis: form.diagnosis.trim() || null,
        treatment_goals: form.treatment_goals.trim() || null,
        clinical_history: null,
        insurance: form.insurance.trim() || null,
        default_session_value: form.default_session_value
          ? Number(form.default_session_value.replace(",", "."))
          : null,
        emergency_contact: form.emergency_contact.trim() || null,
        observations: form.observations.trim() || null,
      };
      if (editingId) {
        await updatePatient(editingId, data);
      } else {
        await createPatient(data);
      }
      setModalOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    await deletePatient(editingId);
    setModalOpen(false);
    await load();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={patients}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum paciente cadastrado. Toque em + para adicionar.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable onPress={() => openEdit(item)}>
              <Text style={styles.cardTitle}>{item.full_name}</Text>
              {!!item.phone && <Text style={styles.cardSubtitle}>{item.phone}</Text>}
              {!!item.diagnosis && <Text style={styles.cardSubtitle}>{item.diagnosis}</Text>}
            </Pressable>
            <Pressable onPress={() => setTimelinePatient(item)} style={styles.historyLink}>
              <Text style={styles.historyLinkText}>Ver histórico clínico →</Text>
            </Pressable>
          </View>
        )}
      />
      <FloatingAddButton onPress={openNew} />

      <PatientTimelineModal
        visible={!!timelinePatient}
        patientId={timelinePatient?.id ?? null}
        patientName={timelinePatient?.full_name ?? ""}
        onClose={() => setTimelinePatient(null)}
      />

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <ScrollView style={styles.modalContainer} contentContainerStyle={{ padding: spacing.md }}>
          <Text style={styles.modalTitle}>{editingId ? "Editar paciente" : "Novo paciente"}</Text>
          <FormInput label="Nome completo" required value={form.full_name} onChangeText={(v) => setForm({ ...form, full_name: v })} />
          <FormInput label="Telefone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
          <FormInput label="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" />
          <FormInput label="Valor padrão da sessão (R$)" value={form.default_session_value} onChangeText={(v) => setForm({ ...form, default_session_value: v })} keyboardType="decimal-pad" />
          <FormInput label="Convênio" value={form.insurance} onChangeText={(v) => setForm({ ...form, insurance: v })} />
          <FormInput label="Diagnóstico" value={form.diagnosis} onChangeText={(v) => setForm({ ...form, diagnosis: v })} multiline numberOfLines={2} />
          <FormInput label="Objetivos do tratamento" value={form.treatment_goals} onChangeText={(v) => setForm({ ...form, treatment_goals: v })} multiline numberOfLines={2} />
          <FormInput label="Contato de emergência" value={form.emergency_contact} onChangeText={(v) => setForm({ ...form, emergency_contact: v })} />
          <FormInput label="Observações" value={form.observations} onChangeText={(v) => setForm({ ...form, observations: v })} multiline numberOfLines={2} />

          <PrimaryButton label={saving ? "Salvando..." : "Salvar"} onPress={handleSave} disabled={saving || !form.full_name.trim()} />
          {editingId && <PrimaryButton label="Excluir paciente" variant="danger" onPress={handleDelete} />}
          <PrimaryButton label="Cancelar" variant="outline" onPress={() => setModalOpen(false)} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: "600" },
  cardSubtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  historyLink: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  historyLinkText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: "700", marginBottom: spacing.md },
});
