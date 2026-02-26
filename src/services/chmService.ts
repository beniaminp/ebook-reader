/**
 * CHM (Compiled HTML Help) Service
 *
 * WARNING: CHM format support is currently limited.
 *
 * The CHM format is a proprietary Microsoft format that uses the ITSS (InfoTech
 * Storage System) for compression and storage. There is no reliable pure JavaScript
 * library available for parsing CHM files in the browser environment.
 *
 * Available options:
 * 1. Native bindings to CHMLib (C library) - requires Node.js native addons
 * 2. Server-side conversion - requires backend service
 * 3. Pre-converted content - user must convert CHM to another format
 *
 * Current implementation provides placeholder functions for future implementation
 * when a suitable JavaScript library becomes available.
 *
 * For now, CHM files should be converted to HTML, EPUB, or PDF format before importing.
 *
 * Alternative approaches that could be explored:
 * - Create a Node.js native addon using CHMLib
 * - Use WebAssembly with CHMLib compiled to WASM
 * - Implement a basic ITS/CHM parser in JavaScript (complex undertaking)
 */

export interface ChmMetadata {
  title: string;
  author?: string;
  language?: string;
  description?: string;
}

export interface ChmParsedContent {
  html: string;
  metadata: ChmMetadata;
  toc: Array<{ id: string; label: string; level: number }>;
}

/**
 * CHM Service Class
 *
 * Placeholder implementation with documentation of limitations.
 */
class ChmService {
  /**
   * Check if CHM format is supported
   *
   * Currently returns false as there is no reliable JS library for CHM parsing.
   */
  isSupported(): boolean {
    return false;
  }

  /**
   * Get unsupported reason message
   */
  getUnsupportedReason(): string {
    return 'CHM format is not currently supported. Please convert your CHM files to HTML, EPUB, or PDF format before importing. Tools like Calibre can perform this conversion.';
  }

  /**
   * Placeholder: Extract CHM metadata
   *
   * @throws {Error} Always throws an error indicating CHM is not supported
   */
  extractChmMetadata(_arrayBuffer: ArrayBuffer): ChmMetadata {
    throw new Error(this.getUnsupportedReason());
  }

  /**
   * Placeholder: Extract CHM content
   *
   * @throws {Error} Always throws an error indicating CHM is not supported
   */
  async extractChmContent(_arrayBuffer: ArrayBuffer): Promise<ChmParsedContent> {
    throw new Error(this.getUnsupportedReason());
  }

  /**
   * Placeholder: Validate CHM file
   *
   * @throws {Error} Always throws an error indicating CHM is not supported
   */
  isValidChm(_arrayBuffer: ArrayBuffer): boolean {
    return false;
  }

  /**
   * Parse CHM file structure
   *
   * Future implementation would:
   * 1. Parse CHM header (ITSF format)
   * 2. Extract file listing from directory
   * 3. Parse HTML content files
   * 4. Build TOC from .hhc file
   * 5. Concatenate content in reading order
   *
   * @throws {Error} Always throws an error indicating CHM is not supported
   */
  async parseChm(_arrayBuffer: ArrayBuffer): Promise<ChmParsedContent> {
    throw new Error(this.getUnsupportedReason());
  }

  /**
   * Get suggested conversion tools for CHM files
   */
  getConversionTools(): Array<{ name: string; url: string; description: string }> {
    return [
      {
        name: 'Calibre',
        url: 'https://calibre-ebook.com/',
        description:
          'Free and open source ebook library management application that can convert CHM to EPUB/PDF',
      },
      {
        name: 'Online-Convert',
        url: 'https://www.online-convert.com/file-format/chm-to-epub',
        description: 'Online tool for converting CHM to EPUB',
      },
      {
        name: 'chm2pdf',
        url: 'https://github.com/theunknownkevin/chm2pdf',
        description: 'Command-line tool for converting CHM to PDF',
      },
    ];
  }
}

// Export singleton instance
export const chmService = new ChmService();
