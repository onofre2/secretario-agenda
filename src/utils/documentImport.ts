import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { createPatientDocument } from "../database/repositories/patientDocumentsRepo";

const DOCS_DIR = FileSystem.documentDirectory + "patient_documents/";

async function ensureDocsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DOCS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOCS_DIR, { intermediates: true });
  }
}

export async function importPhotoDocument(patientId: number): Promise<boolean> {
  const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
  if (!cameraPerm.granted) return false;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.[0]) return false;

  const asset = result.assets[0];
  await ensureDocsDir();
  const ext = asset.uri.split(".").pop() ?? "jpg";
  const fileName = `doc_${patientId}_${Date.now()}.${ext}`;
  const destPath = DOCS_DIR + fileName;
  await FileSystem.copyAsync({ from: asset.uri, to: destPath });

  try {
    const mediaPerm = await MediaLibrary.requestPermissionsAsync();
    if (mediaPerm.granted) {
      await MediaLibrary.saveToLibraryAsync(asset.uri);
    }
  } catch (err) {
    console.error("Erro ao salvar foto na galeria:", err);
  }

  await createPatientDocument(patientId, destPath, "photo", fileName);
  return true;
}

export async function importGalleryPhotoDocument(patientId: number): Promise<boolean> {
  const libraryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!libraryPerm.granted) return false;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.[0]) return false;

  const asset = result.assets[0];
  await ensureDocsDir();
  const ext = asset.uri.split(".").pop() ?? "jpg";
  const fileName = `doc_${patientId}_${Date.now()}.${ext}`;
  const destPath = DOCS_DIR + fileName;
  await FileSystem.copyAsync({ from: asset.uri, to: destPath });

  await createPatientDocument(patientId, destPath, "photo", fileName);
  return true;
}

export async function importPdfDocument(patientId: number): Promise<boolean> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return false;

  const asset = result.assets[0];
  await ensureDocsDir();
  const fileName = `doc_${patientId}_${Date.now()}.pdf`;
  const destPath = DOCS_DIR + fileName;
  await FileSystem.copyAsync({ from: asset.uri, to: destPath });

  await createPatientDocument(patientId, destPath, "pdf", asset.name ?? fileName);
  return true;
}
