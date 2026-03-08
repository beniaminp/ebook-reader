/**
 * Generates the HTML that runs inside the WebView for EPUB/MOBI/FB2 rendering.
 * This is where the shelfy-reader (foliate-js) library runs — it has full DOM access.
 *
 * The bridge protocol:
 * - RN -> WebView: window.handleCommand(command) injected via injectJavaScript
 * - WebView -> RN: window.ReactNativeWebView.postMessage(JSON.stringify(message))
 */
import { FOLIATE_JS } from './foliateBundle';

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
    foliate-view {
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
    /* Tap zones overlay the foliate-view */
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

  <!-- Shelfy-reader (foliate-js) bundle — defines <foliate-view> custom element -->
  <script>${FOLIATE_JS}</script>

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
    var currentView = null;
    var currentTheme = {};
    var pendingInitialLocation = null;

    // MIME type mapping
    function formatToMime(format) {
      switch (format) {
        case 'epub': return 'application/epub+zip';
        case 'mobi':
        case 'azw3': return 'application/x-mobipocket-ebook';
        case 'fb2': return 'application/x-fictionbook+xml';
        case 'cbz':
        case 'cbr': return 'application/vnd.comicbook+zip';
        default: return 'application/epub+zip';
      }
    }

    // Convert foliate TOC tree to flat chapter array for RN
    function flattenToc(items) {
      if (!items) return [];
      return items.map(function(item, idx) {
        return {
          label: (item.label || '').trim() || ('Chapter ' + (idx + 1)),
          href: item.href || '',
          subitems: item.subitems ? flattenToc(item.subitems) : undefined,
        };
      });
    }

    // Tap zone handlers
    document.getElementById('tap-left').addEventListener('click', function(e) {
      e.stopPropagation();
      if (currentView) {
        currentView.goLeft();
      }
      sendMessage({ type: 'tap', zone: 'left' });
    });

    document.getElementById('tap-center').addEventListener('click', function(e) {
      e.stopPropagation();
      sendMessage({ type: 'tap', zone: 'center' });
    });

    document.getElementById('tap-right').addEventListener('click', function(e) {
      e.stopPropagation();
      if (currentView) {
        currentView.goRight();
      }
      sendMessage({ type: 'tap', zone: 'right' });
    });

    // Text selection handler for the outer document
    document.addEventListener('selectionchange', function() {
      var selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        var range = selection.getRangeAt(0);
        var rect = range.getBoundingClientRect();
        sendMessage({
          type: 'selection',
          text: selection.toString(),
          cfi: '',
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
        });
      }
    });

    // Build a CSS string from the current theme for injection into foliate-view iframes
    function buildThemeCSS(theme) {
      var rules = [];
      var bg = theme.backgroundColor || '#ffffff';
      var fg = theme.textColor || '#000000';
      var fontSize = theme.fontSize || 16;
      var fontFamily = theme.fontFamily || 'serif';
      var lineHeight = theme.lineHeight || 1.6;
      var textAlign = theme.textAlign || 'left';
      var letterSpacing = theme.letterSpacing || 0;
      var marginSize = theme.marginSize || 16;

      rules.push('body { background: ' + bg + ' !important; color: ' + fg + ' !important; }');
      rules.push('body { font-size: ' + fontSize + 'px !important; font-family: ' + fontFamily + ' !important; }');
      rules.push('body, p { line-height: ' + lineHeight + ' !important; }');
      rules.push('body, p, div { text-align: ' + textAlign + ' !important; }');
      if (letterSpacing) {
        rules.push('body { letter-spacing: ' + letterSpacing + 'px !important; }');
      }
      rules.push('body { padding: ' + marginSize + 'px !important; }');

      return rules.join('\\n');
    }

    // Apply theme to the foliate-view renderer and outer body
    function applyTheme(theme) {
      currentTheme = theme;
      document.body.style.backgroundColor = theme.backgroundColor || '#fff';
      document.body.style.color = theme.textColor || '#000';

      if (currentView && currentView.renderer) {
        try {
          currentView.renderer.setStyles(buildThemeCSS(theme));
        } catch (err) {
          log('Error applying theme to renderer: ' + err.message);
        }
      }
    }

    // Load book using shelfy-reader (foliate-view)
    function loadBook(base64Data, format, initialLocation) {
      try {
        log('Loading book, format: ' + format + ', data length: ' + base64Data.length);

        // Decode base64 to binary
        var binary = atob(base64Data);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        var container = document.getElementById('book-view');

        // Plain text formats: render directly without foliate-view
        if (format === 'txt' || format === 'html' || format === 'md') {
          var text = new TextDecoder().decode(bytes);
          var content = format === 'html' ? text : '<pre style="white-space:pre-wrap;word-wrap:break-word;font-family:inherit;">' + escapeHtml(text) + '</pre>';
          container.innerHTML = '<div style="padding:16px;overflow-y:auto;height:100%;">' + content + '</div>';
          sendMessage({ type: 'tocLoaded', toc: [] });
          sendMessage({
            type: 'locationChanged',
            location: '0',
            progress: { current: 1, total: 1, fraction: 0, location: '0' },
          });
          applyTheme(currentTheme);
          log('Text book loaded');
          return;
        }

        // EPUB/MOBI/FB2/CBZ — use shelfy-reader <foliate-view>
        var mimeType = formatToMime(format);
        var blob = new Blob([bytes], { type: mimeType });
        var file = new File([blob], 'book.' + format, { type: mimeType });

        // Clean up previous view
        if (currentView) {
          try { currentView.close(); } catch(e) {}
          try { currentView.remove(); } catch(e) {}
          currentView = null;
        }
        container.innerHTML = '';

        // Create foliate-view element
        var view = document.createElement('foliate-view');
        container.appendChild(view);
        currentView = view;

        // Listen for section loads (each iframe section)
        view.addEventListener('load', function(e) {
          var doc = e.detail.doc;
          if (doc) {
            // Inject theme styles into the section iframe
            if (currentTheme && Object.keys(currentTheme).length > 0) {
              try {
                var style = doc.createElement('style');
                style.id = 'rn-reader-theme';
                style.textContent = buildThemeCSS(currentTheme);
                doc.head.appendChild(style);
              } catch(err) {
                log('Error injecting styles: ' + err.message);
              }
            }
          }
        });

        // Listen for draw-annotation events to render highlight visuals
        view.addEventListener('draw-annotation', function(e) {
          var draw = e.detail.draw;
          var annotation = e.detail.annotation;
          var color = annotation.color || '#ffff00';
          draw(
            function(rects, opts) {
              var ns = 'http://www.w3.org/2000/svg';
              var g = document.createElementNS(ns, 'g');
              g.setAttribute('fill', color);
              g.style.opacity = '0.3';
              g.style.mixBlendMode = 'multiply';
              for (var i = 0; i < rects.length; i++) {
                var r = rects[i];
                var el = document.createElementNS(ns, 'rect');
                el.setAttribute('x', String(r.left));
                el.setAttribute('y', String(r.top));
                el.setAttribute('height', String(r.height));
                el.setAttribute('width', String(r.width));
                g.append(el);
              }
              return g;
            },
            { color: color }
          );
        });

        // Listen for annotation taps
        view.addEventListener('show-annotation', function(e) {
          sendMessage({
            type: 'annotationTapped',
            value: e.detail.value,
          });
        });

        // Listen for overlay creation to re-add existing highlights
        view.addEventListener('create-overlay', function(e) {
          // Highlights are re-added via addHighlight commands from RN
        });

        // Listen for relocations (page turns, navigation)
        view.addEventListener('relocate', function(e) {
          var loc = e.detail;
          var cfi = loc.cfi || '';
          var fraction = loc.fraction || 0;
          var current = (loc.location && loc.location.current) ? loc.location.current : 0;
          var total = (loc.location && loc.location.total) ? loc.location.total : 0;
          var chapterLabel = (loc.tocItem && loc.tocItem.label) ? loc.tocItem.label : '';

          sendMessage({
            type: 'locationChanged',
            location: cfi,
            progress: {
              current: Math.max(1, current),
              total: total,
              fraction: fraction,
              location: cfi,
              chapterProgress: loc.section ? (loc.section.current / Math.max(1, loc.section.total)) : undefined,
              timeLeftInChapter: loc.time ? loc.time.section : undefined,
              timeLeftInBook: loc.time ? loc.time.total : undefined,
            },
          });

          // Also send chapter change if there's a toc item
          if (chapterLabel) {
            sendMessage({
              type: 'chapterChanged',
              label: chapterLabel,
              href: (loc.tocItem && loc.tocItem.href) || '',
            });
          }
        });

        // Store initial location to navigate after open
        pendingInitialLocation = initialLocation || null;

        // Open the book
        log('Opening book with foliate-view...');
        view.open(file).then(function() {
          log('Book opened successfully');

          // Extract TOC
          var bookToc = view.book ? view.book.toc : null;
          var chapters = flattenToc(bookToc);
          sendMessage({ type: 'tocLoaded', toc: chapters });

          // Extract metadata
          var meta = view.book ? view.book.metadata : null;
          if (meta) {
            sendMessage({
              type: 'metadataLoaded',
              metadata: {
                title: metaString(meta.title) || 'Unknown',
                author: metaAuthor(meta.author) || '',
              },
            });
          }

          // Navigate to initial location if provided
          if (pendingInitialLocation) {
            try {
              view.goTo(pendingInitialLocation);
            } catch(navErr) {
              log('Could not navigate to initial location: ' + navErr.message);
              // Fallback: go to first page
              view.next();
            }
            pendingInitialLocation = null;
          } else {
            view.next();
          }

          // Apply theme after open
          applyTheme(currentTheme);
        }).catch(function(err) {
          log('Error opening book: ' + err.message);
          sendMessage({ type: 'error', message: 'Failed to open book: ' + err.message });
        });

      } catch (e) {
        log('Error loading book: ' + e.message);
        sendMessage({ type: 'error', message: e.message });
      }
    }

    // Helper: extract plain string from foliate metadata fields
    function metaString(val) {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (typeof val === 'object' && val !== null) {
        var values = Object.values(val);
        return values[0] || '';
      }
      return String(val);
    }

    // Helper: extract author name from foliate metadata
    function metaAuthor(val) {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) {
        return val
          .map(function(item) { return metaString(item && item.name ? item.name : item); })
          .filter(Boolean)
          .join(', ');
      }
      if (typeof val === 'object' && val !== null && val.name) {
        return metaString(val.name);
      }
      return metaString(val);
    }

    function escapeHtml(text) {
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Search implementation using foliate-view async iterator
    async function performSearch(query) {
      if (!currentView || !query || !query.trim()) {
        sendMessage({ type: 'searchResults', results: [] });
        return;
      }
      try {
        var results = [];
        var iter = currentView.search({ query: query });
        for await (var result of iter) {
          if (result === 'done') break;
          if (typeof result === 'string') continue;
          if (result.subitems) {
            var chapterLabel = result.label || '';
            for (var i = 0; i < result.subitems.length; i++) {
              var sub = result.subitems[i];
              results.push({
                cfi: sub.cfi,
                excerpt: sub.excerpt || '',
                chapterLabel: chapterLabel,
              });
            }
          } else if (result.cfi) {
            results.push({
              cfi: result.cfi,
              excerpt: result.excerpt || '',
              chapterLabel: '',
            });
          }
        }
        sendMessage({ type: 'searchResults', results: results });
      } catch (err) {
        log('Search error: ' + err.message);
        sendMessage({ type: 'searchResults', results: [] });
      }
    }

    // Command handler — called from React Native via injectJavaScript
    window.handleCommand = function(command) {
      try {
        switch (command.type) {
          case 'loadBook':
            loadBook(command.data, command.format, command.initialLocation);
            break;
          case 'goToNext':
            if (currentView) currentView.goRight();
            break;
          case 'goToPrev':
            if (currentView) currentView.goLeft();
            break;
          case 'goToLocation':
            if (currentView && command.location) {
              currentView.goTo(command.location);
            }
            break;
          case 'goToChapter':
            if (currentView && command.href) {
              currentView.goTo(command.href);
            }
            break;
          case 'goToFraction':
            if (currentView && command.fraction !== undefined) {
              currentView.goToFraction(command.fraction);
            }
            break;
          case 'search':
            performSearch(command.query);
            break;
          case 'clearSearch':
            if (currentView) {
              try { currentView.clearSearch(); } catch(e) {}
            }
            break;
          case 'addHighlight':
            if (currentView && command.cfi) {
              try {
                currentView.addAnnotation({
                  value: command.cfi,
                  color: command.color || '#ffff00',
                });
              } catch(e) {
                log('Error adding highlight: ' + e.message);
              }
            }
            break;
          case 'removeHighlight':
            if (currentView && command.id) {
              try {
                currentView.deleteAnnotation({ value: command.id });
              } catch(e) {
                log('Error removing highlight: ' + e.message);
              }
            }
            break;
          case 'applyTheme':
            applyTheme(command.theme);
            break;
          case 'setFontSize':
            currentTheme.fontSize = command.size;
            applyTheme(currentTheme);
            break;
          case 'setFontFamily':
            currentTheme.fontFamily = command.family;
            applyTheme(currentTheme);
            break;
          case 'setLineHeight':
            currentTheme.lineHeight = command.height;
            applyTheme(currentTheme);
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
