# Book Open Error Investigation

## Error Description

**Error Message:** `Cannot read properties of undefined (reading 'endsWith')`

**When it occurs:** When opening a book from the library to read

## Root Cause Analysis

### Investigation Findings

The error `.endsWith()` is only called in one location in the codebase:

**File:** `src/pages/Library/Library.tsx`
**Lines:** 403, 405, 407, 409

```typescript
const importBook = async (file: File): Promise<void> => {
  const fileName = file.name.toLowerCase();  // Line 400

  if (fileName.endsWith('.epub')) {          // Line 403
    format = 'epub';
  } else if (fileName.endsWith('.pdf')) {    // Line 405
    format = 'pdf';
  } else if (fileName.endsWith('.mobi')) {   // Line 407
    format = 'mobi';
  } else if (fileName.endsWith('.fb2')) {    // Line 409
    format = 'fb2';
  }
  // ...
}
```

### Primary Cause

The error occurs when `file.name` is `undefined`, which causes `fileName` to be `undefined`, and then calling `.endsWith()` on undefined throws the error.

### Why This Happens When Opening a Book (Not Importing)

The `importBook` function is only called during file import (`handleFileImport`), but the error manifests when opening a book because:

1. **Old/Migrated Data**: Books in localStorage/webBooks may have `undefined` `filePath` values from:
   - Previous app versions with different data structure
   - Failed migrations that didn't properly set `filePath`
   - Manual localStorage manipulation

2. **Type Mismatch**: The `Book` interface defines `filePath: string` (non-optional), but at runtime:
   - `mapRowToBook()` directly assigns `row.file_path` without null checking
   - `webBookToBook()` assigns `webBook.filePath` without validation
   - Old localStorage data may not have this field

3. **Data Flow:**
   ```
   Library Click → Reader.tsx loadBook()
                → databaseService.getBookById()
                → mapRowToBook() or webBookToBook()
                → filePath could be undefined
                → detectFormat(filePath, ...) called
                → operations on undefined cause errors
   ```

### Secondary Issues in Reader.tsx

The Reader component at `src/pages/Reader/Reader.tsx` has several vulnerabilities:

1. **Line 105**: `let resolvedFilePath = foundBook.filePath;` - No validation before use
2. **Line 158**: `const fmt = detectFormat(resolvedFilePath, foundBook.format);` - Assumes valid filePath
3. **Line 173**: `if (resolvedFilePath.startsWith('indexeddb://'))` - Would fail if undefined

```typescript
function detectFormat(filePath: string, bookFormat: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';  // Line 29
  // If filePath is undefined, this throws "Cannot read properties of undefined (reading 'split')"
  // ...
}
```

### Data Integrity Issues

**Database Schema (`src/services/schema.ts:40`):**
```sql
file_path TEXT NOT NULL UNIQUE
```

The schema correctly defines `file_path` as `NOT NULL`, but runtime JavaScript doesn't enforce this.

**Web Storage (`src/services/database.ts:98-99`):**
```typescript
webBooks = storedBooks ? JSON.parse(storedBooks) : [];
webCollections = storedCollections ? JSON.parse(storedCollections) : getDefaultCollections();
```

No validation when loading from localStorage - old data structure can persist.

## Solutions

### Solution 1: Add Validation in `mapRowToBook` and `webBookToBook`

**File:** `src/services/database.ts`

```typescript
function mapRowToBook(row: any): Book {
  // Add validation for required fields
  if (!row.file_path) {
    console.error(`Book ${row.id} has missing file_path`, row);
    throw new Error(`Book ${row.id} has invalid data: file_path is required`);
  }
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    filePath: row.file_path,  // Now validated
    // ... rest of mapping
  };
}

function webBookToBook(webBook: WebBook): Book {
  // Add validation
  if (!webBook.filePath) {
    console.error(`WebBook ${webBook.id} has missing filePath`, webBook);
    throw new Error(`Book ${webBook.id} has invalid data: filePath is required`);
  }
  return {
    id: webBook.id,
    title: webBook.title,
    author: webBook.author,
    filePath: webBook.filePath,  // Now validated
    // ... rest of mapping
  };
}
```

