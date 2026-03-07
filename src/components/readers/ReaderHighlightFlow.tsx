/**
 * ReaderHighlightFlow — color picker popover for creating highlights.
 *
 * Extracted from UnifiedReaderContainer to reduce its size.
 */

import React from 'react';
import { IonPopover } from '@ionic/react';
import { HIGHLIGHT_COLORS } from '../../services/annotationsService';
import { TagInput, saveTagsToSuggestions } from '../reader-ui/TagInput';
import { databaseService } from '../../services/database';
import type { Highlight } from '../../types/index';
import type { ReaderEngineRef } from '../../types/reader';

export interface HighlightMeta {
  cfi?: string;
  startOffset?: number;
  endOffset?: number;
}

export interface ReaderHighlightFlowProps {
  bookId: string;
  isOpen: boolean;
  onClose: () => void;
  pendingText: string;
  pendingMeta: HighlightMeta | null;
  isFoliate: boolean;
  engineRef: React.RefObject<ReaderEngineRef | null>;
  onHighlightCreated: (highlight: Highlight) => void;
  onToast: (message: string) => void;
  onClearSelection: () => void;
}

export const ReaderHighlightFlow: React.FC<ReaderHighlightFlowProps> = ({
  bookId,
  isOpen,
  onClose,
  pendingText,
  pendingMeta,
  isFoliate,
  engineRef,
  onHighlightCreated,
  onToast,
  onClearSelection,
}) => {
  const [pendingHighlightColor, setPendingHighlightColor] = React.useState<string>(HIGHLIGHT_COLORS[0].value);
  const [pendingHighlightTags, setPendingHighlightTags] = React.useState<string[]>([]);

  const handleDismiss = () => {
    onClose();
    setPendingHighlightColor(HIGHLIGHT_COLORS[0].value);
    setPendingHighlightTags([]);
  };

  const handleSave = async () => {
    const meta = pendingMeta;
    const text = pendingText;
    if (!meta) return;

    // Determine location string
    let locationStr = '';
    if (meta.cfi) {
      locationStr = meta.cfi;
    } else if (meta.startOffset !== undefined && meta.endOffset !== undefined) {
      locationStr = `${meta.startOffset}-${meta.endOffset}`;
    }

    // Save to database
    const saved = await databaseService.addHighlight({
      bookId,
      location: locationStr,
      text,
      color: pendingHighlightColor,
      tags: pendingHighlightTags.length > 0 ? JSON.stringify(pendingHighlightTags) : undefined,
    });

    if (saved) {
      // For EPUB, also add visual annotation
      if (isFoliate && meta.cfi) {
        engineRef.current?.addHighlightAnnotation?.(meta.cfi, pendingHighlightColor);
      }

      // Persist tags to suggestions
      if (pendingHighlightTags.length > 0) {
        saveTagsToSuggestions(pendingHighlightTags);
      }

      onHighlightCreated(saved);
      onToast('Highlight added');
    }

    onClose();
    setPendingHighlightColor(HIGHLIGHT_COLORS[0].value);
    setPendingHighlightTags([]);
    onClearSelection();
    // Clear native selection in iframes
    try {
      engineRef.current?.getContentDocuments?.()?.forEach((d) => {
        try { d.getSelection?.()?.removeAllRanges(); } catch { /* */ }
      });
    } catch { /* */ }
    window.getSelection()?.removeAllRanges();
  };

  return (
    <IonPopover
      isOpen={isOpen}
      onDidDismiss={handleDismiss}
    >
      <div style={{ padding: '12px' }}>
        <p style={{ textAlign: 'center', margin: '0 0 8px', fontSize: '14px' }}>
          Pick highlight color
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '12px' }}>
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => setPendingHighlightColor(color.value)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: color.value,
                border: pendingHighlightColor === color.value ? '3px solid var(--ion-color-dark, #222)' : '2px solid #fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                transform: pendingHighlightColor === color.value ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 0.15s, border 0.15s',
              }}
              title={color.name}
            />
          ))}
        </div>
        <TagInput
          tags={pendingHighlightTags}
          onChange={setPendingHighlightTags}
          compact
          placeholder="Add tags..."
        />
        <button
          onClick={handleSave}
          style={{
            width: '100%',
            marginTop: '10px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--ion-color-primary, #3880ff)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Save Highlight
        </button>
      </div>
    </IonPopover>
  );
};

export default ReaderHighlightFlow;
