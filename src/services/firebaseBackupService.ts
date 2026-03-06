import { doc, setDoc, getDoc, deleteDoc, collection, getDocs } from 'firebase/firestore/lite';
import { ref, uploadBytes, getBytes, deleteObject, listAll } from 'firebase/storage';
import { db, storage } from '../config/firebaseConfig';
import { databaseService } from './database';
import { webFileStorage } from './webFileStorage';
import { useThemeStore } from '../stores/useThemeStore';
import { useLibraryPrefsStore } from '../stores/useLibraryPrefsStore';
import { useTranslationStore } from '../stores/useTranslationStore';
import { useSecurityStore } from '../stores/useSecurityStore';

export interface BackupManifest {
  timestamp: number;
  bookCount: number;
  bookmarkCount: number;
  highlightCount: number;
  fileCount: number;
  totalSize: number;
}

export async function performBackup(userId: string): Promise<void> {
  // 1. Export database
  const dbExport = await databaseService.exportDatabase();

  // 2. Export store settings
  const storeExports = {
    theme: useThemeStore.getState(),
    libraryPrefs: useLibraryPrefsStore.getState(),
    translation: useTranslationStore.getState(),
    security: useSecurityStore.getState(),
  };

  // 3. Upload database + stores to Firestore
  const dataDoc = doc(db, 'backups', userId, 'data', 'main');
  await setDoc(dataDoc, {
    database: JSON.stringify(dbExport),
    stores: JSON.stringify(storeExports),
    updatedAt: Date.now(),
  });

  // 4. Upload book files to Firebase Storage
  const fileKeys = await webFileStorage.getAllKeys();
  let totalSize = 0;

  for (const bookId of fileKeys) {
    const data = await webFileStorage.getFile(bookId);
    if (data) {
      const fileRef = ref(storage, `backups/${userId}/files/${bookId}`);
      await uploadBytes(fileRef, new Uint8Array(data));
      totalSize += data.byteLength;
    }
  }

  // 5. Write manifest
  const manifestDoc = doc(db, 'backups', userId, 'data', 'manifest');
  const manifest: BackupManifest = {
    timestamp: Date.now(),
    bookCount: dbExport.books.length,
    bookmarkCount: dbExport.bookmarks.length,
    highlightCount: dbExport.highlights.length,
    fileCount: fileKeys.length,
    totalSize,
  };
  await setDoc(manifestDoc, manifest);
}

export async function restoreFromBackup(userId: string): Promise<void> {
  // 1. Download database + stores from Firestore
  const dataDoc = doc(db, 'backups', userId, 'data', 'main');
  const dataSnap = await getDoc(dataDoc);
  if (!dataSnap.exists()) {
    throw new Error('No backup found');
  }

  const data = dataSnap.data();
  const dbExport = JSON.parse(data.database);
  const storeExports = JSON.parse(data.stores);

  // 2. Import database
  await databaseService.importDatabase(dbExport, {
    overwrite: true,
    mergeStrategy: 'merge',
  });

  // 3. Restore store settings
  if (storeExports.theme) {
    const {
      theme, fontFamily, fontSize, lineHeight, textAlign, marginSize,
      blueLightFilter, blueLightIntensity, readingRuler, readingRulerSettings,
      bionicReading, focusMode, focusModeSettings, autoScroll, autoScrollSpeed,
      customThemes, customFonts, customBackgroundColor, customBackgroundImage,
      pageTransitionType, fontWeight,
    } = storeExports.theme;
    useThemeStore.setState({
      theme, fontFamily, fontSize, lineHeight, textAlign, marginSize,
      blueLightFilter, blueLightIntensity, readingRuler, readingRulerSettings,
      bionicReading, focusMode, focusModeSettings, autoScroll, autoScrollSpeed,
      customThemes, customFonts, customBackgroundColor, customBackgroundImage,
      pageTransitionType, fontWeight,
    });
  }

  if (storeExports.libraryPrefs) {
    const { viewMode, sortBy, filters } = storeExports.libraryPrefs;
    useLibraryPrefsStore.setState({ viewMode, sortBy, filters });
  }

  if (storeExports.translation) {
    const { targetLanguage, autoDetectSource, apiKey, apiEndpoint, saveHistory, translationHistory } = storeExports.translation;
    useTranslationStore.setState({ targetLanguage, autoDetectSource, apiKey, apiEndpoint, saveHistory, translationHistory });
  }

  if (storeExports.security) {
    const { lockType, isEnabled, autoLockDelay } = storeExports.security;
    useSecurityStore.setState({ lockType, isEnabled, autoLockDelay });
  }

  // 4. Restore book files from Firebase Storage
  const filesRef = ref(storage, `backups/${userId}/files`);
  try {
    const fileList = await listAll(filesRef);
    for (const itemRef of fileList.items) {
      const bookId = itemRef.name;
      const data = await getBytes(itemRef);
      await webFileStorage.storeFile(bookId, data);
    }
  } catch {
    // No files to restore — not an error
  }
}

export async function checkForBackup(userId: string): Promise<BackupManifest | null> {
  const manifestDoc = doc(db, 'backups', userId, 'data', 'manifest');
  const snap = await getDoc(manifestDoc);
  if (!snap.exists()) return null;
  return snap.data() as BackupManifest;
}

export async function deleteBackup(userId: string): Promise<void> {
  // Delete Firestore docs
  const dataColl = collection(db, 'backups', userId, 'data');
  const docs = await getDocs(dataColl);
  for (const d of docs.docs) {
    await deleteDoc(d.ref);
  }

  // Delete Storage files
  const filesRef = ref(storage, `backups/${userId}/files`);
  try {
    const fileList = await listAll(filesRef);
    for (const itemRef of fileList.items) {
      await deleteObject(itemRef);
    }
  } catch {
    // Nothing to delete
  }
}
