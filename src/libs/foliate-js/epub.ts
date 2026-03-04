import * as CFI from './epubcfi'

const NS = {
    CONTAINER: 'urn:oasis:names:tc:opendocument:xmlns:container',
    XHTML: 'http://www.w3.org/1999/xhtml',
    OPF: 'http://www.idpf.org/2007/opf',
    EPUB: 'http://www.idpf.org/2007/ops',
    DC: 'http://purl.org/dc/elements/1.1/',
    DCTERMS: 'http://purl.org/dc/terms/',
    ENC: 'http://www.w3.org/2001/04/xmlenc#',
    NCX: 'http://www.daisy.org/z3986/2005/ncx/',
    XLINK: 'http://www.w3.org/1999/xlink',
    SMIL: 'http://www.w3.org/ns/SMIL',
} as const

const MIME = {
    XML: 'application/xml' as const,
    NCX: 'application/x-dtbncx+xml' as const,
    XHTML: 'application/xhtml+xml' as const,
    HTML: 'text/html' as const,
    CSS: 'text/css' as const,
    SVG: 'image/svg+xml' as const,
    JS: /\/(x-)?(javascript|ecmascript)/,
}

// https://www.w3.org/TR/epub-33/#sec-reserved-prefixes
const PREFIX: Record<string, string> = {
    a11y: 'http://www.idpf.org/epub/vocab/package/a11y/#',
    dcterms: 'http://purl.org/dc/terms/',
    marc: 'http://id.loc.gov/vocabulary/',
    media: 'http://www.idpf.org/epub/vocab/overlays/#',
    onix: 'http://www.editeur.org/ONIX/book/codelists/current.html#',
    rendition: 'http://www.idpf.org/vocab/rendition/#',
    schema: 'http://schema.org/',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    msv: 'http://www.idpf.org/epub/vocab/structure/magazine/#',
    prism: 'http://www.prismstandard.org/specifications/3.0/PRISM_CV_Spec_3.0.htm#',
}

const RELATORS: Record<string, string> = {
    art: 'artist',
    aut: 'author',
    clr: 'colorist',
    edt: 'editor',
    ill: 'illustrator',
    nrt: 'narrator',
    trl: 'translator',
    pbl: 'publisher',
}

const ONIX5: Record<string, string> = {
    '02': 'isbn',
    '06': 'doi',
    '15': 'isbn',
    '26': 'doi',
    '34': 'issn',
}

interface ManifestItem {
    href: string
    id: string
    mediaType: string
    properties: string[] | null
    mediaOverlay: string | null
}

interface SpineItem {
    idref: string
    id: string
    linear: string | null
    properties: string[] | null
}

interface GuideReference {
    label: string
    type: string[]
    href: string
}

interface NavItem {
    label: string
    href: string | null
    subitems: NavItem[] | null
    type?: string[]
}

interface NavResult {
    toc: NavItem[] | null
    pageList: NavItem[] | null
    landmarks?: NavItem[] | null
    others: { label: string; type?: string[]; list: NavItem[] | null }[]
}

interface SMILAudioItem {
    text: string
    begin: number | undefined
    end: number | undefined
}

interface SMILAudioEntry {
    src: string
    items: SMILAudioItem[]
}

interface MetadataParsed {
    property: string | null
    scheme: string | null
    lang: string | null
    value: string
    props: Record<string, MetadataParsed[]> | null
    attrs: Record<string, string>
}

interface LanguageMap {
    [lang: string]: string
}

interface Contributor {
    name: string | LanguageMap | null
    sortAs?: string | LanguageMap | null
    role?: (string | null)[]
    code?: string | null
    scheme?: string | null
}

interface Collection {
    name: string | LanguageMap | null
    position?: string | null
}

interface AltIdentifier {
    scheme: string
    value: string
}

interface EpubMetadata {
    identifier: string
    title: string | LanguageMap | null
    sortAs?: string | LanguageMap | null
    subtitle?: string
    language?: string[]
    description?: string
    publisher?: Contributor | null
    published?: string
    modified?: string
    subject?: (Contributor | null)[]
    belongsTo?: {
        collection?: Collection[] | Collection
        series?: Collection[] | Collection | null
    }
    altIdentifier?: (string | AltIdentifier)[]
    source?: (string | AltIdentifier)[]
    rights?: string
    [key: string]: unknown
}

interface Rendition {
    layout?: string
    [key: string]: string | undefined
}

interface MediaProperties {
    duration?: number | string
    [key: string]: unknown
}

interface MetadataResult {
    metadata: EpubMetadata
    rendition: Rendition
    media: MediaProperties
}

interface DisplayOptions {
    fixedLayout: string
    openToSpread: string
}

interface Section {
    id: string
    load: () => Promise<string | null>
    unload: () => void
    createDocument: () => Promise<Document>
    size: number
    cfi: string
    linear: string | null
    pageSpread: string | undefined
    resolveHref: (href: string) => string
    mediaOverlay: ManifestItem | null
}

interface ResolvedHref {
    index: number
    anchor: (doc: Document) => Range | Element | number | null
}

interface LoaderOptions {
    loadText: (uri: string) => Promise<string>
    loadBlob: (uri: string) => Promise<Blob>
    resources: Resources
}

interface ResourcesOptions {
    opf: Document
    resolveHref: (url: string) => string
}

interface EPUBOptions {
    loadText: (uri: string) => Promise<string>
    loadBlob: (uri: string) => Promise<Blob>
    getSize: (href: string) => number
    sha1?: (str: string) => Promise<Uint8Array>
}

interface DeobfuscationAlgorithm {
    key: (opf: Document) => Uint8Array | Promise<Uint8Array>
    decode: (key: Uint8Array, blob: Blob) => Promise<Blob>
}

interface CalibreBookmarks {
    [key: string]: unknown
}

type ChildGetter = {
    $: (el: Element, name: string) => Element | undefined
    $$: (el: Element, name: string) => Element[]
    $$$: (el: Element | Document, name: string) => Element[]
}

// convert to camel case
const camel = (x: string): string => x.toLowerCase().replace(/[-:](.)/g, (_, g: string) => g.toUpperCase())

// strip and collapse ASCII whitespace
// https://infra.spec.whatwg.org/#strip-and-collapse-ascii-whitespace
const normalizeWhitespace = (str: string | null | undefined): string => str ? str
    .replace(/[\t\n\f\r ]+/g, ' ')
    .replace(/^[\t\n\f\r ]+/, '')
    .replace(/[\t\n\f\r ]+$/, '') : ''

const filterAttribute = (attr: string, value: string | ((val: string | null) => boolean), isList?: boolean): ((el: Element) => boolean) => isList
    ? (el: Element) => el.getAttribute(attr)?.split(/\s/)?.includes(value as string) ?? false
    : typeof value === 'function'
        ? (el: Element) => value(el.getAttribute(attr))
        : (el: Element) => el.getAttribute(attr) === value

