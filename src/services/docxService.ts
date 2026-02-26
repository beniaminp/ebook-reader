/**
 * DOCX Service
 *
 * Handles parsing of DOCX (Microsoft Word) format documents.
 * Uses mammoth.js for DOCX to HTML conversion and JSZip + fast-xml-parser
 * for metadata extraction from docProps/core.xml.
 */

import * as JSZip from 'jszip';
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
      // Dynamically import mammoth to avoid bundle issues
      const mammoth = await import('mammoth');
      const result = await mammoth.convertToHtml({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error('DOCX to HTML conversion failed:', error);
      throw new Error(
        `Failed to convert DOCX to HTML: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
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
      const coreProps = parsed['cp:coreProperties'] || parsed;

      const title = this.extractTextValue(coreProps['dc:title'] || coreProps.title);
      const author = this.extractTextValue(coreProps['dc:creator'] || coreProps.creator);

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
}

// Export singleton instance
export const docxService = new DocxService();
