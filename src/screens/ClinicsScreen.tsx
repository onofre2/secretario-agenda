import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Modal, StyleSheet, Pressable, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing, radius } from "../theme/colors";
import FormInput from "../components/FormInput";
import PrimaryButton from "../components/PrimaryButton";
import FloatingAddButton from "../components/FloatingAddButton";
import {
  listClinics,
  createClinic,
  updateClinic,
  deleteClinic,
} from "../database/repositories/clinicsRepo";
import { Clinic } from "../database/types";

const emptyForm = { name: "", address: "", phone: "", payment_info: "", notes: "" };

export default function ClinicsScreen() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setClinics(await listClinics());
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

  const handleDelete = async () => {
    if (!editingId) return;
    await deleteClinic(editingId);
    setModalOpen(false);
    await load();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={clinics}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhuma clínica cadastrada. Toque em + para adicionar.</Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openEdit(item)}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            {!!item.address && <Text style={styles.cardSubtitle}>{item.address}</Text>}
            {!!item.phone && <Text style={styles.cardSubtitle}>{item.phone}</Text>}
          </Pressable>
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
          {editingId && <PrimaryButton label="Excluir clínica" variant="danger" onPress={handleDelete} />}
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
  empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: "700", marginBottom: spacing.md },
});
