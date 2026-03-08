/**
 * DOCX Service
 *
 * Handles parsing of DOCX (Microsoft Word) format documents.
 * Uses mammoth.js for DOCX to HTML conversion and JSZip + fast-xml-parser
 * for metadata extraction from docProps/core.xml.
 *
 * React Native version:
 * - mammoth.js convertToHtml may have limited support in RN (no DOM);
 *   falls back to raw XML text extraction if mammoth fails
 * - Uses JSZip + fast-xml-parser for metadata (same as Ionic)
 * - Same export interface for drop-in compatibility
 */

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

// DOCX metadata types
export interface DocxMetadata {
  title?: string;
  author?: string;
}

/**
 * DOCX Service
 */
class DocxService {
  private parser: XMLParser;

  constructor() {
    // Configure XML parser for DOCX metadata
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      ignoreDeclaration: true,
      ignorePiTags: true,
      trimValues: true,
      parseTagValue: true,
      parseAttributeValue: true,
      removeNSPrefix: true,
    });
  }

  /**
   * Convert DOCX to HTML using mammoth.js
   * @param arrayBuffer - The DOCX file data as ArrayBuffer
   * @returns HTML string representation of the document
   */
  async convertDocxToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
      // Try mammoth.js first (works in RN if no DOM manipulation is needed)
      const mammoth = await import('mammoth');
      const result = await mammoth.convertToHtml({ arrayBuffer });
      return result.value;
    } catch (mammothError) {
      console.warn('mammoth.js conversion failed, falling back to XML extraction:', mammothError);
      // Fallback: manually extract text from document.xml inside the DOCX ZIP
      return this.extractDocxTextAsHtml(arrayBuffer);
    }
  }

  /**
   * Fallback: Extract text content from DOCX as simple HTML.
   * Parses word/document.xml directly via fast-xml-parser.
   */
  private async extractDocxTextAsHtml(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
      const zip = await JSZip.loadAsync(arrayBuffer);

      const docXmlFile = zip.file('word/document.xml');
      if (!docXmlFile) {
        throw new Error('Invalid DOCX file: missing word/document.xml');
      }

      const docXml = await docXmlFile.async('string');
      const parsed = this.parser.parse(docXml);

      // Navigate to w:body
      const body =
        parsed['w:document']?.['w:body'] ||
        parsed['document']?.['body'] ||
        parsed;

      const htmlParts: string[] = ['<div class="docx-content">'];

      // Extract paragraphs (w:p)
      const paragraphs = this.ensureArray(body['w:p'] || body['p']);
      for (const para of paragraphs) {
        if (!para || typeof para !== 'object') continue;

        const text = this.extractParagraphText(para);
        if (text) {
          htmlParts.push(`<p>${this.escapeHtml(text)}</p>`);
        }
      }

      htmlParts.push('</div>');
      return htmlParts.join('\n');
    } catch (error) {
      console.error('DOCX XML fallback extraction failed:', error);
      throw new Error(
        `Failed to convert DOCX to HTML: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract text from a w:p (paragraph) element
   */
  private extractParagraphText(para: any): string {
    if (!para || typeof para !== 'object') return '';

    // Get w:r (runs) which contain the actual text
    const runs = this.ensureArray(para['w:r'] || para['r']);
    const textParts: string[] = [];

    for (const run of runs) {
      if (!run || typeof run !== 'object') continue;

      // w:t contains the text
      const t = run['w:t'] || run['t'];
      if (typeof t === 'string') {
        textParts.push(t);
      } else if (t && typeof t === 'object') {
        const text = t['#text'];
        if (typeof text === 'string') {
          textParts.push(text);
        }
      }
    }

    return textParts.join('');
  }

  /**
   * Extract metadata from DOCX file
   * DOCX files are ZIP archives containing docProps/core.xml with metadata
   * @param arrayBuffer - The DOCX file data as ArrayBuffer
   * @returns Metadata object with title and author
   */
  async extractDocxMetadata(arrayBuffer: ArrayBuffer): Promise<DocxMetadata> {
    try {
      // Load DOCX as ZIP file
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Try to read docProps/core.xml
      const coreXmlPath = 'docProps/core.xml';
      const coreXmlFile = zip.file(coreXmlPath);

      if (!coreXmlFile) {
        console.warn('DOCX metadata: docProps/core.xml not found');
        return {};
      }

      const coreXmlContent = await coreXmlFile.async('string');
      const parsed = this.parser.parse(coreXmlContent);

      // Extract metadata from core properties
      // The XML structure uses cp:coreProperties namespace
      const coreProps = parsed['coreProperties'] || parsed;

      const title = this.extractTextValue(coreProps['title'] || coreProps['dc:title']);
      const author = this.extractTextValue(coreProps['creator'] || coreProps['dc:creator']);

      return {
        title: title || undefined,
        author: author || undefined,
      };
    } catch (error) {
      console.error('DOCX metadata extraction failed:', error);
      // Return empty object on failure - don't block import
      return {};
    }
  }

  /**
   * Extract text value from XML node (handles various formats)
   */
  private extractTextValue(node: any): string | null {
    if (!node) return null;

    // If it's already a string
    if (typeof node === 'string') {
      return node.trim();
    }

    // If it has a text node
    if (node['#text'] && typeof node['#text'] === 'string') {
      return node['#text'].trim();
    }

    return null;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Helper to ensure we have an array
   */
  private ensureArray<T>(value: T | T[] | undefined | null): T[] {
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [value];
  }
}

// Export singleton instance
export const docxService = new DocxService();
