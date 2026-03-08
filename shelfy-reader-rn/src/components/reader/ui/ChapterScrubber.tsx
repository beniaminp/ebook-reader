/**
 * ChapterScrubber - A horizontal scrubber with chapter markers.
 * Shows a progress bar with chapter boundary tick marks, a draggable thumb,
 * and tappable chapter markers for quick navigation.
 */

import React, { useMemo, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../../theme/ThemeContext';

interface Chapter {
  title: string;
  startPage: number;
}

interface ChapterScrubberProps {
  chapters: Chapter[];
  currentChapter: number;
  totalPages: number;
  currentPage: number;
  onChapterSelect: (index: number) => void;
}

export function ChapterScrubber({
  chapters,
  currentChapter,
  totalPages,
  currentPage,
  onChapterSelect,
}: ChapterScrubberProps) {
  const { theme } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  // Compute chapter positions as fractions (0-1)
  const chapterPositions = useMemo(() => {
    if (chapters.length === 0 || totalPages <= 0) return [];
    return chapters.map((ch) => Math.min(ch.startPage / totalPages, 1));
  }, [chapters, totalPages]);

  // Current progress fraction
  const fraction = totalPages > 0 ? Math.min(currentPage / totalPages, 1) : 0;

  const handleSliderChange = useCallback(
    (value: number) => {
      if (chapters.length === 0) return;
      // Find the chapter closest to this fraction
      const targetPage = Math.round(value * totalPages);
      let closestIdx = 0;
      let closestDist = Infinity;
      for (let i = 0; i < chapters.length; i++) {
        const dist = Math.abs(chapters[i].startPage - targetPage);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }
      onChapterSelect(closestIdx);
    },
    [chapters, totalPages, onChapterSelect],
  );

  const handleTrackLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  const percentage = Math.round(fraction * 100);

  // When many chapters, show a scrollable row of chapter pills
  const hasChapters = chapters.length > 0;

  return (
    <View style={styles.container}>
      {/* Chapter pills (scrollable if many) */}
      {hasChapters && (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chapterPillsContent}
          style={styles.chapterPills}
        >
          {chapters.map((ch, idx) => {
            const isActive = idx === currentChapter;
            return (
              <Pressable
                key={`ch-${idx}`}
                style={[
                  styles.chapterPill,
                  {
                    backgroundColor: isActive ? theme.primary : theme.surface,
                    borderColor: isActive ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => onChapterSelect(idx)}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.chapterPillText,
                    { color: isActive ? '#fff' : theme.textSecondary },
                  ]}
                >
                  {ch.title || `Chapter ${idx + 1}`}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Scrubber track with chapter markers */}
      <View style={styles.scrubberRow} onLayout={handleTrackLayout}>
        {/* Chapter tick marks rendered on the track */}
        {trackWidth > 0 &&
          chapterPositions.map((pos, idx) => {
            // Skip marker at position 0 (first chapter)
            if (pos === 0 && idx === 0) return null;
            return (
              <Pressable
                key={`marker-${idx}`}
                style={[
                  styles.chapterMarker,
                  {
                    left: pos * trackWidth,
                    backgroundColor: theme.textMuted,
                  },
                ]}
                onPress={() => onChapterSelect(idx)}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              />
            );
          })}

        {/* Slider */}
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={fraction}
          onSlidingComplete={handleSliderChange}
          minimumTrackTintColor={theme.primary}
          maximumTrackTintColor={theme.border}
          thumbTintColor={theme.primary}
        />
      </View>

      {/* Labels row */}
      <View style={styles.labelsRow}>
        <Text style={[styles.chapterLabel, { color: theme.textSecondary }]} numberOfLines={1}>
          {chapters[currentChapter]?.title || ''}
        </Text>
        <Text style={[styles.percentLabel, { color: theme.textSecondary }]}>
          {percentage}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  chapterPills: {
    maxHeight: 36,
    marginBottom: 6,
  },
  chapterPillsContent: {
    gap: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  chapterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 140,
  },
  chapterPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scrubberRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 36,
  },
  chapterMarker: {
    position: 'absolute',
    width: 2,
    height: 12,
    borderRadius: 1,
    top: 12,
    zIndex: 1,
    marginLeft: -1,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -2,
  },
  chapterLabel: {
    flex: 1,
    fontSize: 12,
    marginRight: 8,
  },
  percentLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ChapterScrubber;
