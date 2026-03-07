import React, { useState, useCallback } from 'react';
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
  IonBadge,
  IonCheckbox,
  IonAlert,
} from '@ionic/react';
import {
  addOutline,
  trashOutline,
  createOutline,
  sparklesOutline,
} from 'ionicons/icons';
import SmartShelfEditor from '../SmartShelfEditor';
import { databaseService } from '../../services/database';
import { evaluateShelf } from '../../services/smartShelvesService';
import type { SmartShelf } from '../../services/smartShelvesService';
import type { Book, Collection } from '../../types/index';

export interface ShelfManagerProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  smartShelves: SmartShelf[];
  books: Book[];
  bookCollectionMap: Record<string, string[]>;
  // Collection CRUD
  onCollectionsChanged: () => void;
  // Smart shelf CRUD
  onSaveSmartShelf: (shelf: SmartShelf) => void;
  onDeleteSmartShelf: (shelfId: string) => void;
  // Filter integration
  currentCollectionId: string;
  onFilterCollectionChange: (collectionId: string) => void;
}

// Sub-component: Add to Shelf modal
export interface AddToShelfModalProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  book: Book | null;
  bookCollectionMap: Record<string, string[]>;
  onBookCollectionMapChange: (updater: (prev: Record<string, string[]>) => Record<string, string[]>) => void;
  onCreateShelf: () => void;
}

