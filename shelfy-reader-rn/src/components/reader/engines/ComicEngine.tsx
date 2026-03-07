import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, FlatList, useWindowDimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import type {
  ReaderEngineRef,
  ReaderEngineProps,
  ReaderProgress,
  ReaderTheme,
} from './types';

interface ComicPage {
  index: number;
  uri: string;
}

export const ComicEngine = forwardRef<ReaderEngineRef, ReaderEngineProps>(
  function ComicEngine(props, ref) {
    const {
      bookData,
      readerTheme,
      initialLocation,
      onLocationChange,
      onProgressChange,
    } = props;

    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const flatListRef = useRef<FlatList>(null);
    const [pages, setPages] = useState<ComicPage[]>([]);
    const [currentPage, setCurrentPage] = useState(
      initialLocation ? parseInt(initialLocation, 10) || 0 : 0
    );

    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);

    // Extract images from CBZ (ZIP) on mount
    React.useEffect(() => {
      if (bookData) {
        extractComicPages(bookData);
      }
    }, [bookData]);

    const extractComicPages = async (data: ArrayBuffer) => {
      try {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(data);
        const imageFiles = Object.keys(zip.files)
          .filter((name) => /\.(jpg|jpeg|png|gif|webp)$/i.test(name))
          .sort();

        const extractedPages: ComicPage[] = [];
        for (let i = 0; i < imageFiles.length; i++) {
          const file = zip.files[imageFiles[i]];
          const blob = await file.async('base64');
          const ext = imageFiles[i].split('.').pop()?.toLowerCase() || 'jpg';
          const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
          extractedPages.push({
            index: i,
            uri: `data:${mimeType};base64,${blob}`,
          });
        }
        setPages(extractedPages);
      } catch (e) {
        console.error('Failed to extract comic pages:', e);
      }
    };

    const updateProgress = useCallback(
      (page: number) => {
        const total = pages.length;
        const progress: ReaderProgress = {
          current: page + 1,
          total,
          fraction: total > 0 ? page / (total - 1) : 0,
          location: String(page),
        };
        onProgressChange?.(progress);
        onLocationChange?.(String(page));
      },
      [pages.length, onProgressChange, onLocationChange]
    );

    const goToPage = useCallback(
      (page: number) => {
        const clamped = Math.max(0, Math.min(page, pages.length - 1));
        flatListRef.current?.scrollToIndex({ index: clamped, animated: true });
        setCurrentPage(clamped);
        updateProgress(clamped);
      },
      [pages.length, updateProgress]
    );

    useImperativeHandle(ref, () => ({
      goToNext: () => goToPage(currentPage + 1),
      goToPrev: () => goToPage(currentPage - 1),
      goToLocation: (loc: string) => goToPage(parseInt(loc, 10) || 0),
      goToChapter: () => {},
      goToPage,
      getCurrentLocation: () => ({
        page: currentPage,
        fraction: pages.length > 0 ? currentPage / (pages.length - 1) : 0,
      }),
      getProgress: () => ({
        current: currentPage + 1,
        total: pages.length,
        fraction: pages.length > 0 ? currentPage / (pages.length - 1) : 0,
        location: String(currentPage),
      }),
      getTOC: () => [],
      getTotalPages: () => pages.length,
      search: async () => [],
      clearSearch: () => {},
      addHighlight: () => {},
      removeHighlight: () => {},
      applyTheme: () => {},
      setFontSize: () => {},
      setFontFamily: () => {},
      setLineHeight: () => {},
    }));

    const pinchGesture = Gesture.Pinch()
      .onUpdate((e) => {
        scale.value = savedScale.value * e.scale;
      })
      .onEnd(() => {
        if (scale.value < 1) scale.value = withSpring(1);
        if (scale.value > 4) scale.value = withSpring(4);
        savedScale.value = scale.value;
      });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const renderPage = useCallback(
      ({ item }: { item: ComicPage }) => (
        <GestureDetector gesture={pinchGesture}>
          <Animated.View style={[{ width: screenWidth, height: screenHeight }, animatedStyle]}>
            <Image
              source={{ uri: item.uri }}
              style={{ width: screenWidth, height: screenHeight }}
              contentFit="contain"
              transition={150}
            />
          </Animated.View>
        </GestureDetector>
      ),
      [screenWidth, screenHeight, pinchGesture, animatedStyle]
    );

    return (
      <View style={[styles.container, { backgroundColor: readerTheme.backgroundColor }]}>
        <FlatList
          ref={flatListRef}
          data={pages}
          horizontal
          pagingEnabled
          renderItem={renderPage}
          keyExtractor={(item) => String(item.index)}
          onMomentumScrollEnd={(e) => {
            const page = Math.round(
              e.nativeEvent.contentOffset.x / screenWidth
            );
            setCurrentPage(page);
            updateProgress(page);
          }}
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          initialScrollIndex={currentPage}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
