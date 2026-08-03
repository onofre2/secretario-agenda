import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Modal, FlatList, StyleSheet, Pressable, ActivityIndicator, Alert, Image } from "react-native";
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
import { listDocumentsByPatient, deletePatientDocument } from "../database/repositories/patientDocumentsRepo";
import { importPhotoDocument, importPdfDocument } from "../utils/documentImport";
import { PatientDocument } from "../database/types";

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
  const [documents, setDocuments] = useState<PatientDocument[]>([]);

  const load = useCallback(async () => {
    if (!patientId) return;
    const [timeline, noteList, docList] = await Promise.all([
      getPatientTimeline(patientId) as Promise<AppointmentRow[]>,
      listNotesByPatient(patientId),
      listDocumentsByPatient(patientId),
    ]);
    setAppointments(timeline);
    setNotes(noteList);
    setDocuments(docList);
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

  const handleImportPhoto = async () => {
    if (!patientId) return;
    try {
      const ok = await importPhotoDocument(patientId);
      if (ok) await load();
    } catch (err) {
      console.error("Erro ao importar foto:", err);
    }
  };

  const handleImportPdf = async () => {
    if (!patientId) return;
    try {
      const ok = await importPdfDocument(patientId);
      if (ok) await load();
    } catch (err) {
      console.error("Erro ao importar PDF:", err);
    }
  };

  const handleImportDocument = () => {
    Alert.alert("Importar documento", "Escolha uma opcao", [
      { text: "Cancelar", style: "cancel" },
      { text: "Tirar foto", onPress: handleImportPhoto },
      { text: "Importar PDF", onPress: handleImportPdf },
    ]);
  };

  const handleDeleteDocument = (id: number) => {
    Alert.alert("Excluir documento", "Essa acao nao pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => { await deletePatientDocument(id); await load(); } },
    ]);
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
            <PrimaryButton
              label="Importar documentos e exames"
              variant="outline"
              onPress={handleImportDocument}
              style={{ marginTop: spacing.sm }}
            />
          {exportingPdf && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />}
        </View>

          {documents.length > 0 && (
            <View style={styles.docsSection}>
              <Text style={styles.docsTitle}>Documentos e exames</Text>
              {documents.map((doc) => (
                <View key={doc.id} style={styles.docRow}>
                  {doc.file_type === "photo" ? (
                    <Image source={{ uri: doc.file_path }} style={styles.docThumb} />
                  ) : (
                    <View style={styles.docIcon}><Text style={styles.docIconText}>PDF</Text></View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName} numberOfLines={1}>{doc.original_name ?? doc.file_path}</Text>
                    <Text style={styles.docDate}>{doc.created_at}</Text>
                  </View>
                  <Pressable onPress={() => handleDeleteDocument(doc.id)}>
                    <Text style={styles.docDelete}>Excluir</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
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
  docsSection: { marginTop: spacing.sm, paddingHorizontal: spacing.md },
  docsTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginBottom: spacing.sm },
  docRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surface, borderRadius: 10, padding: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  docThumb: { width: 40, height: 40, borderRadius: 6, backgroundColor: colors.surfaceLight },
  docIcon: { width: 40, height: 40, borderRadius: 6, backgroundColor: colors.surfaceLight, alignItems: "center", justifyContent: "center" },
  docIconText: { color: colors.danger, fontSize: 10, fontWeight: "700" },
  docName: { color: colors.text, fontSize: 13, fontWeight: "600" },
  docDate: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  docDelete: { color: colors.danger, fontSize: 12, fontWeight: "600" },
});
