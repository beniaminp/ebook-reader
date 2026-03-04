const NS = {
    ATOM: 'http://www.w3.org/2005/Atom',
    OPDS: 'http://opds-spec.org/2010/catalog',
    THR: 'http://purl.org/syndication/thread/1.0',
    DC: 'http://purl.org/dc/elements/1.1/',
    DCTERMS: 'http://purl.org/dc/terms/',
} as const

const MIME = {
    ATOM: 'application/atom+xml',
    OPDS2: 'application/opds+json',
} as const

// --- Interfaces ---

interface MediaTypeParsed {
    mediaType: string
    parameters: Record<string, string | undefined>
}

interface Price {
    currency: string | null
    value: string | null
}

interface IndirectAcquisition {
    type: string | null
}

interface LinkProperties {
    price: Price | null
    indirectAcquisition: IndirectAcquisition[]
    numberOfItems: string | null
}

interface OPDSLink {
    rel: string[] | undefined
    href: string | null
    type: string | null
    title: string | null
    properties: LinkProperties
    [key: symbol]: string | null
}

interface Person {
    name: string
    links: { href: string }[]
}

interface ContentResult {
    value: string | null
    type: string
}

interface Subject {
    name: string | null
    code: string | null
    scheme: string | null
}

interface PublicationMetadata {
    title: string
    author: Person[]
    contributor: Person[]
    publisher: string | null | undefined
    published: string | null | undefined
    language: string | null | undefined
    identifier: string | null | undefined
    subject: Subject[]
    rights: string
    [key: symbol]: ContentResult | undefined
}

interface Publication {
    metadata: PublicationMetadata
    links: OPDSLink[]
    images: OPDSLink[]
}

interface FeedMetadata {
    title: string | null | undefined
    subtitle?: string | null | undefined
    numberOfItems?: string | null
}

interface FeedGroup {
    metadata?: FeedMetadata
    links?: { rel: string; href: string | null; type: string | null }[]
    publications?: unknown[]
    navigation?: unknown[]
    [key: string]: unknown
}

interface Facet {
    metadata: { title: string | null | symbol }
    links: OPDSLink[]
}

interface Feed {
    metadata: {
        title: string | null | undefined
        subtitle?: string | null | undefined
    }
    links: OPDSLink[]
    groups: FeedGroup[]
    facets: Facet[]
    publications?: unknown[]
    navigation?: unknown[]
    [key: string]: unknown
}

interface SearchParam {
    name: string
    ns?: string | null
    required?: boolean
    value?: string
}

interface SearchResult {
    metadata: {
        title: string | null | undefined
    }
    search: (map: Map<string | null, unknown>) => string
    params: SearchParam[]
}

// --- Exports ---

export const REL = {
    ACQ: 'http://opds-spec.org/acquisition',
    FACET: 'http://opds-spec.org/facet',
    GROUP: 'http://opds-spec.org/group',
    COVER: [
        'http://opds-spec.org/image',
        'http://opds-spec.org/cover',
    ],
    THUMBNAIL: [
        'http://opds-spec.org/image/thumbnail',
        'http://opds-spec.org/thumbnail',
    ],
} as const

export const SYMBOL = {
    SUMMARY: Symbol('summary'),
    CONTENT: Symbol('content'),
} as const

const FACET_GROUP: unique symbol = Symbol('facetGroup')

const groupByArray = <T>(arr: T[] | undefined | null, f: (el: T) => unknown): Map<unknown, T[]> => {
    const map = new Map<unknown, T[]>()
    if (arr) for (const el of arr) {
        const keys = f(el)
        for (const key of [keys].flat()) {
            const group = map.get(key)
            if (group) group.push(el)
            else map.set(key, [el])
        }
    }
    return map
}

// https://www.rfc-editor.org/rfc/rfc7231#section-3.1.1
const parseMediaType = (str: string | null | undefined): MediaTypeParsed | null => {
    if (!str) return null
    const [mediaType, ...ps] = str.split(/ *; */)
    return {
        mediaType: mediaType.toLowerCase(),
        parameters: Object.fromEntries(ps.map(p => {
            const [name, val] = p.split('=')
            return [name.toLowerCase(), val?.replace(/(^"|"$)/g, '')]
        })),
    }
}

export const isOPDSCatalog = (str: string | null | undefined): boolean => {
    const parsed = parseMediaType(str)
    if (!parsed) return false
    const { mediaType, parameters } = parsed
    if (mediaType === MIME.OPDS2) return true
    return mediaType === MIME.ATOM && parameters.profile?.toLowerCase() === 'opds-catalog'
}

// ignore the namespace if it doesn't appear in document at all
const useNS = (doc: Document, ns: string): string | null =>
    doc.lookupNamespaceURI(null) === ns || doc.lookupPrefix(ns) ? ns : null