const getAttributes = (...xs: string[]) => (el: Element | null): Record<string, string | null> | null =>
    el ? Object.fromEntries(xs.map(x => [camel(x), el.getAttribute(x)])) : null

const getElementText = (el: Element | null | undefined): string => normalizeWhitespace(el?.textContent)

const childGetter = (doc: Document | Element, ns: string): ChildGetter => {
    // ignore the namespace if it doesn't appear in document at all
    const useNS = doc.lookupNamespaceURI(null) === ns || doc.lookupPrefix(ns)
    const f = useNS
        ? (_el: Element, name: string) => (el: Element) => el.namespaceURI === ns && el.localName === name
        : (_el: Element, name: string) => (el: Element) => el.localName === name
    return {
        $: (el: Element, name: string) => [...el.children].find(f(el, name)),
        $$: (el: Element, name: string) => [...el.children].filter(f(el, name)),
        $$$: useNS
            ? (el: Element | Document, name: string) => [...(el as Element).getElementsByTagNameNS(ns, name)]
            : (el: Element | Document, name: string) => [...(el as Element).getElementsByTagName(name)],
    }
}

const resolveURL = (url: string, relativeTo: string): string => {
    try {
        // replace %2c in the url with a comma, this might be introduced by calibre
        url = url.replace(/%2c/, ',')
        if (relativeTo.includes(':') && !relativeTo.startsWith('OEBPS')) return new URL(url, relativeTo) as unknown as string
        // the base needs to be a valid URL, so set a base URL and then remove it
        const root = 'https://invalid.invalid/'
        const obj = new URL(url, root + relativeTo)
        obj.search = ''
        return decodeURI(obj.href.replace(root, ''))
    } catch(e) {
        console.warn(e)
        return url
    }
}

const isExternal = (uri: string): boolean => /^(?!blob)\w+:/i.test(uri)

// like `path.relative()` in Node.js
const pathRelative = (from: string, to: string): string => {
    if (!from) return to
    const as = from.replace(/\/$/, '').split('/')
    const bs = to.replace(/\/$/, '').split('/')
    const i = (as.length > bs.length ? as : bs).findIndex((_, i) => as[i] !== bs[i])
    return i < 0 ? '' : Array(as.length - i).fill('..').concat(bs.slice(i)).join('/')
}

const pathDirname = (str: string): string => str.slice(0, str.lastIndexOf('/') + 1)

// replace asynchronously and sequentially
// same technique as https://stackoverflow.com/a/48032528
const replaceSeries = async (str: string, regex: RegExp, f: (...args: string[]) => Promise<string>): Promise<string> => {
    const matches: string[][] = []
    str.replace(regex, (...args: string[]) => (matches.push(args), null as unknown as string))
    const results: string[] = []
    for (const args of matches) results.push(await f(...args))
    return str.replace(regex, () => results.shift()!)
}

const regexEscape = (str: string): string => str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')

const tidy = (obj: Record<string, unknown>): unknown => {
    for (const [key, val] of Object.entries(obj))
        if (val == null) delete obj[key]
        else if (Array.isArray(val)) {
            obj[key] = val.filter(x => x).map(x =>
                typeof x === 'object' && !Array.isArray(x) ? tidy(x as Record<string, unknown>) : x)
            if (!(obj[key] as unknown[]).length) delete obj[key]
            else if ((obj[key] as unknown[]).length === 1) obj[key] = (obj[key] as unknown[])[0]
        }
        else if (typeof val === 'object') {
            obj[key] = tidy(val as Record<string, unknown>)
            if (!Object.keys(val as Record<string, unknown>).length) delete obj[key]
        }
    const keys = Object.keys(obj)
    if (keys.length === 1 && keys[0] === 'name') return (obj as Record<string, unknown>)[keys[0]]
    return obj
}

// https://www.w3.org/TR/epub/#sec-prefix-attr
const getPrefixes = (doc: Document): Map<string, string> => {
    const map = new Map<string, string>(Object.entries(PREFIX))
    const value = doc.documentElement.getAttributeNS(NS.EPUB, 'prefix')
        || doc.documentElement.getAttribute('prefix')
    if (value) for (const [, prefix, url] of value
        .matchAll(/(.+): +(.+)[ \t\r\n]*/g)) map.set(prefix, url)
    return map
}

// https://www.w3.org/TR/epub-rs/#sec-property-values
// but ignoring the case where the prefix is omitted
const getPropertyURL = (value: string | null, prefixes: Map<string, string>): string | null => {
    if (!value) return null
    const [a, b] = value.split(':')
    const prefix = b ? a : null
    const reference = b ? b : a
    const baseURL = prefixes.get(prefix!)
    return baseURL ? baseURL + reference : null
}

