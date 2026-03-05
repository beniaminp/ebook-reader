import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'fastlane', 'metadata', 'android', 'en-US', 'images');

// Register fonts
const fontDir = '/home/beniaminp/JetBrainsGateway-253.30387.104/jbr/lib/fonts';
GlobalFonts.registerFromPath(join(fontDir, 'Inter-Regular.otf'), 'Inter');
GlobalFonts.registerFromPath(join(fontDir, 'Inter-SemiBold.otf'), 'InterSemiBold');
GlobalFonts.registerFromPath(join(fontDir, 'DroidSans.ttf'), 'DroidSans');
GlobalFonts.registerFromPath(join(fontDir, 'DroidSans-Bold.ttf'), 'DroidSansBold');
GlobalFonts.registerFromPath(join(fontDir, 'Roboto-Light.ttf'), 'RobotoLight');

const FONT_BOLD = 'DroidSansBold';
const FONT_REGULAR = 'Inter';
const FONT_SEMIBOLD = 'InterSemiBold';
const FONT_LIGHT = 'RobotoLight';

const W = 1024;
const H = 500;

// Brand colors
const BLUE_DARK = '#1E3A5F';
const BLUE_MID = '#2C5F8A';
const BLUE_LIGHT = '#4A90D9';
const WHITE = '#FFFFFF';
const WHITE_80 = 'rgba(255,255,255,0.8)';
const WHITE_50 = 'rgba(255,255,255,0.5)';
const WHITE_15 = 'rgba(255,255,255,0.15)';
const BOOKMARK_RED = '#E8636F';

// Load icon
const iconPath = join(__dirname, '..', 'public', 'assets', 'icon', 'icon.png');
const icon = await loadImage(iconPath);

// Helper: draw rounded rect
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Helper: draw a stylized book
function drawBook(ctx, x, y, w, h, color, angle = 0) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.translate(-w / 2, -h / 2);

  // Book shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  roundRect(ctx, 4, 4, w, h, 6);
  ctx.fill();

  // Book cover
  ctx.fillStyle = color;
  roundRect(ctx, 0, 0, w, h, 6);
  ctx.fill();

  // Spine line
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(12, 4);
  ctx.lineTo(12, h - 4);
  ctx.stroke();

  // Title lines on cover
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 3; i++) {
    const lw = w * (0.5 - i * 0.08);
    roundRect(ctx, 24, 20 + i * 14, lw, 6, 3);
    ctx.fill();
  }

  ctx.restore();
}

// Helper: format pill
function drawPill(ctx, x, y, text) {
  ctx.font = `16px ${FONT_SEMIBOLD}`;
  const metrics = ctx.measureText(text);
  const pw = metrics.width + 20;
  const ph = 28;

  ctx.fillStyle = WHITE_15;
  roundRect(ctx, x, y, pw, ph, 14);
  ctx.fill();

  ctx.fillStyle = WHITE_80;
  ctx.fillText(text, x + 10, y + 19);

  return pw;
}

// ============================================================
// VARIANT 1: Clean centered with floating books
// ============================================================
function generateVariant1() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#1A3A60');
  grad.addColorStop(0.5, BLUE_MID);
  grad.addColorStop(1, '#3B7DD8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial glow
  const radial = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 400);
  radial.addColorStop(0, 'rgba(74,144,217,0.3)');
  radial.addColorStop(1, 'rgba(74,144,217,0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, W, H);

  // Floating books on the right
  const bookColors = ['#E8636F', '#F5A623', '#7ED321', '#4ECDC4', '#9B59B6'];
  drawBook(ctx, 620, 60, 90, 130, bookColors[0], -12);
  drawBook(ctx, 730, 100, 85, 125, bookColors[1], 5);
  drawBook(ctx, 840, 50, 80, 120, bookColors[2], -8);
  drawBook(ctx, 680, 250, 88, 128, bookColors[3], 10);
  drawBook(ctx, 810, 280, 82, 122, bookColors[4], -5);

  // App icon
  ctx.drawImage(icon, 80, 130, 100, 100);

  // App name
  ctx.font = `64px ${FONT_BOLD}`;
  ctx.fillStyle = WHITE;
  ctx.fillText('Shelfy', 200, 205);

  // Tagline
  ctx.font = `28px ${FONT_LIGHT}`;
  ctx.fillStyle = WHITE_80;
  ctx.fillText('Read anything. Anywhere.', 200, 248);

  // Format pills
  const formats = ['EPUB', 'PDF', 'MOBI', 'CBZ', 'FB2', '13+'];
  let px = 80;
  for (const f of formats) {
    const pw = drawPill(ctx, px, 340, f);
    px += pw + 10;
  }

  return canvas;
}