const filterNS = (ns: string | null): (name: string) => (el: Element) => boolean =>
    ns
        ? (name: string) => (el: Element) => el.namespaceURI === ns && el.localName === name
        : (name: string) => (el: Element) => el.localName === name

const getContent = (el: Element | undefined): ContentResult | undefined => {
    if (!el) return undefined
    const type = el.getAttribute('type') ?? 'text'
    const value = type === 'xhtml' ? el.innerHTML
        : type === 'html' ? (el.textContent ?? '')
            .replaceAll('&lt;', '<')
            .replaceAll('&gt;', '>')
            .replaceAll('&amp;', '&')
        : el.textContent
    return { value, type }
}

const getTextContent = (el: Element | undefined): string | null | undefined => {
    const content = getContent(el)
    if (content?.type === 'text') return content?.value
}

const getSummary = (a: Element | undefined, b: Element | undefined): string | null | undefined =>
    getTextContent(a) ?? getTextContent(b)

const getPrice = (link: Element): Price | null => {
    const price = link.getElementsByTagNameNS(NS.OPDS, 'price')[0]
    return price ? {
        currency: price.getAttribute('currencycode'),
        value: price.textContent,
    } : null
}

const getIndirectAcquisition = (el: Element): IndirectAcquisition[] => {
    const ia = el.getElementsByTagNameNS(NS.OPDS, 'indirectAcquisition')[0]
    if (!ia) return []
    return [{ type: ia.getAttribute('type') }, ...getIndirectAcquisition(ia)]
}

const getLink = (link: Element): OPDSLink => {
    const obj: OPDSLink = {
        rel: link.getAttribute('rel')?.split(/ +/),
        href: link.getAttribute('href'),
        type: link.getAttribute('type'),
        title: link.getAttribute('title'),
        properties: {
            price: getPrice(link),
            indirectAcquisition: getIndirectAcquisition(link),
            numberOfItems: link.getAttributeNS(NS.THR, 'count'),
        },
        [FACET_GROUP]: link.getAttributeNS(NS.OPDS, 'facetGroup'),
    }
    if (link.getAttributeNS(NS.OPDS, 'activeFacet') === 'true')
        obj.rel = [obj.rel ?? []].flat().concat('self')
    return obj
}

const getPerson = (person: Element): Person => {
    const ns = person.namespaceURI
    const uri = person.getElementsByTagNameNS(ns!, 'uri')[0]?.textContent
    return {
        name: person.getElementsByTagNameNS(ns!, 'name')[0]?.textContent ?? '',
        links: uri ? [{ href: uri }] : [],
    }
}

export const getPublication = (entry: Element): Publication => {
    const filter = filterNS(useNS(entry.ownerDocument!, NS.ATOM))
    const children = Array.from(entry.children)
    const filterDCEL = filterNS(NS.DC)
    const filterDCTERMS = filterNS(NS.DCTERMS)
    const filterDC = (x: string) => {
        const a = filterDCEL(x), b = filterDCTERMS(x)
        return (y: Element) => a(y) || b(y)
    }
    const links = children.filter(filter('link')).map(getLink)
    const linksByRel = groupByArray(links, link => link.rel)
    return {
        metadata: {
            title: children.find(filter('title'))?.textContent ?? '',
            author: children.filter(filter('author')).map(getPerson),
            contributor: children.filter(filter('contributor')).map(getPerson),
            publisher: children.find(filterDC('publisher'))?.textContent,
            published: (children.find(filterDCTERMS('issued'))
                ?? children.find(filterDC('date')))?.textContent,
            language: children.find(filterDC('language'))?.textContent,
            identifier: children.find(filterDC('identifier'))?.textContent,
            subject: children.filter(filter('category')).map(category => ({
                name: category.getAttribute('label'),
                code: category.getAttribute('term'),
                scheme: category.getAttribute('scheme'),
            })),
            rights: children.find(filter('rights'))?.textContent ?? '',
            [SYMBOL.CONTENT]: getContent(children.find(filter('content'))
                ?? children.find(filter('summary'))),
        },
        links,
        images: (REL.COVER as readonly string[]).concat(REL.THUMBNAIL)
            .map(R => (linksByRel.get(R) as OPDSLink[] | undefined)?.[0]).filter((x): x is OPDSLink => !!x),
    }
}

