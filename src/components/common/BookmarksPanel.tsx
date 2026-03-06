/**
 * Bookmarks Panel Component
 *
 * Displays all bookmarks for a book in a list format
 * Allows navigation to bookmark location and deletion
 */

import React, { useState } from 'react';
import {
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
  IonNote,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonCard,
  IonCardContent,
  IonTextarea,
  IonToast,
} from '@ionic/react';
import { bookmark, bookmarkOutline, trashOutline, createOutline, close } from 'ionicons/icons';

import type { EpubBookmark } from '../../services/annotationsService';
import { useToast } from '../../hooks/useToast';

interface BookmarksPanelProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: EpubBookmark[];
  onGoToBookmark: (cfi: string) => void;
  onDeleteBookmark: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
}

export const BookmarksPanel: React.FC<BookmarksPanelProps> = ({
  isOpen,
  onClose,
  bookmarks,
  onGoToBookmark,
  onDeleteBookmark,
  onUpdateNote,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const toast = useToast();

  const handleEditNote = (bookmark: EpubBookmark) => {
    setEditingId(bookmark.id);
    setNoteText(bookmark.note || '');
  };

  const handleSaveNote = () => {
    if (editingId) {
      onUpdateNote(editingId, noteText);
      setEditingId(null);
      setNoteText('');
      toast.show('Note updated');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNoteText('');
  };

  const handleDelete = (id: string) => {
    onDeleteBookmark(id);
    toast.show('Bookmark removed');
  };

  const handleGoToBookmark = (cfi: string) => {
    onGoToBookmark(cfi);
    onClose();
  };

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={onClose}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Bookmarks ({bookmarks.length})</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={onClose}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          {bookmarks.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <IonIcon
                icon={bookmarkOutline}
                style={{ fontSize: '48px', color: 'var(--ion-color-medium)' }}
              />
              <p style={{ color: 'var(--ion-color-medium)' }}>No bookmarks yet</p>
              <IonNote>Select some text and tap "Add Bookmark" to create one</IonNote>
            </div>
          ) : (
            <IonList>
              {bookmarks.map((bm) => (
                <IonItem key={bm.id} button onClick={() => handleGoToBookmark(bm.cfi)}>
                  <IonIcon icon={bookmark} slot="start" color="primary" />
                  <IonLabel>
                    <h3>{bm.chapterTitle || 'Bookmark'}</h3>
                    {bm.textPreview && (
                      <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                        {bm.textPreview}
                      </p>
                    )}
                    {bm.note && (
                      <IonNote style={{ display: 'block', marginTop: '4px' }}>
                        Note: {bm.note}
                      </IonNote>
                    )}
                  </IonLabel>
                  <IonButtons slot="end">
                    <IonButton onClick={() => handleEditNote(bm)}>
                      <IonIcon icon={createOutline} />
                    </IonButton>
                    <IonButton onClick={() => handleDelete(bm.id)} color="danger">
                      <IonIcon icon={trashOutline} />
                    </IonButton>
                  </IonButtons>
                </IonItem>
              ))}
            </IonList>
          )}
        </IonContent>
      </IonModal>

      {/* Note Edit Modal */}
      <IonModal isOpen={editingId !== null} onDidDismiss={handleCancelEdit}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Edit Note</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={handleCancelEdit}>Cancel</IonButton>
              <IonButton onClick={handleSaveNote} strong>
                Save
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ padding: '16px' }}>
            <IonTextarea
              value={noteText}
              onIonInput={(e) => setNoteText(e.detail.value || '')}
              rows={8}
              placeholder="Add a note for this bookmark..."
              autoGrow
            />
          </div>
        </IonContent>
      </IonModal>

      <IonToast
        isOpen={toast.isOpen}
        onDidDismiss={toast.dismiss}
        message={toast.message}
        duration={2000}
      />
    </>
  );
};

export default BookmarksPanel;
