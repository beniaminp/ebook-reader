import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type {
  ReaderEngineRef,
  ReaderEngineProps,
  ReaderProgress,
  ReaderTheme,
} from './types';

export const TextEngine = forwardRef<ReaderEngineRef, ReaderEngineProps>(
  function TextEngine(props, ref) {
    const {
      bookData,
      format,
      readerTheme,
      onLocationChange,
      onProgressChange,
      onTap,
    } = props;

    const webViewRef = useRef<WebView>(null);
    const [progress, setProgress] = useState<ReaderProgress>({
      current: 0,
      total: 100,
      fraction: 0,
    });

    const htmlContent = React.useMemo(() => {
      if (!bookData) return '';
      const text = new TextDecoder().decode(bookData);

      let body: string;
      if (format === 'html') {
        body = text;
      } else if (format === 'md') {
        // Simple markdown rendering
        body = text
          .replace(/^### (.*$)/gm, '<h3>$1</h3>')
          .replace(/^## (.*$)/gm, '<h2>$1</h2>')
          .replace(/^# (.*$)/gm, '<h1>$1</h1>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/\n/g, '<br>');
        body = `<p>${body}</p>`;
      } else {
        // Plain text
        const escaped = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        body = `<pre style="white-space:pre-wrap;word-wrap:break-word;font-family:inherit;">${escaped}</pre>`;
      }

      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background-color: ${readerTheme.backgroundColor};
      color: ${readerTheme.textColor};
      font-size: ${readerTheme.fontSize}px;
      font-family: ${readerTheme.fontFamily || 'system-ui, sans-serif'};
      line-height: ${readerTheme.lineHeight || 1.6};
      letter-spacing: ${readerTheme.letterSpacing || 0}px;
      text-align: ${readerTheme.textAlign || 'left'};
      padding: ${readerTheme.marginSize || 16}px;
      overflow-y: auto;
    }
    h1, h2, h3, h4, h5, h6 { margin: 1em 0 0.5em; }
    p { margin-bottom: 1em; }
    a { color: ${readerTheme.textColor}; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${body}
  <script>
    // Track scroll progress
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const scrollHeight = document.body.scrollHeight - window.innerHeight;
          const fraction = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'scroll',
            fraction: Math.min(1, Math.max(0, fraction)),
          }));
          ticking = false;
        });
        ticking = true;
      }
    });

    // Tap handler
    document.addEventListener('click', (e) => {
      const x = e.clientX / window.innerWidth;
      let zone = 'center';
      if (x < 0.3) zone = 'left';
      else if (x > 0.7) zone = 'right';
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'tap',
        zone: zone,
      }));
    });
  </script>
</body>
</html>`;
    }, [bookData, format, readerTheme]);

    const handleMessage = (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'scroll') {
          const p: ReaderProgress = {
            current: Math.round(msg.fraction * 100),
            total: 100,
            fraction: msg.fraction,
            location: String(Math.round(msg.fraction * 100)),
          };
          setProgress(p);
          onProgressChange?.(p);
          onLocationChange?.(String(Math.round(msg.fraction * 100)));
        } else if (msg.type === 'tap') {
          onTap?.(msg.zone);
        }
      } catch (e) {
        // ignore
      }
    };

    useImperativeHandle(ref, () => ({
      goToNext: () => {
        webViewRef.current?.injectJavaScript(
          'window.scrollBy(0, window.innerHeight * 0.9); true;'
        );
      },
      goToPrev: () => {
        webViewRef.current?.injectJavaScript(
          'window.scrollBy(0, -window.innerHeight * 0.9); true;'
        );
      },
      goToLocation: (loc: string) => {
        const pct = parseInt(loc, 10) / 100;
        webViewRef.current?.injectJavaScript(
          `window.scrollTo(0, (document.body.scrollHeight - window.innerHeight) * ${pct}); true;`
        );
      },
      goToChapter: () => {},
      goToPage: () => {},
      getCurrentLocation: () => ({ fraction: progress.fraction }),
      getProgress: () => progress,
      getTOC: () => [],
      getTotalPages: () => 100,
      search: async () => [],
      clearSearch: () => {},
      addHighlight: () => {},
      removeHighlight: () => {},
      applyTheme: () => {},
      setFontSize: (size: number) => {
        webViewRef.current?.injectJavaScript(
          `document.body.style.fontSize = '${size}px'; true;`
        );
      },
      setFontFamily: (family: string) => {
        webViewRef.current?.injectJavaScript(
          `document.body.style.fontFamily = '${family}'; true;`
        );
      },
      setLineHeight: (height: number) => {
        webViewRef.current?.injectJavaScript(
          `document.body.style.lineHeight = '${height}'; true;`
        );
      },
    }));

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          onMessage={handleMessage}
          style={[styles.webview, { backgroundColor: readerTheme.backgroundColor }]}
          originWhitelist={['*']}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
});
