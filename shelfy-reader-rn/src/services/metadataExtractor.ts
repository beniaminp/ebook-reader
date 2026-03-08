/**
 * Metadata Extractor
 *
 * Extracts metadata (title, author, cover) from various book formats.
 *
 * React Native version:
 * - Uses local format services (fb2Service, comicService, docxService, odtService)
 * - No pdfjs-dist (PDF metadata extraction stubbed)
 * - No foliate-js (EPUB/MOBI metadata extraction stubbed)
 * - No FileReader or Blob URLs (covers are base64 data URIs)
 * - Same export interface for drop-in compatibility
 */

import { fb2Service } from './fb2Service';
import { comicService } from './comicService';
import { docxService } from './docxService';
import { odtService } from './odtService';

export type ExtractedMetadata = {
  title?: string;
  author?: string;
  coverDataUrl?: string;
};

/** Race a promise against a timeout. Returns null if the timeout fires first. */
export const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | null> => {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
};

/**
 * Extract metadata from EPUB files.
 *
 * TODO: foliate-js (used in the Ionic version) requires DOM/browser APIs.
 * Implement using a React Native compatible EPUB parser (e.g., parse
 * META-INF/container.xml -> content.opf from the EPUB ZIP).
 */
export const extractEpubMetadata = async (
  arrayBuffer: ArrayBuffer,
  _fileName: string
): Promise<{ title: string; author: string; coverDataUrl?: string } | null> => {
  try {
    // EPUB files are ZIP archives. Parse the OPF metadata from the ZIP.
    const JSZip = (await import('jszip')).default;
    const { XMLParser } = await import('fast-xml-parser');
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 1. Find the rootfile from META-INF/container.xml
    const containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) return null;

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true,
    });

    const containerXml = await containerFile.async('string');
    const container = parser.parse(containerXml);

    // Navigate to rootfile
    const rootfiles = container?.container?.rootfiles?.rootfile;
    const rootfile = Array.isArray(rootfiles) ? rootfiles[0] : rootfiles;
    const opfPath = rootfile?.['@_full-path'];

    if (!opfPath) return null;

    // 2. Parse the OPF file
    const opfFile = zip.file(opfPath);
    if (!opfFile) return null;

    const opfXml = await opfFile.async('string');
    const opf = parser.parse(opfXml);

    const metadata = opf?.package?.metadata;
    if (!metadata) return null;

    // Extract title
    let title = '';
    const rawTitle = metadata['title'] || metadata['dc:title'];
    if (typeof rawTitle === 'string') {
      title = rawTitle;
    } else if (rawTitle?.['#text']) {
      title = rawTitle['#text'];
    } else if (Array.isArray(rawTitle)) {
      const first = rawTitle[0];
      title = typeof first === 'string' ? first : first?.['#text'] || '';
    }

    // Extract author
    let author = '';
    const rawAuthor = metadata['creator'] || metadata['dc:creator'];
    if (typeof rawAuthor === 'string') {
      author = rawAuthor;
    } else if (rawAuthor?.['#text']) {
      author = rawAuthor['#text'];
    } else if (Array.isArray(rawAuthor)) {
      author = rawAuthor
        .map((a: any) => (typeof a === 'string' ? a : a?.['#text'] || ''))
        .filter(Boolean)
        .join(', ');
    }

    // 3. Try to extract cover image
    let coverDataUrl: string | undefined;
    try {
      // Find cover meta element
      const metaElements = metadata.meta;
      const metaArray = Array.isArray(metaElements) ? metaElements : metaElements ? [metaElements] : [];
      const coverMeta = metaArray.find(
        (m: any) => m?.['@_name'] === 'cover' && m?.['@_content']
      );

      if (coverMeta) {
        const coverId = coverMeta['@_content'];

        // Find the manifest item with this ID
        const manifest = opf?.package?.manifest?.item;
        const items = Array.isArray(manifest) ? manifest : manifest ? [manifest] : [];
        const coverItem = items.find((item: any) => item?.['@_id'] === coverId);

        if (coverItem) {
          const coverHref = coverItem['@_href'];
          const coverMediaType = coverItem['@_media-type'] || 'image/jpeg';

          // Resolve the cover path relative to the OPF file
          const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
          const coverPath = opfDir + coverHref;

          const coverFile = zip.file(coverPath);
          if (coverFile) {
            const base64 = await coverFile.async('base64');
            coverDataUrl = `data:${coverMediaType};base64,${base64}`;
          }
        }
      }
    } catch {
      // Cover extraction is optional
    }

    return {
      title: title || '',
      author: author || 'Unknown',
      coverDataUrl,
    };
  } catch (err) {
    console.error('EPUB metadata extraction failed:', err);
    return null;
  }
};

