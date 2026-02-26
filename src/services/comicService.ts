/**
 * comicService — handles CBZ and CBR comic archive operations.
 *
 * Provides utilities to:
 * - Extract images from CBZ (ZIP) archives
 * - Extract images from CBR (RAR) archives and convert to CBZ
 * - Generate cover thumbnails from comic archives
 * - Get page count for progress tracking
 */

import JSZip from 'jszip';

// Image file extensions to extract from comic archives
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.jxl', '.avif'];

/** Natural sort comparator for filenames with numbers (e.g., page-1.jpg, page-2.jpg, page-10.jpg) */
function naturalSort(a: string, b: string): number {
  const numA = parseInt(a.replace(/\D+/g, ''), 10) || 0;
  const numB = parseInt(b.replace(/\D+/g, ''), 10) || 0;
  if (numA !== numB) return numA - numB;
  return a.localeCompare(b);
}

/**
 * Extract image files from a CBZ (ZIP) archive.
 * Returns an array of sorted image blobs with their filenames.
 */
export async function extractCbzImages(
  arrayBuffer: ArrayBuffer
): Promise<{ blob: Blob; filename: string }[]> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const images: { blob: Blob; filename: string }[] = [];

    // Iterate through all files in the ZIP
    const fileNames = Object.keys(zip.files);
    const imageFileNames = fileNames.filter((name) => {
      const ext = name.toLowerCase().split('.').pop();
      return ext && IMAGE_EXTENSIONS.includes(`.${ext}`);
    });

    // Sort filenames naturally for proper page order
    imageFileNames.sort(naturalSort);

    // Extract each image
    for (const filename of imageFileNames) {
      const file = zip.files[filename];
      if (!file.dir) {
        const blob = await file.async('blob');
        images.push({ blob, filename });
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
 * Uses unrar.js to extract files.
 * Returns an array of sorted image blobs with their filenames.
 */
export async function extractCbrImages(
  arrayBuffer: ArrayBuffer
): Promise<{ blob: Blob; filename: string }[]> {
  try {
    // Import unrar.js dynamically
    const { createExtractorFromData } = await import('unrar.js');

    // Create a Uint8Array from the ArrayBuffer
    const uint8Array = new Uint8Array(arrayBuffer);

    // Extract the RAR archive
    const extractor = createExtractorFromData(uint8Array);
    const extracted = extractor.extract();

    const images: { blob: Blob; filename: string }[] = [];
    const imageFiles: { name: string; blob: Blob }[] = [];

    // Process extracted files
    if (extracted.files) {
      for (const file of extracted.files) {
        if (file.fileHeader && file.fileHeader.name) {
          const filename = file.fileHeader.name;
          const ext = filename.toLowerCase().split('.').pop();

          if (ext && IMAGE_EXTENSIONS.includes(`.${ext}`)) {
            // Extract file data
            if (file.extraction) {
              const fileData = file.extraction;
              // Convert Uint8Array to ArrayBuffer for Blob constructor
              const arrayBuffer = fileData.buffer.slice(
                fileData.byteOffset,
                fileData.byteOffset + fileData.byteLength
              ) as ArrayBuffer;
              const blob = new Blob([arrayBuffer], { type: getMimeType(ext) });
              imageFiles.push({ name: filename, blob });
            }
          }
        }
      }
    }

    // Sort filenames naturally
    imageFiles.sort((a, b) => naturalSort(a.name, b.name));

    // Convert to output format
    for (const { name, blob } of imageFiles) {
      images.push({ blob, filename: name });
    }

    return images;
  } catch (error) {
    console.error('Error extracting CBR images:', error);
    throw new Error(
      'Failed to extract images from CBR archive. unrar.js may not be available in this environment.'
    );
  }
}

/**
 * Convert a CBR archive to CBZ format.
 * Extracts images from RAR and repackages them as a ZIP archive.
 */
export async function convertCbrToCbz(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  try {
    // Extract images from CBR
    const images = await extractCbrImages(arrayBuffer);

    if (images.length === 0) {
      throw new Error('No images found in CBR archive');
    }

    // Create a new ZIP archive
    const zip = new JSZip();

    // Add all images to the ZIP with sanitized names
    for (let i = 0; i < images.length; i++) {
      const { blob, filename } = images[i];
      // Use zero-padded numbers for consistent ordering
      const ext = filename.toLowerCase().split('.').pop() || 'jpg';
      const sanitizedName = `page-${String(i + 1).padStart(4, '0')}.${ext}`;
      zip.file(sanitizedName, blob);
    }

    // Generate the ZIP blob
    const zipBlob = await zip.generateAsync({ type: 'arraybuffer' });

    return zipBlob as ArrayBuffer;
  } catch (error) {
    console.error('Error converting CBR to CBZ:', error);
    throw new Error('Failed to convert CBR to CBZ format');
  }
}

/**
 * Extract the first image from a comic archive as a cover thumbnail.
 * Works for both CBZ and CBR formats.
 */
export async function extractComicCover(
  arrayBuffer: ArrayBuffer,
  format: 'cbz' | 'cbr'
): Promise<string | null> {
  try {
    let images: { blob: Blob; filename: string }[];

    if (format === 'cbz') {
      images = await extractCbzImages(arrayBuffer);
    } else {
      images = await extractCbrImages(arrayBuffer);
    }

    if (images.length === 0) {
      return null;
    }

    // Get the first image as a data URL
    const firstImage = images[0].blob;
    const dataUrl = await blobToDataUrl(firstImage);

    return dataUrl;
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
    if (format === 'cbz') {
      const images = await extractCbzImages(arrayBuffer);
      return images.length;
    } else {
      const images = await extractCbrImages(arrayBuffer);
      return images.length;
    }
  } catch (error) {
    console.error('Error getting comic page count:', error);
    return 0;
  }
}

/**
 * Helper function to convert a Blob to a data URL.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Get MIME type based on file extension.
 */
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
  getComicPageCount,
  isValidComicArchive,
};
