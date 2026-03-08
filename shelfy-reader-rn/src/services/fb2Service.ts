/**
 * FB2 (FictionBook) Service
 *
 * Handles parsing of FB2 XML format ebooks using fast-xml-parser.
 * Converts FB2 content to HTML for rendering in a WebView.
 *
 * React Native version:
 * - No DOM dependencies (escapeHtml uses manual replacement instead of
 *   document.createElement)
 * - Same fast-xml-parser parsing as the Ionic version
 * - Same export interface for drop-in compatibility
 */

import { XMLParser } from 'fast-xml-parser';

// FB2 metadata types
export interface Fb2Metadata {
  title: string;
  author: string;
  genre?: string[];
  language?: string;
  coverBase64?: string;
  description?: string;
  publisher?: string;
  publishDate?: string;
  isbn?: string;
}

// TOC entry for chapters
export interface Fb2TocEntry {
  id: string;
  label: string;
  level: number;
}

// Parsed FB2 content
export interface Fb2ParsedContent {
  html: string;
  metadata: Fb2Metadata;
  toc: Fb2TocEntry[];
}

// Parser options for fast-xml-parser
const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  ignoreDeclaration: true,
  ignorePiTags: true,
  trimValues: true,
  parseTagValue: true,
  parseAttributeValue: true,
  cdataProp: '#text',
  removeNSPrefix: true,
  isArray: (name: string) => {
    return ['p', 'image', 'section', 'author', 'genre', 'translator', 'stanza', 'v'].includes(name);
  },
};

/**
 * FB2 Service Class
 */