### Solution 2: Add Early Validation in Reader.tsx

**File:** `src/pages/Reader/Reader.tsx`

Move the filePath validation BEFORE the Calibre-Web logic:

```typescript
// Load book from store or database
useEffect(() => {
  const loadBook = async () => {
    setLoadState('loading');

    // Try from store first
    let foundBook = books.find((b) => b.id === bookId) || null;

    if (!foundBook) {
      try {
        foundBook = await databaseService.getBookById(bookId);
      } catch {
        // ignore
      }
    }

    if (!foundBook) {
      setErrorMessage(`Book not found (id: ${bookId})`);
      setLoadState('error');
      return;
    }

    // ADD THIS: Validate filePath early
    if (!foundBook.filePath) {
      setErrorMessage(`Book has missing file path. The book data may be corrupted. Please re-import the book.`);
      setLoadState('error');
      return;
    }

    setBook(foundBook);
    setCurrentBook(foundBook);

    // ... rest of the function continues
```

### Solution 3: Add Migration to Clean Up Corrupted Data

**File:** `src/services/database.ts` (or new migration file)

```typescript
/** Migrate old book data, removing books with invalid filePath */
export async function migrateBookData(): Promise<number> {
  if (!Capacitor.isNativePlatform()) {
    ensureWebInit();
    const validBooks = webBooks.filter(b => b.filePath);
    const removedCount = webBooks.length - validBooks.length;
    webBooks = validBooks;
    saveWebData();
    return removedCount;
  }

  // Native platform migration
  if (!db) await initDatabase();
  const result = await db!.query(`SELECT id FROM ${TABLES.BOOKS} WHERE file_path IS NULL OR file_path = ''`);
  if (result.values && result.values.length > 0) {
    for (const row of result.values) {
      await deleteBook(row.id);  // Delete corrupted entries
    }
    return result.values.length;
  }
  return 0;
}
```

### Solution 4: Add Guard in `importBook` (Preventative)

**File:** `src/pages/Library/Library.tsx`

```typescript
const importBook = async (file: File): Promise<void> => {
  // Add validation for File object
  if (!file || !file.name) {
    throw new Error('Invalid file: file name is required');
  }

  const fileName = file.name.toLowerCase();
  // ... rest of function
```

### Solution 5: Add Validation in `detectFormat` Helper

**File:** `src/pages/Reader/Reader.tsx`

```typescript
function detectFormat(filePath: string, bookFormat: string): string {
  if (!filePath) {
    console.warn('detectFormat called with undefined filePath');
    return bookFormat || 'txt';
  }
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  if (ext === 'txt') return 'txt';
  // ... rest of function
}
```

## Recommended Action Plan

1. **Immediate Fix:** Add early validation in Reader.tsx (Solution 2) - prevents crash, shows user error message
2. **Data Cleanup:** Run migration to remove corrupted books (Solution 3) - cleans up existing bad data
3. **Root Cause Fix:** Add validation in `mapRowToBook` and `webBookToBook` (Solution 1) - prevents future corrupted data
4. **Defensive Coding:** Add guards in `importBook` and `detectFormat` (Solutions 4 & 5) - additional safety layers

## Testing Checklist

- [ ] Open a book with valid `filePath` - should work normally
- [ ] Try to open a book with undefined/empty `filePath` - should show error message, not crash
- [ ] Import a new file - should work even if edge case (File without name)
- [ ] Run migration on existing data - corrupted books should be removed
- [ ] Verify localStorage books load correctly after migration

## Files to Modify

1. `src/pages/Reader/Reader.tsx` - Add early validation
2. `src/services/database.ts` - Add validation in mapping functions
3. `src/pages/Library/Library.tsx` - Add guard in importBook
4. Consider creating `src/migrations/bookDataCleanup.ts` for data migration