export const getFeed = (doc: Document): Feed => {
    const ns = useNS(doc, NS.ATOM)
    const filter = filterNS(ns)
    const children = Array.from(doc.documentElement.children)
    const entries = children.filter(filter('entry'))
    const links = children.filter(filter('link')).map(getLink)
    const linksByRel = groupByArray(links, link => link.rel)

    const groupedItems = new Map<string | null, unknown[]>([[null, []]])
    const groupLinkMap = new Map<string | null, OPDSLink>()
    for (const entry of entries) {
        const children = Array.from(entry.children)
        const links = children.filter(filter('link')).map(getLink)
        const linksByRel = groupByArray(links, link => link.rel)
        const isPub = [...linksByRel.keys()]
            .some(rel => (typeof rel === 'string' && rel?.startsWith(REL.ACQ)) || rel === 'preview')

        const groupLinks = (linksByRel.get(REL.GROUP) ?? linksByRel.get('collection')) as OPDSLink[] | undefined
        const groupLink = groupLinks?.length
            ? groupLinks.find(link => groupedItems.has(link.href)) ?? groupLinks[0] : null
        if (groupLink && !groupLinkMap.has(groupLink.href))
            groupLinkMap.set(groupLink.href, groupLink)

        const item: unknown = isPub
            ? getPublication(entry)
            : Object.assign(links.find(link => isOPDSCatalog(link.type)) ?? links[0] ?? {}, {
                title: children.find(filter('title'))?.textContent,
                [SYMBOL.SUMMARY]: getSummary(children.find(filter('summary')),
                    children.find(filter('content'))),
            })

        const arr = groupedItems.get(groupLink?.href ?? null)
        if (arr) arr.push(item)
        else groupedItems.set(groupLink!.href, [item])
    }
    const [items, ...groups] = Array.from(groupedItems, ([key, items]): FeedGroup => {
        const itemsKey = (items[0] as Record<string, unknown>)?.metadata ? 'publications' : 'navigation'
        if (key == null) return { [itemsKey]: items }
        const link = groupLinkMap.get(key)!
        return {
            metadata: {
                title: link.title,
                numberOfItems: link.properties.numberOfItems,
            },
            links: [{ rel: 'self', href: link.href, type: link.type }],
            [itemsKey]: items,
        }
    })
    return {
        metadata: {
            title: children.find(filter('title'))?.textContent,
            subtitle: children.find(filter('subtitle'))?.textContent,
        },
        links,
        ...items,
        groups,
        facets: Array.from(
            groupByArray((linksByRel.get(REL.FACET) ?? []) as OPDSLink[], link => link[FACET_GROUP]),
            ([facet, links]) => ({ metadata: { title: facet as string | null }, links: links as OPDSLink[] })),
    } as Feed
}

export const getSearch = async (link: OPDSLink): Promise<SearchResult> => {
    const { replace, getVariables } = await import('./uri-template')
    return {
        metadata: {
            title: link.title,
        },
        search: (map: Map<string | null, unknown>) =>
            replace(link.href!, (map as Map<string | null, Map<string, string>>).get(null)!),
        params: Array.from(getVariables(link.href!), name => ({ name })),
    }
}

export const getOpenSearch = (doc: Document): SearchResult => {
    const defaultNS = doc.documentElement.namespaceURI
    const filter = filterNS(defaultNS)
    const children = Array.from(doc.documentElement.children)

    const $$urls = children.filter(filter('Url'))
    const $url = $$urls.find(url => isOPDSCatalog(url.getAttribute('type'))) ?? $$urls[0]
    if (!$url) throw new Error('document must contain at least one Url element')

    const regex = /{(?:([^}]+?):)?(.+?)(\?)?}/g
    const defaultMap = new Map<string, string>([
        ['count', '100'],
        ['startIndex', $url.getAttribute('indexOffset') ?? '0'],
        ['startPage', $url.getAttribute('pageOffset') ?? '0'],
        ['language', '*'],
        ['inputEncoding', 'UTF-8'],
        ['outputEncoding', 'UTF-8'],
    ])

    const template = $url.getAttribute('template')!
    return {
        metadata: {
            title: (children.find(filter('LongName')) ?? children.find(filter('ShortName')))?.textContent,
        },
        search: (map: Map<string | null, unknown>) =>
            template.replace(regex, (_: string, prefix: string, param: string) => {
                const namespace = prefix ? $url.lookupNamespaceURI(prefix) : null
                const ns = namespace === defaultNS ? null : namespace
                const val = (map.get(ns) as Map<string, string> | undefined)?.get(param)
                return encodeURIComponent(val ? val : (!ns ? defaultMap.get(param) ?? '' : ''))
            }),
        params: Array.from(template.matchAll(regex), ([, prefix, param, optional]) => {
            const namespace = prefix ? $url.lookupNamespaceURI(prefix) : null
            const ns = namespace === defaultNS ? null : namespace
            return {
                ns, name: param,
                required: !optional,
                value: ns && ns !== defaultNS ? '' : defaultMap.get(param) ?? '',
            }
        }),
    }
}