/**
 * Extract metadata from PDF files.
 *
 * TODO: pdfjs-dist requires DOM/canvas and does not work in React Native.
 * Lightweight alternative: parse PDF header bytes for /Title and /Author.
 */
export const extractPdfMetadata = async (
  _arrayBuffer: ArrayBuffer
): Promise<{ title: string; author: string; coverDataUrl?: string } | null> => {
  // TODO: Implement lightweight PDF metadata extraction for RN
  // (parse the cross-reference table and info dictionary from raw bytes)
  console.warn('PDF metadata extraction not yet implemented for React Native');
  return null;
};

/**
 * Extract metadata from FB2 files.
 */
export const extractFb2Metadata = async (
  arrayBuffer: ArrayBuffer
): Promise<{ title: string; author: string; coverDataUrl?: string } | null> => {
  try {
    const decoder = new TextDecoder();
    const xmlContent = decoder.decode(arrayBuffer);

    // Validate that it's FB2
    if (!fb2Service.isValidFb2(xmlContent)) {
      return null;
    }

    const metadata = fb2Service.extractFb2Metadata(xmlContent);
    const coverBase64 = fb2Service.extractCover(xmlContent);

    return {
      title: metadata.title || '',
      author: metadata.author || 'Unknown',
      coverDataUrl: coverBase64,
    };
  } catch (err) {
    console.error('FB2 metadata extraction failed:', err);
    return null;
  }
};

/**
 * Extract metadata from ODT files.
 */
export const extractOdtMetadata = async (
  arrayBuffer: ArrayBuffer
): Promise<{ title: string; author: string; coverDataUrl?: string } | null> => {
  try {
    const metadata = await odtService.extractOdtMetadata(arrayBuffer);

    return {
      title: metadata.title || '',
      author: metadata.author || 'Unknown',
    };
  } catch (err) {
    console.error('ODT metadata extraction failed:', err);
    return null;
  }
};

/**
 * Extract metadata from DOCX files.
 */
export const extractDocxMetadata = async (
  arrayBuffer: ArrayBuffer
): Promise<{ title: string; author: string; coverDataUrl?: string } | null> => {
  try {
    const metadata = await docxService.extractDocxMetadata(arrayBuffer);

    return {
      title: metadata.title || '',
      author: metadata.author || 'Unknown',
    };
  } catch (err) {
    console.error('DOCX metadata extraction failed:', err);
    return null;
  }
};

/**
 * Extract metadata from MOBI/AZW3 files.
 *
 * TODO: foliate-js (used in the Ionic version) requires DOM/browser APIs.
 * Implement using direct MOBI/PalmDOC header parsing.
 */
export const extractMobiMetadata = async (
  _arrayBuffer: ArrayBuffer,
  _fileName: string
): Promise<{ title: string; author: string; coverDataUrl?: string } | null> => {
  // TODO: Implement MOBI/AZW3 header parsing for RN
  console.warn('MOBI/AZW3 metadata extraction not yet implemented for React Native');
  return null;
};

/**
 * Extract metadata from comic archives (CBZ/CBR).
 */
export const extractComicMetadata = async (
  arrayBuffer: ArrayBuffer,
  format: 'cbz' | 'cbr'
): Promise<{ title: string; author: string; coverDataUrl?: string } | null> => {
  try {
    // Extract cover from comic archive
    const coverDataUrl = await comicService.extractComicCover(arrayBuffer, format);

    return {
      title: '', // Comic archives typically don't have metadata, use filename
      author: 'Unknown',
      coverDataUrl: coverDataUrl || undefined,
    };
  } catch (err) {
    console.error('Comic metadata extraction failed:', err);
    return null;
  }
};

/**
 * Dispatcher function that extracts metadata from a book file based on its format.
 * Returns extracted title, author, and cover image (all optional).
 */
export async function extractMetadata(
  buffer: ArrayBuffer,
  fileName: string,
  format: string
): Promise<{ title?: string; author?: string; coverDataUrl?: string }> {
  try {
    switch (format) {
      case 'epub':
        return (await extractEpubMetadata(buffer, fileName)) ?? {};
      case 'pdf':
        return (await extractPdfMetadata(buffer)) ?? {};
      case 'fb2':
        return (await extractFb2Metadata(buffer)) ?? {};
      case 'odt':
        return (await extractOdtMetadata(buffer)) ?? {};
      case 'docx':
        return (await extractDocxMetadata(buffer)) ?? {};
      case 'mobi':
      case 'azw3':
      case 'azw':
        return (await extractMobiMetadata(buffer, fileName)) ?? {};
      case 'cbz':
      case 'cbr':
        return (await extractComicMetadata(buffer, format)) ?? {};
      default:
        return {};
    }
  } catch (e) {
    console.warn(`Metadata extraction failed for ${format}:`, e);
    return {};
  }
}
