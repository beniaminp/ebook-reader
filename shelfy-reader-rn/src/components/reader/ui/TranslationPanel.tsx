/**
 * TranslationPanel - Bottom sheet for translating selected text.
 * Shows source text, language selector, translated result, and copy action.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import {
  useTranslationStore,
  getLanguageName,
  getTargetLanguages,
} from '../../../stores/useTranslationStore';
import { translationService } from '../../../services/translationService';
import type { TranslationLanguageCode } from '../../../types';
import * as RNClipboard from '../../../utils/clipboard';

interface TranslationPanelProps {
  visible: boolean;
  selectedText: string;
  onClose: () => void;
}

export function TranslationPanel({
  visible,
  selectedText,
  onClose,
}: TranslationPanelProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    targetLanguage,
    detectedLanguage,
    isLoading,
    error,
    currentTranslation,
    setTargetLanguage,
    setCurrentTranslation,
    clearCurrentTranslation,
    setLoading,
    setError,
  } = useTranslationStore();

  const [sourceLanguage, setSourceLanguage] = useState<TranslationLanguageCode>('auto');
  const [currentTargetLang, setCurrentTargetLang] = useState<TranslationLanguageCode>(targetLanguage);

  // Sync target language from store
  useEffect(() => {
    setCurrentTargetLang(targetLanguage);
  }, [targetLanguage]);

  const handleTranslate = useCallback(async () => {
    if (!selectedText || selectedText.trim().length === 0) return;

    clearCurrentTranslation();
    setLoading(true);
    setError(null);

    try {
      const result = await translationService.translate(
        selectedText,
        currentTargetLang,
        sourceLanguage === 'auto' ? undefined : sourceLanguage,
      );

      setCurrentTranslation(result.translatedText, result.detectedSourceLang);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Translation failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    selectedText,
    sourceLanguage,
    currentTargetLang,
    clearCurrentTranslation,
    setLoading,
    setError,
    setCurrentTranslation,
  ]);

  // Auto-translate when panel opens or languages change
  useEffect(() => {
    if (visible && selectedText) {
      handleTranslate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, selectedText, sourceLanguage, currentTargetLang]);

  // Clear state when closing
  useEffect(() => {
    if (!visible) {
      clearCurrentTranslation();
    }
  }, [visible, clearCurrentTranslation]);

  const handleSwapLanguages = useCallback(() => {
    if (sourceLanguage === 'auto' && detectedLanguage) {
      setSourceLanguage(currentTargetLang);
      setCurrentTargetLang(detectedLanguage as TranslationLanguageCode);
      setTargetLanguage(detectedLanguage as TranslationLanguageCode);
    } else if (sourceLanguage !== 'auto') {
      const prevSource = sourceLanguage;
      setSourceLanguage(currentTargetLang);
      setCurrentTargetLang(prevSource);
      setTargetLanguage(prevSource);
    }
  }, [sourceLanguage, currentTargetLang, detectedLanguage, setTargetLanguage]);

  const handleCopy = useCallback(async () => {
    if (!currentTranslation) return;
    await RNClipboard.copyToClipboard(currentTranslation);
    Alert.alert('Copied', 'Translation copied to clipboard.');
  }, [currentTranslation]);

  const handleTargetLanguagePicker = useCallback(() => {
    const languages = getTargetLanguages();
    Alert.alert(
      'Target Language',
      undefined,
      [
        ...languages.map((lang) => ({
          text: lang.name,
          onPress: () => {
            setCurrentTargetLang(lang.code as TranslationLanguageCode);
            setTargetLanguage(lang.code as TranslationLanguageCode);
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  }, [setTargetLanguage]);

  const handleSourceLanguagePicker = useCallback(() => {
    const languages = getTargetLanguages();
    Alert.alert(
      'Source Language',
      undefined,
      [
        {
          text: `Auto${detectedLanguage ? ` (${getLanguageName(detectedLanguage)})` : ''}`,
          onPress: () => setSourceLanguage('auto'),
        },
        ...languages.map((lang) => ({
          text: lang.name,
          onPress: () => setSourceLanguage(lang.code as TranslationLanguageCode),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  }, [detectedLanguage]);

  const sourceLangLabel =
    sourceLanguage === 'auto'
      ? detectedLanguage
        ? getLanguageName(detectedLanguage)
        : 'Auto Detect'
      : getLanguageName(sourceLanguage);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
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
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Header with language selectors */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Pressable
              style={[styles.langButton, { backgroundColor: theme.surface }]}
              onPress={handleSourceLanguagePicker}
            >
              <Text style={[styles.langButtonText, { color: theme.text }]} numberOfLines={1}>
                {sourceLangLabel}
              </Text>
              <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
            </Pressable>

            <Pressable
              style={styles.swapButton}
              onPress={handleSwapLanguages}
              disabled={sourceLanguage === 'auto' && !detectedLanguage}
            >
              <Ionicons
                name="swap-horizontal"
                size={20}
                color={
                  sourceLanguage === 'auto' && !detectedLanguage
                    ? theme.textMuted
                    : theme.primary
                }
              />
            </Pressable>

            <Pressable
              style={[styles.langButton, { backgroundColor: theme.surface }]}
              onPress={handleTargetLanguagePicker}
            >
              <Text style={[styles.langButtonText, { color: theme.text }]} numberOfLines={1}>
                {getLanguageName(currentTargetLang)}
              </Text>
              <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
            </Pressable>

            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Source text */}
            {selectedText ? (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
                  {sourceLangLabel}
                </Text>
                <Text style={[styles.sourceText, { color: theme.text }]}>
                  {selectedText}
                </Text>
              </View>
            ) : null}

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Translation result */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
                {getLanguageName(currentTargetLang)}
              </Text>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                    Translating...
                  </Text>
                </View>
              ) : error ? (
                <View style={styles.errorContainer}>
                  <Text style={[styles.errorText, { color: theme.error }]}>
                    {error}
                  </Text>
                  <Pressable
                    style={[styles.retryButton, { backgroundColor: theme.surface }]}
                    onPress={handleTranslate}
                  >
                    <Ionicons name="refresh" size={16} color={theme.primary} />
                    <Text style={[styles.retryText, { color: theme.primary }]}>
                      Retry
                    </Text>
                  </Pressable>
                </View>
              ) : currentTranslation ? (
                <Text style={[styles.translatedText, { color: theme.text }]}>
                  {currentTranslation}
                </Text>
              ) : null}
            </View>
          </ScrollView>

          {/* Action bar */}
          {currentTranslation && !isLoading ? (
            <View style={[styles.actionBar, { borderTopColor: theme.border }]}>
              <Pressable style={[styles.actionButton, { backgroundColor: theme.surface }]} onPress={handleCopy}>
                <Ionicons name="copy-outline" size={18} color={theme.primary} />
                <Text style={[styles.actionButtonText, { color: theme.text }]}>
                  Copy
                </Text>
              </Pressable>
            </View>
          ) : null}
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
    maxHeight: '55%',
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
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  langButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  langButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  swapButton: {
    padding: 6,
  },
  closeButton: {
    padding: 6,
    marginLeft: 4,
  },
  content: {
    flex: 1,
    paddingTop: 12,
  },
  section: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sourceText: {
    fontSize: 15,
    lineHeight: 22,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    gap: 8,
  },
  errorText: {
    fontSize: 14,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  translatedText: {
    fontSize: 15,
    lineHeight: 22,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default TranslationPanel;
