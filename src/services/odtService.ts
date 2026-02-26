/**
 * ODT (OpenDocument Text) service
 * Handles conversion of ODT files to HTML and metadata extraction
 * ODT files are ZIP archives containing XML files
 */

import * as JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

interface OdtMetadata {
  title?: string;
  author?: string;
}

/**
 * Convert ODT file content to HTML
 * @param arrayBuffer - The ODT file as ArrayBuffer
 * @returns HTML string representation of the ODT content
 */
export async function convertOdtToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Load ODT as ZIP file
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Extract content.xml which contains the document content
    const contentXmlFile = zip.file('content.xml');
    if (!contentXmlFile) {
      throw new Error('Invalid ODT file: missing content.xml');
    }

    const contentXml = await contentXmlFile.async('string');

    // Parse XML with fast-xml-parser
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true,
      cdataPropName: '__cdata', // Keep CDATA sections
    });

    const parsedXml = parser.parse(contentXml);

    // Navigate to the actual content in office:body/office:text
    const body = parsedXml['office:document-content']?.['office:body'];
    if (!body) {
      throw new Error('Invalid ODT file: missing office:body element');
    }

    const textContent = body['office:text'];
    if (!textContent) {
      throw new Error('Invalid ODT file: missing office:text element');
    }

    // Build HTML from ODT elements
    const htmlParts: string[] = [];
    htmlParts.push('<div class="odt-content">');

    // Process paragraphs, headings, spans, lists, and tables
    processOdtContent(textContent, htmlParts);

    htmlParts.push('</div>');

    return htmlParts.join('\n');
  } catch (error) {
    throw new Error(
      `Failed to convert ODT to HTML: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Recursively process ODT content and convert to HTML
 */
function processOdtContent(content: Record<string, unknown>, htmlParts: string[]): void {
  if (!content || typeof content !== 'object') {
    return;
  }

  // Get all text:p elements (paragraphs)
  const paragraphs = ensureArray(content['text:p']);

  for (const paragraph of paragraphs) {
    if (!paragraph) continue;

    // Extract text content with formatting
    const textContent = extractTextContent(paragraph);
    if (textContent) {
      htmlParts.push(`<p>${textContent}</p>`);
    }
  }

  // Process headings (text:h)
  const headings = ensureArray(content['text:h']);
  for (const heading of headings) {
    if (!heading) continue;

    const level = heading['@_text:outline-level'] || '1';
    const textContent = extractTextContent(heading);
    if (textContent) {
      htmlParts.push(
        `<h${Math.min(parseInt(level, 10), 6)}>${textContent}</h${Math.min(parseInt(level, 10), 6)}>`
      );
    }
  }

  // Process lists (text:list)
  const lists = ensureArray(content['text:list']);
  for (const list of lists) {
    if (!list) continue;

    htmlParts.push('<ul>');
    const listItems = ensureArray(list['text:list-item']);
    for (const listItem of listItems) {
      if (!listItem) continue;

      const itemText = extractTextContent(listItem);
      htmlParts.push(`<li>${itemText || ''}</li>`);

      // Handle nested lists
      if (listItem['text:list']) {
        processOdtContent(listItem, htmlParts);
      }
    }
    htmlParts.push('</ul>');
  }

  // Process tables (table:table)
  const tables = ensureArray(content['table:table']);
  for (const table of tables) {
    if (!table) continue;

    htmlParts.push('<table border="1" class="odt-table">');

    const rows = ensureArray(table['table:table-row']);
    for (const row of rows) {
      if (!row) continue;

      htmlParts.push('<tr>');
      const cells = ensureArray(row['table:table-cell']);
      for (const cell of cells) {
        if (!cell) continue;

        const cellText = extractTextContent(cell);
        htmlParts.push(`<td>${cellText || ''}</td>`);
      }
      htmlParts.push('</tr>');
    }

    htmlParts.push('</table>');
  }
}

/**
 * Extract text content from an ODT element, preserving spans and formatting
 */
function extractTextContent(element: Record<string, unknown>): string {
  if (!element || typeof element !== 'object') {
    return element ? String(element).trim() : '';
  }

  // Direct text content
  if (element['#text']) {
    return escapeHtml(element['#text']);
  }

  // Process text:span elements (inline formatting)
  const spans = ensureArray(element['text:span']);
  if (spans.length > 0) {
    return spans
      .map((span: Record<string, unknown>) => {
        if (!span) return '';

        // Check for formatting attributes
        const styleAttrs: string[] = [];
        if (span['@_text:style-name']) {
          // Could map style names to actual CSS here
          styleAttrs.push('font-style: italic;');
        }

        const spanContent = span['#text'] || extractTextContent(span);
        const styleAttr = styleAttrs.length > 0 ? ` style="${styleAttrs.join(' ')}"` : '';

        return `<span${styleAttr}>${escapeHtml(String(spanContent))}</span>`;
      })
      .join('');
  }

  // Process nested text:p elements (e.g., in list items)
  const nestedParagraphs = ensureArray(element['text:p']);
  if (nestedParagraphs.length > 0) {
    return nestedParagraphs
      .map((p: Record<string, unknown>) => extractTextContent(p))
      .filter(Boolean)
      .join(' ');
  }

  // Check for text:a (links/anchors)
  const links = ensureArray(element['text:a']);
  if (links.length > 0) {
    return links
      .map((link: Record<string, unknown>) => {
        const href = link['@_xlink:href'] || link['@_office:href'] || '#';
        const linkText = link['#text'] || extractTextContent(link);
        return `<a href="${escapeHtml(String(href))}">${escapeHtml(String(linkText))}</a>`;
      })
      .join('');
  }

  // Tab stops
  const tabs = ensureArray(element['text:tab']);
  if (tabs.length > 0) {
    return '&nbsp;&nbsp;&nbsp;&nbsp;';
  }

  // Line breaks
  const breaks = ensureArray(element['text:line-break']);
  if (breaks.length > 0) {
    return '<br>';
  }

  return '';
}

/**
 * Extract metadata from ODT file
 * @param arrayBuffer - The ODT file as ArrayBuffer
 * @returns Metadata object with title and author
 */
export async function extractOdtMetadata(arrayBuffer: ArrayBuffer): Promise<OdtMetadata> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Extract meta.xml which contains document metadata
    const metaXmlFile = zip.file('meta.xml');
    if (!metaXmlFile) {
      return {};
    }

    const metaXml = await metaXmlFile.async('string');

    // Parse XML with fast-xml-parser
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true,
    });

    const parsedXml = parser.parse(metaXml);

    // Navigate to office:meta
    const meta = parsedXml['office:document-meta']?.['office:meta'];
    if (!meta) {
      return {};
    }

    // Extract title (dc:title)
    const title = meta['dc:title']?.['#text'] || meta['dc:title'];

    // Extract author (dc:creator - initial creator)
    const author =
      meta['dc:creator']?.['#text'] ||
      meta['dc:creator'] ||
      meta['meta:initial-creator']?.['#text'] ||
      meta['meta:initial-creator'];

    return {
      title: title ? String(title).trim() : undefined,
      author: author ? String(author).trim() : undefined,
    };
  } catch (error) {
    console.error('Failed to extract ODT metadata:', error);
    return {};
  }
}

/**
 * Helper to ensure we have an array
 */
function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Export as singleton
export const odtService = {
  convertOdtToHtml,
  extractOdtMetadata,
};