export const AddToShelfModal: React.FC<AddToShelfModalProps> = ({
  isOpen,
  onClose,
  collections,
  book,
  bookCollectionMap,
  onBookCollectionMapChange,
  onCreateShelf,
}) => {
  const [bookShelfIds, setBookShelfIds] = useState<string[]>([]);

  // Sync shelf assignments when opening
  React.useEffect(() => {
    if (book && isOpen) {
      const ids: string[] = [];
      for (const [colId, bookIds] of Object.entries(bookCollectionMap)) {
        if (bookIds.includes(book.id)) ids.push(colId);
      }
      setBookShelfIds(ids);
    }
  }, [book, isOpen, bookCollectionMap]);

  const toggleBookShelf = useCallback(
    async (collectionId: string) => {
      if (!book) return;
      const isIn = bookShelfIds.includes(collectionId);
      if (isIn) {
        await databaseService.removeBookFromCollection(book.id, collectionId);
        setBookShelfIds((prev) => prev.filter((id) => id !== collectionId));
      } else {
        await databaseService.addBookToCollection(book.id, collectionId);
        setBookShelfIds((prev) => [...prev, collectionId]);
      }
      onBookCollectionMapChange((prev) => {
        const updated = { ...prev };
        const list = updated[collectionId] ? [...updated[collectionId]] : [];
        if (isIn) {
          updated[collectionId] = list.filter((id) => id !== book.id);
        } else {
          updated[collectionId] = [...list, book.id];
        }
        return updated;
      });
    },
    [book, bookShelfIds, onBookCollectionMapChange]
  );

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      breakpoints={[0, 0.5, 0.85]}
      initialBreakpoint={0.5}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>Add to Shelf</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Done</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {collections.map((shelf) => (
            <IonItem key={shelf.id} button onClick={() => toggleBookShelf(shelf.id)}>
              <IonCheckbox
                slot="start"
                checked={bookShelfIds.includes(shelf.id)}
              />
              <IonLabel>{shelf.name}</IonLabel>
            </IonItem>
          ))}
        </IonList>
        {collections.length === 0 && (
          <div className="ion-padding ion-text-center">
            <p>No shelves yet</p>
            <IonButton
              fill="outline"
              onClick={() => {
                onClose();
                onCreateShelf();
              }}
            >
              Create a Shelf
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonModal>
  );
};

const ShelfManager: React.FC<ShelfManagerProps> = ({
  isOpen,
  onClose,
  collections,
  smartShelves,
  books,
  bookCollectionMap,
  onCollectionsChanged,
  onSaveSmartShelf,
  onDeleteSmartShelf,
  currentCollectionId,
  onFilterCollectionChange,
}) => {
  // Create/Edit Shelf state
  const [showShelfModal, setShowShelfModal] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Collection | null>(null);
  const [shelfName, setShelfName] = useState('');
  const [shelfDescription, setShelfDescription] = useState('');

  // Delete shelf state
  const [showDeleteShelfAlert, setShowDeleteShelfAlert] = useState(false);
  const [shelfToDelete, setShelfToDelete] = useState<Collection | null>(null);

  // Smart shelf editor state
  const [showSmartShelfEditor, setShowSmartShelfEditor] = useState(false);
  const [editingSmartShelf, setEditingSmartShelf] = useState<SmartShelf | null>(null);

  const openShelfModal = useCallback((shelf?: Collection) => {
    if (shelf) {
      setEditingShelf(shelf);
      setShelfName(shelf.name);
      setShelfDescription(shelf.description || '');
    } else {
      setEditingShelf(null);
      setShelfName('');
      setShelfDescription('');
    }
    setShowShelfModal(true);
  }, []);

  const handleSaveShelf = useCallback(async () => {
    if (!shelfName.trim()) return;
    try {
      if (editingShelf) {
        await databaseService.updateCollection(editingShelf.id, {
          name: shelfName.trim(),
          description: shelfDescription.trim() || undefined,
        });
      } else {
        await databaseService.createCollection({
          name: shelfName.trim(),
          description: shelfDescription.trim() || undefined,
          sortOrder: collections.length,
        });
      }
      setShowShelfModal(false);
      setEditingShelf(null);
      setShelfName('');
      setShelfDescription('');
      onCollectionsChanged();
    } catch (err) {
      console.error('Failed to save shelf:', err);
    }
  }, [shelfName, shelfDescription, editingShelf, collections.length, onCollectionsChanged]);

  const handleDeleteShelf = useCallback(async () => {
    if (!shelfToDelete) return;
    try {
      await databaseService.deleteCollection(shelfToDelete.id);
      if (currentCollectionId === shelfToDelete.id) {
        onFilterCollectionChange('all');
      }
      setShelfToDelete(null);
      onCollectionsChanged();
    } catch (err) {
      console.error('Failed to delete shelf:', err);
    }
  }, [shelfToDelete, currentCollectionId, onFilterCollectionChange, onCollectionsChanged]);

  return (
    <>
      {/* Manage Shelves Modal */}
      <IonModal isOpen={isOpen} onDidDismiss={onClose}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Manage Shelves</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={onClose}>Done</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          {/* Collections section */}
          <div style={{ padding: '16px 16px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Collections</h2>
              <IonButton
                fill="clear"
                size="small"
                onClick={() => { onClose(); openShelfModal(); }}
              >
                <IonIcon icon={addOutline} slot="start" />
                Add
              </IonButton>
            </div>
          </div>
          <IonList>
            {collections.length === 0 && (
              <IonItem>
                <IonLabel color="medium">No collections yet</IonLabel>
              </IonItem>
            )}
            {collections.map((shelf) => (
              <IonItem key={shelf.id}>
                <IonLabel>
                  <h3>{shelf.name}</h3>
                  {shelf.description && <p>{shelf.description}</p>}
                  <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                    {bookCollectionMap[shelf.id]?.length || 0} book{(bookCollectionMap[shelf.id]?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </IonLabel>
                <IonButton
                  fill="clear"
                  slot="end"
                  onClick={() => { onClose(); openShelfModal(shelf); }}
                >
                  <IonIcon icon={createOutline} />
                </IonButton>
                <IonButton
                  fill="clear"
                  color="danger"
                  slot="end"
                  onClick={() => {
                    setShelfToDelete(shelf);
                    setShowDeleteShelfAlert(true);
                    onClose();
                  }}
                >
                  <IonIcon icon={trashOutline} />
                </IonButton>
              </IonItem>
            ))}
          </IonList>

          {/* Smart Shelves section */}
          <div style={{ padding: '16px 16px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                <IonIcon icon={sparklesOutline} style={{ marginRight: 6, verticalAlign: 'middle', fontSize: '16px' }} />
                Smart Shelves
              </h2>
              <IonButton
                fill="clear"
                size="small"
                onClick={() => { onClose(); setEditingSmartShelf(null); setShowSmartShelfEditor(true); }}
              >
                <IonIcon icon={addOutline} slot="start" />
                Add
              </IonButton>
            </div>
          </div>
          <IonList>
            {smartShelves.length === 0 && (
              <IonItem>
                <IonLabel color="medium">No smart shelves yet</IonLabel>
              </IonItem>
            )}
            {smartShelves.map((shelf) => (
              <IonItem key={shelf.id}>
                <IonLabel>
                  <h3>{shelf.name}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                    {shelf.rules.length} rule{shelf.rules.length !== 1 ? 's' : ''}
                    {' \u00B7 '}
                    {evaluateShelf(shelf, books).length} book{evaluateShelf(shelf, books).length !== 1 ? 's' : ''}
                    {shelf.isDefault && ' \u00B7 Default'}
                  </p>
                </IonLabel>
                <IonButton
                  fill="clear"
                  slot="end"
                  onClick={() => { onClose(); setEditingSmartShelf(shelf); setShowSmartShelfEditor(true); }}
                >
                  <IonIcon icon={createOutline} />
                </IonButton>
                {!shelf.isDefault && (
                  <IonButton
                    fill="clear"
                    color="danger"
                    slot="end"
                    onClick={() => { onDeleteSmartShelf(shelf.id); }}
                  >
                    <IonIcon icon={trashOutline} />
                  </IonButton>
                )}
              </IonItem>
            ))}
          </IonList>
        </IonContent>
      </IonModal>

      {/* Create/Edit Shelf Modal */}
      <IonModal isOpen={showShelfModal} onDidDismiss={() => setShowShelfModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>{editingShelf ? 'Edit Shelf' : 'New Shelf'}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowShelfModal(false)}>Cancel</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonItem>
            <IonLabel position="stacked">Shelf Name *</IonLabel>
            <IonInput
              value={shelfName}
              onIonInput={(e) => setShelfName(e.detail.value || '')}
              placeholder="e.g. Sci-Fi, Work, Summer Reading"
              clearInput
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Description</IonLabel>
            <IonInput
              value={shelfDescription}
              onIonInput={(e) => setShelfDescription(e.detail.value || '')}
              placeholder="Optional description"
              clearInput
            />
          </IonItem>
          <div className="ion-padding">
            <IonButton expand="block" onClick={handleSaveShelf} disabled={!shelfName.trim()}>
              {editingShelf ? 'Save Changes' : 'Create Shelf'}
            </IonButton>
            {editingShelf && (
              <IonButton
                expand="block"
                fill="outline"
                color="danger"
                style={{ marginTop: 12 }}
                onClick={() => {
                  setShelfToDelete(editingShelf);
                  setShowDeleteShelfAlert(true);
                  setShowShelfModal(false);
                }}
              >
                <IonIcon icon={trashOutline} slot="start" />
                Delete Shelf
              </IonButton>
            )}
          </div>
        </IonContent>
      </IonModal>

      {/* Delete Shelf Alert */}
      <IonAlert
        isOpen={showDeleteShelfAlert}
        onDidDismiss={() => {
          setShowDeleteShelfAlert(false);
          setShelfToDelete(null);
        }}
        header="Delete Shelf"
        message={`Delete "${shelfToDelete?.name}"? Books in this shelf will not be deleted.`}
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Delete',
            role: 'destructive',
            handler: handleDeleteShelf,
          },
        ]}
      />

      {/* Smart Shelf Editor Modal */}
      <SmartShelfEditor
        isOpen={showSmartShelfEditor}
        shelf={editingSmartShelf}
        onSave={onSaveSmartShelf}
        onDelete={onDeleteSmartShelf}
        onDismiss={() => {
          setShowSmartShelfEditor(false);
          setEditingSmartShelf(null);
        }}
      />
    </>
  );
};

export default ShelfManager;
