// utils/imageStorage.js
import * as FileSystem from 'expo-file-system/legacy';

const IMAGE_DIR = FileSystem.documentDirectory + 'diary_images/';

const ensureDirExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
};

export const persistPickedImage = async (tempUri) => {
  await ensureDirExists();

  const extMatch = tempUri.match(/\.(\w+)$/);
  const ext = extMatch ? extMatch[1] : 'jpg';
  const filename = `${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
  const destUri = IMAGE_DIR + filename;

  await FileSystem.copyAsync({ from: tempUri, to: destUri });
  return destUri;
};

export const deletePersistedImage = async (uri) => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (error) {
    console.error('Error deleting persisted image:', error);
  }
};

/** Deletes multiple persisted images, ignoring individual failures. */
export const deletePersistedImages = async (uris = []) => {
  await Promise.all(uris.map((uri) => deletePersistedImage(uri)));
};