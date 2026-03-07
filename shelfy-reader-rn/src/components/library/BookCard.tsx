import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { formatPercentage, getFormatDisplayName } from '../../utils/formatUtils';
import type { Book } from '../../types';

interface BookCardProps {
  book: Book;
  viewMode: 'grid' | 'list';
  onPress: () => void;
  onLongPress?: () => void;
}

export function BookCard({ book, viewMode, onPress, onLongPress }: BookCardProps) {
  const { theme } = useTheme();

  if (viewMode === 'grid') {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={[styles.gridCard, { backgroundColor: theme.card }]}
      >
        <View
          style={[
            styles.gridCover,
            { backgroundColor: theme.surfaceVariant },
          ]}
        >
          {book.coverPath ? (
            <Image
              source={{ uri: book.coverPath }}
              style={styles.coverImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.placeholderCover}>
              <Ionicons name="book" size={32} color={theme.textMuted} />
            </View>
          )}
          {book.progress != null && book.progress > 0 && (
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${Math.min(book.progress * 100, 100)}%`,
                  },
                ]}
              />
            </View>
          )}
        </View>
        <Text
          numberOfLines={2}
          style={[styles.gridTitle, { color: theme.text }]}
        >
          {book.title}
        </Text>
        {book.author && (
          <Text
            numberOfLines={1}
            style={[styles.gridAuthor, { color: theme.textSecondary }]}
          >
            {book.author}
          </Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.listCard, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
    >
      <View
        style={[styles.listCover, { backgroundColor: theme.surfaceVariant }]}
      >
        {book.coverPath ? (
          <Image
            source={{ uri: book.coverPath }}
            style={styles.listCoverImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Ionicons name="book" size={24} color={theme.textMuted} />
        )}
      </View>
      <View style={styles.listInfo}>
        <Text numberOfLines={1} style={[styles.listTitle, { color: theme.text }]}>
          {book.title}
        </Text>
        {book.author && (
          <Text
            numberOfLines={1}
            style={[styles.listAuthor, { color: theme.textSecondary }]}
          >
            {book.author}
          </Text>
        )}
        <View style={styles.listMeta}>
          <Text style={[styles.formatBadge, { color: theme.primary, backgroundColor: theme.surface }]}>
            {getFormatDisplayName(book.format)}
          </Text>
          {book.progress != null && book.progress > 0 && (
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>
              {formatPercentage(book.progress)}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gridCard: {
    flex: 1,
    margin: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridCover: {
    aspectRatio: 2 / 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  gridAuthor: {
    fontSize: 11,
    marginTop: 2,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listCover: {
    width: 48,
    height: 64,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  listCoverImage: {
    width: '100%',
    height: '100%',
  },
  listInfo: {
    flex: 1,
    marginLeft: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  listAuthor: {
    fontSize: 13,
    marginTop: 2,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  formatBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
