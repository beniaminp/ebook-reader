import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export interface SharedBookDoc {
  id?: string;
  magnetURI?: string;
  downloadURL?: string;
  title: string;
  author: string;
  format: string;
  fileSize: number;
  userId: string;
  sharedAt: Timestamp;
  localBookId: string;
}

const COLLECTION = 'sharedBooks';

export async function shareBook(
  data: Omit<SharedBookDoc, 'id' | 'sharedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    sharedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function unshareBook(docId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, docId));
}

export async function getMySharedBooks(userId: string): Promise<SharedBookDoc[]> {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  const books = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SharedBookDoc));
  return books.sort((a, b) => (b.sharedAt?.seconds ?? 0) - (a.sharedAt?.seconds ?? 0));
}

export async function getAllSharedBooks(): Promise<SharedBookDoc[]> {
  const q = query(collection(db, COLLECTION));
  const snapshot = await getDocs(q);
  const books = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      magnetURI: data.magnetURI || undefined,
      downloadURL: data.downloadURL || undefined,
      title: data.title || '',
      author: data.author || '',
      format: data.format || '',
      fileSize: data.fileSize || 0,
      userId: data.userId || '',
      sharedAt: data.sharedAt,
      localBookId: data.localBookId || '',
    } as SharedBookDoc;
  });
  return books.sort((a, b) => (b.sharedAt?.seconds ?? 0) - (a.sharedAt?.seconds ?? 0));
}

export const sharingService = {
  shareBook,
  unshareBook,
  getMySharedBooks,
  getAllSharedBooks,
};
