import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Modal, FlatList, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { colors, spacing } from "../theme/colors";
import { getPatientTimeline } from "../database/repositories/patientsRepo";
import { deleteAppointment } from "../database/repositories/appointmentsRepo";
import { listNotesByPatient, ClinicalNoteWithContext } from "../database/repositories/clinicalNotesRepo";
import { ClinicalEvolutionRow } from "../database/repositories/reportsRepo";
import { exportClinicalEvolutionAsPdf } from "../reports/exportClinicalPdf";
import { montarMensagemConfirmacao, abrirWhatsApp } from "../utils/whatsapp";
import TimelineItem from "./TimelineItem";
import PrimaryButton from "./PrimaryButton";
import RetroactiveAppointmentModal from "./RetroactiveAppointmentModal";

interface AppointmentRow {
  id: number;
  date: string;
  time: string;
  status: string;
  session_value: number;
  clinic_name: string;
}

interface Props {
  visible: boolean;
  patientId: number | null;
  patientName: string;
  patientPhone?: string | null;
  onClose: () => void;
}

export default function PatientTimelineModal({ visible, patientId, patientName, patientPhone, onClose }: Props) {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [notes, setNotes] = useState<ClinicalNoteWithContext[]>([]);
  const [retroModalOpen, setRetroModalOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const load = useCallback(async () => {
    if (!patientId) return;
    const [timeline, noteList] = await Promise.all([
      getPatientTimeline(patientId) as Promise<AppointmentRow[]>,
      listNotesByPatient(patientId),
    ]);
    setAppointments(timeline);
    setNotes(noteList);
  }, [patientId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const noteByAppointment = new Map(notes.map((n) => [n.appointment_id, n]));

  const handleDeleteAppointment = async (id: number) => {
    await deleteAppointment(id);
    await load();
  };

  const handleExportPdf = async () => {
    if (notes.length === 0) return;
    setExportingPdf(true);
    try {
      const rows: ClinicalEvolutionRow[] = notes
        .slice()
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .map((n) => ({
          date: n.date,
          time: n.time,
          patient_name: patientName,
          clinic_name: n.clinic_name,
          content: n.content,
          is_draft: n.is_draft,
        }));
      await exportClinicalEvolutionAsPdf(rows, patientName);
    } catch (err) {
      console.error("Erro ao exportar evolucao do paciente:", err);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!patientPhone || appointments.length === 0) return;
    const proxima = appointments[0];
    const mensagem = montarMensagemConfirmacao(proxima.date, proxima.time);
    try {
      await abrirWhatsApp(patientPhone, mensagem);
    } catch (err) {
      console.error("Erro ao abrir WhatsApp:", err);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{patientName}</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.closeLink}>Fechar</Text>
          </Pressable>
        </View>

        <View style={styles.actionBar}>
          <PrimaryButton
            label="+ Atendimento retroativo"
            variant="outline"
            onPress={() => setRetroModalOpen(true)}
            style={{ marginTop: 0 }}
          />
          <PrimaryButton
            label={exportingPdf ? "Gerando PDF..." : "Exportar evolucao completa (PDF)"}
            variant="outline"
            onPress={handleExportPdf}
            disabled={notes.length === 0 || exportingPdf}
            style={{ marginTop: spacing.sm }}
          />
          {!!patientPhone && (
            <PrimaryButton
              label="Enviar lembrete WhatsApp"
              variant="outline"
              onPress={handleSendWhatsApp}
              disabled={appointments.length === 0}
              style={{ marginTop: spacing.sm }}
            />
          )}
          {exportingPdf && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />}
        </View>

        <FlatList
          data={appointments}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: spacing.md }}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhum atendimento registrado ainda.</Text>
          }
          renderItem={({ item }) => (
            <TimelineItem
              appointment={item}
              note={noteByAppointment.get(item.id) ?? null}
              onSaved={load}
                onDelete={handleDeleteAppointment}
            />
          )}
        />
      </View>

      <RetroactiveAppointmentModal
        visible={retroModalOpen}
        patientId={patientId}
        onClose={() => setRetroModalOpen(false)}
        onSaved={load}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.text, fontSize: 20, fontWeight: "700" },
  closeLink: { color: colors.primary, fontSize: 15, fontWeight: "600" },
  actionBar: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
});
