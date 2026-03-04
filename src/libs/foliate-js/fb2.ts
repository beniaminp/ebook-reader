const normalizeWhitespace = (str: string | null | undefined): string =>
  str
    ? str
        .replace(/[\t\n\f\r ]+/g, ' ')
        .replace(/^[\t\n\f\r ]+/, '')
        .replace(/[\t\n\f\r ]+$/, '')
    : '';

const getElementText = (el: Element | null | undefined): string =>
  normalizeWhitespace(el?.textContent);

const NS = {
  XLINK: 'http://www.w3.org/1999/xlink',
  EPUB: 'http://www.idpf.org/2007/ops',
  XHTML: 'http://www.w3.org/1999/xhtml',
} as const;

const MIME = {
  XML: 'application/xml',
  XHTML: 'application/xhtml+xml',
} as const;

/**
 * A conversion definition entry can be:
 * - A string method name (e.g. 'anchor', 'image', 'stanza') to call on the converter
 * - A tuple of [tagName, childDef | 'self', optionalAttrs[]]
 *
 * The recursive nature of these definitions makes a fully precise type impractical,
 * so we use a permissive record type.
 */
type ConvertMethodName = 'anchor' | 'image' | 'stanza';

type DefEntry =
  | ConvertMethodName
  | [string]
  | [string, ConversionDef | 'self']
  | [string, ConversionDef | 'self', string[]];

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ConversionDef {
  [tagName: string]: DefEntry;
}

const STYLE: ConversionDef = {
  strong: ['strong', 'self'],
  emphasis: ['em', 'self'],
  style: ['span', 'self'],
  a: 'anchor',
  strikethrough: ['s', 'self'],
  sub: ['sub', 'self'],
  sup: ['sup', 'self'],
  code: ['code', 'self'],
  image: 'image',
};

const TABLE: ConversionDef = {
  tr: [
    'tr',
    {
      th: ['th', STYLE, ['colspan', 'rowspan', 'align', 'valign']],
      td: ['td', STYLE, ['colspan', 'rowspan', 'align', 'valign']],
    },
    ['align'],
  ],
};

const POEM: ConversionDef = {
  epigraph: ['blockquote'] as DefEntry,
  subtitle: ['h2', STYLE],
  'text-author': ['p', STYLE],
  date: ['p', STYLE],
  stanza: 'stanza',
};

const SECTION: ConversionDef = {
  title: [
    'header',
    {
      p: ['h1', STYLE],
      'empty-line': ['br'],
    },
  ],
  epigraph: ['blockquote', 'self'],
  image: 'image',
  annotation: ['aside'],
  section: ['section', 'self'],
  p: ['p', STYLE],
  poem: ['blockquote', POEM],
  subtitle: ['h2', STYLE],
  cite: ['blockquote', 'self'],
  'empty-line': ['br'],
  table: ['table', TABLE],
  'text-author': ['p', STYLE],
};

// Mutate POEM.epigraph to add SECTION as third element
(POEM['epigraph'] as unknown[]).push(SECTION);

const BODY: ConversionDef = {
  image: 'image',
  title: [
    'section',
    {
      p: ['h1', STYLE],
      'empty-line': ['br'],
    },
  ],
  epigraph: ['section', SECTION],
  section: ['section', SECTION],
};

class FB2Converter {
  private fb2: Document;
  private doc: Document;
  private bins: Map<string, Element>;

  constructor(fb2: Document) {
    this.fb2 = fb2;
    this.doc = document.implementation.createDocument(NS.XHTML, 'html');
    // use this instead of `getElementById` to allow images like
    // `<image l:href="#img1.jpg" id="img1.jpg" />`
    this.bins = new Map(
      Array.from(this.fb2.getElementsByTagName('binary'), (el) => [el.id, el]),
    );
  }

  getImageSrc(el: Element): string {
    const href = el.getAttributeNS(NS.XLINK, 'href');
    if (!href) return 'data:,';
    const [, id] = href.split('#');
    if (!id) return href;
    const bin = this.bins.get(id);
    return bin
      ? `data:${bin.getAttribute('content-type')};base64,${bin.textContent}`
      : href;
  }

