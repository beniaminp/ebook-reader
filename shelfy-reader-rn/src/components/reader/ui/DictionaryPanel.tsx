import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { copyToClipboard } from '../../../utils/clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import {
  dictionaryService,
  type DefinitionResult,
  type Meaning,
} from '../../../services/dictionaryService';

interface DictionaryPanelProps {
  visible: boolean;
  word: string;
  onClose: () => void;
}

export function DictionaryPanel({ visible, word, onClose }: DictionaryPanelProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [result, setResult] = useState<DefinitionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [inVocabulary, setInVocabulary] = useState(false);
  const [savingVocab, setSavingVocab] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const lookupWord = useCallback(async () => {
    if (!word || !word.trim()) return;

    setLoading(true);
    setResult(null);
    setCopiedIndex(null);

    try {
      const lookupResult = await dictionaryService.lookup(word);
      setResult(lookupResult);

      // Check if already in vocabulary
      const isInVocab = await dictionaryService.isInVocabulary(word);
      setInVocabulary(isInVocab);
    } catch (error) {
      console.error('Dictionary lookup failed:', error);
      setResult({
        word: word.trim().toLowerCase(),
        found: false,
        meanings: [],
        phonetics: [],
      });
    } finally {
      setLoading(false);
    }
  }, [word]);

  useEffect(() => {
    if (visible && word) {
      lookupWord();
    }
  }, [visible, word, lookupWord]);

  const handleAddToVocabulary = async () => {
    if (!result || !result.found || inVocabulary) return;
    setSavingVocab(true);

    try {
      const firstMeaning = result.meanings[0];
      const firstDef = firstMeaning?.definitions[0];

      await dictionaryService.saveToVocabulary({
        word: result.word,
        definition: firstDef?.definition || '',
        partOfSpeech: firstMeaning?.partOfSpeech || '',
        example: firstDef?.example,
        addedAt: Date.now(),
      });

      setInVocabulary(true);
    } catch (error) {
      console.error('Failed to save to vocabulary:', error);
    } finally {
      setSavingVocab(false);
    }
  };

  const handleCopyDefinition = async (meaningIndex: number, meaning: Meaning) => {
    const text = meaning.definitions
      .map((d, i) => `${i + 1}. ${d.definition}${d.example ? ` (e.g., "${d.example}")` : ''}`)
      .join('\n');
    const fullText = `${result?.word} (${meaning.partOfSpeech}):\n${text}`;

    try {
      await copyToClipboard(fullText);
      setCopiedIndex(meaningIndex);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy definition:', error);
    }
  };

  const renderMeaning = (meaning: Meaning, index: number) => (
    <View key={`${meaning.partOfSpeech}-${index}`} style={styles.meaningBlock}>
      {/* Part of Speech Header */}
      <View style={styles.posRow}>
        <Text style={[styles.partOfSpeech, { color: theme.primary }]}>
          {meaning.partOfSpeech}
        </Text>
        <View style={[styles.posDivider, { backgroundColor: theme.border }]} />
        <Pressable
          onPress={() => handleCopyDefinition(index, meaning)}
          hitSlop={8}
          style={styles.copyButton}
        >
          <Ionicons
            name={copiedIndex === index ? 'checkmark' : 'copy-outline'}
            size={16}
            color={copiedIndex === index ? theme.success : theme.textMuted}
          />
        </Pressable>
      </View>

      {/* Definitions */}
      {meaning.definitions.map((def, defIndex) => (
        <View key={defIndex} style={styles.definitionItem}>
          <Text style={[styles.defNumber, { color: theme.textMuted }]}>
            {defIndex + 1}.
          </Text>
          <View style={styles.defContent}>
            <Text style={[styles.defText, { color: theme.text }]}>
              {def.definition}
            </Text>
            {def.example && (
              <Text style={[styles.exampleText, { color: theme.textSecondary }]}>
                "{def.example}"
              </Text>
            )}
            {def.synonyms && def.synonyms.length > 0 && (
              <Text style={[styles.synonymsText, { color: theme.textMuted }]}>
                Synonyms: {def.synonyms.slice(0, 5).join(', ')}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <Ionicons name="book-outline" size={20} color={theme.primary} />
              <Text style={[styles.title, { color: theme.text }]}>Dictionary</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  Looking up "{word}"...
                </Text>
              </View>
            )}

            {!loading && result && !result.found && (
              <View style={styles.notFoundContainer}>
                <Ionicons name="help-circle-outline" size={48} color={theme.textMuted} />
                <Text style={[styles.notFoundTitle, { color: theme.text }]}>
                  No definition found
                </Text>
                <Text style={[styles.notFoundSubtitle, { color: theme.textSecondary }]}>
                  Could not find a definition for "{result.word}".
                </Text>
              </View>
            )}

            {!loading && result && result.found && (
              <>
                {/* Word and Pronunciation */}
                <View style={styles.wordHeader}>
                  <Text style={[styles.wordText, { color: theme.text }]}>{result.word}</Text>
                  {result.phonetic && (
                    <Text style={[styles.phoneticText, { color: theme.textSecondary }]}>
                      {result.phonetic}
                    </Text>
                  )}
                </View>

                {/* Origin */}
                {result.origin && (
                  <Text style={[styles.originText, { color: theme.textMuted }]}>
                    Origin: {result.origin}
                  </Text>
                )}

                {/* Meanings */}
                {result.meanings.map((meaning, index) => renderMeaning(meaning, index))}

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  <Pressable
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: inVocabulary
                          ? theme.success + '20'
                          : theme.primary + '15',
                        borderColor: inVocabulary ? theme.success : theme.primary,
                      },
                    ]}
                    onPress={handleAddToVocabulary}
                    disabled={inVocabulary || savingVocab}
                  >
                    {savingVocab ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Ionicons
                        name={inVocabulary ? 'checkmark-circle' : 'add-circle-outline'}
                        size={18}
                        color={inVocabulary ? theme.success : theme.primary}
                      />
                    )}
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: inVocabulary ? theme.success : theme.primary },
                      ]}
                    >
                      {inVocabulary ? 'In Vocabulary' : 'Add to Vocabulary'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingVertical: 16,
    paddingBottom: 24,
  },
  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  // Not found
  notFoundContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  notFoundTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  notFoundSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Word header
  wordHeader: {
    marginBottom: 12,
  },
  wordText: {
    fontSize: 28,
    fontWeight: '700',
  },
  phoneticText: {
    fontSize: 16,
    marginTop: 4,
  },
  originText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  // Meaning block
  meaningBlock: {
    marginBottom: 20,
  },
  posRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  partOfSpeech: {
    fontSize: 15,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  posDivider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  copyButton: {
    padding: 4,
  },
  // Definitions
  definitionItem: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  defNumber: {
    fontSize: 14,
    fontWeight: '600',
    width: 20,
    textAlign: 'right',
  },
  defContent: {
    flex: 1,
  },
  defText: {
    fontSize: 15,
    lineHeight: 22,
  },
  exampleText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 20,
  },
  synonymsText: {
    fontSize: 12,
    marginTop: 4,
  },
  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DictionaryPanel;
