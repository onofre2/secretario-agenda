import React, { useCallback, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, FlatList, Modal, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing, radius } from "../theme/colors";
import FormInput from "../components/FormInput";
import PrimaryButton from "../components/PrimaryButton";
import FloatingAddButton from "../components/FloatingAddButton";
import PatientTimelineModal from "../components/PatientTimelineModal";
import RadarChart from "../components/RadarChart";
import { listSchedules } from "../database/repositories/schedulesRepo";
import { getAttendanceByClinic } from "../database/repositories/financialRepo";
import {
  listClinics,
  createClinic,
  updateClinic,
  deleteClinic,
} from "../database/repositories/clinicsRepo";
import { listPatientsByClinic } from "../database/repositories/patientsRepo";
import { getClinicalEvolutionByClinic } from "../database/repositories/reportsRepo";
import { exportClinicalEvolutionAsPdf } from "../reports/exportClinicalPdf";
import { Clinic, Patient } from "../database/types";

const CLINIC_COLORS = ["#22C55E", "#3B82F6", "#F59E0B", "#EC4899", "#A855F7", "#14B8A6", "#EF4444", "#84CC16"];

const emptyForm = { name: "", address: "", phone: "", payment_info: "", notes: "" };

export default function ClinicsScreen() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [patientsModalClinic, setPatientsModalClinic] = useState<Clinic | null>(null);
  const [clinicPatients, setClinicPatients] = useState<Patient[]>([]);
  const [timelinePatient, setTimelinePatient] = useState<Patient | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [exportingClinicId, setExportingClinicId] = useState<number | null>(null);
  const [radarSeries, setRadarSeries] = useState<{ label: string; color: string; values: number[] }[]>([]);

  const load = useCallback(async () => {
    const clinicList = await listClinics();
    const schedules = await listSchedules(true);
    setClinics(clinicList);
    const attendance = await getAttendanceByClinic("1900-01-01", "2100-01-01");
    const attByName = new Map(attendance.map((a) => [a.clinic_name, a]));
    setRadarSeries(
      clinicList.map((c, i) => ({
        label: c.name,
        color: CLINIC_COLORS[i % CLINIC_COLORS.length],
        values: [
          schedules.filter((s) => s.clinic_id === c.id).length,
          attByName.get(c.name)?.present ?? 0,
          attByName.get(c.name)?.absent ?? 0,
        ],
      }))
    );
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (clinic: Clinic) => {
    setEditingId(clinic.id);
    setForm({
      name: clinic.name,
      address: clinic.address ?? "",
      phone: clinic.phone ?? "",
      payment_info: clinic.payment_info ?? "",
      notes: clinic.notes ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        payment_info: form.payment_info.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editingId) {
        await updateClinic(editingId, data);
      } else {
        await createClinic(data);
      }
      setModalOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingId) return;
    Alert.alert(
      "Excluir clinica",
      "Essa acao APAGA PERMANENTEMENTE todos os pacientes, agendamentos, evolucoes e registros financeiros vinculados a esta clinica. Faca um backup antes se quiser manter esses dados. Essa acao nao pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await deleteClinic(editingId);
            setModalOpen(false);
            await load();
          },
        },
      ]
    );
  };

  const openPatientsModal = async (clinic: Clinic) => {
    setPatientsModalClinic(clinic);
    setLoadingPatients(true);
    try {
      setClinicPatients(await listPatientsByClinic(clinic.id));
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleExportClinicPdf = async (clinic: Clinic) => {
    setExportingClinicId(clinic.id);
    try {
      const rows = await getClinicalEvolutionByClinic(clinic.id);
      await exportClinicalEvolutionAsPdf(rows, clinic.name);
    } finally {
      setExportingClinicId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={clinics}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhuma clínica cadastrada. Toque em + para adicionar.</Text>
          }
          ListFooterComponent={
            radarSeries.length > 0 ? (
              <View style={styles.footerSection}>
                <Text style={styles.footerTitle}>Atendimentos, presenças e faltas por clínica</Text>
                <RadarChart axisLabels={["Atendimentos", "Presenças", "Faltas"]} series={radarSeries} />
              </View>
            ) : null
          }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable onPress={() => openEdit(item)}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              {!!item.address && <Text style={styles.cardSubtitle}>{item.address}</Text>}
              {!!item.phone && <Text style={styles.cardSubtitle}>{item.phone}</Text>}
            </Pressable>
            <View style={styles.cardActions}>
              <Pressable style={styles.cardActionBtn} onPress={() => openPatientsModal(item)}>
                <Text style={styles.cardActionText}>Ver pacientes</Text>
              </Pressable>
              <Pressable
                style={styles.cardActionBtn}
                onPress={() => handleExportClinicPdf(item)}
                disabled={exportingClinicId === item.id}
              >
                <Text style={styles.cardActionText}>
                  {exportingClinicId === item.id ? "Gerando PDF..." : "Exportar evolução"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      />
      <FloatingAddButton onPress={openNew} />

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <ScrollView style={styles.modalContainer} contentContainerStyle={{ padding: spacing.md }}>
          <Text style={styles.modalTitle}>{editingId ? "Editar clínica" : "Nova clínica"}</Text>
          <FormInput label="Nome" required value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
          <FormInput label="Endereço" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} />
          <FormInput label="Telefone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
          <FormInput label="Informações de pagamento" value={form.payment_info} onChangeText={(v) => setForm({ ...form, payment_info: v })} />
          <FormInput label="Notas" value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} multiline numberOfLines={3} />

          <PrimaryButton label={saving ? "Salvando..." : "Salvar"} onPress={handleSave} disabled={saving || !form.name.trim()} />
          {editingId && (
            <Text style={styles.dangerWarning}>
              ⚠ Excluir esta clinica apaga permanentemente todos os pacientes, agendamentos, evolucoes e registros financeiros vinculados a ela. Faca um backup antes (aba Config) se quiser manter esses dados.
            </Text>
          )}
          {editingId && <PrimaryButton label="Excluir clínica" variant="danger" onPress={handleDelete} />}
          <PrimaryButton label="Cancelar" variant="outline" onPress={() => setModalOpen(false)} />
        </ScrollView>
      </Modal>

      <Modal
        visible={!!patientsModalClinic}
        animationType="slide"
        onRequestClose={() => setPatientsModalClinic(null)}
      >
        <SafeAreaView style={styles.modalContainer} edges={["top"]}>
          <View style={styles.patientsModalHeader}>
            <Text style={styles.modalTitle}>{patientsModalClinic?.name ?? ""}</Text>
            <Pressable onPress={() => setPatientsModalClinic(null)}>
              <Text style={styles.closeText}>Fechar</Text>
            </Pressable>
          </View>
          {loadingPatients ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <FlatList
              data={clinicPatients}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
              ListEmptyComponent={
                <Text style={styles.empty}>Nenhum paciente vinculado a esta clínica.</Text>
              }
              renderItem={({ item }) => (
                <Pressable style={styles.card} onPress={() => setTimelinePatient(item)}>
                  <Text style={styles.cardTitle}>{item.full_name}</Text>
                  {!!item.diagnosis && <Text style={styles.cardSubtitle}>{item.diagnosis}</Text>}
                </Pressable>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
      <PatientTimelineModal
        visible={!!timelinePatient}
        patientId={timelinePatient?.id ?? null}
        patientName={timelinePatient?.full_name ?? ""}
        patientPhone={timelinePatient?.phone ?? null}
        onClose={() => setTimelinePatient(null)}
      />
    </SafeAreaView>
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
  cardActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cardActionBtn: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
  },
  cardActionText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: "700", marginBottom: spacing.md },
  patientsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  closeText: { color: colors.primary, fontSize: 16, fontWeight: "600" },
  dangerWarning: { color: colors.danger, fontSize: 12, lineHeight: 17, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: radius.sm, borderWidth: 1, borderColor: colors.danger, padding: spacing.sm, marginTop: spacing.md },
  footerSection: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  footerTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: spacing.sm },
});