const getMetadata = (opf: Document): MetadataResult => {
    const { $ } = childGetter(opf, NS.OPF)
    const $metadata = $(opf.documentElement, 'metadata')!

    // first pass: convert to JS objects
    const els = Object.groupBy([...$metadata.children] as Element[], (el: Element) =>
        el.namespaceURI === NS.DC ? 'dc'
        : el.namespaceURI === NS.OPF && el.localName === 'meta' ?
            (el.hasAttribute('name') ? 'legacyMeta' : 'meta') : '')
    const baseLang = $metadata.getAttribute('xml:lang')
        ?? opf.documentElement.getAttribute('xml:lang') ?? 'und'
    const prefixes = getPrefixes(opf)
    const parse = (el: Element): MetadataParsed => {
        const property = el.getAttribute('property')
        const scheme = el.getAttribute('scheme')
        return {
            property: getPropertyURL(property, prefixes) ?? property,
            scheme: getPropertyURL(scheme, prefixes) ?? scheme,
            lang: el.getAttribute('xml:lang'),
            value: getElementText(el),
            props: getProperties(el),
            // `opf:` attributes from EPUB 2 & EPUB 3.1 (removed in EPUB 3.2)
            attrs: Object.fromEntries(Array.from(el.attributes)
                .filter(attr => attr.namespaceURI === NS.OPF)
                .map(attr => [attr.localName, attr.value])),
        }
    }
    const refines = Map.groupBy(els.meta ?? [], (el: Element) => el.getAttribute('refines'))
    const getProperties = (el?: Element | null): Record<string, MetadataParsed[]> | null => {
        const els = refines.get(el ? '#' + el.getAttribute('id') : null)
        if (!els) return null
        return Object.groupBy(els.map(parse), (x: MetadataParsed) => x.property!) as Record<string, MetadataParsed[]>
    }
    const dc = Object.fromEntries(Object.entries(Object.groupBy(els.dc || [], (el: Element) => el.localName))
        .map(([name, els]) => [name, els!.map(parse)])) as Record<string, MetadataParsed[]>
    const properties = getProperties() ?? {} as Record<string, MetadataParsed[]>
    const legacyMeta = Object.fromEntries(els.legacyMeta?.map((el: Element) =>
        [el.getAttribute('name'), el.getAttribute('content')]) ?? []) as Record<string, string>

    // second pass: map to webpub
    const one = (x: MetadataParsed[] | undefined): string | undefined => x?.[0]?.value
    const prop = (x: MetadataParsed | undefined, p: string): string | undefined => one(x?.props?.[p])
    const makeLanguageMap = (x: MetadataParsed | undefined): string | LanguageMap | null => {
        if (!x) return null
        const alts = x.props?.['alternate-script'] ?? []
        const altRep = x.attrs['alt-rep']
        if (!alts.length && (!x.lang || x.lang === baseLang) && !altRep) return x.value
        const map: LanguageMap = { [x.lang ?? baseLang]: x.value }
        if (altRep) map[x.attrs['alt-rep-lang']] = altRep
        for (const y of alts) map[y.lang!] ??= y.value
        return map
    }
    const makeContributor = (x: MetadataParsed | undefined): Contributor | null => x ? ({
        name: makeLanguageMap(x),
        sortAs: makeLanguageMap(x.props?.['file-as']?.[0]) ?? x.attrs['file-as'],
        role: x.props?.role?.filter((x: MetadataParsed) => x.scheme === PREFIX.marc + 'relators')
            ?.map((x: MetadataParsed) => x.value) ?? [x.attrs.role],
        code: prop(x, 'term') ?? x.attrs.term,
        scheme: prop(x, 'authority') ?? x.attrs.authority,
    }) : null
    const makeCollection = (x: MetadataParsed): Collection => ({
        name: makeLanguageMap(x),
        // NOTE: webpub requires number but EPUB allows values like "2.2.1"
        position: one(x.props?.['group-position']),
    })
    const makeAltIdentifier = (x: MetadataParsed): string | AltIdentifier => {
        const { value } = x
        if (/^urn:/i.test(value)) return value
        if (/^doi:/i.test(value)) return `urn:${value}`
        const type = x.props?.['identifier-type']
        if (!type) {
            const scheme = x.attrs.scheme
            if (!scheme) return value
            // https://idpf.github.io/epub-registries/identifiers/
            // but no "jdcn", which isn't a registered URN namespace
            if (/^(doi|isbn|uuid)$/i.test(scheme)) return `urn:${scheme}:${value}`
            // NOTE: webpub requires scheme to be a URI; EPUB allows anything
            return { scheme, value }
        }
        if (type[0]?.scheme === PREFIX.onix + 'codelist5') {
            const nid = ONIX5[type[0].value]
            if (nid) return `urn:${nid}:${value}`
        }
        return value
    }
    const belongsTo = Object.groupBy(properties['belongs-to-collection'] ?? [],
        (x: MetadataParsed) => prop(x, 'collection-type') === 'series' ? 'series' : 'collection')
    const mainTitle = dc.title?.find((x: MetadataParsed) => prop(x, 'title-type') === 'main') ?? dc.title?.[0]
    const metadata: EpubMetadata = {
        identifier: getIdentifier(opf),
        title: makeLanguageMap(mainTitle),
        sortAs: makeLanguageMap(mainTitle?.props?.['file-as']?.[0])
            ?? mainTitle?.attrs?.['file-as']
            ?? legacyMeta?.['calibre:title_sort'],
        subtitle: dc.title?.find((x: MetadataParsed) => prop(x, 'title-type') === 'subtitle')?.value,
        language: dc.language?.map((x: MetadataParsed) => x.value),
        description: one(dc.description),
        publisher: makeContributor(dc.publisher?.[0]),
        published: dc.date?.find((x: MetadataParsed) => x.attrs.event === 'publication')?.value
            ?? one(dc.date),
        modified: one(properties[PREFIX.dcterms + 'modified'])
            ?? dc.date?.find((x: MetadataParsed) => x.attrs.event === 'modification')?.value,
        subject: dc.subject?.map(makeContributor),
        belongsTo: {
            collection: belongsTo.collection?.map(makeCollection),
            series: belongsTo.series?.map(makeCollection)
            ?? legacyMeta?.['calibre:series'] ? {
                name: legacyMeta?.['calibre:series'],
                position: parseFloat(legacyMeta?.['calibre:series_index']),
            } as unknown as Collection : null,
        },
        altIdentifier: dc.identifier?.map(makeAltIdentifier),
        source: dc.source?.map(makeAltIdentifier), // NOTE: not in webpub schema
        rights: one(dc.rights), // NOTE: not in webpub schema
    }
    const remapContributor = (defaultKey: string) => (x: Contributor) => {
        const keys = new Set<string>(x.role?.map((role: string | null) => RELATORS[role!] ?? defaultKey))
        return [keys.size ? keys : [defaultKey], x] as [Set<string> | string[], Contributor]
    }
    for (const [keys, val] of ([] as [Set<string> | string[], Contributor][]).concat(
        dc.creator?.map(makeContributor)?.filter((x): x is Contributor => x !== null)?.map(remapContributor('author')) ?? [],
        dc.contributor?.map(makeContributor)?.filter((x): x is Contributor => x !== null)?.map(remapContributor('contributor')) ?? []))
        for (const key of keys)
            if (metadata[key]) (metadata[key] as Contributor[]).push(val)
            else metadata[key] = [val]
    tidy(metadata as unknown as Record<string, unknown>)
    if (metadata.altIdentifier as unknown === metadata.identifier)
        delete metadata.altIdentifier

    const rendition: Rendition = {}
    const media: MediaProperties = {}
    for (const [key, val] of Object.entries(properties)) {
        if (key.startsWith(PREFIX.rendition))
            rendition[camel(key.replace(PREFIX.rendition, ''))] = one(val)
        else if (key.startsWith(PREFIX.media))
            media[camel(key.replace(PREFIX.media, ''))] = one(val)
    }
    if (media.duration) media.duration = parseClock(media.duration as string)!
    return { metadata, rendition, media }
}

