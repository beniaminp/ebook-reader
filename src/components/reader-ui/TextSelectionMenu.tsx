/**
 * TextSelectionMenu - Bottom action bar that appears on text selection
 * Shows as a fixed bottom bar on mobile to avoid being covered by
 * Android's native selection toolbar which renders above the WebView.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IonButton, IonIcon } from '@ionic/react';
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
  const [visible, setVisible] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const iframeDocRef = useRef<Document | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  const openTranslationPanel = useTranslationStore((state) => state.openTranslationPanel);

  // Get selection from foliate iframe
  const getIframeSelection = useCallback((): string => {
    try {
      const foliateView = document.querySelector('foliate-view');
      if (!foliateView) return '';
      const iframe = foliateView.shadowRoot?.querySelector('iframe') as HTMLIFrameElement | null;
      if (!iframe?.contentWindow) return '';
      const sel = iframe.contentWindow.getSelection();
      if (!sel || sel.isCollapsed) return '';
      return sel.toString().trim();
    } catch {
      return '';
    }
  }, []);

  // Check for text selection in both main document and iframe
  const checkSelection = useCallback(() => {
    // Check main document
    const mainSel = window.getSelection();
    let text = mainSel?.toString().trim() || '';

    // If no main selection, check iframe
    if (!text) {
      text = getIframeSelection();
    }

    if (text && text.length > 0) {
      setSelectedText(text);
      setVisible(true);
    } else {
      setVisible(false);
      setSelectedText('');
    }
  }, [getIframeSelection]);

  // Attach listeners to iframe document (for EPUB content)
  const attachIframeListeners = useCallback(() => {
    // Clean up old listeners
    if (iframeDocRef.current) {
      iframeDocRef.current.removeEventListener('selectionchange', checkSelection);
      iframeDocRef.current.removeEventListener('mouseup', checkSelection);
      iframeDocRef.current.removeEventListener('touchend', checkSelection);
    }

    const foliateView = document.querySelector('foliate-view');
    if (!foliateView?.shadowRoot) return;

    const iframe = foliateView.shadowRoot.querySelector('iframe') as HTMLIFrameElement | null;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    iframeDocRef.current = doc;
    doc.addEventListener('selectionchange', checkSelection);
    doc.addEventListener('mouseup', checkSelection);
    doc.addEventListener('touchend', checkSelection);
  }, [checkSelection]);

  useEffect(() => {
    // Listen on main document
    document.addEventListener('selectionchange', checkSelection);
    document.addEventListener('mouseup', checkSelection);
    document.addEventListener('touchend', checkSelection);

    // Try attaching to iframe immediately and after delays
    // (iframe may not be ready yet or may change on page turns)
    attachIframeListeners();
    const t1 = setTimeout(attachIframeListeners, 1000);
    const t2 = setTimeout(attachIframeListeners, 3000);

    // Watch for iframe changes via MutationObserver on the foliate-view shadow root
    const setupObserver = () => {
      const foliateView = document.querySelector('foliate-view');
      if (!foliateView?.shadowRoot) return;

      observerRef.current = new MutationObserver(() => {
        // Re-attach when iframe changes (page turn)
        setTimeout(attachIframeListeners, 100);
      });
      observerRef.current.observe(foliateView.shadowRoot, {
        childList: true,
        subtree: true,
      });
    };
    setupObserver();
    const t3 = setTimeout(setupObserver, 2000);

    return () => {
      document.removeEventListener('selectionchange', checkSelection);
      document.removeEventListener('mouseup', checkSelection);
      document.removeEventListener('touchend', checkSelection);

      if (iframeDocRef.current) {
        iframeDocRef.current.removeEventListener('selectionchange', checkSelection);
        iframeDocRef.current.removeEventListener('mouseup', checkSelection);
        iframeDocRef.current.removeEventListener('touchend', checkSelection);
      }

      observerRef.current?.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [checkSelection, attachIframeListeners]);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    try {
      const foliateView = document.querySelector('foliate-view');
      const iframe = foliateView?.shadowRoot?.querySelector('iframe') as HTMLIFrameElement | null;
      iframe?.contentWindow?.getSelection()?.removeAllRanges();
    } catch {
      // ignore
    }
  }, []);

  const handleTranslate = useCallback(() => {
    openTranslationPanel(selectedText);
    onTranslate?.(selectedText);
    setVisible(false);
    clearSelection();
  }, [selectedText, onTranslate, openTranslationPanel, clearSelection]);

  const handleDefine = useCallback(() => {
    onDefine?.(selectedText);
    setVisible(false);
    clearSelection();
  }, [selectedText, onDefine, clearSelection]);

  const handleHighlight = useCallback(() => {
    onHighlight?.(selectedText);
    setVisible(false);
    // Don't clear selection yet — the color picker needs it
  }, [selectedText, onHighlight]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(selectedText);
      onCopy?.(selectedText);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    setVisible(false);
    clearSelection();
  }, [selectedText, onCopy, clearSelection]);

  const handleAddNote = useCallback(() => {
    onAddNote?.(selectedText);
    setVisible(false);
    clearSelection();
  }, [selectedText, onAddNote, clearSelection]);

  if (!visible || !selectedText) {
    return null;
  }

  return createPortal(
    <div className="text-selection-menu">
      <div className="text-selection-menu-preview">
        &ldquo;{selectedText.length > 60 ? selectedText.slice(0, 60) + '...' : selectedText}&rdquo;
      </div>
      <div className="text-selection-menu-actions">
        {enabledActions.includes('highlight') && (
          <IonButton onClick={handleHighlight} color="warning" size="small" fill="solid">
            <IonIcon icon={bookmark} slot="start" />
            Highlight
          </IonButton>
        )}
        {enabledActions.includes('copy') && (
          <IonButton onClick={handleCopy} color="medium" size="small" fill="solid">
            <IonIcon icon={copy} slot="start" />
            Copy
          </IonButton>
        )}
        {enabledActions.includes('translate') && (
          <IonButton onClick={handleTranslate} color="primary" size="small" fill="solid">
            <IonIcon icon={language} slot="start" />
            Translate
          </IonButton>
        )}
        {enabledActions.includes('define') && (
          <IonButton onClick={handleDefine} color="success" size="small" fill="solid">
            <IonIcon icon={glasses} slot="start" />
            Define
          </IonButton>
        )}
        {enabledActions.includes('note') && (
          <IonButton onClick={handleAddNote} color="tertiary" size="small" fill="solid">
            <IonIcon icon={create} slot="start" />
            Note
          </IonButton>
        )}
      </div>
    </div>,
    document.body
  );
};

export default TextSelectionMenu;
