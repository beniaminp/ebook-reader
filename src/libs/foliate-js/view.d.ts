/**
 * TypeScript declarations for foliate-js view module.
 */

export class View extends HTMLElement {
  book: FoliateBook;
  renderer: FoliateRenderer;
  lastLocation: FoliateLocation | null;
  history: FoliateHistory;
  isFixedLayout: boolean;
  language: { canonical?: string; locale?: Intl.Locale; isCJK?: boolean; direction?: string };

  open(book: Blob | File | string | FoliateBook): Promise<void>;
  close(): void;
  init(opts: { lastLocation?: string | null; showTextStart?: boolean }): Promise<void>;
  goTo(
    target: string | number | { fraction: number }
  ): Promise<{ index: number; anchor?: unknown } | undefined>;
  goToFraction(fraction: number): Promise<void>;
  next(distance?: number): Promise<void>;
  prev(distance?: number): Promise<void>;
  goLeft(): Promise<void>;
  goRight(): Promise<void>;
  getCFI(index: number, range?: Range): string;
  resolveCFI(cfi: string): { index: number; anchor: (doc: Document) => Range | Node };
  resolveNavigation(
    target: string | number | { fraction: number }
  ): { index: number; anchor?: unknown } | undefined;

  search(opts: { query: string; index?: number }): AsyncGenerator<FoliateSearchYield | 'done'>;
  clearSearch(): void;

  addAnnotation(
    annotation: { value: string },
    remove?: boolean
  ): Promise<{ index: number; label: string } | undefined>;
  deleteAnnotation(annotation: {
    value: string;
  }): Promise<{ index: number; label: string } | undefined>;

  addEventListener(type: 'relocate', listener: (e: CustomEvent<FoliateLocation>) => void): void;
  addEventListener(
    type: 'load',
    listener: (e: CustomEvent<{ doc: Document; index: number }>) => void
  ): void;
  addEventListener(
    type: 'link',
    listener: (e: CustomEvent<{ a: HTMLAnchorElement; href: string }>) => void
  ): void;
  addEventListener(
    type: 'external-link',
    listener: (e: CustomEvent<{ a: HTMLAnchorElement; href: string }>) => void
  ): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}

export function makeBook(file: Blob | File | string): Promise<FoliateBook>;

export interface FoliateRenderer {
  goTo(target: { index: number; anchor?: unknown; select?: boolean }): Promise<void>;
  next(distance?: number): Promise<void>;
  prev(distance?: number): Promise<void>;
  destroy(): void;
  remove(): void;
  getContents(): Array<{ doc: Document; index: number; overlayer?: unknown }>;
  scrollToAnchor(range: Range, select?: boolean): void;
}

export interface FoliateHistory {
  pushState(x: unknown): void;
  replaceState(x: unknown): void;
  back(): void;
  forward(): void;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  clear(): void;
}

export interface FoliateBook {
  metadata: FoliateMetadata;
  toc?: FoliateTocItem[];
  sections: FoliateSection[];
  dir?: string;
  rendition?: { layout?: string };
  landmarks?: Array<{ type: string[]; href: string }>;
  pageList?: Array<{ label: string; href: string }>;
  getCover?(): Promise<Blob | null>;
  destroy?(): void;
  resolveHref?(href: string): { index: number; anchor: unknown } | null;
  splitTOCHref?(href: string): string[];
  getTOCFragment?(doc: Document, id: string): Element | null;
  isExternal?(uri: string): boolean;
  resolveCFI?(cfi: string): { index: number; anchor: (doc: Document) => Range | Node };
}

export interface FoliateMetadata {
  title: string | Record<string, string>;
  author?:
    | string
    | Array<{ name: string | Record<string, string>; role?: string[] }>
    | { name: string | Record<string, string>; role?: string[] };
  description?: string;
  publisher?: string | { name: string };
  language?: string | string[];
  identifier?: string;
  published?: string;
  modified?: string;
  subject?: unknown;
}

export interface FoliateTocItem {
  id?: number;
  label: string;
  href: string;
  subitems?: FoliateTocItem[] | null;
}

export interface FoliateSection {
  id: string;
  href: string;
  mediaType: string;
  linear?: string;
  size: number;
  cfi?: string;
  createDocument?(): Promise<Document>;
  mediaOverlay?: unknown;
  pageSpread?: string;
}

export interface FoliateLocation {
  fraction: number;
  section: { current: number; total: number };
  location: { current: number; next: number; total: number };
  time: { section: number; total: number };
  tocItem?: FoliateTocItem | null;
  pageItem?: { label: string } | null;
  cfi: string;
  range?: Range;
}

export interface FoliateSearchYield {
  label?: string;
  subitems?: Array<{ cfi: string; excerpt: string }>;
  cfi?: string;
  excerpt?: string;
  progress?: number;
}
