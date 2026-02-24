# FB2 and CHM Format Support Implementation

## Summary

This implementation adds support for FB2 (FictionBook) format and documents the limitations for CHM (Compiled HTML Help) format.

## FB2 Format Support

### Implementation

Created `src/services/fb2Service.ts` with the following functionality:

#### Features

1. **XML Parsing**
   - Uses `fast-xml-parser` library for parsing FB2 XML files
   - Configured with appropriate options for handling FB2 structure

2. **Metadata Extraction**
   - Title (`book-title`)
   - Author (`first-name`, `middle-name`, `last-name`)
   - Genres (`genre`)
   - Language (`lang`)
   - Description/Annotation (`annotation` with `p` elements)
   - Publisher (`publisher`)
   - Publish Date (`date`)
   - ISBN (`isbn`)

3. **Content Conversion to HTML**
   - Sections (`section` → `div.fb2-section`)
   - Titles (`title` → `div.fb2-title`)
   - Paragraphs (`p` → `p`)
   - Emphasis (`emphasis` → `em`)
   - Strong/Bold (`strong` → `strong`)
   - Strikethrough (`strikethrough` → `s`)
   - Code (`code` → `code`)
   - Subscript (`sub` → `sub`)
   - Superscript (`sup` → `sup`)
   - Links (`a` with `href` or `xlink:href` → `a`)
   - Images (`image` → `img`)
   - Poems (`poem` → `div.fb2-poem`)
   - Blockquotes/Citations (`cite` → `blockquote.fb2-cite`)
   - Epigraphs (`epigraph` → `div.fb2-epigraph`)

4. **Table of Contents Generation**
   - Automatically builds TOC from section titles
   - Supports hierarchical structure

5. **Cover Image Extraction**
   - Extracts base64-encoded cover images from binary data
   - Returns data URL for direct use in `<img>` tags

### Usage

FB2 files are handled by **foliate-js** which natively supports FB2 format:

1. Import: FB2 files (`.fb2`) can be imported via the Library page
2. Metadata: Automatically extracted and stored in database
3. Reading: Displayed using `FoliateEngine` (same as EPUB)

### Files Modified/Created

- `/home/beniaminp/ebook-reader/src/services/fb2Service.ts` - FB2 parsing service
- `/home/beniaminp/ebook-reader/src/services/fb2Service.test.ts` - Unit tests
- `/home/beniaminp/ebook-reader/src/components/readers/Fb2Reader.css` - Styling for converted FB2 content
- `/home/beniaminp/ebook-reader/src/services/index.ts` - Export fb2Service
- `/home/beniaminp/ebook-reader/src/pages/Library/Library.tsx` - Add FB2 metadata extraction
- `/home/beniaminp/ebook-reader/src/types/index.ts` - Add FB2 to Book format type
- `/home/beniaminp/ebook-reader/src/services/schema.ts` - Add FB2 to database CHECK constraint

## CHM Format Support

### Limitations

CHM (Compiled HTML Help) format is **NOT supported** due to the following reasons:

1. **No Pure JavaScript Library**
   - CHM uses the ITSS (InfoTech Storage System) format
   - Requires native libraries (CHMLib is C-based)
   - No reliable npm package for browser-based CHM parsing

2. **Proprietary Format**
   - Microsoft proprietary format
   - Complex binary structure
   - Requires decompression and parsing of multiple files

### Alternative Solutions

Users should convert CHM files before importing:

1. **Calibre** (https://calibre-ebook.com/)
   - Free and open source
   - Converts CHM to EPUB/PDF

2. **Online-Convert** (https://www.online-convert.com/)
   - Web-based conversion tool

3. **chm2pdf** (https://github.com/theunknownkevin/chm2pdf)
   - Command-line tool for CHM to PDF conversion

### Implementation

Created `src/services/chmService.ts` as a placeholder with:

- `isSupported()` - Returns `false`
- `getUnsupportedReason()` - Returns helpful error message
- `getConversionTools()` - Lists recommended conversion tools
- All parsing methods throw descriptive errors

### Files Created

- `/home/beniaminp/ebook-reader/src/services/chmService.ts` - CHM service placeholder
- `/home/beniaminp/ebook-reader/src/services/chmService.test.ts` - Unit tests

### User Experience

When attempting to open a CHM file:
- Import is blocked with helpful error message
- Message explains the limitation
- Suggested conversion tools are provided
- Error message: "CHM format is not currently supported. Please convert your CHM files to HTML, EPUB, or PDF format before importing."

## Database Schema Updates

Added `FB2` and `CHM` to the format CHECK constraint in the books table:

```sql
format TEXT NOT NULL CHECK(format IN ('EPUB', 'PDF', 'TXT', 'HTML', 'MD', 'MOBI', 'AZW3', 'CBZ', 'CBR', 'DOCX', 'FB2', 'CHM'))
```

## Testing

Created comprehensive unit tests:

### FB2 Tests (`src/services/fb2Service.test.ts`)
- Validation of FB2 XML
- Metadata extraction
- HTML conversion
- TOC generation
- Cover image extraction
- 22 tests covering all functionality

### CHM Tests (`src/services/chmService.test.ts`)
- Support status verification
- Error handling
- Conversion tools listing
- 9 tests verifying the placeholder behavior

## Integration Points

1. **Library Import**
   - FB2 files accepted in file input
   - Metadata extracted during import
   - CHM files rejected with helpful error

2. **Reader Page**
   - FB2 uses existing `FoliateEngine`
   - CHM shows unsupported format error

3. **Unified Reader Container**
   - Already configured for FB2 via foliate-js
   - No changes needed (FOLIATE_FORMATS includes 'fb2')

## Future Enhancements

For CHM support, potential approaches:

1. **WebAssembly**
   - Compile CHMLib to WASM
   - Complex and would significantly increase bundle size

2. **Server-Side Conversion**
   - Backend service to convert CHM on demand
   - Requires additional infrastructure

3. **Native Plugin**
   - Capacitor plugin for native CHM handling
   - Platform-specific implementation needed

For FB2, current implementation is complete and production-ready.

## Build Verification

- All TypeScript compilation successful
- All unit tests passing (31 tests)
- No new linting errors introduced
- Build completes successfully
