/**
 * Type declarations for unrar.js
 */

declare module 'unrar.js' {
  export interface UnrarFileHeader {
    name: string;
    size: number;
    compressedSize: number;
    crc?: number;
  }

  export interface UnrarExtraction {
    fileHeader?: UnrarFileHeader;
    extraction?: Uint8Array;
  }

  export interface UnrarResult {
    files?: UnrarExtraction[];
  }

  export interface UnrarExtractor {
    extract(): UnrarResult;
  }

  export function createExtractorFromData(data: Uint8Array): UnrarExtractor;
}
