/**
 * TextSelectionMenu - Floating menu that appears on text selection
 * Provides quick actions like Translate, Define, Highlight
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { IonButton, IonButtons, IonIcon } from '@ionic/react';
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

  // Handle text selection (checks both main document and foliate iframe)
  useEffect(() => {
    const getSelectionFromIframe = (): { text: string; rect: DOMRect } | null => {
      const foliateView = document.querySelector('foliate-view');
      if (!foliateView) return null;
      const iframe = foliateView.shadowRoot?.querySelector('iframe') as HTMLIFrameElement | null;
      if (!iframe?.contentWindow) return null;
      const sel = iframe.contentWindow.getSelection();
      if (!sel || sel.isCollapsed) return null;
      const text = sel.toString().trim();
      if (!text) return null;
      const range = sel.getRangeAt(0);
      const iframeRect = iframe.getBoundingClientRect();
      const rangeRect = range.getBoundingClientRect();
      // Translate iframe-relative coordinates to viewport coordinates
      return {
        text,
        rect: new DOMRect(
          rangeRect.left + iframeRect.left,
          rangeRect.top + iframeRect.top,
          rangeRect.width,
          rangeRect.height
        ),
      };
    };

    const handleSelection = () => {
      // First try main document selection
      const selection = window.getSelection();
      let text = selection?.toString().trim() || '';
      let rect: DOMRect | null = null;

      if (text && text.length > 0) {
        const range = selection?.getRangeAt(0);
        if (range) {
          rect = range.getBoundingClientRect();
        }
      }

      // If no main document selection, try foliate iframe
      if (!text) {
        const iframeSel = getSelectionFromIframe();
        if (iframeSel) {
          text = iframeSel.text;
          rect = iframeSel.rect;
        }
      }

      if (text && rect) {
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
        setSelectedText(text);
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

    // Suppress native Android context menu so our custom menu works
    const preventContextMenu = (e: Event) => e.preventDefault();

    document.addEventListener('selectionchange', debouncedHandler);
    document.addEventListener('mouseup', debouncedHandler);
    document.addEventListener('touchend', debouncedHandler);
    document.addEventListener('contextmenu', preventContextMenu);

    // Also listen inside foliate iframe for selection events
    let iframeDoc: Document | null = null;
    const attachIframeListeners = () => {
      const foliateView = document.querySelector('foliate-view');
      const iframe = foliateView?.shadowRoot?.querySelector('iframe') as HTMLIFrameElement | null;
      iframeDoc = iframe?.contentDocument ?? null;
      if (iframeDoc) {
        iframeDoc.addEventListener('selectionchange', debouncedHandler);
        iframeDoc.addEventListener('mouseup', debouncedHandler);
        iframeDoc.addEventListener('touchend', debouncedHandler);
        iframeDoc.addEventListener('contextmenu', preventContextMenu);
      }
    };
    // Delay to wait for iframe to be ready
    const iframeTimer = setTimeout(attachIframeListeners, 1000);

    return () => {
      document.removeEventListener('selectionchange', debouncedHandler);
      document.removeEventListener('mouseup', debouncedHandler);
      document.removeEventListener('touchend', debouncedHandler);
      document.removeEventListener('contextmenu', preventContextMenu);
      if (iframeDoc) {
        iframeDoc.removeEventListener('selectionchange', debouncedHandler);
        iframeDoc.removeEventListener('mouseup', debouncedHandler);
        iframeDoc.removeEventListener('touchend', debouncedHandler);
        iframeDoc.removeEventListener('contextmenu', preventContextMenu);
      }
      clearTimeout(iframeTimer);
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

  // Clamp position so the menu doesn't go off-screen
  const menuX = Math.max(80, Math.min(position.x, window.innerWidth - 80));
  const menuY = Math.max(50, position.y - 50);

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${menuX}px`,
    top: `${menuY}px`,
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
