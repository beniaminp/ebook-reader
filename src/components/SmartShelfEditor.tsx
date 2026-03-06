import React, { useState, useEffect } from 'react';
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
  IonToggle,
  IonChip,
  IonAlert,
} from '@ionic/react';
import {
  closeOutline,
  addOutline,
  trashOutline,
} from 'ionicons/icons';
import type { SmartShelf, SmartShelfRule, SmartShelfField, SmartShelfOperator } from '../services/smartShelvesService';
import {
  FIELD_LABELS,
  OPERATOR_LABELS,
  getOperatorsForField,
} from '../services/smartShelvesService';

interface SmartShelfEditorProps {
  isOpen: boolean;
  shelf: SmartShelf | null;
  onSave: (shelf: SmartShelf) => void;
  onDelete?: (shelfId: string) => void;
  onDismiss: () => void;
}

const SmartShelfEditor: React.FC<SmartShelfEditorProps> = ({
  isOpen,
  shelf,
  onSave,
  onDelete,
  onDismiss,
}) => {
  const [name, setName] = useState('');
  const [rules, setRules] = useState<SmartShelfRule[]>([]);
  const [matchAll, setMatchAll] = useState(true);
  const [sortBy, setSortBy] = useState<SmartShelf['sortBy']>('dateAdded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit] = useState<number>(0);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const isEditing = shelf !== null;
  const isDefault = shelf?.isDefault === true;

  useEffect(() => {
    if (shelf) {
      setName(shelf.name);
      setRules([...shelf.rules]);
      setMatchAll(shelf.matchAll);
      setSortBy(shelf.sortBy || 'dateAdded');
      setSortOrder(shelf.sortOrder || 'desc');
      setLimit(shelf.limit || 0);
    } else {
      setName('');
      setRules([{ field: 'status', operator: 'equals', value: 'reading' }]);
      setMatchAll(true);
      setSortBy('dateAdded');
      setSortOrder('desc');
      setLimit(0);
    }
  }, [shelf, isOpen]);

  const addRule = () => {
    setRules([...rules, { field: 'format', operator: 'equals', value: '' }]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, updates: Partial<SmartShelfRule>) => {
    setRules(
      rules.map((rule, i) => {
        if (i !== index) return rule;
        const updated = { ...rule, ...updates };
        // If field changed, reset operator to a valid one for the new field
        if (updates.field && updates.field !== rule.field) {
          const validOps = getOperatorsForField(updates.field);
          if (!validOps.includes(updated.operator)) {
            updated.operator = validOps[0];
          }
          updated.value = '';
        }
        return updated;
      })
    );
  };

  const handleSave = () => {
    if (!name.trim() || rules.length === 0) return;

    const result: SmartShelf = {
      id: shelf?.id || `smart-custom-${Date.now()}`,
      name: name.trim(),
      icon: shelf?.icon || 'bookmark-outline',
      rules,
      matchAll,
      sortBy,
      sortOrder,
      limit: limit > 0 ? limit : undefined,
      isDefault: shelf?.isDefault,
    };
    onSave(result);
    onDismiss();
  };

  const renderValueInput = (rule: SmartShelfRule, index: number) => {
    // Provide specific options for known fields
    if (rule.field === 'status') {
      return (
        <IonSelect
          value={rule.value}
          onIonChange={(e) => updateRule(index, { value: e.detail.value })}
          placeholder="Select status"
          style={{ maxWidth: '130px' }}
        >
          <IonSelectOption value="unread">Unread</IonSelectOption>
          <IonSelectOption value="reading">Reading</IonSelectOption>
          <IonSelectOption value="finished">Finished</IonSelectOption>
          <IonSelectOption value="dnf">DNF</IonSelectOption>
        </IonSelect>
      );
    }

    if (rule.field === 'format') {
      return (
        <IonSelect
          value={rule.value}
          onIonChange={(e) => updateRule(index, { value: e.detail.value })}
          placeholder="Select format"
          style={{ maxWidth: '130px' }}
        >
          {['epub', 'pdf', 'mobi', 'azw3', 'fb2', 'cbz', 'cbr', 'txt', 'html', 'docx', 'odt', 'md'].map(
            (f) => (
              <IonSelectOption key={f} value={f}>
                {f.toUpperCase()}
              </IonSelectOption>
            )
          )}
        </IonSelect>
      );
    }

    if (rule.field === 'rating') {
      return (
        <IonSelect
          value={rule.value}
          onIonChange={(e) => updateRule(index, { value: Number(e.detail.value) })}
          placeholder="Rating"
          style={{ maxWidth: '100px' }}
        >
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <IonSelectOption key={r} value={r}>
              {r === 0 ? 'None' : `${r} star${r > 1 ? 's' : ''}`}
            </IonSelectOption>
          ))}
        </IonSelect>
      );
    }

    if (rule.field === 'progress') {
      return (
        <IonInput
          type="number"
          value={typeof rule.value === 'number' ? rule.value : ''}
          onIonInput={(e) => {
            const val = parseFloat(e.detail.value || '0');
            updateRule(index, { value: isNaN(val) ? 0 : val });
          }}
          placeholder="0 to 1"
          style={{ maxWidth: '100px' }}
          min={0}
          max={1}
          step="0.05"
        />
      );
    }

    if (rule.field === 'pages') {
      return (
        <IonInput
          type="number"
          value={typeof rule.value === 'number' ? rule.value : ''}
          onIonInput={(e) => {
            const val = parseInt(e.detail.value || '0', 10);
            updateRule(index, { value: isNaN(val) ? 0 : val });
          }}
          placeholder="Pages"
          style={{ maxWidth: '100px' }}
          min={0}
        />
      );
    }

    // Default: text input
    return (
      <IonInput
        value={String(rule.value)}
        onIonInput={(e) => updateRule(index, { value: e.detail.value || '' })}
        placeholder="Value"
        style={{ maxWidth: '140px' }}
      />
    );
  };

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>{isEditing ? 'Edit Smart Shelf' : 'New Smart Shelf'}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={onDismiss}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonList>
            <IonItem>
              <IonLabel position="stacked">Shelf Name</IonLabel>
              <IonInput
                value={name}
                onIonInput={(e) => setName(e.detail.value || '')}
                placeholder="e.g. My Favorites, Sci-Fi Books"
                clearInput
              />
            </IonItem>

            <IonItem>
              <IonLabel>Match</IonLabel>
              <IonSelect
                value={matchAll ? 'all' : 'any'}
                onIonChange={(e) => setMatchAll(e.detail.value === 'all')}
              >
                <IonSelectOption value="all">All rules (AND)</IonSelectOption>
                <IonSelectOption value="any">Any rule (OR)</IonSelectOption>
              </IonSelect>
            </IonItem>
          </IonList>

          <div style={{ padding: '16px 0 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Rules</h3>
            <IonButton fill="outline" size="small" onClick={addRule}>
              <IonIcon icon={addOutline} slot="start" />
              Add Rule
            </IonButton>
          </div>

          {rules.length === 0 && (
            <p style={{ color: 'var(--ion-color-medium)', fontSize: '14px', textAlign: 'center', padding: '16px' }}>
              No rules added yet. Add at least one rule to define this smart shelf.
            </p>
          )}

          {rules.map((rule, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 0',
                borderBottom: '1px solid var(--ion-color-light)',
                flexWrap: 'wrap',
              }}
            >
              <IonSelect
                value={rule.field}
                onIonChange={(e) => updateRule(index, { field: e.detail.value })}
                style={{ minWidth: '100px', maxWidth: '130px' }}
                interface="popover"
              >
                {(Object.keys(FIELD_LABELS) as SmartShelfField[]).map((f) => (
                  <IonSelectOption key={f} value={f}>
                    {FIELD_LABELS[f]}
                  </IonSelectOption>
                ))}
              </IonSelect>

              <IonSelect
                value={rule.operator}
                onIonChange={(e) => updateRule(index, { operator: e.detail.value })}
                style={{ minWidth: '80px', maxWidth: '120px' }}
                interface="popover"
              >
                {getOperatorsForField(rule.field).map((op) => (
                  <IonSelectOption key={op} value={op}>
                    {OPERATOR_LABELS[op]}
                  </IonSelectOption>
                ))}
              </IonSelect>

              {renderValueInput(rule, index)}

              <IonButton
                fill="clear"
                color="danger"
                size="small"
                onClick={() => removeRule(index)}
                style={{ minWidth: 'auto' }}
              >
                <IonIcon icon={trashOutline} />
              </IonButton>
            </div>
          ))}

          <div style={{ marginTop: '20px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600 }}>Sorting & Limit</h3>
            <IonList>
              <IonItem>
                <IonLabel>Sort by</IonLabel>
                <IonSelect
                  value={sortBy}
                  onIonChange={(e) => setSortBy(e.detail.value)}
                >
                  <IonSelectOption value="dateAdded">Date Added</IonSelectOption>
                  <IonSelectOption value="lastRead">Last Read</IonSelectOption>
                  <IonSelectOption value="title">Title</IonSelectOption>
                  <IonSelectOption value="progress">Progress</IonSelectOption>
                  <IonSelectOption value="rating">Rating</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel>Order</IonLabel>
                <IonSelect
                  value={sortOrder}
                  onIonChange={(e) => setSortOrder(e.detail.value)}
                >
                  <IonSelectOption value="desc">Newest / Highest first</IonSelectOption>
                  <IonSelectOption value="asc">Oldest / Lowest first</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Max results (0 = unlimited)</IonLabel>
                <IonInput
                  type="number"
                  value={limit}
                  onIonInput={(e) => setLimit(parseInt(e.detail.value || '0', 10) || 0)}
                  min={0}
                />
              </IonItem>
            </IonList>
          </div>

          <div style={{ padding: '16px 0' }}>
            <IonButton
              expand="block"
              onClick={handleSave}
              disabled={!name.trim() || rules.length === 0}
            >
              {isEditing ? 'Save Changes' : 'Create Smart Shelf'}
            </IonButton>

            {isEditing && !isDefault && onDelete && (
              <IonButton
                expand="block"
                fill="outline"
                color="danger"
                style={{ marginTop: 12 }}
                onClick={() => setShowDeleteAlert(true)}
              >
                <IonIcon icon={trashOutline} slot="start" />
                Delete Smart Shelf
              </IonButton>
            )}
          </div>
        </IonContent>
      </IonModal>

      <IonAlert
        isOpen={showDeleteAlert}
        onDidDismiss={() => setShowDeleteAlert(false)}
        header="Delete Smart Shelf"
        message={`Delete "${shelf?.name}"? This cannot be undone.`}
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Delete',
            role: 'destructive',
            handler: () => {
              if (shelf && onDelete) {
                onDelete(shelf.id);
                onDismiss();
              }
            },
          },
        ]}
      />
    </>
  );
};

export default SmartShelfEditor;
