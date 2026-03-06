/**
 * Quote Card Service
 *
 * Generates styled quote image cards from highlighted/selected text.
 * The card includes the quote, book title, author, and a gradient background.
 */

export interface QuoteCardOptions {
  text: string;
  bookTitle: string;
  author: string;
  coverDataUrl?: string;
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1080;
const PADDING = 80;

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  lineHeight: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function generateQuoteCard(options: QuoteCardOptions): Promise<Blob> {
  const { text, bookTitle, author } = options;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(0.5, '#16213e');
  gradient.addColorStop(1, '#0f3460');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Decorative quote mark
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.font = 'bold 400px Georgia, serif';
  ctx.fillText('\u201C', 20, 320);

  // Quote text
  const maxQuoteWidth = CARD_WIDTH - PADDING * 2;
  const fontSize = text.length > 300 ? 28 : text.length > 150 ? 34 : 40;
  ctx.font = `italic ${fontSize}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';

  const lineHeight = fontSize * 1.6;
  const lines = wrapText(ctx, `\u201C${text}\u201D`, maxQuoteWidth, lineHeight);

  // Center the quote block vertically
  const totalTextHeight = lines.length * lineHeight;
  const metaHeight = 120;
  const startY = Math.max(
    PADDING + 40,
    (CARD_HEIGHT - totalTextHeight - metaHeight) / 2
  );

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], PADDING, startY + i * lineHeight);
  }

  // Divider line
  const dividerY = startY + lines.length * lineHeight + 30;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING, dividerY);
  ctx.lineTo(PADDING + 80, dividerY);
  ctx.stroke();

  // Book title
  ctx.font = `bold 24px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  ctx.fillStyle = '#e0e0e0';
  ctx.fillText(bookTitle, PADDING, dividerY + 20);

  // Author
  ctx.font = `18px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  ctx.fillStyle = '#a0a0a0';
  ctx.fillText(`by ${author}`, PADDING, dividerY + 54);

  // App branding (small)
  ctx.font = `14px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.textAlign = 'right';
  ctx.fillText('Shelfy Reader', CARD_WIDTH - PADDING, CARD_HEIGHT - PADDING + 10);
  ctx.textAlign = 'left';

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate quote card'));
      },
      'image/png',
      1
    );
  });
}

export async function shareQuoteCard(options: QuoteCardOptions): Promise<void> {
  const blob = await generateQuoteCard(options);

  // Try Web Share API first
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], 'quote.png', { type: 'image/png' });
    const shareData = {
      title: `Quote from "${options.bookTitle}"`,
      text: `"${options.text}" — ${options.author}`,
      files: [file],
    };

    if (navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return;
    }
  }

  // Fallback: download the image
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quote-${options.bookTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