class Fb2Service {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser(parserOptions);
  }

  /**
   * Parse FB2 metadata from XML content
   */
  extractFb2Metadata(xmlContent: string): Fb2Metadata {
    try {
      const parsed = this.parser.parse(xmlContent);
      const fb2Description = parsed.FictionBook?.description;

      // Handle title-info as both array and object
      const titleInfoRaw = fb2Description?.['title-info'] || fb2Description?.titleInfo;
      const titleInfo = Array.isArray(titleInfoRaw) ? titleInfoRaw[0] : titleInfoRaw;

      // Handle publish-info as both array and object
      const publishInfoRaw = fb2Description?.['publish-info'] || fb2Description?.publishInfo;
      const publishInfo = Array.isArray(publishInfoRaw) ? publishInfoRaw[0] : publishInfoRaw;

      // Extract title
      let title = 'Unknown Title';
      const bookTitle = titleInfo?.['book-title'] || titleInfo?.bookTitle;
      if (typeof bookTitle === 'string') {
        title = bookTitle;
      } else if (bookTitle?.['#text']) {
        title = bookTitle['#text'];
      }

      // Extract author(s)
      let author = 'Unknown Author';
      const authors = titleInfo?.author || [];
      const authorArray = Array.isArray(authors) ? authors : [authors];

      const authorNames = authorArray
        .map((auth: any) => {
          const firstName = auth?.['first-name'] || auth?.firstName || '';
          const middleName = auth?.['middle-name'] || auth?.middleName || '';
          const lastName = auth?.['last-name'] || auth?.lastName || '';
          const parts = [firstName, middleName, lastName].filter(Boolean);
          return parts.length > 0 ? parts.join(' ') : null;
        })
        .filter(Boolean);

      if (authorNames.length > 0) {
        author = authorNames.join(', ');
      }

      // Extract genres
      let genres: string[] | undefined;
      const genreNodes = titleInfo?.genre || [];
      if (Array.isArray(genreNodes)) {
        genres = genreNodes
          .map((g: any) => (typeof g === 'string' ? g : g?.['#text']))
          .filter(Boolean);
      } else if (genreNodes) {
        genres = [typeof genreNodes === 'string' ? genreNodes : genreNodes?.['#text']].filter(
          Boolean
        );
      }

      // Extract language
      let language: string | undefined;
      const langNode = titleInfo?.lang || titleInfo?.language;
      if (typeof langNode === 'string') {
        language = langNode;
      } else if (langNode?.['#text']) {
        language = langNode['#text'];
      }

      // Extract description (book annotation)
      let bookDescription: string | undefined;
      const annotation = titleInfo?.annotation;
      if (annotation) {
        if (typeof annotation === 'string') {
          bookDescription = annotation;
        } else if (annotation?.p) {
          const paragraphs = Array.isArray(annotation.p) ? annotation.p : [annotation.p];
          bookDescription = paragraphs
            .map((p: any) => (typeof p === 'string' ? p : p?.['#text'] || ''))
            .join('\n\n');
        }
      }

      // Extract publisher info
      let publisher: string | undefined;
      const pubNode = publishInfo?.publisher;
      if (typeof pubNode === 'string') {
        publisher = pubNode;
      } else if (pubNode?.['#text']) {
        publisher = pubNode['#text'];
      }

      // Extract publish date
      let publishDate: string | undefined;
      const dateNode = publishInfo?.date || titleInfo?.date;
      if (typeof dateNode === 'string') {
        publishDate = dateNode;
      } else if (dateNode?.['#text']) {
        publishDate = dateNode['#text'];
      } else if (dateNode?.['@_value']) {
        publishDate = dateNode['@_value'];
      }

      // Extract ISBN
      let isbn: string | undefined;
      const isbnNode = publishInfo?.isbn;
      if (typeof isbnNode === 'string') {
        isbn = isbnNode;
      } else if (isbnNode?.['#text']) {
        isbn = isbnNode['#text'];
      }

      return {
        title,
        author,
        genre: genres,
        language,
        description: bookDescription,
        publisher,
        publishDate,
        isbn,
      };
    } catch (error) {
      console.error('FB2 metadata extraction failed:', error);
      return {
        title: 'Unknown Title',
        author: 'Unknown Author',
      };
    }
  }

  /**
   * Extract cover image from FB2 content
   */
  extractCover(xmlContent: string): string | undefined {
    try {
      const parsed = this.parser.parse(xmlContent);
      const binaries = parsed.FictionBook?.binary || [];

      // Find cover image reference
      const fb2Description = parsed.FictionBook?.description;
      const titleInfoRaw = fb2Description?.['title-info'] || fb2Description?.titleInfo;
      const titleInfo = Array.isArray(titleInfoRaw) ? titleInfoRaw[0] : titleInfoRaw;
      const coverPage = titleInfo?.coverpage || titleInfo?.coverPage;
      const coverImage = coverPage?.image;

      if (!coverImage) return undefined;

      // Get href attribute
      let coverId: string | undefined;
      if (typeof coverImage === 'string') {
        coverId = coverImage;
      } else if (coverImage?.['@_href'] || coverImage?.['@_xlink:href']) {
        coverId = coverImage['@_href'] || coverImage['@_xlink:href'];
      }

      if (!coverId) return undefined;

      // Remove # prefix if present
      coverId = coverId.replace(/^#/, '');

      // Find the binary data
      const binaryArray = Array.isArray(binaries) ? binaries : [binaries];
      const coverBinary = binaryArray.find((b: any) => b?.['@_id'] === coverId);

      if (coverBinary) {
        const data = typeof coverBinary === 'string' ? coverBinary : coverBinary?.['#text'];
        const contentType =
          typeof coverBinary === 'object' ? coverBinary?.['@_content-type'] : 'image/jpeg';

        if (data) {
          return `data:${contentType};base64,${data}`;
        }
      }

      return undefined;
    } catch (error) {
      console.error('FB2 cover extraction failed:', error);
      return undefined;
    }
  }

  /**
   * Convert FB2 XML to HTML for rendering
   */
  convertFb2ToHtml(xmlContent: string): string {
    try {
      const parsed = this.parser.parse(xmlContent);
      const body = parsed.FictionBook?.body;

      if (!body) {
        throw new Error('No body element found in FB2 file');
      }

      // Get the main body (could be an array with named bodies)
      const mainBody = Array.isArray(body) ? body[0] : body;
      const sections = mainBody?.section || [];

      const sectionArray = Array.isArray(sections) ? sections : [sections];

      let html = '<div class="fb2-content">';

      // Process each section
      sectionArray.forEach((section: any, sectionIndex: number) => {
        html += this.processSection(section, sectionIndex);
      });

      html += '</div>';

      return html;
    } catch (error) {
      console.error('FB2 to HTML conversion failed:', error);
      throw new Error(
        `Failed to convert FB2 to HTML: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Process a section element recursively
   */
  private processSection(section: any, _index: number): string {
    if (!section) return '';

    let html = '<div class="fb2-section">';

    // Process title if present
    if (section.title) {
      html += this.processTitle(section.title);
    }

    // Process epigraph if present
    if (section.epigraph) {
      const epigraphs = Array.isArray(section.epigraph) ? section.epigraph : [section.epigraph];
      epigraphs.forEach((epi: any) => {
        html += this.processEpigraph(epi);
      });
    }

    // Process image if present
    if (section.image) {
      const images = Array.isArray(section.image) ? section.image : [section.image];
      images.forEach((img: any) => {
        html += this.processImage(img);
      });
    }

    // Process paragraphs and other content
    if (section.p) {
      const paragraphs = Array.isArray(section.p) ? section.p : [section.p];
      paragraphs.forEach((p: any) => {
        html += this.processParagraph(p);
      });
    }

    // Process poems if present
    if (section.poem) {
      const poems = Array.isArray(section.poem) ? section.poem : [section.poem];
      poems.forEach((poem: any) => {
        html += this.processPoem(poem);
      });
    }

    // Process cite (blockquote) if present
    if (section.cite) {
      const cites = Array.isArray(section.cite) ? section.cite : [section.cite];
      cites.forEach((cite: any) => {
        html += this.processCite(cite);
      });
    }

    // Process sub-sections
    if (section.section) {
      const subsections = Array.isArray(section.section) ? section.section : [section.section];
      subsections.forEach((sub: any, subIndex: number) => {
        html += this.processSection(sub, subIndex);
      });
    }

    html += '</div>';
    return html;
  }

  /**
   * Process title element
   */
  private processTitle(title: any): string {
    if (!title) return '';

    let html = '<div class="fb2-title">';

    if (typeof title === 'string') {
      html += `<p>${this.escapeHtml(title)}</p>`;
    } else {
      // Process nested p elements
      if (title.p) {
        const paragraphs = Array.isArray(title.p) ? title.p : [title.p];
        paragraphs.forEach((p: any) => {
          html += '<p>';
          html += this.processInlineElements(p);
          html += '</p>';
        });
      } else if (title['#text']) {
        html += `<p>${this.escapeHtml(title['#text'])}</p>`;
      }
    }

    html += '</div>';
    return html;
  }

  /**
   * Process paragraph with inline elements
   */
  private processParagraph(p: any): string {
    if (!p) return '';

    let html = '<p>';

    if (typeof p === 'string') {
      html += this.escapeHtml(p);
    } else {
      html += this.processInlineElements(p);
    }

    html += '</p>';
    return html;
  }

  /**
   * Process inline elements (emphasis, strong, links, etc.)
   */
  private processInlineElements(element: any): string {
    if (!element) return '';

    if (typeof element === 'string') {
      return this.escapeHtml(element);
    }

    let html = '';

    // Process children in order
    if (Array.isArray(element.p)) {
      element.p.forEach((child: any) => {
        html += this.processInlineElements(child);
      });
    } else if (element.p) {
      html += this.processInlineElements(element.p);
    }

    // Process emphasis (italic)
    if (element.emphasis) {
      const emphasis = Array.isArray(element.emphasis) ? element.emphasis : [element.emphasis];
      emphasis.forEach((em: any) => {
        html += `<em>${this.processInlineElements(em)}</em>`;
      });
    }

    // Process strong (bold)
    if (element.strong) {
      const strong = Array.isArray(element.strong) ? element.strong : [element.strong];
      strong.forEach((s: any) => {
        html += `<strong>${this.processInlineElements(s)}</strong>`;
      });
    }

    // Process strikethrough
    if (element['strikethrough']) {
      const strike = Array.isArray(element['strikethrough'])
        ? element['strikethrough']
        : [element['strikethrough']];
      strike.forEach((s: any) => {
        html += `<s>${this.processInlineElements(s)}</s>`;
      });
    }

    // Process code
    if (element.code) {
      const code = Array.isArray(element.code) ? element.code : [element.code];
      code.forEach((c: any) => {
        html += `<code>${this.processInlineElements(c)}</code>`;
      });
    }

    // Process subscript
    if (element.sub) {
      const sub = Array.isArray(element.sub) ? element.sub : [element.sub];
      sub.forEach((s: any) => {
        html += `<sub>${this.processInlineElements(s)}</sub>`;
      });
    }

    // Process superscript
    if (element.sup) {
      const sup = Array.isArray(element.sup) ? element.sup : [element.sup];
      sup.forEach((s: any) => {
        html += `<sup>${this.processInlineElements(s)}</sup>`;
      });
    }

    // Process links
    if (element.a) {
      const links = Array.isArray(element.a) ? element.a : [element.a];
      links.forEach((link: any) => {
        const href = link?.['@_href'] || link?.['@_xlink:href'] || '#';
        const content = this.processInlineElements(link);
        html += `<a href="${this.escapeHtml(href)}">${content}</a>`;
      });
    }

    // Process empty line
    if (element['empty-line']) {
      html += '<br />';
    }

    // Process text node (only after processing all inline elements)
    if (element['#text'] && typeof element['#text'] === 'string') {
      html += this.escapeHtml(element['#text']);
    }

    // If we only have text and no children, return just the escaped text
    if (html === '' && element['#text'] && typeof element['#text'] === 'string') {
      return this.escapeHtml(element['#text']);
    }

    return html;
  }

  /**
   * Process epigraph element
   */
  private processEpigraph(epigraph: any): string {
    if (!epigraph) return '';

    let html = '<div class="fb2-epigraph">';

    if (epigraph.p) {
      const paragraphs = Array.isArray(epigraph.p) ? epigraph.p : [epigraph.p];
      paragraphs.forEach((p: any) => {
        html += this.processParagraph(p);
      });
    }

    if (epigraph['text-author']) {
      const authors = Array.isArray(epigraph['text-author'])
        ? epigraph['text-author']
        : [epigraph['text-author']];
      html += '<p class="fb2-text-author">';
      authors.forEach((a: any) => {
        html += `<em>${this.processInlineElements(a)}</em>`;
      });
      html += '</p>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Process poem element
   */
  private processPoem(poem: any): string {
    if (!poem) return '';

    let html = '<div class="fb2-poem">';

    // Process title if present
    if (poem.title) {
      html += this.processTitle(poem.title);
    }

    // Process epigraph if present
    if (poem.epigraph) {
      const epigraphs = Array.isArray(poem.epigraph) ? poem.epigraph : [poem.epigraph];
      epigraphs.forEach((epi: any) => {
        html += this.processEpigraph(epi);
      });
    }

    // Process stanzas
    if (poem.stanza) {
      const stanzas = Array.isArray(poem.stanza) ? poem.stanza : [poem.stanza];
      stanzas.forEach((stanza: any) => {
        html += '<div class="fb2-stanza">';
        if (stanza.title) {
          html += this.processTitle(stanza.title);
        }
        if (stanza.v) {
          const verses = Array.isArray(stanza.v) ? stanza.v : [stanza.v];
          verses.forEach((v: any) => {
            html += `<p class="fb2-verse">${this.processInlineElements(v)}</p>`;
          });
        }
        html += '</div>';
      });
    }

    // Process text-author if present
    if (poem['text-author']) {
      const authors = Array.isArray(poem['text-author'])
        ? poem['text-author']
        : [poem['text-author']];
      html += '<p class="fb2-text-author">';
      authors.forEach((a: any) => {
        html += `<em>${this.processInlineElements(a)}</em>`;
      });
      html += '</p>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Process cite (blockquote) element
   */
  private processCite(cite: any): string {
    if (!cite) return '';

    let html = '<blockquote class="fb2-cite">';

    // Process paragraphs
    if (cite.p) {
      const paragraphs = Array.isArray(cite.p) ? cite.p : [cite.p];
      paragraphs.forEach((p: any) => {
        html += this.processParagraph(p);
      });
    }

    // Process sub-elements
    if (cite.poem) {
      const poems = Array.isArray(cite.poem) ? cite.poem : [cite.poem];
      poems.forEach((poem: any) => {
        html += this.processPoem(poem);
      });
    }

    // Process text-author if present
    if (cite['text-author']) {
      const authors = Array.isArray(cite['text-author'])
        ? cite['text-author']
        : [cite['text-author']];
      html += '<p class="fb2-text-author">';
      authors.forEach((a: any) => {
        html += `<em>${this.processInlineElements(a)}</em>`;
      });
      html += '</p>';
    }

    html += '</blockquote>';
    return html;
  }

  /**
   * Process image element
   */
  private processImage(image: any): string {
    if (!image) return '';

    let href: string | undefined;
    let alt = '';

    if (typeof image === 'string') {
      href = image;
    } else {
      href = image?.['@_href'] || image?.['@_xlink:href'];
      alt = image?.['@_alt'] || '';
    }

    if (!href) return '';

    // Handle inline images from binary data
    if (href.startsWith('#')) {
      // This is a reference to a binary - we'd need to look it up
      // For now, return a placeholder
      return `<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='100'%3E%3Crect fill='%23ccc' width='200' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E" alt="${this.escapeHtml(alt)}" class="fb2-image" />`;
    }

    return `<img src="${this.escapeHtml(href)}" alt="${this.escapeHtml(alt)}" class="fb2-image" />`;
  }

  /**
   * Parse FB2 content and extract both HTML and metadata
   */
  parseFb2(xmlContent: string): Fb2ParsedContent {
    const metadata = this.extractFb2Metadata(xmlContent);
    const coverBase64 = this.extractCover(xmlContent);
    const html = this.convertFb2ToHtml(xmlContent);

    // Build TOC from sections
    const toc = this.buildToc(xmlContent);

    return {
      html,
      metadata: {
        ...metadata,
        coverBase64,
      },
      toc,
    };
  }

  /**
   * Build table of contents from FB2 structure
   */
  private buildToc(xmlContent: string): Fb2TocEntry[] {
    try {
      const parsed = this.parser.parse(xmlContent);
      const body = parsed.FictionBook?.body;

      if (!body) return [];

      const mainBody = Array.isArray(body) ? body[0] : body;
      const sections = mainBody?.section || [];
      const sectionArray = Array.isArray(sections) ? sections : [sections];

      const toc: Fb2TocEntry[] = [];
      let chapterIndex = 1;

      const processSectionToc = (section: any, level: number) => {
        if (!section) return;

        // Check for title
        if (section.title) {
          let title = '';
          if (typeof section.title === 'string') {
            title = section.title;
          } else if (section.title?.p) {
            const paragraphs = Array.isArray(section.title.p) ? section.title.p : [section.title.p];
            title = paragraphs
              .map((p: any) => (typeof p === 'string' ? p : p?.['#text'] || ''))
              .join(' ');
          } else if (section.title?.['#text']) {
            title = section.title['#text'];
          }

          if (title.trim()) {
            toc.push({
              id: `chapter-${chapterIndex++}`,
              label: title.trim(),
              level,
            });
          }
        }

        // Process sub-sections
        if (section.section) {
          const subsections = Array.isArray(section.section) ? section.section : [section.section];
          subsections.forEach((sub: any) => processSectionToc(sub, level + 1));
        }
      };

      sectionArray.forEach((section: any) => processSectionToc(section, 1));

      return toc;
    } catch (error) {
      console.error('FB2 TOC building failed:', error);
      return [];
    }
  }

  /**
   * Escape HTML special characters.
   * Uses manual string replacement instead of DOM (no document in RN).
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
   * Validate if content is valid FB2 XML
   */
  isValidFb2(xmlContent: string): boolean {
    try {
      const parsed = this.parser.parse(xmlContent);
      return !!parsed.FictionBook;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const fb2Service = new Fb2Service();
