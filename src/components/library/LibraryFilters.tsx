import React from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonFooter,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonChip,
} from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import type { Collection } from '../../types/index';
import type { ReadStatus } from '../../stores/useLibraryPrefsStore';

export interface LibraryFiltersState {
  format: string;
  readStatus: ReadStatus | 'all';
  collectionId: string;
  tagIds: string[];
}

export interface LibraryFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: LibraryFiltersState;
  onFiltersChange: (updater: (prev: LibraryFiltersState) => LibraryFiltersState) => void;
  collections: Collection[];
  allTags: Array<{ id: string; name: string; color?: string }>;
  onClearAll: () => void;
}

const LibraryFilters: React.FC<LibraryFiltersProps> = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  collections,
  allTags,
  onClearAll,
}) => {
  const toggleTagFilter = (tagId: string) => {
    onFiltersChange((prev) => {
      const isActive = prev.tagIds.includes(tagId);
      return {
        ...prev,
        tagIds: isActive ? prev.tagIds.filter((id) => id !== tagId) : [...prev.tagIds, tagId],
      };
    });
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      breakpoints={[0, 0.6, 0.9]}
      initialBreakpoint={0.6}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>Filter Books</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          <IonItem>
            <IonLabel>Format</IonLabel>
            <IonSelect
              value={filters.format}
              onIonChange={(e) => onFiltersChange((prev) => ({ ...prev, format: e.detail.value }))}
              slot="end"
            >
              <IonSelectOption value="all">All</IonSelectOption>
              <IonSelectOption value="epub">EPUB</IonSelectOption>
              <IonSelectOption value="pdf">PDF</IonSelectOption>
              <IonSelectOption value="mobi">MOBI</IonSelectOption>
              <IonSelectOption value="txt">TXT</IonSelectOption>
              <IonSelectOption value="fb2">FB2</IonSelectOption>
              <IonSelectOption value="docx">DOCX</IonSelectOption>
              <IonSelectOption value="odt">ODT</IonSelectOption>
            </IonSelect>
          </IonItem>

          <IonItem>
            <IonLabel>Read Status</IonLabel>
            <IonSelect
              value={filters.readStatus}
              onIonChange={(e) =>
                onFiltersChange((prev) => ({ ...prev, readStatus: e.detail.value as ReadStatus }))
              }
              slot="end"
            >
              <IonSelectOption value="all">All</IonSelectOption>
              <IonSelectOption value="unread">Unread</IonSelectOption>
              <IonSelectOption value="reading">In Progress</IonSelectOption>
              <IonSelectOption value="finished">Finished</IonSelectOption>
              <IonSelectOption value="dnf">Did Not Finish</IonSelectOption>
            </IonSelect>
          </IonItem>

          {collections.length > 0 && (
            <IonItem>
              <IonLabel>Collection</IonLabel>
              <IonSelect
                value={filters.collectionId}
                onIonChange={(e) =>
                  onFiltersChange((prev) => ({ ...prev, collectionId: e.detail.value }))
                }
                slot="end"
              >
                <IonSelectOption value="all">All Collections</IonSelectOption>
                {collections.map((col) => (
                  <IonSelectOption key={col.id} value={col.id}>
                    {col.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          )}
        </IonList>

        {allTags.length > 0 && (
          <div style={{ padding: '8px 16px' }}>
            <IonLabel
              style={{
                fontSize: '14px',
                color: 'var(--ion-color-medium)',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Tags
            </IonLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {allTags.map((tag) => (
                <IonChip
                  key={tag.id}
                  outline={!filters.tagIds.includes(tag.id)}
                  color={filters.tagIds.includes(tag.id) ? 'primary' : undefined}
                  onClick={() => toggleTagFilter(tag.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {tag.name}
                </IonChip>
              ))}
            </div>
          </div>
        )}
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <IonButton
            expand="block"
            fill="outline"
            color="medium"
            onClick={onClearAll}
            style={{ margin: '8px' }}
          >
            Clear All Filters
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonModal>
  );
};

export default LibraryFilters;
