import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type {
  ReaderEngineRef,
  ReaderEngineProps,
  BridgeMessage,
  BridgeCommand,
  Chapter,
  ReaderProgress,
  ReaderLocation,
  SearchResult,
  ReaderTheme,
} from './types';
import { getReaderHTML } from '../webview/readerHtml';

export const EpubEngine = forwardRef<ReaderEngineRef, ReaderEngineProps>(
  function EpubEngine(props, ref) {
    const {
      bookData,
      format,
      initialLocation,
      highlights,
      readerTheme,
      onLocationChange,
      onSelectionChange,
      onTocLoaded,
      onProgressChange,
      onTap,
    } = props;

    const webViewRef = useRef<WebView>(null);
    const [isReady, setIsReady] = useState(false);
    const [toc, setToc] = useState<Chapter[]>([]);
    const [currentProgress, setCurrentProgress] = useState<ReaderProgress | null>(null);
    const [currentLocation, setCurrentLocation] = useState<ReaderLocation | null>(null);

    const sendCommand = useCallback(
      (command: BridgeCommand) => {
        if (webViewRef.current && isReady) {
          const js = `window.handleCommand(${JSON.stringify(command)}); true;`;
          webViewRef.current.injectJavaScript(js);
        }
      },
      [isReady]
    );

    useEffect(() => {
      if (isReady && bookData) {
        // Convert ArrayBuffer to base64 in chunks to avoid call stack overflow
        const bytes = new Uint8Array(bookData);
        const CHUNK_SIZE = 8192;
        let binary = '';
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
          const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
          for (let j = 0; j < chunk.length; j++) {
            binary += String.fromCharCode(chunk[j]);
          }
        }
        const base64 = btoa(binary);
        sendCommand({
          type: 'loadBook',
          data: base64,
          format,
          initialLocation: initialLocation || undefined,
        });
      }
    }, [isReady, bookData, format, initialLocation, sendCommand]);

    useEffect(() => {
      if (isReady) {
        sendCommand({ type: 'applyTheme', theme: readerTheme });
      }
    }, [isReady, readerTheme, sendCommand]);

    useEffect(() => {
      if (isReady && highlights) {
        for (const hl of highlights) {
          sendCommand({
            type: 'addHighlight',
            cfi: hl.cfi,
            color: hl.color,
            id: hl.id,
          });
        }
      }
    }, [isReady, highlights, sendCommand]);

    const handleMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const msg: BridgeMessage = JSON.parse(event.nativeEvent.data);
          switch (msg.type) {
            case 'ready':
              setIsReady(true);
              break;
            case 'locationChanged':
              setCurrentLocation({
                cfi: msg.location,
                fraction: msg.progress?.fraction,
              });
              setCurrentProgress(msg.progress);
              onLocationChange?.(msg.location);
              onProgressChange?.(msg.progress);
              break;
            case 'tocLoaded':
              setToc(msg.toc);
              onTocLoaded?.(msg.toc);
              break;
            case 'metadataLoaded':
              // Metadata available via msg.metadata.title, msg.metadata.author
              console.log('Book metadata:', msg.metadata);
              break;
            case 'selection':
              onSelectionChange?.(msg);
              break;
            case 'selectionCleared':
              break;
            case 'tap':
              onTap?.(msg.zone);
              break;
            case 'chapterChanged':
              // Chapter navigation info available via msg.label, msg.href
              break;
            case 'annotationTapped':
              // Highlight tapped: msg.value contains the CFI
              console.log('Annotation tapped:', msg.value);
              break;
            case 'searchResults':
              // Search results available via msg.results
              break;
            case 'error':
              console.error('WebView error:', msg.message);
              break;
            case 'log':
              console.log('WebView:', msg.message);
              break;
          }
        } catch (e) {
          console.error('Failed to parse WebView message:', e);
        }
      },
      [onLocationChange, onSelectionChange, onTocLoaded, onProgressChange, onTap]
    );

    useImperativeHandle(ref, () => ({
      goToNext: () => sendCommand({ type: 'goToNext' }),
      goToPrev: () => sendCommand({ type: 'goToPrev' }),
      goToLocation: (location: string) =>
        sendCommand({ type: 'goToLocation', location }),
      goToChapter: (href: string) =>
        sendCommand({ type: 'goToChapter', href }),
      goToPage: (page: number) =>
        sendCommand({ type: 'goToLocation', location: String(page) }),
      getCurrentLocation: () => currentLocation,
      getProgress: () => currentProgress,
      getTOC: () => toc,
      getTotalPages: () => currentProgress?.total ?? 0,
      search: async (query: string) => {
        sendCommand({ type: 'search', query });
        return []; // Results come asynchronously via onMessage
      },
      clearSearch: () => sendCommand({ type: 'clearSearch' }),
      addHighlight: (cfi: string, color: string, id: string) =>
        sendCommand({ type: 'addHighlight', cfi, color, id }),
      removeHighlight: (id: string) =>
        sendCommand({ type: 'removeHighlight', id }),
      applyTheme: (theme: ReaderTheme) =>
        sendCommand({ type: 'applyTheme', theme }),
      setFontSize: (size: number) =>
        sendCommand({ type: 'setFontSize', size }),
      setFontFamily: (family: string) =>
        sendCommand({ type: 'setFontFamily', family }),
      setLineHeight: (height: number) =>
        sendCommand({ type: 'setLineHeight', height }),
    }));

    // Swipe gesture for page turns
    const swipeGesture = Gesture.Pan()
      .activeOffsetX([-30, 30])
      .onEnd((e) => {
        if (e.translationX < -50) {
          sendCommand({ type: 'goToNext' });
        } else if (e.translationX > 50) {
          sendCommand({ type: 'goToPrev' });
        }
      });

    const readerHTML = getReaderHTML();

    return (
      <View style={styles.container}>
        <GestureDetector gesture={swipeGesture}>
          <View style={styles.webviewWrapper}>
            <WebView
              ref={webViewRef}
              source={{ html: readerHTML }}
              onMessage={handleMessage}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              allowFileAccess
              allowFileAccessFromFileURLs
              allowUniversalAccessFromFileURLs
              mixedContentMode="always"
              style={[
                styles.webview,
                { backgroundColor: readerTheme.backgroundColor },
              ]}
              onError={(e) =>
                console.error('WebView error:', e.nativeEvent)
              }
            />
          </View>
        </GestureDetector>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webviewWrapper: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
