import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSearchbar,
} from '@ionic/react';
import { close, checkmarkCircle, addCircleOutline } from 'ionicons/icons';
import { GOOGLE_FONTS, type GoogleFontCategory } from '../../data/googleFonts';
import { fontService } from '../../services/fontService';
import { useThemeStore } from '../../stores/useThemeStore';
import './GoogleFontsModal.css';

const CATEGORIES: { label: string; value: GoogleFontCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Serif', value: 'serif' },
  { label: 'Sans Serif', value: 'sans-serif' },
  { label: 'Display', value: 'display' },
  { label: 'Handwriting', value: 'handwriting' },
  { label: 'Monospace', value: 'monospace' },
];

interface GoogleFontsModalProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export const GoogleFontsModal: React.FC<GoogleFontsModalProps> = ({ isOpen, onDismiss }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<GoogleFontCategory | 'all'>('all');
  const { customFonts, addGoogleFont, removeCustomFont } = useThemeStore();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadedFontsRef = useRef<Set<string>>(new Set());

  const addedGoogleFonts = new Set(
    customFonts.filter((f) => f.source === 'google-fonts').map((f) => f.name)
  );

  const filtered = GOOGLE_FONTS.filter((font) => {
    const matchesSearch = font.family.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || font.category === category;
    return matchesSearch && matchesCategory;
  });

  const fontItemRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      observerRef.current?.observe(node);
    },
    []
  );

  // Set up IntersectionObserver for lazy font loading
  useEffect(() => {
    if (!isOpen) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const family = (entry.target as HTMLElement).dataset.fontFamily;
          if (!family || loadedFontsRef.current.has(family)) continue;
          loadedFontsRef.current.add(family);
          fontService.loadGoogleFont(family);
        }
      },
      { rootMargin: '200px' }
    );

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [isOpen]);

  const handleToggleFont = async (family: string) => {
    if (addedGoogleFonts.has(family)) {
      await removeCustomFont(family);
    } else {
      await addGoogleFont(family);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss} className="google-fonts-modal">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Google Fonts</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDismiss}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={search}
            onIonInput={(e) => setSearch(e.detail.value || '')}
            placeholder="Search fonts..."
            debounce={200}
          />
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="gf-category-chips">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              className={`gf-chip ${category === cat.value ? 'gf-chip-active' : ''}`}
              onClick={() => setCategory(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="gf-font-list">
          {filtered.map((font) => {
            const isAdded = addedGoogleFonts.has(font.family);
            return (
              <div
                key={font.family}
                className="gf-font-item"
                ref={fontItemRef}
                data-font-family={font.family}
              >
                <div className="gf-font-info">
                  <span
                    className="gf-font-preview"
                    style={{ fontFamily: `'${font.family}', ${font.category}` }}
                  >
                    {font.family}
                  </span>
                  <span className="gf-font-category">{font.category}</span>
                </div>
                <button
                  className={`gf-add-btn ${isAdded ? 'gf-added' : ''}`}
                  onClick={() => handleToggleFont(font.family)}
                >
                  <IonIcon icon={isAdded ? checkmarkCircle : addCircleOutline} />
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="gf-empty">No fonts match your search.</div>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};

export default GoogleFontsModal;
