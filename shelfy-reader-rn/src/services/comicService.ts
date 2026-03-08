/**
 * Comic Service — handles CBZ and CBR comic archive operations.
 *
 * React Native version:
 * - Uses JSZip for CBZ (ZIP) extraction
 * - CBR (RAR) support is stubbed — unrar.js is browser-only
 * - Uses expo-file-system (File, Directory, Paths) for temp storage
 * - Returns base64 data URIs instead of Blob URLs
 *
 * Provides utilities to:
 * - Extract images from CBZ (ZIP) archives
 * - Extract images from CBR (RAR) archives (stub — TODO)
 * - Generate cover thumbnails from comic archives
 * - Get page count for progress tracking
 */

import JSZip from 'jszip';
import { File, Directory, Paths } from 'expo-file-system';

// Image file extensions to extract from comic archives
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.jxl', '.avif'];

/** Natural sort comparator for filenames with numbers (e.g., page-1.jpg, page-2.jpg, page-10.jpg) */
function naturalSort(a: string, b: string): number {
  const numA = parseInt(a.replace(/\D+/g, ''), 10) || 0;
  const numB = parseInt(b.replace(/\D+/g, ''), 10) || 0;
  if (numA !== numB) return numA - numB;
  return a.localeCompare(b);
}

/** Get MIME type based on file extension. */
function getMimeType(ext: string): string {
  const extLower = ext.toLowerCase();
  switch (extLower) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'bmp':
      return 'image/bmp';
    case 'jxl':
      return 'image/jxl';
    case 'avif':
      return 'image/avif';
    default:
      return 'image/jpeg';
  }
}

/** Comic page image — base64 data URI and filename */
export interface ComicPageImage {
  /** Base64 data URI (e.g., data:image/jpeg;base64,...) */
  dataUri: string;
  filename: string;
}

/**
 * Extract image files from a CBZ (ZIP) archive.
 * Returns an array of sorted image data URIs with their filenames.
 */
export async function extractCbzImages(
  arrayBuffer: ArrayBuffer
): Promise<ComicPageImage[]> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const images: ComicPageImage[] = [];

    // Iterate through all files in the ZIP
    const fileNames = Object.keys(zip.files);
    const imageFileNames = fileNames.filter((name) => {
      const ext = name.toLowerCase().split('.').pop();
      return ext && IMAGE_EXTENSIONS.includes(`.${ext}`);
    });

    // Sort filenames naturally for proper page order
    imageFileNames.sort(naturalSort);

    // Extract each image as base64 data URI
    for (const filename of imageFileNames) {
      const file = zip.files[filename];
      if (!file.dir) {
        const base64 = await file.async('base64');
        const ext = filename.toLowerCase().split('.').pop() || 'jpg';
        const mimeType = getMimeType(ext);
        images.push({
          dataUri: `data:${mimeType};base64,${base64}`,
          filename,
        });
      }
    }

    return images;
  } catch (error) {
    console.error('Error extracting CBZ images:', error);
    throw new Error('Failed to extract images from CBZ archive');
  }
}

/**
 * Extract image files from a CBR (RAR) archive.
 *
 * TODO: unrar.js is browser-only and does not work in React Native.
 * A native RAR extraction library (e.g., react-native-unrar) would be
 * needed for full CBR support. For now this throws an error.
 */
export async function extractCbrImages(
  _arrayBuffer: ArrayBuffer
): Promise<ComicPageImage[]> {
  // TODO: Implement CBR extraction with a React Native compatible RAR library
  console.warn('CBR extraction is not yet supported in React Native');
  throw new Error(
    'CBR format is not yet supported in React Native. Convert to CBZ first.'
  );
}

/**
 * Convert a CBR archive to CBZ format.
 *
 * TODO: Requires CBR extraction support — see extractCbrImages.
 */
export async function convertCbrToCbz(_arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  // TODO: Implement when CBR extraction is available
  throw new Error('CBR to CBZ conversion is not yet supported in React Native');
}

/**
 * Extract the first image from a comic archive as a cover thumbnail.
 * Works for CBZ format; CBR will return null until supported.
 */
export async function extractComicCover(
  arrayBuffer: ArrayBuffer,
  format: 'cbz' | 'cbr'
): Promise<string | null> {
  try {
    if (format === 'cbr') {
      console.warn('CBR cover extraction not supported in RN');
      return null;
    }

    const images = await extractCbzImages(arrayBuffer);
    if (images.length === 0) {
      return null;
    }

    // Return the first image data URI as the cover
    return images[0].dataUri;
  } catch (error) {
    console.error('Error extracting comic cover:', error);
    return null;
  }
}