const parseNav = (doc: Document, resolve: (href: string) => string = (f: string) => f): NavResult => {
    const { $, $$, $$$ } = childGetter(doc, NS.XHTML)
    const resolveHref = (href: string | null): string | null => href ? decodeURI(resolve(href)) : null
    const parseLI = (getType: boolean) => ($li: Element): NavItem => {
        const $a = $($li, 'a') ?? $($li, 'span')
        const $ol = $($li, 'ol')
        const href = resolveHref($a?.getAttribute('href') ?? null)
        const label = getElementText($a) || $a?.getAttribute('title') || ''
        // TODO: get and concat alt/title texts in content
        const result: NavItem = { label, href, subitems: parseOL($ol) }
        if (getType) result.type = $a?.getAttributeNS(NS.EPUB, 'type')?.split(/\s/)
        return result
    }
    const parseOL = ($ol: Element | undefined, getType?: boolean): NavItem[] | null => $ol ? $$($ol, 'li').map(parseLI(!!getType)) : null
    const parseNavEl = ($nav: Element, getType?: boolean): NavItem[] | null => parseOL($($nav, 'ol'), getType)

    const $$nav = $$$(doc, 'nav')
    let toc: NavItem[] | null = null
    let pageList: NavItem[] | null = null
    let landmarks: NavItem[] | null = null
    const others: { label: string; type: string[]; list: NavItem[] | null }[] = []
    for (const $nav of $$nav) {
        const type = $nav.getAttributeNS(NS.EPUB, 'type')?.split(/\s/) ?? []
        if (type.includes('toc')) toc ??= parseNavEl($nav)
        else if (type.includes('page-list')) pageList ??= parseNavEl($nav)
        else if (type.includes('landmarks')) landmarks ??= parseNavEl($nav, true)
        else others.push({
            label: getElementText($nav.firstElementChild), type,
            list: parseNavEl($nav),
        })
    }
    return { toc, pageList, landmarks, others }
}

const parseNCX = (doc: Document, resolve: (href: string) => string = (f: string) => f): NavResult => {
    const { $, $$ } = childGetter(doc, NS.NCX)
    const resolveHref = (href: string | null): string | null => href ? decodeURI(resolve(href)) : null
    const parseItem = (el: Element): NavItem => {
        const $label = $(el, 'navLabel')
        const $content = $(el, 'content')
        const label = getElementText($label)
        const href = resolveHref($content!.getAttribute('src'))
        if (el.localName === 'navPoint') {
            const els = $$(el, 'navPoint')
            return { label, href, subitems: els.length ? els.map(parseItem) : null }
        }
        return { label, href, subitems: null }
    }
    const parseList = (el: Element, itemName: string): NavItem[] => $$(el, itemName).map(parseItem)
    const getSingle = (container: string, itemName: string): NavItem[] | null => {
        const $container = $(doc.documentElement, container)
        return $container ? parseList($container, itemName) : null
    }
    return {
        toc: getSingle('navMap', 'navPoint'),
        pageList: getSingle('pageList', 'pageTarget'),
        others: $$(doc.documentElement, 'navList').map(el => ({
            label: getElementText($(el, 'navLabel')),
            list: parseList(el, 'navTarget'),
        })),
    }
}

const parseClock = (str: string | null | undefined): number | undefined => {
    if (!str) return
    const parts = str.split(':').map(x => parseFloat(x))
    if (parts.length === 3) {
        const [h, m, s] = parts
        return h * 60 * 60 + m * 60 + s
    }
    if (parts.length === 2) {
        const [m, s] = parts
        return m * 60 + s
    }
    const [x, unit] = str.split(/(?=[^\d.])/)
    const n = parseFloat(x)
    const f = unit === 'h' ? 60 * 60
        : unit === 'min' ? 60
        : unit === 'ms' ? .001
        : 1
    return n * f
}

