/**
 * Highlights Panel Component
 *
 * Displays all highlights for a book in a list format
 * Allows navigation to highlight location, editing, and deletion
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
  IonTextarea,
  IonSegment,
  IonSegmentButton,
  IonToast,
  IonBadge,
} from '@ionic/react';
import { colorPalette, trashOutline, createOutline, close, bookmarkOutline } from 'ionicons/icons';

import type { EpubHighlight } from '../../services/annotationsService';
import { HIGHLIGHT_COLORS } from '../../services/annotationsService';

interface HighlightsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  highlights: EpubHighlight[];
  onGoToHighlight: (cfiRange: string) => void;
  onDeleteHighlight: (id: string) => void;
  onUpdateHighlight: (id: string, updates: { color?: string; note?: string }) => void;
}

export const HighlightsPanel: React.FC<HighlightsPanelProps> = ({
  isOpen,
  onClose,
  highlights,
  onGoToHighlight,
  onDeleteHighlight,
  onUpdateHighlight,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(HIGHLIGHT_COLORS[0].value);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleEdit = (highlight: EpubHighlight) => {
    setEditingId(highlight.id);
    setNoteText(highlight.note || '');
    setSelectedColor(highlight.color);
  };

  const handleSave = () => {
    if (editingId) {
      onUpdateHighlight(editingId, { note: noteText, color: selectedColor });
      setEditingId(null);
      setNoteText('');
      setToastMessage('Highlight updated');
      setShowToast(true);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNoteText('');
  };

  const handleDelete = (id: string) => {
    onDeleteHighlight(id);
    setToastMessage('Highlight removed');
    setShowToast(true);
  };

  const handleGoToHighlight = (cfiRange: string) => {
    onGoToHighlight(cfiRange);
    onClose();
  };

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={onClose}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Highlights ({highlights.length})</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={onClose}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          {highlights.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <IonIcon
                icon={colorPalette}
                style={{ fontSize: '48px', color: 'var(--ion-color-medium)' }}
              />
              <p style={{ color: 'var(--ion-color-medium)' }}>No highlights yet</p>
              <IonNote>Select some text to create a highlight</IonNote>
            </div>
          ) : (
            <IonList>
              {highlights.map((highlight) => (
                <IonItem
                  key={highlight.id}
                  button
                  onClick={() => handleGoToHighlight(highlight.cfiRange)}
                  style={{
                    borderLeft: `4px solid ${highlight.color}`,
                    paddingLeft: '12px',
                  }}
                >
                  <IonLabel>
                    <p
                      style={{
                        backgroundColor: `${highlight.color}40`,
                        padding: '8px',
                        borderRadius: '4px',
                        fontStyle: 'italic',
                      }}
                    >
                      "{highlight.text}"
                    </p>
                    {highlight.chapterTitle && (
                      <IonNote style={{ display: 'block', marginTop: '4px' }}>
                        {highlight.chapterTitle}
                      </IonNote>
                    )}
                    {highlight.note && (
                      <IonNote style={{ display: 'block', marginTop: '4px' }}>
                        Note: {highlight.note}
                      </IonNote>
                    )}
                  </IonLabel>
                  <IonButtons slot="end">
                    <IonButton onClick={() => handleEdit(highlight)}>
                      <IonIcon icon={createOutline} />
                    </IonButton>
                    <IonButton onClick={() => handleDelete(highlight.id)} color="danger">
                      <IonIcon icon={trashOutline} />
                    </IonButton>
                  </IonButtons>
                </IonItem>
              ))}
            </IonList>
          )}
        </IonContent>
      </IonModal>

      {/* Edit Modal */}
      <IonModal isOpen={editingId !== null} onDidDismiss={handleCancelEdit}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Edit Highlight</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={handleCancelEdit}>Cancel</IonButton>
              <IonButton onClick={handleSave} strong>
                Save
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ padding: '16px' }}>
            <IonNote style={{ display: 'block', marginBottom: '8px' }}>Color</IonNote>
            <IonSegment
              value={selectedColor}
              onIonChange={(e) => setSelectedColor(e.detail.value as string)}
            >
              {HIGHLIGHT_COLORS.map((color) => (
                <IonSegmentButton key={color.value} value={color.value}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: color.value,
                      border: '2px solid #ccc',
                    }}
                  />
                </IonSegmentButton>
              ))}
            </IonSegment>

            <IonNote style={{ display: 'block', marginTop: '16px', marginBottom: '8px' }}>
              Note
            </IonNote>
            <IonTextarea
              value={noteText}
              onIonInput={(e) => setNoteText(e.detail.value || '')}
              rows={6}
              placeholder="Add a note for this highlight..."
              autoGrow
            />
          </div>
        </IonContent>
      </IonModal>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={2000}
      />
    </>
  );
};

export default HighlightsPanel;
