/**
 * TextSelectionMenu - Floating menu that appears on text selection
 * Provides quick actions like Translate, Define, Highlight
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  IonButton,
  IonButtons,
  IonIcon,
} from '@ionic/react';
import { language, bookmark, glasses, copy, create } from 'ionicons/icons';
import { useTranslationStore } from '../../stores/useTranslationStore';
import './TextSelectionMenu.css';

interface TextSelectionMenuProps {
  onTranslate?: (text: string, rect?: DOMRect) => void;
  onDefine?: (text: string, rect?: DOMRect) => void;
  onHighlight?: (text: string, color?: string) => void;
  onCopy?: (text: string) => void;
  onAddNote?: (text: string, rect?: DOMRect) => void;
  enabledActions?: Array<'translate' | 'define' | 'highlight' | 'copy' | 'note'>;
}

export const TextSelectionMenu: React.FC<TextSelectionMenuProps> = ({
  onTranslate,
  onDefine,
  onHighlight,
  onCopy,
  onAddNote,
  enabledActions = ['translate', 'highlight', 'copy'],
}) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');

  const openTranslationPanel = useTranslationStore((state) => state.openTranslationPanel);

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 0) {
        const range = selection?.getRangeAt(0);
        if (range) {
          const rect = range.getBoundingClientRect();
          const scrollX = window.scrollX || window.pageXOffset;
          const scrollY = window.scrollY || window.pageYOffset;

          setPosition({
            x: rect.left + rect.width / 2 + scrollX,
            y: rect.top + scrollY,
          });
          setSelectedText(text);
        }
      } else {
        setPosition(null);
        setSelectedText('');
      }
    };

    // Debounce the selection handler to avoid flickering
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const debouncedHandler = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleSelection, 100);
    };

    document.addEventListener('selectionchange', debouncedHandler);
    document.addEventListener('mouseup', debouncedHandler);
    document.addEventListener('touchend', debouncedHandler);

    return () => {
      document.removeEventListener('selectionchange', debouncedHandler);
      document.removeEventListener('mouseup', debouncedHandler);
      document.removeEventListener('touchend', debouncedHandler);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Hide menu on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (position !== null) {
        setPosition(null);
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [position]);

  const handleTranslate = useCallback(() => {
    openTranslationPanel(selectedText);
    onTranslate?.(selectedText);
    setPosition(null);
    window.getSelection()?.removeAllRanges();
  }, [selectedText, onTranslate, openTranslationPanel]);

  const handleDefine = useCallback(() => {
    onDefine?.(selectedText);
    setPosition(null);
    window.getSelection()?.removeAllRanges();
  }, [selectedText, onDefine]);

  const handleHighlight = useCallback(() => {
    onHighlight?.(selectedText);
    setPosition(null);
    window.getSelection()?.removeAllRanges();
  }, [selectedText, onHighlight]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(selectedText);
      onCopy?.(selectedText);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    setPosition(null);
    window.getSelection()?.removeAllRanges();
  }, [selectedText, onCopy]);

  const handleAddNote = useCallback(() => {
    onAddNote?.(selectedText);
    setPosition(null);
    window.getSelection()?.removeAllRanges();
  }, [selectedText, onAddNote]);

  // Don't render if no selection
  if (!position || !selectedText) {
    return null;
  }

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y - 50}px`, // Position above selection
    transform: 'translateX(-50%)',
    zIndex: 9999,
  };

  return createPortal(
    <div className="text-selection-menu" style={menuStyle}>
      <IonButtons>
        {enabledActions.includes('translate') && (
          <IonButton onClick={handleTranslate} color="primary" size="small">
            <IonIcon icon={language} slot="icon-only" />
          </IonButton>
        )}
        {enabledActions.includes('highlight') && (
          <IonButton onClick={handleHighlight} color="warning" size="small">
            <IonIcon icon={bookmark} slot="icon-only" />
          </IonButton>
        )}
        {enabledActions.includes('define') && (
          <IonButton onClick={handleDefine} color="success" size="small">
            <IonIcon icon={glasses} slot="icon-only" />
          </IonButton>
        )}
        {enabledActions.includes('copy') && (
          <IonButton onClick={handleCopy} color="medium" size="small">
            <IonIcon icon={copy} slot="icon-only" />
          </IonButton>
        )}
        {enabledActions.includes('note') && (
          <IonButton onClick={handleAddNote} color="tertiary" size="small">
            <IonIcon icon={create} slot="icon-only" />
          </IonButton>
        )}
      </IonButtons>
    </div>,
    document.body
  );
};

export default TextSelectionMenu;