  image(node: Element): Element {
    const el = this.doc.createElement('img');
    el.alt = node.getAttribute('alt') ?? '';
    el.title = node.getAttribute('title') ?? '';
    el.setAttribute('src', this.getImageSrc(node));
    return el;
  }

  anchor(node: Element): Element {
    const el = this.convert(node, { a: ['a', STYLE] }) as Element;
    el.setAttribute('href', node.getAttributeNS(NS.XLINK, 'href') ?? '');
    if (node.getAttribute('type') === 'note')
      el.setAttributeNS(NS.EPUB, 'epub:type', 'noteref');
    return el;
  }

  stanza(node: Element): Element {
    const el = this.convert(node, {
      stanza: [
        'p',
        {
          title: [
            'header',
            {
              p: ['strong', STYLE],
              'empty-line': ['br'],
            },
          ],
          subtitle: ['p', STYLE],
        },
      ],
    }) as Element;
    for (const child of Array.from(node.children)) {
      if (child.nodeName === 'v') {
        el.append(this.doc.createTextNode(child.textContent ?? ''));
        el.append(this.doc.createElement('br'));
      }
    }
    return el;
  }

  convert(node: Node, def: ConversionDef | undefined): Node | null {
    // not an element; return text content
    if (node.nodeType === 3)
      return this.doc.createTextNode(node.textContent ?? '');
    if (node.nodeType === 4)
      return this.doc.createCDATASection(node.textContent ?? '');
    if (node.nodeType === 8)
      return this.doc.createComment(node.textContent ?? '');

    const d = def?.[node.nodeName];
    if (!d) return null;
    if (typeof d === 'string')
      return this[d as ConvertMethodName](node as Element);

    const [name, opts, attrs] = d as [
      string,
      ConversionDef | 'self' | undefined,
      string[] | undefined,
    ];
    const el = this.doc.createElement(name);

    // copy the ID, and set class name from original element name
    if ((node as Element).id) el.id = (node as Element).id;
    el.classList.add(node.nodeName);

    // copy attributes
    if (Array.isArray(attrs)) {
      for (const attr of attrs) {
        const value = (node as Element).getAttribute(attr);
        if (value) el.setAttribute(attr, value);
      }
    }

    // process child elements recursively
    const childDef = opts === 'self' ? def : (opts as ConversionDef | undefined);
    let child = node.firstChild;
    while (child) {
      const childEl = this.convert(child, childDef);
      if (childEl) el.append(childEl);
      child = child.nextSibling;
    }
    return el;
  }
}

