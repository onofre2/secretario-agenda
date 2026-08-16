import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { updateClinic } from "../database/repositories/clinicsRepo";

const LOGO_DIR = FileSystem.documentDirectory + "clinic_logos/";

async function ensureLogoDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(LOGO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(LOGO_DIR, { intermediates: true });
  }
}

export async function pickClinicLogo(clinicId: number): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  await ensureLogoDir();
  const destPath = LOGO_DIR + `logo_${clinicId}.jpg`;
  await FileSystem.copyAsync({ from: asset.uri, to: destPath });
  await updateClinic(clinicId, { logo_path: destPath });
  return destPath;
}

export async function removeClinicLogo(clinicId: number): Promise<void> {
  await updateClinic(clinicId, { logo_path: null });
}

export async function getClinicLogoBase64(logoPath: string | null): Promise<string | null> {
  if (!logoPath) return null;
  const info = await FileSystem.getInfoAsync(logoPath);
  if (!info.exists) return null;
  const base64 = await FileSystem.readAsStringAsync(logoPath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:image/jpeg;base64,${base64}`;
}

export async function getImageBase64(imagePath: string): Promise<string | null> {
  const info = await FileSystem.getInfoAsync(imagePath);
  if (!info.exists) return null;
  const base64 = await FileSystem.readAsStringAsync(imagePath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:image/jpeg;base64,${base64}`;
}
