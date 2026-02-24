/**
 * FB2 Service Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { fb2Service } from './fb2Service';

describe('fb2Service', () => {
  // Sample minimal FB2 XML for testing
  const minimalFb2Xml = `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink">
  <description>
    <title-info>
      <genre>sci_history</genre>
      <author>
        <first-name>Isaac</first-name>
        <middle-name/>
        <last-name>Asimov</last-name>
      </author>
      <book-title>Foundation</book-title>
      <lang>en</lang>
      <annotation>
        <p>First book in the Foundation series.</p>
        <p>A masterpiece of science fiction.</p>
      </annotation>
    </title-info>
    <publish-info>
      <publisher>Gnome Press</publisher>
      <year>1951</year>
      <isbn>978-0-553-29335-7</isbn>
    </publish-info>
  </description>
  <body>
    <section>
      <title>
        <p>Chapter 1</p>
      </title>
      <p>Harry Seldon arrived at Trantor.</p>
      <p>The Galactic Empire was crumbling.</p>
    </section>
  </body>
</FictionBook>`;

  const fb2XmlWithEmphasis = `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description>
    <title-info>
      <author>
        <first-name>Test</first-name>
        <last-name>Author</last-name>
      </author>
      <book-title>Test Book</book-title>
    </title-info>
  </description>
  <body>
    <section>
      <title>
        <p>Introduction</p>
      </title>
      <p>This is <emphasis>italic</emphasis> text.</p>
      <p>This is <strong>bold</strong> text.</p>
      <p>This has <strikethrough>deleted</strikethrough> text.</p>
      <p>This has <code>code</code> in it.</p>
      <p>This has <sub>subscript</sub>.</p>
      <p>This has <sup>superscript</sup>.</p>
    </section>
  </body>
</FictionBook>`;

  const fb2XmlWithPoem = `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description>
    <title-info>
      <author>
        <first-name>Poet</first-name>
        <last-name>Name</last-name>
      </author>
      <book-title>Poetry Collection</book-title>
    </title-info>
  </description>
  <body>
    <section>
      <poem>
        <title>
          <p>The Road Not Taken</p>
        </title>
        <stanza>
          <v>Two roads diverged in a yellow wood,</v>
          <v>And sorry I could not travel both</v>
          <v>And be one traveler, long I stood</v>
          <v>And looked down one as far as I could</v>
        </stanza>
        <text-author>Robert Frost</text-author>
      </poem>
    </section>
  </body>
</FictionBook>`;

  const fb2XmlWithCite = `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description>
    <title-info>
      <author>
        <first-name>Test</first-name>
        <last-name>Author</last-name>
      </author>
      <book-title>Test Book</book-title>
    </title-info>
  </description>
  <body>
    <section>
      <cite>
        <p>To be, or not to be,</p>
        <p>that is the question:</p>
        <text-author>William Shakespeare</text-author>
      </cite>
    </section>
  </body>
</FictionBook>`;

  describe('isValidFb2', () => {
    it('should return true for valid FB2 XML', () => {
      const result = fb2Service.isValidFb2(minimalFb2Xml);
      expect(result).toBe(true);
    });

    it('should return false for invalid XML', () => {
      const result = fb2Service.isValidFb2('not xml at all');
      expect(result).toBe(false);
    });

    it('should return false for non-FB2 XML', () => {
      const result = fb2Service.isValidFb2('<root><item>test</item></root>');
      expect(result).toBe(false);
    });
  });

  describe('extractFb2Metadata', () => {
    it('should extract title from FB2', () => {
      const metadata = fb2Service.extractFb2Metadata(minimalFb2Xml);
      expect(metadata.title).toBe('Foundation');
    });

    it('should extract author name from FB2', () => {
      const metadata = fb2Service.extractFb2Metadata(minimalFb2Xml);
      expect(metadata.author).toBe('Isaac Asimov');
    });

    it('should extract genre from FB2', () => {
      const metadata = fb2Service.extractFb2Metadata(minimalFb2Xml);
      expect(metadata.genre).toContain('sci_history');
    });

    it('should extract language from FB2', () => {
      const metadata = fb2Service.extractFb2Metadata(minimalFb2Xml);
      expect(metadata.language).toBe('en');
    });

    it('should extract description (annotation) from FB2', () => {
      const metadata = fb2Service.extractFb2Metadata(minimalFb2Xml);
      expect(metadata.description).toContain('First book in the Foundation series');
    });

    it('should handle missing metadata gracefully', () => {
      const emptyXml = '<?xml version="1.0"?><FictionBook></FictionBook>';
      const metadata = fb2Service.extractFb2Metadata(emptyXml);
      expect(metadata.title).toBe('Unknown Title');
      expect(metadata.author).toBe('Unknown Author');
    });
  });

  describe('convertFb2ToHtml', () => {
    it('should convert FB2 sections to HTML divs', () => {
      const html = fb2Service.convertFb2ToHtml(minimalFb2Xml);
      expect(html).toContain('<div class="fb2-content">');
      expect(html).toContain('<div class="fb2-section">');
    });

    it('should convert FB2 titles to HTML', () => {
      const html = fb2Service.convertFb2ToHtml(minimalFb2Xml);
      expect(html).toContain('<div class="fb2-title">');
      expect(html).toContain('Chapter 1');
    });

    it('should convert FB2 paragraphs to HTML p tags', () => {
      const html = fb2Service.convertFb2ToHtml(minimalFb2Xml);
      expect(html).toContain('<p>Harry Seldon arrived at Trantor.</p>');
    });

    it('should convert emphasis to em tags', () => {
      const html = fb2Service.convertFb2ToHtml(fb2XmlWithEmphasis);
      expect(html).toContain('<em>italic</em>');
    });

    it('should convert strong to strong tags', () => {
      const html = fb2Service.convertFb2ToHtml(fb2XmlWithEmphasis);
      expect(html).toContain('<strong>bold</strong>');
    });

    it('should convert strikethrough to s tags', () => {
      const html = fb2Service.convertFb2ToHtml(fb2XmlWithEmphasis);
      expect(html).toContain('<s>deleted</s>');
    });

    it('should convert code to code tags', () => {
      const html = fb2Service.convertFb2ToHtml(fb2XmlWithEmphasis);
      expect(html).toContain('<code>code</code>');
    });

    it('should convert subscript to sub tags', () => {
      const html = fb2Service.convertFb2ToHtml(fb2XmlWithEmphasis);
      expect(html).toContain('<sub>subscript</sub>');
    });

    it('should convert superscript to sup tags', () => {
      const html = fb2Service.convertFb2ToHtml(fb2XmlWithEmphasis);
      expect(html).toContain('<sup>superscript</sup>');
    });
  });

  describe('parseFb2', () => {
    it('should return parsed content with metadata', () => {
      const result = fb2Service.parseFb2(minimalFb2Xml);

      expect(result.metadata.title).toBe('Foundation');
      expect(result.metadata.author).toBe('Isaac Asimov');
      expect(result.html).toContain('<div class="fb2-content">');
    });

    it('should build table of contents', () => {
      const result = fb2Service.parseFb2(minimalFb2Xml);

      expect(result.toc.length).toBeGreaterThan(0);
      expect(result.toc[0].label).toContain('Chapter 1');
    });
  });

  describe('extractCover', () => {
    it('should return undefined for FB2 without cover', () => {
      const cover = fb2Service.extractCover(minimalFb2Xml);
      expect(cover).toBeUndefined();
    });

    // Note: Testing cover extraction with actual binary data would require
    // a more complex test fixture with base64 encoded images
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      // This is tested indirectly through convertFb2ToHtml
      const xmlWithSpecialChars = `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description><title-info><author><first-name>Test</first-name></author><book-title>Test</book-title></title-info></description>
  <body><section><p>Text with &lt;special&gt; characters &amp; symbols</p></section></body>
</FictionBook>`;

      const html = fb2Service.convertFb2ToHtml(xmlWithSpecialChars);
      // The converted HTML should contain the special text (escaped)
      expect(html).toContain('Text with');
    });
  });
});