/**
 * Get the page count of a comic archive.
 */
export async function getComicPageCount(
  arrayBuffer: ArrayBuffer,
  format: 'cbz' | 'cbr'
): Promise<number> {
  try {
    if (format === 'cbr') {
      // CBR not supported yet — return 0
      return 0;
    }

    // For CBZ, count image files without fully extracting them
    const zip = await JSZip.loadAsync(arrayBuffer);
    const fileNames = Object.keys(zip.files);
    const imageFileNames = fileNames.filter((name) => {
      const ext = name.toLowerCase().split('.').pop();
      return ext && IMAGE_EXTENSIONS.includes(`.${ext}`) && !zip.files[name].dir;
    });
    return imageFileNames.length;
  } catch (error) {
    console.error('Error getting comic page count:', error);
    return 0;
  }
}

/**
 * Extract a single page from a comic archive by index.
 * More memory-efficient than extracting all pages.
 */
export async function extractComicPage(
  arrayBuffer: ArrayBuffer,
  pageIndex: number,
  format: 'cbz' | 'cbr'
): Promise<ComicPageImage | null> {
  try {
    if (format === 'cbr') {
      return null;
    }

    const zip = await JSZip.loadAsync(arrayBuffer);
    const fileNames = Object.keys(zip.files);
    const imageFileNames = fileNames
      .filter((name) => {
        const ext = name.toLowerCase().split('.').pop();
        return ext && IMAGE_EXTENSIONS.includes(`.${ext}`) && !zip.files[name].dir;
      })
      .sort(naturalSort);

    if (pageIndex < 0 || pageIndex >= imageFileNames.length) {
      return null;
    }

    const filename = imageFileNames[pageIndex];
    const file = zip.files[filename];
    const base64 = await file.async('base64');
    const ext = filename.toLowerCase().split('.').pop() || 'jpg';
    const mimeType = getMimeType(ext);

    return {
      dataUri: `data:${mimeType};base64,${base64}`,
      filename,
    };
  } catch (error) {
    console.error('Error extracting comic page:', error);
    return null;
  }
}

/**
 * Save extracted comic pages to the filesystem for caching.
 * Returns array of file URIs.
 */
export async function cacheComicPages(
  arrayBuffer: ArrayBuffer,
  bookId: string,
  format: 'cbz' | 'cbr'
): Promise<string[]> {
  try {
    if (format === 'cbr') {
      return [];
    }

    const cacheDir = new Directory(Paths.cache, 'comics', bookId);
    if (!cacheDir.exists) {
      cacheDir.create({ intermediates: true });
    }

    const zip = await JSZip.loadAsync(arrayBuffer);
    const fileNames = Object.keys(zip.files);
    const imageFileNames = fileNames
      .filter((name) => {
        const ext = name.toLowerCase().split('.').pop();
        return ext && IMAGE_EXTENSIONS.includes(`.${ext}`) && !zip.files[name].dir;
      })
      .sort(naturalSort);

    const uris: string[] = [];

    for (let i = 0; i < imageFileNames.length; i++) {
      const filename = imageFileNames[i];
      const zipFile = zip.files[filename];
      const ext = filename.toLowerCase().split('.').pop() || 'jpg';
      const paddedIndex = String(i).padStart(4, '0');
      const outputName = `page-${paddedIndex}.${ext}`;

      const uint8 = await zipFile.async('uint8array');
      const outFile = new File(cacheDir, outputName);
      outFile.write(uint8);
      uris.push(outFile.uri);
    }

    return uris;
  } catch (error) {
    console.error('Error caching comic pages:', error);
    return [];
  }
}

/**
 * Verify if a file appears to be a valid comic archive.
 */
export async function isValidComicArchive(
  arrayBuffer: ArrayBuffer,
  format: 'cbz' | 'cbr'
): Promise<boolean> {
  try {
    const pageCount = await getComicPageCount(arrayBuffer, format);
    return pageCount > 0;
  } catch {
    return false;
  }
}

// Singleton service export
export const comicService = {
  extractCbzImages,
  extractCbrImages,
  convertCbrToCbz,
  extractComicCover,
  extractComicPage,
  getComicPageCount,
  cacheComicPages,
  isValidComicArchive,
};