// ============================================================
// VARIANT 2: Minimalist with phone mockup style
// ============================================================
function generateVariant2() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Deep gradient background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#0F2847');
  grad.addColorStop(1, '#1E5A8C');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Decorative circles
  ctx.fillStyle = 'rgba(74,144,217,0.08)';
  ctx.beginPath();
  ctx.arc(800, 250, 300, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(850, 200, 200, 0, Math.PI * 2);
  ctx.fill();

  // Phone mockup (right side)
  const phoneX = 640;
  const phoneY = 40;
  const phoneW = 240;
  const phoneH = 420;

  // Phone shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundRect(ctx, phoneX + 6, phoneY + 6, phoneW, phoneH, 24);
  ctx.fill();

  // Phone body
  ctx.fillStyle = '#1A1A2E';
  roundRect(ctx, phoneX, phoneY, phoneW, phoneH, 24);
  ctx.fill();

  // Phone screen
  ctx.fillStyle = '#F5F0E8';
  roundRect(ctx, phoneX + 10, phoneY + 36, phoneW - 20, phoneH - 56, 4);
  ctx.fill();

  // Fake reader content (lines of text)
  ctx.fillStyle = '#3A3A3A';
  for (let i = 0; i < 14; i++) {
    const lw = 140 + Math.sin(i * 2.1) * 40;
    roundRect(ctx, phoneX + 26, phoneY + 55 + i * 24, lw, 8, 4);
    ctx.fill();
  }

  // Bookmark on phone
  ctx.fillStyle = BOOKMARK_RED;
  ctx.beginPath();
  ctx.moveTo(phoneX + phoneW - 40, phoneY + 36);
  ctx.lineTo(phoneX + phoneW - 40, phoneY + 80);
  ctx.lineTo(phoneX + phoneW - 30, phoneY + 70);
  ctx.lineTo(phoneX + phoneW - 20, phoneY + 80);
  ctx.lineTo(phoneX + phoneW - 20, phoneY + 36);
  ctx.closePath();
  ctx.fill();

  // Left side content
  ctx.drawImage(icon, 80, 80, 80, 80);

  ctx.font = `58px ${FONT_BOLD}`;
  ctx.fillStyle = WHITE;
  ctx.fillText('Shelfy', 80, 230);

  ctx.font = `26px ${FONT_LIGHT}`;
  ctx.fillStyle = WHITE_80;
  ctx.fillText('Your books.', 80, 272);
  ctx.fillText('Your way.', 80, 304);

  // Format line
  ctx.font = `18px ${FONT_REGULAR}`;
  ctx.fillStyle = WHITE_50;
  ctx.fillText('EPUB  |  PDF  |  MOBI  |  CBZ  |  13+ formats', 80, 380);

  // Open source badge
  ctx.fillStyle = 'rgba(126,211,33,0.2)';
  roundRect(ctx, 80, 410, 130, 30, 15);
  ctx.fill();
  ctx.font = `14px ${FONT_SEMIBOLD}`;
  ctx.fillStyle = '#7ED321';
  ctx.fillText('Open Source', 100, 430);

  return canvas;
}

// ============================================================
// VARIANT 3: Bold split with bookshelf vibe
// ============================================================
function generateVariant3() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Warm gradient background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#1A2F4A');
  grad.addColorStop(0.6, '#2C5F8A');
  grad.addColorStop(1, '#4A90D9');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Book spines (right side, like a shelf view)
  const spineColors = ['#E8636F', '#F5A623', '#4ECDC4', '#9B59B6', '#7ED321', '#E74C3C', '#3498DB', '#F39C12', '#1ABC9C', '#8E44AD'];
  const spineX = 520;
  const spineW = 45;
  const spineGap = 4;
  for (let i = 0; i < 10; i++) {
    const x = spineX + i * (spineW + spineGap);
    const h = 320 + Math.sin(i * 1.5) * 30;
    const y = H - 80 - h;

    // Spine shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    roundRect(ctx, x + 2, y + 2, spineW, h, 3);
    ctx.fill();

    // Spine
    ctx.fillStyle = spineColors[i];
    roundRect(ctx, x, y, spineW, h, 3);
    ctx.fill();

    // Spine highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 2, y + 2, 6, h - 4);

    // Title line on spine
    ctx.save();
    ctx.translate(x + spineW / 2, y + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    roundRect(ctx, -30, -3, 60, 6, 3);
    ctx.fill();
    ctx.restore();
  }

  // Shelf
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(spineX - 10, H - 80, W - spineX + 20, 8);

  // Left side: icon + text
  ctx.drawImage(icon, 70, 70, 90, 90);

  ctx.font = `62px ${FONT_BOLD}`;
  ctx.fillStyle = WHITE;
  ctx.fillText('Shelfy', 70, 240);

  ctx.font = `26px ${FONT_LIGHT}`;
  ctx.fillStyle = WHITE_80;
  ctx.fillText('All your books', 70, 280);
  ctx.fillText('in one place.', 70, 314);

  // Feature highlights
  const features = ['13+ Formats', 'No Ads', 'Offline'];
  let fx = 70;
  for (const feat of features) {
    const pw = drawPill(ctx, fx, 370, feat);
    fx += pw + 10;
  }

  return canvas;
}

// Generate all 3
const variants = [
  { fn: generateVariant1, name: 'featureGraphic_v1.png' },
  { fn: generateVariant2, name: 'featureGraphic_v2.png' },
  { fn: generateVariant3, name: 'featureGraphic_v3.png' },
];

for (const { fn, name } of variants) {
  const canvas = fn();
  const buffer = canvas.toBuffer('image/png');
  const outPath = join(outDir, name);
  writeFileSync(outPath, buffer);
  console.log(`Generated: ${outPath}`);
}
