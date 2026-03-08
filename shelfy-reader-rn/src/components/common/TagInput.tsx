/**
 * TagInput Component
 *
 * A compact tag input for adding custom reusable tags to highlights.
 * Shows existing tags as chips with remove button, provides autocomplete
 * from previously used tags stored in AsyncStorage.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme/ThemeContext';

const TAG_SUGGESTIONS_KEY = 'ebook_highlight_tag_suggestions';
const MAX_SUGGESTIONS = 20;

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  compact?: boolean;
}

/**
 * Get all previously used tags from AsyncStorage
 */
export async function getStoredTagSuggestions(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(TAG_SUGGESTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save a tag to the suggestions list in AsyncStorage
 */
export async function saveTagToSuggestions(tag: string): Promise<void> {
  try {
    const existing = await getStoredTagSuggestions();
    if (!existing.includes(tag)) {
      const updated = [tag, ...existing].slice(0, MAX_SUGGESTIONS);
      await AsyncStorage.setItem(TAG_SUGGESTIONS_KEY, JSON.stringify(updated));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Save multiple tags to the suggestions list
 */
export async function saveTagsToSuggestions(tags: string[]): Promise<void> {
  for (const tag of tags) {
    await saveTagToSuggestions(tag);
  }
}

export function TagInput({
  tags,
  onChange,
  placeholder = 'Add tag...',
  compact = false,
}: TagInputProps) {
  const { theme } = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allSuggestions, setAllSuggestions] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    getStoredTagSuggestions().then(setAllSuggestions);
  }, []);

  const getFilteredSuggestions = useCallback(() => {
    if (!inputValue.trim()) {
      return allSuggestions.filter((s) => !tags.includes(s));
    }
    const query = inputValue.toLowerCase().replace(/^#/, '');
    return allSuggestions.filter(
      (s) => s.toLowerCase().includes(query) && !tags.includes(s)
    );
  }, [inputValue, allSuggestions, tags]);

  useEffect(() => {
    setSuggestions(getFilteredSuggestions());
  }, [getFilteredSuggestions]);

  const addTag = useCallback(
    (tag: string) => {
      const cleaned = tag.trim().toLowerCase().replace(/^#+/, '');
      if (!cleaned || tags.includes(cleaned)) return;
      const updated = [...tags, cleaned];
      onChange(updated);
      saveTagToSuggestions(cleaned).then(() => {
        getStoredTagSuggestions().then(setAllSuggestions);
      });
      setInputValue('');
      setShowSuggestions(false);
    },
    [tags, onChange]
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(tags.filter((t) => t !== tag));
    },
    [tags, onChange]
  );

  const handleSubmit = useCallback(() => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  }, [inputValue, addTag]);

  return (
    <View>
      {/* Label */}
      {!compact ? (
        <View style={styles.labelRow}>
          <Ionicons
            name="pricetag-outline"
            size={14}
            color={theme.textMuted}
          />
          <Text style={[styles.labelText, { color: theme.textMuted }]}>
            Tags
          </Text>
        </View>
      ) : null}

      {/* Tag chips + input */}
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.inputContainer,
          {
            borderColor: theme.border,
            backgroundColor: theme.surface,
            minHeight: compact ? 28 : 36,
            padding: compact ? 4 : 6,
          },
        ]}
      >
        {tags.map((tag) => (
          <View
            key={tag}
            style={[
              styles.tagChip,
              {
                backgroundColor: theme.primary,
                paddingHorizontal: compact ? 6 : 8,
                paddingVertical: compact ? 1 : 2,
              },
            ]}
          >
            <Text
              style={[
                styles.tagChipText,
                { fontSize: compact ? 11 : 12 },
              ]}
            >
              #{tag}
            </Text>
            <Pressable
              onPress={() => removeTag(tag)}
              hitSlop={4}
              style={styles.tagRemoveBtn}
            >
              <Ionicons
                name="close-circle"
                size={compact ? 12 : 14}
                color="rgba(255,255,255,0.8)"
              />
            </Pressable>
          </View>
        ))}
        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            {
              color: theme.text,
              fontSize: compact ? 12 : 13,
            },
          ]}
          value={inputValue}
          onChangeText={(text) => {
            setInputValue(text);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay to allow tap on suggestion
            setTimeout(() => setShowSuggestions(false), 250);
          }}
          onSubmitEditing={handleSubmit}
          placeholder={tags.length === 0 ? placeholder : ''}
          placeholderTextColor={theme.textMuted}
          returnKeyType="done"
          blurOnSubmit={false}
        />
      </Pressable>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 ? (
        <View
          style={[
            styles.suggestionsContainer,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <ScrollView
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {suggestions.map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => addTag(suggestion)}
                style={[
                  styles.suggestionItem,
                  { borderBottomColor: theme.surface },
                ]}
              >
                <Text
                  style={[styles.suggestionText, { color: theme.text }]}
                >
                  #{suggestion}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Render tags as small colored badges (read-only display)
 */
export function TagBadges({
  tags,
  onTagPress,
  compact = false,
}: {
  tags: string[];
  onTagPress?: (tag: string) => void;
  compact?: boolean;
}) {
  const { theme } = useTheme();

  if (!tags || tags.length === 0) return null;

  return (
    <View
      style={[
        styles.badgesContainer,
        { marginTop: compact ? 2 : 4 },
      ]}
    >
      {tags.map((tag) => (
        <Pressable
          key={tag}
          onPress={onTagPress ? () => onTagPress(tag) : undefined}
          disabled={!onTagPress}
          style={[
            styles.badge,
            {
              backgroundColor: theme.primary,
              paddingHorizontal: compact ? 5 : 6,
              paddingVertical: compact ? 0 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { fontSize: compact ? 10 : 11 },
            ]}
          >
            #{tag}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  labelText: {
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 12,
  },
  tagChipText: {
    color: '#fff',
    lineHeight: 18,
  },
  tagRemoveBtn: {
    marginLeft: 2,
  },
  textInput: {
    flex: 1,
    minWidth: 60,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  suggestionsContainer: {
    borderWidth: 1,
    borderRadius: 6,
    marginTop: 2,
    maxHeight: 150,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  suggestionsList: {
    maxHeight: 150,
  },
  suggestionItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionText: {
    fontSize: 13,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  badge: {
    borderRadius: 10,
  },
  badgeText: {
    color: '#fff',
    lineHeight: 18,
  },
});

export default TagInput;
