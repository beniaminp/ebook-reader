/**
 * Generates the HTML that runs inside the WebView for EPUB/MOBI/FB2 rendering.
 * This is where the shelfy-reader (foliate-js) library runs — it has full DOM access.
 *
 * The bridge protocol:
 * - RN → WebView: window.handleCommand(command) injected via injectJavaScript
 * - WebView → RN: window.ReactNativeWebView.postMessage(JSON.stringify(message))
 */
export function getReaderHTML(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      -webkit-user-select: none;
      user-select: none;
    }
    #reader-container {
      width: 100%;
      height: 100%;
      position: relative;
    }
    #book-view {
      width: 100%;
      height: 100%;
    }
    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      font-family: system-ui, sans-serif;
      color: #666;
    }
    /* Tap zones */
    .tap-zone {
      position: absolute;
      top: 0;
      bottom: 0;
      z-index: 10;
    }
    .tap-zone-left { left: 0; width: 30%; }
    .tap-zone-center { left: 30%; width: 40%; }
    .tap-zone-right { right: 0; width: 30%; }
  </style>
</head>
<body>
  <div id="reader-container">
    <div id="book-view">
      <div class="loading">Loading book...</div>
    </div>
    <div class="tap-zone tap-zone-left" id="tap-left"></div>
    <div class="tap-zone tap-zone-center" id="tap-center"></div>
    <div class="tap-zone tap-zone-right" id="tap-right"></div>
  </div>

  <script>
    // Bridge: send message to React Native
    function sendMessage(msg) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    }

    function log(msg) {
      sendMessage({ type: 'log', message: String(msg) });
    }

    // Book state
    let currentBook = null;
    let currentView = null;
    let currentTheme = {};
    let toc = [];
    let currentLocation = null;
    let totalPages = 0;
    let currentPage = 0;

    // Tap zone handlers
    document.getElementById('tap-left').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentView) {
        goToPrev();
      }
      sendMessage({ type: 'tap', zone: 'left' });
    });

    document.getElementById('tap-center').addEventListener('click', (e) => {
      e.stopPropagation();
      sendMessage({ type: 'tap', zone: 'center' });
    });

    document.getElementById('tap-right').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentView) {
        goToNext();
      }
      sendMessage({ type: 'tap', zone: 'right' });
    });

    // Text selection handler
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        sendMessage({
          type: 'selection',
          text: selection.toString(),
          cfi: '', // CFI will be computed when shelfy-reader is loaded
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
        });
      }
    });

    // Navigation functions
    function goToNext() {
      currentPage = Math.min(currentPage + 1, totalPages - 1);
      updateProgress();
      // Scroll or paginate based on rendering mode
      const container = document.getElementById('book-view');
      if (container && container.firstElementChild) {
        const pageWidth = container.clientWidth;
        container.firstElementChild.scrollLeft = currentPage * pageWidth;
      }
    }

    function goToPrev() {
      currentPage = Math.max(currentPage - 1, 0);
      updateProgress();
      const container = document.getElementById('book-view');
      if (container && container.firstElementChild) {
        const pageWidth = container.clientWidth;
        container.firstElementChild.scrollLeft = currentPage * pageWidth;
      }
    }

    function updateProgress() {
      const fraction = totalPages > 0 ? currentPage / totalPages : 0;
      sendMessage({
        type: 'locationChanged',
        location: String(currentPage),
        progress: {
          current: currentPage + 1,
          total: totalPages,
          fraction: fraction,
          location: String(currentPage),
        },
      });
    }

    // Apply theme
    function applyTheme(theme) {
      currentTheme = theme;
      document.body.style.backgroundColor = theme.backgroundColor || '#fff';
      document.body.style.color = theme.textColor || '#000';
      document.body.style.fontSize = (theme.fontSize || 16) + 'px';
      document.body.style.fontFamily = theme.fontFamily || 'system-ui, sans-serif';
      document.body.style.lineHeight = theme.lineHeight || 1.6;

      // Apply to book content iframe if exists
      const iframe = document.querySelector('#book-view iframe');
      if (iframe && iframe.contentDocument) {
        const doc = iframe.contentDocument;
        doc.body.style.backgroundColor = theme.backgroundColor || '#fff';
        doc.body.style.color = theme.textColor || '#000';
        doc.body.style.fontSize = (theme.fontSize || 16) + 'px';
        doc.body.style.fontFamily = theme.fontFamily || 'system-ui, sans-serif';
        doc.body.style.lineHeight = theme.lineHeight || 1.6;
        doc.body.style.textAlign = theme.textAlign || 'left';
        doc.body.style.letterSpacing = (theme.letterSpacing || 0) + 'px';
        doc.body.style.padding = (theme.marginSize || 16) + 'px';
      }
    }

    // Load book content (simplified — real implementation uses shelfy-reader lib)
    function loadBook(base64Data, format) {
      try {
        log('Loading book, format: ' + format);
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const container = document.getElementById('book-view');

        if (format === 'txt' || format === 'html' || format === 'md') {
          // Simple text/HTML rendering
          const text = new TextDecoder().decode(bytes);
          const content = format === 'html' ? text : '<pre style="white-space:pre-wrap;word-wrap:break-word;font-family:inherit;">' + escapeHtml(text) + '</pre>';
          container.innerHTML = '<div style="padding:16px;overflow-y:auto;height:100%;">' + content + '</div>';
          totalPages = 1;
          currentPage = 0;
          updateProgress();
        } else {
          // For EPUB/MOBI/FB2 — show the raw content for now
          // Full shelfy-reader integration will parse and render these properly
          container.innerHTML = '<div style="padding:20px;overflow-y:auto;height:100%;font-family:system-ui,sans-serif;">' +
            '<p style="color:#666;text-align:center;margin-top:40%;">Book loaded (' + format.toUpperCase() + ')</p>' +
            '<p style="color:#999;text-align:center;font-size:14px;margin-top:8px;">Shelfy-reader engine rendering will be integrated here</p>' +
            '</div>';
          totalPages = 1;
          currentPage = 0;
          updateProgress();
        }

        // Send TOC (placeholder)
        sendMessage({ type: 'tocLoaded', toc: [] });
        applyTheme(currentTheme);
        log('Book loaded successfully');
      } catch (e) {
        log('Error loading book: ' + e.message);
        sendMessage({ type: 'error', message: e.message });
      }
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Command handler — called from React Native via injectJavaScript
    window.handleCommand = function(command) {
      try {
        switch (command.type) {
          case 'loadBook':
            loadBook(command.data, command.format);
            break;
          case 'goToNext':
            goToNext();
            break;
          case 'goToPrev':
            goToPrev();
            break;
          case 'goToLocation':
            // TODO: implement with shelfy-reader
            break;
          case 'goToChapter':
            // TODO: implement with shelfy-reader
            break;
          case 'search':
            // TODO: implement search
            sendMessage({ type: 'searchResults', results: [] });
            break;
          case 'clearSearch':
            break;
          case 'addHighlight':
            // TODO: implement with shelfy-reader overlayer
            break;
          case 'removeHighlight':
            // TODO: implement with shelfy-reader overlayer
            break;
          case 'applyTheme':
            applyTheme(command.theme);
            break;
          case 'setFontSize':
            document.body.style.fontSize = command.size + 'px';
            break;
          case 'setFontFamily':
            document.body.style.fontFamily = command.family;
            break;
          case 'setLineHeight':
            document.body.style.lineHeight = command.height;
            break;
          default:
            log('Unknown command: ' + command.type);
        }
      } catch (e) {
        log('Command error: ' + e.message);
        sendMessage({ type: 'error', message: e.message });
      }
    };

    // Signal ready
    sendMessage({ type: 'ready' });
  </script>
</body>
</html>
  `.trim();
}
