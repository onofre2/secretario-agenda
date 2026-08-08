import React, { useCallback, useState, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { abrirWhatsApp } from "../utils/whatsapp";
import { View, Text, FlatList, Modal, StyleSheet, Pressable, ScrollView, TextInput, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { spacing, radius } from "../theme/colors";
import { useTheme } from "../context/ThemeContext";
import FormInput from "../components/FormInput";
import PrimaryButton from "../components/PrimaryButton";
import FloatingAddButton from "../components/FloatingAddButton";
import PatientTimelineModal from "../components/PatientTimelineModal";
import {
  listPatients,
  listPatientsByClinic,
  createPatient,
  updatePatient,
  deletePatient,
} from "../database/repositories/patientsRepo";
import { listClinics } from "../database/repositories/clinicsRepo";
import { Patient, Clinic, NoteProfile } from "../database/types";

const emptyForm = {
  full_name: "",
  phone: "",
  email: "",
  diagnosis: "",
  treatment_goals: "",
  qp: "",
  clinical_history: "",
  insurance: "",
  default_session_value: "",
  observations: "",
  note_profile: "default" as NoteProfile,
};

export default function PatientsScreen() {
  const { colors } = useTheme();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [timelinePatient, setTimelinePatient] = useState<Patient | null>(null);
  const [broadcastQueue, setBroadcastQueue] = useState<Patient[]>([]);
  const [broadcastIndex, setBroadcastIndex] = useState(0);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");

  const styles = useMemo(() => StyleSheet.create({
    searchInput: {
      backgroundColor: colors.surface,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      fontSize: 13,
      height: 34,
      textAlignVertical: "center",
      paddingHorizontal: spacing.sm,
      paddingVertical: 0,
      marginHorizontal: spacing.md,
      marginTop: 4,
    },
    broadcastBtn: { backgroundColor: colors.surfaceLight, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, marginHorizontal: spacing.md, marginTop: spacing.xs, paddingVertical: 6, alignItems: "center" },
    broadcastBtnText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
    broadcastOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: spacing.lg },
    broadcastModalBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
    broadcastInfo: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
    broadcastBanner: { position: "absolute", bottom: 90, left: spacing.md, right: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, padding: spacing.md },
    broadcastBannerText: { color: colors.text, fontSize: 13, fontWeight: "600", marginBottom: spacing.sm },
    broadcastBannerActions: { flexDirection: "row", justifyContent: "space-between" },
    broadcastBannerNext: { color: colors.primary, fontSize: 14, fontWeight: "700" },
    broadcastBannerCancel: { color: colors.danger, fontSize: 14, fontWeight: "600" },
    container: { flex: 1, backgroundColor: colors.background },
    tabsBar: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.border },
    tabsBarContent: { paddingHorizontal: spacing.md, alignItems: "center", gap: spacing.sm },
    tab: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radius.sm,
    },
    tabActive: { backgroundColor: colors.primary },
    tabText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
    tabTextActive: { color: "#FFFFFF" },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: { color: colors.text, fontSize: 17, fontWeight: "600" },
    cardHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
    whatsappBtn: { backgroundColor: "#25D366", width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    cardSubtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    historyLink: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
    historyLinkText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
    empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
    modalContainer: { flex: 1, backgroundColor: colors.background },
    modalTitle: { color: colors.text, fontSize: 20, fontWeight: "700", marginBottom: spacing.md },
    profileLabel: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs, marginTop: spacing.xs },
    profileRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
    profileChip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border },
    profileChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    profileText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
    profileTextActive: { color: "#0F172A" },
  }), [colors]);

  const load = useCallback(async (clinicId: number | "all") => {
    const clinicList = await listClinics();
    setClinics(clinicList);
    if (clinicId === "all") {
      setPatients(await listPatients());
    } else {
      setPatients(await listPatientsByClinic(clinicId));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(selectedClinicId);
    }, [load, selectedClinicId])
  );

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
      qp: patient.qp ?? "",
      clinical_history: patient.clinical_history ?? "",
      insurance: patient.insurance ?? "",
      default_session_value:
        patient.default_session_value != null ? String(patient.default_session_value) : "",
      observations: patient.observations ?? "",
      note_profile: patient.note_profile,
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
        clinical_history: form.clinical_history.trim() || null,
        qp: form.qp.trim() || null,
        insurance: form.insurance.trim() || null,
        default_session_value: form.default_session_value
          ? Number(form.default_session_value.replace(",", "."))
          : null,
        observations: form.observations.trim() || null,
        note_profile: form.note_profile,
      };
      if (editingId) {
        await updatePatient(editingId, data);
      } else {
        await createPatient(data);
      }
      setModalOpen(false);
      await load(selectedClinicId);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingId) return;
    Alert.alert(
      "Excluir paciente",
      "Essa acao nao pode ser desfeita. Todos os atendimentos e evolucoes deste paciente tambem serao removidos.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await deletePatient(editingId);
            setModalOpen(false);
            await load(selectedClinicId);
          },
        },
      ]
    );
  };

  const filteredPatients = patients.filter((p) =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startBroadcast = async () => {
    const queue = filteredPatients.filter((p) => !!p.phone);
    if (queue.length === 0 || !broadcastMessage.trim()) return;
    setBroadcastQueue(queue);
    setBroadcastIndex(0);
    setBroadcastModalOpen(false);
    await abrirWhatsApp(queue[0].phone as string, broadcastMessage.trim());
  };

  const advanceBroadcast = async () => {
    const next = broadcastIndex + 1;
    if (next >= broadcastQueue.length) {
      setBroadcastQueue([]);
      setBroadcastIndex(0);
      return;
    }
    setBroadcastIndex(next);
    await abrirWhatsApp(broadcastQueue[next].phone as string, broadcastMessage.trim());
  };

  const cancelBroadcast = () => {
    setBroadcastQueue([]);
    setBroadcastIndex(0);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsBar} contentContainerStyle={styles.tabsBarContent}>
        <Pressable
          onPress={() => setSelectedClinicId("all")}
          style={[styles.tab, selectedClinicId === "all" && styles.tabActive]}
        >
          <Text style={[styles.tabText, selectedClinicId === "all" && styles.tabTextActive]}>Todos</Text>
        </Pressable>
        {clinics.map((clinic) => (
          <Pressable
            key={clinic.id}
            onPress={() => setSelectedClinicId(clinic.id)}
            style={[styles.tab, selectedClinicId === clinic.id && styles.tabActive]}
          >
            <Text style={[styles.tabText, selectedClinicId === clinic.id && styles.tabTextActive]}>
              {clinic.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar paciente por nome..."
        placeholderTextColor={colors.textMuted}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <Pressable style={styles.broadcastBtn} onPress={() => { setBroadcastMessage(""); setBroadcastModalOpen(true); }}>
        <Text style={styles.broadcastBtnText}>📢 Enviar aviso a todos</Text>
      </Pressable>
      <FlatList
        data={filteredPatients}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum paciente encontrado nesta clínica.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Pressable style={{ flex: 1 }} onPress={() => openEdit(item)}>
                <Text style={styles.cardTitle}>{item.full_name}</Text>
                {!!item.phone && <Text style={styles.cardSubtitle}>{item.phone}</Text>}
                {!!item.diagnosis && <Text style={styles.cardSubtitle}>{item.diagnosis}</Text>}
              </Pressable>
              <Pressable
                style={styles.whatsappBtn}
                onPress={() =>
                  item.phone
                    ? abrirWhatsApp(item.phone, `Ola ${item.full_name}, tudo bem?`)
                    : openEdit(item)
                }
              >
                <FontAwesome name="whatsapp" size={22} color="#FFFFFF" />
              </Pressable>
            </View>
            <Pressable onPress={() => setTimelinePatient(item)} style={styles.historyLink}>
              <Text style={styles.historyLinkText}>Histórico do paciente →</Text>
            </Pressable>
          </View>
        )}
      />

      <FloatingAddButton onPress={openNew} />

      <PatientTimelineModal
        visible={!!timelinePatient}
        patientId={timelinePatient?.id ?? null}
        patientName={timelinePatient?.full_name ?? ""}
        patientPhone={timelinePatient?.phone ?? null}
        onClose={() => setTimelinePatient(null)}
      />

      <Modal visible={broadcastModalOpen} animationType="slide" onRequestClose={() => setBroadcastModalOpen(false)} transparent>
        <View style={styles.broadcastOverlay}>
          <View style={styles.broadcastModalBox}>
            <Text style={styles.modalTitle}>Enviar aviso a todos</Text>
            <Text style={styles.broadcastInfo}>
              {filteredPatients.filter((p) => !!p.phone).length} paciente(s) com telefone cadastrado nesta lista.
            </Text>
            <FormInput
              label="Mensagem"
              value={broadcastMessage}
              onChangeText={setBroadcastMessage}
              multiline
              numberOfLines={4}
              placeholder="Ex: A clínica não abrirá amanhã, feriado."
            />
            <PrimaryButton label="Iniciar envio" onPress={startBroadcast} disabled={!broadcastMessage.trim()} />
            <PrimaryButton label="Cancelar" variant="outline" onPress={() => setBroadcastModalOpen(false)} />
          </View>
        </View>
      </Modal>

      {broadcastQueue.length > 0 && (
        <View style={styles.broadcastBanner}>
          <Text style={styles.broadcastBannerText}>
            Enviando {broadcastIndex + 1}/{broadcastQueue.length} — {broadcastQueue[broadcastIndex]?.full_name}
          </Text>
          <View style={styles.broadcastBannerActions}>
            <Pressable onPress={advanceBroadcast}>
              <Text style={styles.broadcastBannerNext}>Próximo →</Text>
            </Pressable>
            <Pressable onPress={cancelBroadcast}>
              <Text style={styles.broadcastBannerCancel}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      )}

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
          <FormInput label="QP - Queixa principal" value={form.qp} onChangeText={(v) => setForm({ ...form, qp: v })} multiline numberOfLines={2} />
          <FormInput label="HD - Histórico de doenças" value={form.clinical_history} onChangeText={(v) => setForm({ ...form, clinical_history: v })} multiline numberOfLines={2} />

          <Text style={styles.profileLabel}>Modelo de evolução clínica</Text>
          <View style={styles.profileRow}>
            {[
              { key: "default", label: "🔵 Padrão" },
              { key: "neuro", label: "🟢 Neurodesenvolvimento" },
              { key: "ortho", label: "🟠 Ortopedia/Traumato" },
              { key: "elderly", label: "🟣 Idoso/Funcional" },
            ].map((p) => (
              <Pressable
                key={p.key}
                onPress={() => setForm({ ...form, note_profile: p.key as NoteProfile })}
                style={[styles.profileChip, form.note_profile === p.key && styles.profileChipActive]}
              >
                <Text style={[styles.profileText, form.note_profile === p.key && styles.profileTextActive]}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <FormInput label="Observações" value={form.observations} onChangeText={(v) => setForm({ ...form, observations: v })} multiline numberOfLines={2} />

          <PrimaryButton label={saving ? "Salvando..." : "Salvar"} onPress={handleSave} disabled={saving || !form.full_name.trim()} />
          {editingId && <PrimaryButton label="Excluir paciente" variant="danger" onPress={handleDelete} />}
          <PrimaryButton label="Cancelar" variant="outline" onPress={() => setModalOpen(false)} />
        </ScrollView>
      </Modal>
    </SafeAreaView>
  );
}
