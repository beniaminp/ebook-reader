/**
 * Configures the PDF.js GlobalWorkerOptions.workerSrc once.
 *
 * Import this module in any file that uses pdfjs-dist to avoid duplicating
 * the CDN URL string across multiple components and hooks.
 */

import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
