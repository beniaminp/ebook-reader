/**
 * TagInput Component
 *
 * A compact tag input for adding custom reusable tags to highlights.
 * Shows existing tags as chips with remove button, provides autocomplete
 * from previously used tags stored in localStorage.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IonIcon } from '@ionic/react';
import { closeCircle, pricetagOutline } from 'ionicons/icons';

const TAG_SUGGESTIONS_KEY = 'ebook_highlight_tag_suggestions';
const MAX_SUGGESTIONS = 20;

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  compact?: boolean;
}

/**
 * Get all previously used tags from localStorage
 */
export function getStoredTagSuggestions(): string[] {
  try {
    const stored = localStorage.getItem(TAG_SUGGESTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save a tag to the suggestions list in localStorage
 */
export function saveTagToSuggestions(tag: string): void {
  try {
    const existing = getStoredTagSuggestions();
    if (!existing.includes(tag)) {
      const updated = [tag, ...existing].slice(0, MAX_SUGGESTIONS);
      localStorage.setItem(TAG_SUGGESTIONS_KEY, JSON.stringify(updated));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Save multiple tags to the suggestions list
 */
export function saveTagsToSuggestions(tags: string[]): void {
  tags.forEach(saveTagToSuggestions);
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder = 'Add tag...',
  compact = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allSuggestions, setAllSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAllSuggestions(getStoredTagSuggestions());
  }, []);

  const filteredSuggestions = useCallback(() => {
    if (!inputValue.trim()) {
      return allSuggestions.filter((s) => !tags.includes(s));
    }
    const query = inputValue.toLowerCase().replace(/^#/, '');
    return allSuggestions.filter(
      (s) => s.toLowerCase().includes(query) && !tags.includes(s)
    );
  }, [inputValue, allSuggestions, tags]);

  useEffect(() => {
    setSuggestions(filteredSuggestions());
  }, [filteredSuggestions]);

  const addTag = (tag: string) => {
    const cleaned = tag.trim().toLowerCase().replace(/^#+/, '');
    if (!cleaned || tags.includes(cleaned)) return;
    const updated = [...tags, cleaned];
    onChange(updated);
    saveTagToSuggestions(cleaned);
    setAllSuggestions(getStoredTagSuggestions());
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const tagChipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    padding: compact ? '1px 6px' : '2px 8px',
    borderRadius: '12px',
    backgroundColor: 'var(--ion-color-primary-tint, #4c8dff)',
    color: '#fff',
    fontSize: compact ? '11px' : '12px',
    lineHeight: '1.4',
    whiteSpace: 'nowrap',
  };

  const removeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    padding: '0',
    margin: '0 0 0 2px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    color: 'rgba(255,255,255,0.8)',
    fontSize: compact ? '12px' : '14px',
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Label */}
      {!compact && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '4px',
            fontSize: '13px',
            color: 'var(--ion-color-medium)',
          }}
        >
          <IonIcon icon={pricetagOutline} style={{ fontSize: '14px' }} />
          <span>Tags</span>
        </div>
      )}

      {/* Tag chips + input */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '4px',
          padding: compact ? '4px' : '6px 8px',
          border: '1px solid var(--ion-color-light-shade, #d7d8da)',
          borderRadius: '8px',
          backgroundColor: 'var(--ion-background-color, #fff)',
          minHeight: compact ? '28px' : '36px',
          cursor: 'text',
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span key={tag} style={tagChipStyle}>
            #{tag}
            <button
              style={removeButtonStyle}
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              type="button"
            >
              <IonIcon icon={closeCircle} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay to allow click on suggestion
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          style={{
            flex: '1 1 60px',
            minWidth: '60px',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            fontSize: compact ? '12px' : '13px',
            padding: '2px 0',
            color: 'var(--ion-text-color)',
          }}
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            right: '0',
            zIndex: 1000,
            maxHeight: '150px',
            overflowY: 'auto',
            backgroundColor: 'var(--ion-background-color, #fff)',
            border: '1px solid var(--ion-color-light-shade, #d7d8da)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            marginTop: '2px',
          }}
        >
          {suggestions.map((suggestion) => (
            <div
              key={suggestion}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(suggestion);
              }}
              style={{
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px',
                color: 'var(--ion-text-color)',
                borderBottom: '1px solid var(--ion-color-light, #f4f5f8)',
              }}
            >
              #{suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Render tags as small colored badges (read-only display)
 */
export const TagBadges: React.FC<{
  tags: string[];
  onTagClick?: (tag: string) => void;
  compact?: boolean;
}> = ({ tags, onTagClick, compact = false }) => {
  if (!tags || tags.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '3px',
        marginTop: compact ? '2px' : '4px',
      }}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          onClick={(e) => {
            if (onTagClick) {
              e.stopPropagation();
              onTagClick(tag);
            }
          }}
          style={{
            display: 'inline-block',
            padding: compact ? '0px 5px' : '1px 6px',
            borderRadius: '10px',
            backgroundColor: 'var(--ion-color-primary-tint, #4c8dff)',
            color: '#fff',
            fontSize: compact ? '10px' : '11px',
            lineHeight: '1.6',
            cursor: onTagClick ? 'pointer' : 'default',
            whiteSpace: 'nowrap',
          }}
        >
          #{tag}
        </span>
      ))}
    </div>
  );
};

export default TagInput;
