import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Modal, FlatList, StyleSheet, Pressable } from "react-native";
import { colors, spacing } from "../theme/colors";
import { getPatientTimeline } from "../database/repositories/patientsRepo";
import { listNotesByPatient, ClinicalNoteWithContext } from "../database/repositories/clinicalNotesRepo";
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
  onClose: () => void;
}

export default function PatientTimelineModal({ visible, patientId, patientName, onClose }: Props) {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [notes, setNotes] = useState<ClinicalNoteWithContext[]>([]);
  const [retroModalOpen, setRetroModalOpen] = useState(false);

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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "700" },
  closeLink: { color: colors.primary, fontSize: 15, fontWeight: "600" },
  actionBar: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
});