class MediaOverlay extends EventTarget {
    #entries: SMILAudioEntry[] = []
    #lastMediaOverlayItem: ManifestItem | null = null
    #sectionIndex: number = 0
    #audioIndex: number = -1
    #itemIndex: number = -1
    #audio: HTMLAudioElement | null = null
    #volume: number = 1
    #rate: number = 1
    #state: string | undefined
    book: EPUB
    loadXML: (uri: string) => Promise<Document | null>
    constructor(book: EPUB, loadXML: (uri: string) => Promise<Document | null>) {
        super()
        this.book = book
        this.loadXML = loadXML
    }
    async #loadSMIL(item: ManifestItem): Promise<void> {
        if (this.#lastMediaOverlayItem === item) return
        const doc = await this.loadXML(item.href)
        if (!doc) return
        const resolve = (href: string | null): string | null => href ? resolveURL(href, item.href) : null
        const { $, $$$ } = childGetter(doc, NS.SMIL)
        this.#audioIndex = -1
        this.#itemIndex = -1
        this.#entries = $$$(doc, 'par').reduce((arr: SMILAudioEntry[], $par: Element) => {
            const text = resolve($($par, 'text')?.getAttribute('src') ?? null)
            const $audio = $($par, 'audio')
            if (!text || !$audio) return arr
            const src = resolve($audio.getAttribute('src'))
            const begin = parseClock($audio.getAttribute('clipBegin'))
            const end = parseClock($audio.getAttribute('clipEnd'))
            const last = arr.at(-1)
            if (last?.src === src) last.items.push({ text, begin, end })
            else arr.push({ src: src!, items: [{ text, begin, end }] })
            return arr
        }, [])
        this.#lastMediaOverlayItem = item
    }
    get #activeAudio(): SMILAudioEntry | undefined {
        return this.#entries[this.#audioIndex]
    }
    get #activeItem(): SMILAudioItem | undefined {
        return this.#activeAudio?.items?.[this.#itemIndex]
    }
    #error(e: unknown): void {
        console.error(e)
        this.dispatchEvent(new CustomEvent('error', { detail: e }))
    }
    #highlight(): void {
        this.dispatchEvent(new CustomEvent('highlight', { detail: this.#activeItem }))
    }
    #unhighlight(): void {
        this.dispatchEvent(new CustomEvent('unhighlight', { detail: this.#activeItem }))
    }
    async #play(audioIndex: number, itemIndex: number): Promise<void> {
        this.#stop()
        this.#audioIndex = audioIndex
        this.#itemIndex = itemIndex
        const src = this.#activeAudio?.src
        if (!src || !this.#activeItem) return this.start(this.#sectionIndex + 1)

        const url = URL.createObjectURL(await this.book.loadBlob(src))
        const audio = new Audio(url)
        this.#audio = audio
        audio.volume = this.#volume
        audio.playbackRate = this.#rate
        audio.addEventListener('timeupdate', () => {
            if (audio.paused) return
            const t = audio.currentTime
            const { items } = this.#activeAudio!
            if (t > this.#activeItem?.end!) {
                this.#unhighlight()
                if (this.#itemIndex === items.length - 1) {
                    this.#play(this.#audioIndex + 1, 0).catch(e => this.#error(e))
                    return
                }
            }
            const oldIndex = this.#itemIndex
            while (items[this.#itemIndex + 1]?.begin! <= t) this.#itemIndex++
            if (this.#itemIndex !== oldIndex) this.#highlight()
        })
        audio.addEventListener('error', () =>
            this.#error(new Error(`Failed to load ${src}`)))
        audio.addEventListener('playing', () => this.#highlight())
        audio.addEventListener('ended', () => {
            this.#unhighlight()
            URL.revokeObjectURL(url)
            this.#audio = null
            this.#play(audioIndex + 1, 0).catch(e => this.#error(e))
        })
        if (this.#state === 'paused') {
            this.#highlight()
            audio.currentTime = this.#activeItem.begin ?? 0
        }
        else audio.addEventListener('canplaythrough', () => {
            // for some reason need to seek in `canplaythrough`
            // or it won't play when skipping in WebKit
            audio.currentTime = this.#activeItem!.begin ?? 0
            this.#state = 'playing'
            audio.play().catch(e => this.#error(e))
        }, { once: true })
    }
    async start(sectionIndex: number, filter: (item: SMILAudioItem, index: number, items: SMILAudioItem[]) => boolean = () => true): Promise<void> {
        this.#audio?.pause()
        const section = this.book.sections[sectionIndex]
        const href = section?.id
        if (!href) return

        const { mediaOverlay } = section
        if (!mediaOverlay) return this.start(sectionIndex + 1)
        this.#sectionIndex = sectionIndex
        await this.#loadSMIL(mediaOverlay)

        for (let i = 0; i < this.#entries.length; i++) {
            const { items } = this.#entries[i]
            for (let j = 0; j < items.length; j++) {
                if (items[j].text.split('#')[0] === href && filter(items[j], j, items))
                    return this.#play(i, j).catch(e => this.#error(e))
            }
        }
    }
    pause(): void {
        this.#state = 'paused'
        this.#audio?.pause()
    }
    resume(): void {
        this.#state = 'playing'
        this.#audio?.play().catch(e => this.#error(e))
    }
    #stop(): void {
        if (this.#audio) {
            this.#audio.pause()
            URL.revokeObjectURL(this.#audio.src)
            this.#audio = null
            this.#unhighlight()
        }
    }
    stop(): void {
        this.#state = 'stopped'
        this.#stop()
    }
    prev(): void {
        if (this.#itemIndex > 0) this.#play(this.#audioIndex, this.#itemIndex - 1)
        else if (this.#audioIndex > 0) this.#play(this.#audioIndex - 1,
            this.#entries[this.#audioIndex - 1].items.length - 1)
        else if (this.#sectionIndex > 0)
            this.start(this.#sectionIndex - 1, (_: SMILAudioItem, i: number, items: SMILAudioItem[]) => i === items.length - 1)
    }
    next(): void {
        this.#play(this.#audioIndex, this.#itemIndex + 1)
    }
    setVolume(volume: number): void {
        this.#volume = volume
        if (this.#audio) this.#audio.volume = volume
    }
    setRate(rate: number): void {
        this.#rate = rate
        if (this.#audio) this.#audio.playbackRate = rate
    }
}

const isUUID = /([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})/

const getUUID = (opf: Document): string => {
    for (const el of opf.getElementsByTagNameNS(NS.DC, 'identifier')) {
        const [id] = getElementText(el).split(':').slice(-1)
        if (isUUID.test(id)) return id
    }
    return ''
}

const getIdentifier = (opf: Document): string => getElementText(
    opf.getElementById(opf.documentElement.getAttribute('unique-identifier')!)
    ?? opf.getElementsByTagNameNS(NS.DC, 'identifier')[0])

// https://www.w3.org/publishing/epub32/epub-ocf.html#sec-resource-obfuscation
const deobfuscate = async (key: Uint8Array, length: number, blob: Blob): Promise<Blob> => {
    const array = new Uint8Array(await blob.slice(0, length).arrayBuffer())
    length = Math.min(length, array.length)
    for (let i = 0; i < length; i++) array[i] = array[i] ^ key[i % key.length]
    return new Blob([array, blob.slice(length)], { type: blob.type })
}

const WebCryptoSHA1 = async (str: string): Promise<Uint8Array> => {
    const data = new TextEncoder().encode(str)
    const buffer = await globalThis.crypto.subtle.digest('SHA-1', data)
    return new Uint8Array(buffer)
}

const deobfuscators = (sha1: (str: string) => Promise<Uint8Array> = WebCryptoSHA1): Record<string, DeobfuscationAlgorithm> => ({
    'http://www.idpf.org/2008/embedding': {
        key: (opf: Document) => sha1(getIdentifier(opf)
            // eslint-disable-next-line no-control-regex
            .replaceAll(/[\u0020\u0009\u000d\u000a]/g, '')),
        decode: (key: Uint8Array, blob: Blob) => deobfuscate(key, 1040, blob),
    },
    'http://ns.adobe.com/pdf/enc#RC': {
        key: (opf: Document) => {
            const uuid = getUUID(opf).replaceAll('-', '')
            return Uint8Array.from({ length: 16 }, (_, i) =>
                parseInt(uuid.slice(i * 2, i * 2 + 2), 16))
        },
        decode: (key: Uint8Array, blob: Blob) => deobfuscate(key, 1024, blob),
    },
})

class Encryption {
    #uris = new Map<string, string>()
    #decoders = new Map<string, (blob: Blob) => Blob | Promise<Blob>>()
    #algorithms: Record<string, DeobfuscationAlgorithm>
    constructor(algorithms: Record<string, DeobfuscationAlgorithm>) {
        this.#algorithms = algorithms
    }
    async init(encryption: Document | null, opf: Document): Promise<void> {
        if (!encryption) return
        const data = Array.from(
            encryption.getElementsByTagNameNS(NS.ENC, 'EncryptedData'), (el: Element) => ({
                algorithm: el.getElementsByTagNameNS(NS.ENC, 'EncryptionMethod')[0]
                    ?.getAttribute('Algorithm'),
                uri: el.getElementsByTagNameNS(NS.ENC, 'CipherReference')[0]
                    ?.getAttribute('URI'),
            }))
        for (const { algorithm, uri } of data) {
            if (!algorithm || !uri) continue
            if (!this.#decoders.has(algorithm)) {
                const algo = this.#algorithms[algorithm]
                if (!algo) {
                    console.warn('Unknown encryption algorithm')
                    continue
                }
                const key = await algo.key(opf)
                this.#decoders.set(algorithm, (blob: Blob) => algo.decode(key, blob))
            }
            this.#uris.set(uri, algorithm)
        }
    }
    getDecoder(uri: string): (blob: Blob) => Blob | Promise<Blob> {
        return this.#decoders.get(this.#uris.get(uri)!) ?? ((x: Blob) => x)
    }
}

class Resources {
    opf: Document
    manifest: ManifestItem[]
    spine: SpineItem[]
    pageProgressionDirection: string | null
    navPath: string | undefined
    ncxPath: string | undefined
    guide?: GuideReference[]
    cover: ManifestItem | undefined
    cfis: string[]
    constructor({ opf, resolveHref }: ResourcesOptions) {
        this.opf = opf
        const { $, $$, $$$ } = childGetter(opf, NS.OPF)

        const $manifest = $(opf.documentElement, 'manifest')!
        const $spine = $(opf.documentElement, 'spine')!
        const $$itemref = $$($spine, 'itemref')

        this.manifest = $$($manifest, 'item')
            .map(getAttributes('href', 'id', 'media-type', 'properties', 'media-overlay'))
            .map(item => {
                const i = item as unknown as ManifestItem
                i.href = resolveHref((i as unknown as Record<string, string>).href)
                i.properties = (item as unknown as Record<string, string | null>).properties?.split(/\s/) ?? null
                return i
            })
        this.spine = $$itemref
            .map(getAttributes('idref', 'id', 'linear', 'properties'))
            .map(item => {
                const i = item as unknown as SpineItem
                i.properties = (item as unknown as Record<string, string | null>).properties?.split(/\s/) ?? null
                return i
            })
        this.pageProgressionDirection = $spine
            .getAttribute('page-progression-direction')

        this.navPath = this.getItemByProperty('nav')?.href
        this.ncxPath = (this.getItemByID($spine.getAttribute('toc'))
            ?? this.manifest.find(item => item.mediaType === MIME.NCX))?.href

        const $guide = $(opf.documentElement, 'guide')
        if ($guide) this.guide = $$($guide, 'reference')
            .map(getAttributes('type', 'title', 'href'))
            .map((item) => { const { type, title, href } = item as Record<string, string | null>; return ({
                label: title!,
                type: type!.split(/\s/),
                href: resolveHref(href!),
            })})

        this.cover = this.getItemByProperty('cover-image')
            // EPUB 2 compat
            ?? this.getItemByID($$$(opf, 'meta')
                .find(filterAttribute('name', 'cover'))
                ?.getAttribute('content'))
            ?? this.manifest.find(item => item.href.includes('cover')
                && item.mediaType.startsWith('image'))
            ?? this.getItemByHref(this.guide
                ?.find(ref => ref.type.includes('cover'))?.href)

        this.cfis = CFI.fromElements($$itemref)
    }
    getItemByID(id: string | null | undefined): ManifestItem | undefined {
        return this.manifest.find(item => item.id === id)
    }
    getItemByHref(href: string | undefined): ManifestItem | undefined {
        return this.manifest.find(item => item.href === href)
    }
    getItemByProperty(prop: string): ManifestItem | undefined {
        return this.manifest.find(item => item.properties?.includes(prop))
    }
    resolveCFI(cfi: string): ResolvedHref {
        const parts = CFI.parse(cfi)
        const top = ((parts as { parent?: CFI.CFIPart[][] }).parent ?? parts as unknown as CFI.CFIPart[][]).shift()!
        let $itemref = CFI.toElement(this.opf, top as unknown as string)
        // make sure it's an idref; if not, try again without the ID assertion
        // mainly because Epub.js used to generate wrong ID assertions
        // https://github.com/futurepress/epub.js/issues/1236
        if ($itemref && $itemref.nodeName !== 'idref') {
            (top as CFI.CFIPart[])[(top as CFI.CFIPart[]).length - 1].id = null as unknown as string
            $itemref = CFI.toElement(this.opf, top as unknown as string)
        }
        const idref = ($itemref as Element)?.getAttribute('idref')
        const index = this.spine.findIndex(item => item.idref === idref)
        const anchor = (doc: Document) => CFI.toRange(doc, parts as unknown as string)
        return { index, anchor }
    }
}

class Loader {
    #cache = new Map<string, string>()
    #children = new Map<string, string[]>()
    #refCount = new Map<string, number>()
    allowScript: boolean = false
    eventTarget = new EventTarget()
    loadText: (uri: string) => Promise<string>
    loadBlob: (uri: string) => Promise<Blob>
    manifest: ManifestItem[]
    assets: ManifestItem[]
    constructor({ loadText, loadBlob, resources }: LoaderOptions) {
        this.loadText = loadText
        this.loadBlob = loadBlob
        this.manifest = resources.manifest
        this.assets = resources.manifest
        // needed only when replacing in (X)HTML w/o parsing (see below)
        //.filter(({ mediaType }) => ![MIME.XHTML, MIME.HTML].includes(mediaType))
    }
    async createURL(href: string, data: string | Promise<string | Blob | ArrayBuffer> | Blob | ArrayBuffer, type: string, parent?: string): Promise<string> {
        if (!data) return ''
        const detail: { data: unknown; type: unknown; readonly name?: string } = { data, type }
        Object.defineProperty(detail, 'name', { value: href }) // readonly
        const event = new CustomEvent('data', { detail })
        this.eventTarget.dispatchEvent(event)
        const newData = await event.detail.data
        const newType = await event.detail.type as string
        const url = URL.createObjectURL(new Blob([newData as BlobPart], { type: newType }))
        this.#cache.set(href, url)
        this.#refCount.set(href, 1)
        if (parent) {
            const childList = this.#children.get(parent)
            if (childList) childList.push(href)
            else this.#children.set(parent, [href])
        }
        return url
    }
    ref(href: string, parent?: string): string | undefined {
        const childList = this.#children.get(parent!)
        if (!childList?.includes(href)) {
            this.#refCount.set(href, this.#refCount.get(href)! + 1)
            if (childList) childList.push(href)
            else this.#children.set(parent!, [href])
        }
        return this.#cache.get(href)
    }
    unref(href: string): void {
        if (!this.#refCount.has(href)) return
        const count = this.#refCount.get(href)! - 1
        if (count < 1) {
            URL.revokeObjectURL(this.#cache.get(href)!)
            this.#cache.delete(href)
            this.#refCount.delete(href)
            // unref children
            const childList = this.#children.get(href)
            if (childList) while (childList.length) this.unref(childList.pop()!)
            this.#children.delete(href)
        } else this.#refCount.set(href, count)
    }
    // load manifest item, recursively loading all resources as needed
    async loadItem(item: ManifestItem | null | undefined, parents: string[] = []): Promise<string | null> {
        if (!item) return null
        const { href, mediaType } = item

        const isScript = MIME.JS.test(item.mediaType)
        if (isScript && !this.allowScript) return null

        const parent = parents.at(-1)
        if (this.#cache.has(href)) return this.ref(href, parent) ?? null

        const shouldReplace =
            (isScript || [MIME.XHTML, MIME.HTML, MIME.CSS, MIME.SVG].includes(mediaType as typeof MIME.XHTML))
            // prevent circular references
            && parents.every(p => p !== href)
        if (shouldReplace) return this.loadReplaced(item, parents)
        // NOTE: this can be replaced with `Promise.try()`
        const tryLoadBlob = Promise.resolve().then(() => this.loadBlob(href))
        return this.createURL(href, tryLoadBlob, mediaType, parent)
    }
    async loadHref(href: string, base: string, parents: string[] = []): Promise<string> {
        if (isExternal(href)) return href
        const path = resolveURL(href, base)
        const item = this.manifest.find(item => item.href === path)
        if (!item) return href
        return (await this.loadItem(item, parents.concat(base))) ?? href
    }
    async loadReplaced(item: ManifestItem, parents: string[] = []): Promise<string | null> {
        const { href } = item
        let { mediaType } = item
        const parent = parents.at(-1)
        let str = ''
        try {
            str = await this.loadText(href)
        } catch (e) {
            return this.createURL(href, Promise.reject(e), mediaType, parent)
        }
        if (!str) return null

        // note that one can also just use `replaceString` for everything:
        // ```
        // const replaced = await this.replaceString(str, href, parents)
        // return this.createURL(href, replaced, mediaType, parent)
        // ```
        // which is basically what Epub.js does, which is simpler, but will
        // break things like iframes (because you don't want to replace links)
        // or text that just happen to be paths

        // parse and replace in HTML
        if ([MIME.XHTML, MIME.HTML, MIME.SVG].includes(mediaType as typeof MIME.XHTML)) {
            let doc = new DOMParser().parseFromString(str, mediaType as DOMParserSupportedType)
            // change to HTML if it's not valid XHTML
            if (mediaType === MIME.XHTML && (doc.querySelector('parsererror')
            || !doc.documentElement?.namespaceURI)) {
                console.warn((doc.querySelector('parsererror') as HTMLElement | null)?.innerText ?? 'Invalid XHTML')
                item.mediaType = MIME.HTML
                mediaType = MIME.HTML
                doc = new DOMParser().parseFromString(str, item.mediaType as DOMParserSupportedType)
            }
            // replace hrefs in XML processing instructions
            // this is mainly for SVGs that use xml-stylesheet
            if ([MIME.XHTML, MIME.SVG].includes(item.mediaType as typeof MIME.XHTML)) {
                let child: ChildNode | null = doc.firstChild
                while (child instanceof ProcessingInstruction) {
                    if (child.data) {
                        const replacedData = await replaceSeries(child.data,
                            /(?:^|\s*)(href\s*=\s*['"])([^'"]*)(['"])/i,
                            (_: string, p1: string, p2: string, p3: string) => this.loadHref(p2, href, parents)
                                .then(p2 => `${p1}${p2}${p3}`))
                        child.replaceWith(doc.createProcessingInstruction(
                            child.target, replacedData))
                    }
                    child = child.nextSibling
                }
            }
            // replace hrefs (excluding anchors)
            // TODO: srcset?
            const replace = async (el: Element, attr: string): Promise<void> => {
                el.setAttribute(attr,
                    await this.loadHref(el.getAttribute(attr)!, href, parents))
            }
            for (const el of doc.querySelectorAll('link[href]')) await replace(el, 'href')
            for (const el of doc.querySelectorAll('[src]')) await replace(el, 'src')
            for (const el of doc.querySelectorAll('[poster]')) await replace(el, 'poster')
            for (const el of doc.querySelectorAll('object[data]')) await replace(el, 'data')
            for (const el of doc.querySelectorAll('[*|href]:not([href])'))
                el.setAttributeNS(NS.XLINK, 'href', await this.loadHref(
                    el.getAttributeNS(NS.XLINK, 'href')!, href, parents))
            // replace inline styles
            for (const el of doc.querySelectorAll('style'))
                if (el.textContent) el.textContent =
                    await this.replaceCSS(el.textContent, href, parents)
            for (const el of doc.querySelectorAll('[style]'))
                el.setAttribute('style',
                    await this.replaceCSS(el.getAttribute('style')!, href, parents))
            // TODO: replace inline scripts? probably not worth the trouble
            const result = new XMLSerializer().serializeToString(doc)
            return this.createURL(href, result, item.mediaType, parent)
        }

        const result = mediaType === MIME.CSS
            ? await this.replaceCSS(str, href, parents)
            : await this.replaceString(str, href, parents)
        return this.createURL(href, result, mediaType, parent)
    }
    async replaceCSS(str: string, href: string, parents: string[] = []): Promise<string> {
        const replacedUrls = await replaceSeries(str,
            /url\(\s*["']?([^'"\n]*?)\s*["']?\s*\)/gi,
            (_: string, url: string) => this.loadHref(url, href, parents)
                .then(url => `url("${url}")`))
        // apart from `url()`, strings can be used for `@import` (but why?!)
        return replaceSeries(replacedUrls,
            /@import\s*["']([^"'\n]*?)["']/gi,
            (_: string, url: string) => this.loadHref(url, href, parents)
                .then(url => `@import "${url}"`))
    }
    // find & replace all possible relative paths for all assets without parsing
    replaceString(str: string, href: string, parents: string[] = []): Promise<string> | string {
        const assetMap = new Map<string, ManifestItem>()
        const urls = this.assets.map(asset => {
            // do not replace references to the file itself
            if (asset.href === href) return
            // href was decoded and resolved when parsing the manifest
            const relative = pathRelative(pathDirname(href), asset.href)
            const relativeEnc = encodeURI(relative)
            const rootRelative = '/' + asset.href
            const rootRelativeEnc = encodeURI(rootRelative)
            const set = new Set([relative, relativeEnc, rootRelative, rootRelativeEnc])
            for (const url of set) assetMap.set(url, asset)
            return Array.from(set)
        }).flat().filter((x): x is string => !!x)
        if (!urls.length) return str
        const regex = new RegExp(urls.map(regexEscape).join('|'), 'g')
        return replaceSeries(str, regex, async (match: string) =>
            (await this.loadItem(assetMap.get(match.replace(/^\//, '')),
                parents.concat(href))) ?? match)
    }
    unloadItem(item: ManifestItem | null | undefined): void {
        this.unref(item?.href ?? '')
    }
    destroy(): void {
        for (const url of this.#cache.values()) URL.revokeObjectURL(url)
    }
}

const getHTMLFragment = (doc: Document, id: string): Element | null => doc.getElementById(id)
    ?? doc.querySelector(`[name="${CSS.escape(id)}"]`)

const getPageSpread = (properties: string[]): string | undefined => {
    for (const p of properties) {
        if (p === 'page-spread-left' || p === 'rendition:page-spread-left')
            return 'left'
        if (p === 'page-spread-right' || p === 'rendition:page-spread-right')
            return 'right'
        if (p === 'rendition:page-spread-center') return 'center'
    }
}

const getDisplayOptions = (doc: Document | null): DisplayOptions | null => {
    if (!doc) return null
    return {
        fixedLayout: getElementText(doc.querySelector('option[name="fixed-layout"]')),
        openToSpread: getElementText(doc.querySelector('option[name="open-to-spread"]')),
    }
}

export class EPUB {
    parser = new DOMParser()
    #loader: Loader | null = null
    #encryption: Encryption
    loadText: (uri: string) => Promise<string>
    loadBlob: (uri: string) => Promise<Blob>
    getSize: (href: string) => number
    resources!: Resources
    transformTarget!: EventTarget
    sections!: Section[]
    toc: NavItem[] | null = null
    pageList: NavItem[] | null = null
    landmarks: NavItem[] | null = null
    metadata!: EpubMetadata
    rendition!: Rendition
    media!: MediaProperties
    dir: string | null = null
    constructor({ loadText, loadBlob, getSize, sha1 }: EPUBOptions) {
        this.loadText = loadText
        this.loadBlob = loadBlob
        this.getSize = getSize
        this.#encryption = new Encryption(deobfuscators(sha1))
    }
    async #loadXML(uri: string): Promise<Document | null> {
        const str = await this.loadText(uri)
        if (!str) return null
        const doc = this.parser.parseFromString(str, MIME.XML)
        if (doc.querySelector('parsererror'))
            throw new Error(`XML parsing error: ${uri}
${(doc.querySelector('parsererror') as HTMLElement).innerText}`)
        return doc
    }
    async init(): Promise<this> {
        const $container = await this.#loadXML('META-INF/container.xml')
        if (!$container) throw new Error('Failed to load container file')

        const opfs = Array.from(
            $container.getElementsByTagNameNS(NS.CONTAINER, 'rootfile'),
            getAttributes('full-path', 'media-type'))
            .filter(file => file!.mediaType === 'application/oebps-package+xml')

        if (!opfs.length) throw new Error('No package document defined in container')
        const opfPath = (opfs[0] as Record<string, string>).fullPath
        const opf = await this.#loadXML(opfPath)
        if (!opf) throw new Error('Failed to load package document')

        const $encryption = await this.#loadXML('META-INF/encryption.xml')
        await this.#encryption.init($encryption, opf)

        this.resources = new Resources({
            opf,
            resolveHref: (url: string) => resolveURL(url, opfPath),
        })
        this.#loader = new Loader({
            loadText: this.loadText,
            loadBlob: (uri: string) => Promise.resolve(this.loadBlob(uri))
                .then(this.#encryption.getDecoder(uri)),
            resources: this.resources,
        })
        this.transformTarget = this.#loader.eventTarget
        this.sections = this.resources.spine.map((spineItem: SpineItem, index: number) => {
            const { idref, linear, properties = [] } = spineItem
            const item = this.resources.getItemByID(idref)
            if (!item) {
                console.warn(`Could not find item with ID "${idref}" in manifest`)
                return null
            }
            return {
                id: item.href,
                load: () => this.#loader!.loadItem(item),
                unload: () => this.#loader!.unloadItem(item),
                createDocument: () => this.loadDocument(item),
                size: this.getSize(item.href),
                cfi: this.resources.cfis[index],
                linear,
                pageSpread: getPageSpread(properties ?? []),
                resolveHref: (href: string) => resolveURL(href, item.href),
                mediaOverlay: item.mediaOverlay
                    ? this.resources.getItemByID(item.mediaOverlay) ?? null : null,
            }
        }).filter((s): s is Section => s !== null)

        const { navPath, ncxPath } = this.resources
        if (navPath) try {
            const resolve = (url: string) => resolveURL(url, navPath)
            const nav = parseNav((await this.#loadXML(navPath))!, resolve)
            this.toc = nav.toc
            this.pageList = nav.pageList
            this.landmarks = nav.landmarks ?? null
        } catch(e) {
            console.warn(e)
        }
        if (!this.toc && ncxPath) try {
            const resolve = (url: string) => resolveURL(url, ncxPath)
            const ncx = parseNCX((await this.#loadXML(ncxPath))!, resolve)
            this.toc = ncx.toc
            this.pageList = ncx.pageList
        } catch(e) {
            console.warn(e)
        }
        this.landmarks ??= this.resources.guide as NavItem[] | null ?? null

        const { metadata, rendition, media } = getMetadata(opf)
        this.metadata = metadata
        this.rendition = rendition
        this.media = media
        this.dir = this.resources.pageProgressionDirection
        const displayOptions = getDisplayOptions(
            await this.#loadXML('META-INF/com.apple.ibooks.display-options.xml')
            ?? await this.#loadXML('META-INF/com.kobobooks.display-options.xml'))
        if (displayOptions) {
            if (displayOptions.fixedLayout === 'true')
                this.rendition.layout ??= 'pre-paginated'
            if (displayOptions.openToSpread === 'false') this.sections
                .find(section => section.linear !== 'no')!.pageSpread ??=
                    this.dir === 'rtl' ? 'left' : 'right'
        }
        return this
    }
    async loadDocument(item: ManifestItem): Promise<Document> {
        const str = await this.loadText(item.href)
        return this.parser.parseFromString(str, item.mediaType as DOMParserSupportedType)
    }
    getMediaOverlay(): MediaOverlay {
        return new MediaOverlay(this, this.#loadXML.bind(this))
    }
    resolveCFI(cfi: string): ResolvedHref {
        return this.resources.resolveCFI(cfi)
    }
    resolveHref(href: string): ResolvedHref | null {
        const [path, hash] = href.split('#')
        const item = this.resources.getItemByHref(decodeURI(path))
        if (!item) return null
        const index = this.resources.spine.findIndex(({ idref }) => idref === item.id)
        const anchor = hash ? (doc: Document) => getHTMLFragment(doc, hash) : () => 0
        return { index, anchor }
    }
    splitTOCHref(href: string | null | undefined): string[] {
        return href?.split('#') ?? []
    }
    getTOCFragment(doc: Document, id: string): Element | null {
        return doc.getElementById(id)
            ?? doc.querySelector(`[name="${CSS.escape(id)}"]`)
    }
    isExternal(uri: string): boolean {
        return isExternal(uri)
    }
    async getCover(): Promise<Blob | null> {
        const cover = this.resources?.cover
        return cover?.href
            ? new Blob([await this.loadBlob(cover.href)], { type: cover.mediaType })
            : null
    }
    async getCalibreBookmarks(): Promise<CalibreBookmarks | undefined> {
        const txt = await this.loadText('META-INF/calibre_bookmarks.txt')
        const magic = 'encoding=json+base64:'
        if (txt?.startsWith(magic)) {
            const json = atob(txt.slice(magic.length))
            return JSON.parse(json)
        }
    }
    destroy(): void {
        this.#loader?.destroy()
    }
}
