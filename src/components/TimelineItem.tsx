import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import { colors, spacing, radius } from "../theme/colors";
import { formatCurrency } from "../utils/date";
import { ClinicalNoteWithContext } from "../database/repositories/clinicalNotesRepo";
import { updateNoteContent } from "../database/repositories/clinicalNotesRepo";

const STATUS_LABEL: Record<string, string> = {
  present: "✅ Presente",
  absent: "❌ Ausente",
  pending: "⏳ Pendente",
};

interface Props {
  appointment: {
    id: number;
    date: string;
    time: string;
    status: string;
    session_value: number;
    clinic_name: string;
  };
  note: ClinicalNoteWithContext | null;
  onSaved: () => void;
}

export default function TimelineItem({ appointment, note, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note?.content ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!note) return;
    setSaving(true);
    try {
      await updateNoteContent(note.id, draft);
      setEditing(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.date}>{appointment.date} · {appointment.time}</Text>
        <Text style={styles.status}>{STATUS_LABEL[appointment.status] ?? appointment.status}</Text>
      </View>
      <Text style={styles.clinic}>
        {appointment.clinic_name} · {formatCurrency(appointment.session_value)}
      </Text>

      {note && (
        <View style={styles.noteBox}>
          <View style={styles.noteHeader}>
            <Text style={styles.noteLabel}>
              Evolução clínica {note.is_draft ? "(rascunho)" : ""}
            </Text>
            {!editing && (
              <Pressable onPress={() => { setDraft(note.content); setEditing(true); }}>
                <Text style={styles.editLink}>Editar</Text>
              </Pressable>
            )}
          </View>

          {editing ? (
            <>
              <TextInput
                style={styles.textArea}
                value={draft}
                onChangeText={setDraft}
                multiline
                numberOfLines={4}
                placeholderTextColor={colors.textMuted}
              />
              <View style={styles.editActions}>
                <Pressable onPress={() => setEditing(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={handleSave} style={styles.saveBtn} disabled={saving}>
                  <Text style={styles.saveText}>{saving ? "Salvando..." : "Salvar"}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Text style={styles.noteContent}>{note.content}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: "row", justifyContent: "space-between" },
  date: { color: colors.text, fontSize: 14, fontWeight: "700" },
  status: { color: colors.textMuted, fontSize: 12 },
  clinic: { color: colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.sm },
  noteBox: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  noteHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xs },
  noteLabel: { color: colors.warning, fontSize: 12, fontWeight: "700" },
  editLink: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  noteContent: { color: colors.text, fontSize: 14, lineHeight: 20 },
  textArea: {
    color: colors.text,
    fontSize: 14,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: "top",
    minHeight: 90,
  },
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.md, marginTop: spacing.sm },
  cancelBtn: { padding: spacing.xs },
  cancelText: { color: colors.textMuted, fontSize: 13 },
  saveBtn: { padding: spacing.xs },
  saveText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
});
