export { signInWithGoogle, signOutUser, getCurrentUser, onAuthStateChanged } from './auth';
export type { FirebaseUser, Unsubscribe } from './auth';
export { firebaseStorageService } from './storage';
export { performBackup, restoreFromBackup, checkForBackup, deleteBackup } from './backup';
export type { BackupManifest } from './backup';
export { markDirty, startAutoBackup, stopAutoBackup } from './autoBackup';
