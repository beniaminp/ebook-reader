import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export interface SharedBookDoc {
  id?: string;
  magnetURI: string;
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
    where('userId', '==', userId),
    orderBy('sharedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SharedBookDoc));
}

export async function getAllSharedBooks(): Promise<SharedBookDoc[]> {
  const q = query(collection(db, COLLECTION), orderBy('sharedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SharedBookDoc));
}

export const sharingService = {
  shareBook,
  unshareBook,
  getMySharedBooks,
  getAllSharedBooks,
};
