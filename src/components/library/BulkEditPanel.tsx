import React, { useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner,
} from '@ionic/react';
import { closeOutline, createOutline } from 'ionicons/icons';
import StarRating from '../common/StarRating';
import { databaseService } from '../../services/database';

export interface BulkEditPanelProps {
  isActive: boolean;
  selectedCount: number;
  selectedBookIds: Set<string>;
  onSelectAll: () => void;
  onCancel: () => void;
  onEditComplete: () => void;
  onToast: (message: string, color: string) => void;
}

const BulkEditPanel: React.FC<BulkEditPanelProps> = ({
  isActive,
  selectedCount,
  selectedBookIds,
  onSelectAll,
  onCancel,
  onEditComplete,
  onToast,
}) => {
  const [showBulkEditSheet, setShowBulkEditSheet] = useState(false);
  const [bulkGenre, setBulkGenre] = useState('');
  const [bulkRating, setBulkRating] = useState(0);
  const [bulkSeries, setBulkSeries] = useState('');
  const [bulkLanguage, setBulkLanguage] = useState('');
  const [bulkReadStatus, setBulkReadStatus] = useState('');
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const handleBulkEdit = async () => {
    if (selectedBookIds.size === 0) return;
    setIsBulkSaving(true);
    try {
      for (const bookId of selectedBookIds) {
        const updates: any = {};
        const metaUpdates: any = {};
        if (bulkGenre.trim()) {
          updates.genre = bulkGenre.trim();
          metaUpdates.genre = bulkGenre.trim();
        }
        if (bulkRating > 0) {
          metaUpdates.rating = bulkRating;
        }
        if (bulkSeries.trim()) {
          updates.series = bulkSeries.trim();
          metaUpdates.series = bulkSeries.trim();
        }
        if (bulkLanguage.trim()) {
          metaUpdates.language = bulkLanguage.trim();
        }
        if (bulkReadStatus) {
          updates.readStatus = bulkReadStatus;
        }
        if (Object.keys(updates).length > 0) {
          await databaseService.updateBook(bookId, updates);
        }
        if (Object.keys(metaUpdates).length > 0) {
          await databaseService.updateBookMetadata(bookId, metaUpdates);
        }
      }
      onToast(`Updated ${selectedBookIds.size} book${selectedBookIds.size > 1 ? 's' : ''}`, 'success');
      setShowBulkEditSheet(false);
      resetFields();
      onEditComplete();
    } catch (err) {
      console.error('Bulk edit failed:', err);
      onToast('Failed to update books', 'danger');
    } finally {
      setIsBulkSaving(false);
    }
  };

  const resetFields = () => {
    setBulkGenre('');
    setBulkRating(0);
    setBulkSeries('');
    setBulkLanguage('');
    setBulkReadStatus('');
  };

  if (!isActive || selectedCount === 0) return null;

  return (
    <>
      {/* Bulk select action bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--ion-toolbar-background, var(--ion-color-primary))',
          color: '#fff',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10000,
          boxShadow: '0 -2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          {selectedCount} selected
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <IonButton
            fill="solid"
            color="light"
            size="small"
            onClick={() => {
              resetFields();
              setShowBulkEditSheet(true);
            }}
          >
            <IonIcon icon={createOutline} slot="start" />
            Edit
          </IonButton>
          <IonButton
            fill="outline"
            color="light"
            size="small"
            onClick={onSelectAll}
          >
            Select All
          </IonButton>
        </div>
      </div>

      {/* Bulk Metadata Edit Modal */}
      <IonModal
        isOpen={showBulkEditSheet}
        onDidDismiss={() => setShowBulkEditSheet(false)}
        breakpoints={[0, 0.65]}
        initialBreakpoint={0.65}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Bulk Edit ({selectedCount} books)</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowBulkEditSheet(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p style={{ fontSize: 13, color: 'var(--ion-color-medium)', margin: '0 0 12px' }}>
            Only filled fields will be applied. Leave blank to skip.
          </p>
          <IonList>
            <IonItem>
              <IonLabel position="stacked">Genre</IonLabel>
              <IonInput
                value={bulkGenre}
                onIonInput={(e) => setBulkGenre(e.detail.value || '')}
                placeholder="e.g. Fiction, Science"
                clearInput
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Series</IonLabel>
              <IonInput
                value={bulkSeries}
                onIonInput={(e) => setBulkSeries(e.detail.value || '')}
                placeholder="e.g. Harry Potter"
                clearInput
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Language</IonLabel>
              <IonInput
                value={bulkLanguage}
                onIonInput={(e) => setBulkLanguage(e.detail.value || '')}
                placeholder="e.g. en, fr, de"
                clearInput
              />
            </IonItem>
            <IonItem>
              <IonLabel>Read Status</IonLabel>
              <IonSelect
                value={bulkReadStatus}
                onIonChange={(e) => setBulkReadStatus(e.detail.value)}
                placeholder="No change"
              >
                <IonSelectOption value="">No change</IonSelectOption>
                <IonSelectOption value="unread">Unread</IonSelectOption>
                <IonSelectOption value="reading">Reading</IonSelectOption>
                <IonSelectOption value="finished">Finished</IonSelectOption>
                <IonSelectOption value="dnf">DNF</IonSelectOption>
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonLabel>Rating</IonLabel>
              <div style={{ padding: '8px 0' }}>
                <StarRating rating={bulkRating} size={24} gap="4px" onRate={(r) => setBulkRating(r)} />
              </div>
            </IonItem>
          </IonList>
          <IonButton
            expand="block"
            style={{ marginTop: 16 }}
            onClick={handleBulkEdit}
            disabled={isBulkSaving}
          >
            {isBulkSaving ? <IonSpinner name="dots" /> : `Apply to ${selectedCount} Books`}
          </IonButton>
        </IonContent>
      </IonModal>
    </>
  );
};

export default BulkEditPanel;
