/**
 * Quote Card Service
 *
 * Generates shareable quote cards from highlighted/selected text.
 *
 * In React Native, we cannot use the HTML Canvas API directly.
 * This service generates an SVG-based quote card and uses
 * react-native-view-shot or expo-sharing to share it.
 *
 * For now, this provides a text-based share fallback and an SVG
 * template that can be rendered by a React Native component.
 */

import * as Sharing from 'expo-sharing';
import { Paths, File, Directory } from 'expo-file-system';

export interface QuoteCardOptions {
  text: string;
  bookTitle: string;
  author: string;
  coverDataUrl?: string;
}

export interface QuoteCardData {
  text: string;
  bookTitle: string;
  author: string;
  gradientStart: string;
  gradientEnd: string;
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1080;
const PADDING = 80;

/**
 * Generate quote card data for rendering in a React Native component.
 * Returns structured data that a QuoteCard component can render.
 */
export function generateQuoteCardData(options: QuoteCardOptions): QuoteCardData {
  return {
    text: options.text,
    bookTitle: options.bookTitle,
    author: options.author,
    gradientStart: '#1a1a2e',
    gradientEnd: '#0f3460',
  };
}

/**
 * Generate an SVG string for the quote card.
 * This can be used with react-native-svg or rendered as an image.
 */
export function generateQuoteCardSvg(options: QuoteCardOptions): string {
  const { text, bookTitle, author } = options;

  // Calculate font size based on text length
  const fontSize = text.length > 300 ? 28 : text.length > 150 ? 34 : 40;
  const lineHeight = fontSize * 1.6;

  // Simple word-wrap estimation for SVG (approximate)
  const maxCharsPerLine = Math.floor((CARD_WIDTH - PADDING * 2) / (fontSize * 0.55));
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Build tspan elements for wrapped text
  const textSpans = lines
    .map(
      (line, i) =>
        `<tspan x="${PADDING}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('\n      ');

  const totalTextHeight = lines.length * lineHeight;
  const metaHeight = 120;
  const startY = Math.max(
    PADDING + 40,
    (CARD_HEIGHT - totalTextHeight - metaHeight) / 2
  );
  const dividerY = startY + totalTextHeight + 30;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="50%" stop-color="#16213e"/>
      <stop offset="100%" stop-color="#0f3460"/>
    </linearGradient>
  </defs>
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bg)"/>
  <!-- Decorative quote mark -->
  <text x="20" y="320" font-family="Georgia, serif" font-size="400" font-weight="bold" fill="rgba(255,255,255,0.06)">\u201C</text>
  <!-- Quote text -->
  <text font-family="Georgia, serif" font-size="${fontSize}" font-style="italic" fill="#ffffff" y="${startY}">
      ${textSpans}
  </text>
  <!-- Divider -->
  <line x1="${PADDING}" y1="${dividerY}" x2="${PADDING + 80}" y2="${dividerY}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
  <!-- Book title -->
  <text x="${PADDING}" y="${dividerY + 30}" font-family="sans-serif" font-size="24" font-weight="bold" fill="#e0e0e0">${escapeXml(bookTitle)}</text>
  <!-- Author -->
  <text x="${PADDING}" y="${dividerY + 64}" font-family="sans-serif" font-size="18" fill="#a0a0a0">by ${escapeXml(author)}</text>
  <!-- Branding -->
  <text x="${CARD_WIDTH - PADDING}" y="${CARD_HEIGHT - PADDING + 10}" font-family="sans-serif" font-size="14" fill="rgba(255,255,255,0.3)" text-anchor="end">Shelfy Reader</text>
</svg>`;
}

/**
 * Share a quote as formatted text using the system share dialog.
 * This is the primary sharing method in React Native.
 */
export async function shareQuoteAsText(options: QuoteCardOptions): Promise<void> {
  const { text, bookTitle, author } = options;

  const quoteText = `\u201C${text}\u201D\n\n\u2014 ${author}, ${bookTitle}\n\nShared via Shelfy Reader`;

  // Write to a temp file for sharing
  const tempDir = new Directory(Paths.cache, 'quotes');
  if (!tempDir.exists) {
    tempDir.create({ intermediates: true });
  }

  const filename = `quote-${bookTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
  const tempFile = new File(tempDir, filename);
  tempFile.write(quoteText);

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(tempFile.uri, {
      mimeType: 'text/plain',
      dialogTitle: `Quote from "${bookTitle}"`,
    });
  } else {
    console.warn('Sharing is not available on this device');
  }
}

/**
 * Share a quote card as an SVG file.
 */
export async function shareQuoteCardSvg(options: QuoteCardOptions): Promise<void> {
  const svg = generateQuoteCardSvg(options);

  const tempDir = new Directory(Paths.cache, 'quotes');
  if (!tempDir.exists) {
    tempDir.create({ intermediates: true });
  }

  const filename = `quote-${options.bookTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.svg`;
  const tempFile = new File(tempDir, filename);
  tempFile.write(svg);

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(tempFile.uri, {
      mimeType: 'image/svg+xml',
      dialogTitle: `Quote from "${options.bookTitle}"`,
    });
  } else {
    console.warn('Sharing is not available on this device');
  }
}

/**
 * Escape XML special characters for SVG text content.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
