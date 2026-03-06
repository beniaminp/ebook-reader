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

export const extractEpubMetadata = async (
  arrayBuffer: ArrayBuffer,
  fileName: string
): Promise<{ title: string; author: string; coverDataUrl?: string } | null> => {
  try {
    const { makeBook } = await import('../libs/foliate-js/view');
    // Use File instead of Blob - File has a name property that foliate-js needs
    const file = new File([arrayBuffer], fileName, { type: 'application/epub+zip' });

    let book;
    try {
      book = await withTimeout(makeBook(file), 8000);
    } catch (err) {
      // foliate-js internal errors (e.g., 'endsWith' on undefined) - fall back gracefully
      console.warn('foliate-js makeBook failed, using fallback metadata:', err);
      return null;
    }
    if (!book) return null;

    // Extract title — may be a string or a language map
    const rawTitle = book.metadata?.title;
    const title =
      typeof rawTitle === 'string'
        ? rawTitle
        : rawTitle && typeof rawTitle === 'object'
          ? (Object.values(rawTitle)[0] ?? '')
          : '';

    // Extract author — may be a string, object, or array
    const rawAuthor = book.metadata?.author;
    let author = '';
    if (typeof rawAuthor === 'string') {
      author = rawAuthor;
    } else if (Array.isArray(rawAuthor)) {
      author = rawAuthor
        .map((a: any) =>
          typeof a === 'string'
            ? a
            : typeof a?.name === 'string'
              ? a.name
              : (Object.values(a?.name ?? {})[0] ?? '')
        )
        .filter(Boolean)
        .join(', ');
    } else if (rawAuthor && typeof rawAuthor === 'object' && 'name' in rawAuthor) {
      const name = (rawAuthor as any).name;
      author = typeof name === 'string' ? name : ((Object.values(name ?? {})[0] as string) ?? '');
    }

    let coverDataUrl: string | undefined;
    try {
      if (book.getCover) {
        const coverBlob = await withTimeout(book.getCover(), 5000);
        if (coverBlob) {
          // Convert to data: URI so it persists across page reloads
          // (blob: URLs are ephemeral and die on reload)
          coverDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(coverBlob as Blob);
          });
        }
      }
    } catch {
      // Cover extraction is optional
    }

    if (book.destroy) book.destroy();

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

export const extractPdfMetadata = async (
  arrayBuffer: ArrayBuffer
): Promise<{ title: string; author: string; coverDataUrl?: string } | null> => {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
    const metadata = await pdf.getMetadata();
    const info = metadata.info as any;

    // Render first page as cover thumbnail
    let coverDataUrl: string | undefined;
    try {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        coverDataUrl = canvas.toDataURL('image/jpeg', 0.7);
      }
    } catch {
      // Cover extraction is optional
    }

    return {
      title: info?.Title || '',
      author: info?.Author || 'Unknown',
      coverDataUrl,
    };
  } catch (err) {
    console.error('PDF metadata extraction failed:', err);
    return null;
  }
};

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

export const extractMobiMetadata = async (
  arrayBuffer: ArrayBuffer,
  fileName: string
): Promise<{ title: string; author: string; coverDataUrl?: string } | null> => {
  try {
    const { makeBook } = await import('../libs/foliate-js/view');
    // MOBI/AZW3 files use the MIME type application/x-mobipocket-ebook
    const file = new File([arrayBuffer], fileName, { type: 'application/x-mobipocket-ebook' });

    let book;
    try {
      book = await withTimeout(makeBook(file), 8000);
    } catch (err) {
      console.warn('foliate-js makeBook failed for MOBI/AZW3, using fallback metadata:', err);
      return null;
    }
    if (!book) return null;

    // Extract title — may be a string or a language map
    const rawTitle = book.metadata?.title;
    const title =
      typeof rawTitle === 'string'
        ? rawTitle
        : rawTitle && typeof rawTitle === 'object'
          ? (Object.values(rawTitle)[0] ?? '')
          : '';

    // Extract author — may be a string, object, or array
    const rawAuthor = book.metadata?.author;
    let author = '';
    if (typeof rawAuthor === 'string') {
      author = rawAuthor;
    } else if (Array.isArray(rawAuthor)) {
      author = rawAuthor
        .map((a: any) =>
          typeof a === 'string'
            ? a
            : typeof a?.name === 'string'
              ? a.name
              : (Object.values(a?.name ?? {})[0] ?? '')
        )
        .filter(Boolean)
        .join(', ');
    } else if (rawAuthor && typeof rawAuthor === 'object' && 'name' in rawAuthor) {
      const name = (rawAuthor as any).name;
      author = typeof name === 'string' ? name : ((Object.values(name ?? {})[0] as string) ?? '');
    }

    let coverDataUrl: string | undefined;
    try {
      if (book.getCover) {
        const coverBlob = await withTimeout(book.getCover(), 5000);
        if (coverBlob) {
          coverDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(coverBlob as Blob);
          });
        }
      }
    } catch {
      // Cover extraction is optional
    }

    if (book.destroy) book.destroy();

    return {
      title: title || '',
      author: author || 'Unknown',
      coverDataUrl,
    };
  } catch (err) {
    console.error('MOBI/AZW3 metadata extraction failed:', err);
    return null;
  }
};

export const extractComicMetadata = async (
  arrayBuffer: ArrayBuffer,
  format: 'cbz' | 'cbr'
): Promise<{ title: string; author: string; coverDataUrl?: string } | null> => {
  try {
    // Extract cover from comic archive
    const coverDataUrl = await comicService.extractComicCover(arrayBuffer, format);
    const pageCount = await comicService.getComicPageCount(arrayBuffer, format);

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
