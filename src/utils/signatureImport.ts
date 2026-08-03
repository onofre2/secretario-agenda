import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { setSetting, getSetting, SETTINGS_KEYS } from "../database/repositories/settingsRepo";

const SIGNATURE_DIR = FileSystem.documentDirectory + "signature/";
const SIGNATURE_FILE = SIGNATURE_DIR + "assinatura.jpg";

async function ensureSignatureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(SIGNATURE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(SIGNATURE_DIR, { intermediates: true });
  }
}

export async function pickSignatureImage(): Promise<boolean> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return false;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return false;

  const asset = result.assets[0];
  await ensureSignatureDir();
  await FileSystem.copyAsync({ from: asset.uri, to: SIGNATURE_FILE });
  await setSetting(SETTINGS_KEYS.SIGNATURE_IMAGE_PATH, SIGNATURE_FILE);
  return true;
}

export async function removeSignatureImage(): Promise<void> {
  await setSetting(SETTINGS_KEYS.SIGNATURE_IMAGE_PATH, "");
}

export async function getSignatureImageBase64(): Promise<string | null> {
  const path = await getSetting(SETTINGS_KEYS.SIGNATURE_IMAGE_PATH);
  if (!path) return null;
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return null;
  const base64 = await FileSystem.readAsStringAsync(path, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:image/jpeg;base64,${base64}`;
}