const parseXML = async (blob: Blob): Promise<Document> => {
  const buffer = await blob.arrayBuffer();
  const str = new TextDecoder('utf-8').decode(buffer);
  const parser = new DOMParser();
  const doc = parser.parseFromString(str, MIME.XML);
  const encoding =
    (doc as unknown as { xmlEncoding?: string }).xmlEncoding ||
    // `Document.xmlEncoding` is deprecated, and already removed in Firefox
    // so parse the XML declaration manually
    str.match(
      /^<\?xml\s+version\s*=\s*["']1.\d+"\s+encoding\s*=\s*["']([A-Za-z0-9._-]*)["']/,
    )?.[1];
  if (encoding && encoding.toLowerCase() !== 'utf-8') {
    const reStr = new TextDecoder(encoding).decode(buffer);
    return parser.parseFromString(reStr, MIME.XML);
  }
  return doc;
};

const style = URL.createObjectURL(
  new Blob(
    [
      `
@namespace epub "http://www.idpf.org/2007/ops";
body > img, section > img {
    display: block;
    margin: auto;
}
.title h1 {
    text-align: center;
}
body > section > .title, body.notesBodyType > .title {
    margin: 3em 0;
}
body.notesBodyType > section .title h1 {
    text-align: start;
}
body.notesBodyType > section .title {
    margin: 1em 0;
}
p {
    text-indent: 1em;
    margin: 0;
}
:not(p) + p, p:first-child {
    text-indent: 0;
}
.poem p {
    text-indent: 0;
    margin: 1em 0;
}
.text-author, .date {
    text-align: end;
}
.text-author:before {
    content: "—";
}
table {
    border-collapse: collapse;
}
td, th {
    padding: .25em;
}
a[epub|type~="noteref"] {
    font-size: .75em;
    vertical-align: super;
}
body:not(.notesBodyType) > .title, body:not(.notesBodyType) > .epigraph {
    margin: 3em 0;
}
`,
    ],
    { type: 'text/css' },
  ),
);

const template = (html: string): string => `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
    <head><link href="${style}" rel="stylesheet" type="text/css"/></head>
    <body>${html}</body>
</html>`;

// name of custom ID attribute for TOC items
const dataID = 'data-foliate-id';

interface Person {
  name: string;
  sortAs?: string | null;
}

interface Contributor {
  name: string;
  sortAs?: string | null;
  role: string;
}

interface FB2Metadata {
  title: string;
  identifier: string;
  language: string;
  author: (Person | string)[];
  translator: (Person | string)[];
  contributor: Contributor[];
  publisher: string;
  published: string;
  modified: string;
  description: string | null;
  subject: string[];
}

interface TOCSubitem {
  label: string;
  href: string;
}

interface TOCItem {
  label: string;
  href: string;
  subitems: TOCSubitem[] | null;
}

interface BookSection {
  id: number;
  load: () => string;
  createDocument: () => Document;
  size: number;
  linear?: string;
}

interface ResolvedHref {
  index: number | undefined;
  anchor: (doc: Document) => Element | null;
}

interface FB2Book {
  metadata: FB2Metadata;
  getCover: () => Promise<Blob | null> | null;
  sections: BookSection[];
  toc: TOCItem[];
  resolveHref: (href: string) => ResolvedHref;
  splitTOCHref: (href: string | null | undefined) => number[];
  getTOCFragment: (doc: Document, id: string) => Element | null;
  destroy: () => void;
}

interface SectionBuildData {
  ids: string[];
  titles?: { title: string; index: number }[];
  el: Element;
  linear?: string;
}

export const makeFB2 = async (blob: Blob): Promise<FB2Book> => {
  const book = {} as FB2Book;
  const doc = await parseXML(blob);
  const converter = new FB2Converter(doc);

  const $ = (x: string): Element | null => doc.querySelector(x);
  const $$ = (x: string): Element[] => Array.from(doc.querySelectorAll(x));
  const getPerson = (el: Element): Person | string => {
    const nick = getElementText(el.querySelector('nickname'));
    if (nick) return nick;
    const first = getElementText(el.querySelector('first-name'));
    const middle = getElementText(el.querySelector('middle-name'));
    const last = getElementText(el.querySelector('last-name'));
    const name = [first, middle, last].filter((x) => x).join(' ');
    const sortAs = last
      ? [last, [first, middle].filter((x) => x).join(' ')].join(', ')
      : null;
    return { name, sortAs };
  };
  const getDate = (el: Element | null | undefined): string =>
    el?.getAttribute('value') ?? getElementText(el);
  const annotation = $('title-info annotation');
  book.metadata = {
    title: getElementText($('title-info book-title')),
    identifier: getElementText($('document-info id')),
    language: getElementText($('title-info lang')),
    author: $$('title-info author').map(getPerson),
    translator: $$('title-info translator').map(getPerson),
    contributor: $$('document-info author')
      .map(getPerson)
      // technically the program probably shouldn't get the `bkp` role
      // but it has been so used by calibre, so ¯\_(ツ)_/¯
      .concat($$('document-info program-used').map(getElementText))
      .map((x) =>
        Object.assign(typeof x === 'string' ? { name: x } : x, {
          role: 'bkp',
        }),
      ) as Contributor[],
    publisher: getElementText($('publish-info publisher')),
    published: getDate($('title-info date')),
    modified: getDate($('document-info date')),
    description: annotation
      ? (
          converter.convert(annotation, {
            annotation: ['div', SECTION],
          }) as Element
        ).innerHTML
      : null,
    subject: $$('title-info genre').map(getElementText),
  };
  if ($('coverpage image')) {
    const src = converter.getImageSrc($('coverpage image')!);
    book.getCover = () => fetch(src).then((res) => res.blob());
  } else {
    book.getCover = () => null;
  }

  // convert each body
  const bodyData = Array.from(doc.querySelectorAll('body'), (body) => {
    const converted = converter.convert(body, {
      body: ['body', BODY],
    }) as Element;
    return [
      Array.from(converted.children, (el) => {
        // get list of IDs in the section
        const ids = [el, ...Array.from(el.querySelectorAll('[id]'))].map((e) => e.id);
        return { el, ids };
      }),
      converted,
    ] as [{ el: Element; ids: string[] }[], Element];
  });

  const urls: string[] = [];
  const sectionData: SectionBuildData[] = bodyData[0][0]
    // make a separate section for each section in the first body
    .map(({ el, ids }) => {
      // set up titles for TOC
      const titles = Array.from(
        el.querySelectorAll(':scope > section > .title'),
        (titleEl, index) => {
          titleEl.setAttribute(dataID, index.toString());
          return { title: getElementText(titleEl), index };
        },
      );
      return { ids, titles, el } as SectionBuildData;
    })
    // for additional bodies, only make one section for each body
    .concat(
      bodyData.slice(1).map(([sections, body]) => {
        const ids = sections.map((s) => s.ids).flat();
        body.classList.add('notesBodyType');
        return { ids, el: body, linear: 'no' } as SectionBuildData;
      }),
    );

  interface ProcessedSection {
    ids: string[];
    title: string;
    titles?: { title: string; index: number }[];
    load: () => string;
    createDocument: () => Document;
    size: number;
    linear?: string;
  }

  const processedSections: ProcessedSection[] = sectionData.map(
    ({ ids, titles, el, linear }) => {
      const str = template(el.outerHTML);
      const sectionBlob = new Blob([str], { type: MIME.XHTML });
      const url = URL.createObjectURL(sectionBlob);
      urls.push(url);
      const title = normalizeWhitespace(
        el.querySelector('.title, .subtitle, p')?.textContent ??
          (el.classList.contains('title') ? el.textContent : ''),
      );
      return {
        ids,
        title,
        titles,
        load: () => url,
        createDocument: () =>
          new DOMParser().parseFromString(str, MIME.XHTML),
        // don't count image data as it'd skew the size too much
        size:
          sectionBlob.size -
          Array.from(
            el.querySelectorAll('[src]'),
            (srcEl) => srcEl.getAttribute('src')?.length ?? 0,
          ).reduce((a, b) => a + b, 0),
        linear,
      };
    },
  );

  const idMap = new Map<string, number>();
  book.sections = processedSections.map((section, index) => {
    const { ids, load, createDocument, size, linear } = section;
    for (const id of ids) if (id) idMap.set(id, index);
    return { id: index, load, createDocument, size, linear };
  });

  book.toc = processedSections
    .map(({ title, titles }, index) => {
      const id = index.toString();
      return {
        label: title,
        href: id,
        subitems: titles?.length
          ? titles.map(({ title: subTitle, index: subIndex }) => ({
              label: subTitle,
              href: `${id}#${subIndex}`,
            }))
          : null,
      };
    })
    .filter((item): item is TOCItem => !!item);

  book.resolveHref = (href: string): ResolvedHref => {
    const [a, b] = href.split('#');
    return a
      ? // the link is from the TOC
        {
          index: Number(a),
          anchor: (d: Document) =>
            d.querySelector(`[${dataID}="${b}"]`),
        }
      : // link from within the page
        {
          index: idMap.get(b),
          anchor: (d: Document) => d.getElementById(b),
        };
  };
  book.splitTOCHref = (href: string | null | undefined): number[] =>
    href?.split('#')?.map((x) => Number(x)) ?? [];
  book.getTOCFragment = (d: Document, id: string): Element | null =>
    d.querySelector(`[${dataID}="${id}"]`);

  book.destroy = () => {
    for (const url of urls) URL.revokeObjectURL(url);
  };
  return book;
};
