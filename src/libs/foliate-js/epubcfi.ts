export interface CFIPart {
    index: number;
    id?: string;
    offset?: number;
    temporal?: number;
    spatial?: number[];
    text?: string[];
    side?: string;
}

export type CFIParsedParts = CFIPart[][];

export type CFIParsedRange = {
    parent: CFIParsedParts;
    start: CFIParsedParts;
    end: CFIParsedParts;
};

export type CFIParsed = CFIParsedParts | CFIParsedRange;

type Token = [string] | [string, number] | [string, string];

interface NodeResult {
    node: Node;
    offset?: number;
    before?: boolean;
    after?: boolean;
}

type NodeFilterFn = (node: Node) => number;

type IndexedChild = Node | Node[] | string | null;

const findIndices = <T>(arr: T[], f: (x: T, i: number, a: T[]) => boolean): number[] => arr
    .map((x, i, a) => f(x, i, a) ? i : null).filter((x): x is number => x != null)
const splitAt = <T>(arr: T[], is: number[]): T[][] => [-1, ...is, arr.length].reduce(({ xs, a }: { xs: T[][] | undefined; a: number }, b: number) =>
    ({ xs: xs?.concat([arr.slice(a + 1, b)]) ?? [], a: b }), {} as { xs: T[][] | undefined; a: number }).xs!
const concatArrays = <T>(a: T[][], b: T[][]): T[][] =>
    a.slice(0, -1).concat([a[a.length - 1].concat(b[0])]).concat(b.slice(1))

const isNumber = /\d/
export const isCFI = /^epubcfi\((.*)\)$/
const escapeCFI = (str: string): string => str.replace(/[\^[\](),;=]/g, '^$&')

const wrap = (x: string): string => isCFI.test(x) ? x : `epubcfi(${x})`
const unwrap = (x: string): string => x.match(isCFI)?.[1] ?? x
const lift = (f: (...xs: string[]) => string) => (...xs: string[]): string =>
    `epubcfi(${f(...xs.map(x => x.match(isCFI)?.[1] ?? x))})`
export const joinIndir = lift((...xs: string[]) => xs.join('!'))

const tokenizer = (str: string): Token[] => {
    const tokens: Token[] = []
    let state: string | null | undefined, escape: boolean | undefined, value = ''
    const push = (x: Token): void => { tokens.push(x); state = null; value = '' }
    const cat = (x: string): void => { value += x; escape = false }
    for (const char of Array.from(str.trim()).concat('')) {
        if (char === '^' && !escape) {
            escape = true
            continue
        }
        if (state === '!') push(['!'])
        else if (state === ',') push([','])
        else if (state === '/' || state === ':') {
            if (isNumber.test(char)) {
                cat(char)
                continue
            } else push([state, parseInt(value)])
        } else if (state === '~') {
            if (isNumber.test(char) || char === '.') {
                cat(char)
                continue
            } else push(['~', parseFloat(value)])
        } else if (state === '@') {
            if (char === ':') {
                push(['@', parseFloat(value)])
                state = '@'
                continue
            }
            if (isNumber.test(char) || char === '.') {
                cat(char)
                continue
            } else push(['@', parseFloat(value)])
        } else if (state === '[') {
            if (char === ';' && !escape) {
                push(['[', value])
                state = ';'
            } else if (char === ',' && !escape) {
                push(['[', value])
                state = '['
            } else if (char === ']' && !escape) push(['[', value])
            else cat(char)
            continue
        } else if (state?.startsWith(';')) {
            if (char === '=' && !escape) {
                state = `;${value}`
                value = ''
            } else if (char === ';' && !escape) {
                push([state, value])
                state = ';'
            } else if (char === ']' && !escape) push([state, value])
            else cat(char)
            continue
        }
        if (char === '/' || char === ':' || char === '~' || char === '@'
        || char === '[' || char === '!' || char === ',') state = char
    }
    return tokens
}

const findTokens = (tokens: Token[], x: string): number[] => findIndices(tokens, ([t]) => t === x)

const parser = (tokens: Token[]): CFIPart[] => {
    const parts: CFIPart[] = []
    let state: string | undefined
    for (const [type, val] of tokens) {
        if (type === '/') parts.push({ index: val as number })
        else {
            const last = parts[parts.length - 1]
            if (type === ':') last.offset = val as number
            else if (type === '~') last.temporal = val as number
            else if (type === '@') last.spatial = (last.spatial ?? []).concat(val as number)
            else if (type === ';s') last.side = val as string
            else if (type === '[') {
                if (state === '/' && val) last.id = val as string
                else {
                    last.text = (last.text ?? []).concat(val as string)
                    continue
                }
            }
        }
        state = type
    }
    return parts
}

const parserIndir = (tokens: Token[]): CFIParsedParts =>
    splitAt(tokens, findTokens(tokens, '!')).map(parser)

export const parse = (cfi: string): CFIParsed => {
    const tokens = tokenizer(unwrap(cfi))
    const commas = findTokens(tokens, ',')
    if (!commas.length) return parserIndir(tokens)
    const [parent, start, end] = splitAt(tokens, commas).map(parserIndir)
    return { parent, start, end }
}

const partToString = ({ index, id, offset, temporal, spatial, text, side }: CFIPart): string => {
    const param = side ? `;s=${side}` : ''
    return `/${index}`
        + (id ? `[${escapeCFI(id)}${param}]` : '')
        + (offset != null && index % 2 ? `:${offset}` : '')
        + (temporal ? `~${temporal}` : '')
        + (spatial ? `@${spatial.join(':')}` : '')
        + (text || (!id && side) ? '['
            + (text?.map(escapeCFI)?.join(',') ?? '')
            + param + ']' : '')
}

const toInnerString = (parsed: CFIParsed): string => (parsed as CFIParsedRange).parent
    ? [(parsed as CFIParsedRange).parent, (parsed as CFIParsedRange).start, (parsed as CFIParsedRange).end].map(toInnerString).join(',')
    : (parsed as CFIParsedParts).map(parts => parts.map(partToString).join('')).join('!')

const toString = (parsed: CFIParsed): string => wrap(toInnerString(parsed))

export const collapse = (x: string | CFIParsed, toEnd?: boolean): string | CFIParsedParts => {
    if (typeof x === 'string') return toString(collapse(parse(x), toEnd) as CFIParsedParts)
    return (x as CFIParsedRange).parent
        ? concatArrays((x as CFIParsedRange).parent, (x as CFIParsedRange)[toEnd ? 'end' : 'start'])
        : x as CFIParsedParts
}

const buildRange = (from: string | CFIParsedParts, to: string | CFIParsedParts): string => {
    let fromParts: CFIParsedParts = typeof from === 'string' ? collapse(parse(from)) as CFIParsedParts : from
    let toParts: CFIParsedParts = typeof to === 'string' ? collapse(parse(to), true) as CFIParsedParts : to
    fromParts = collapse(fromParts) as CFIParsedParts
    toParts = collapse(toParts, true) as CFIParsedParts
    const localFrom = fromParts[fromParts.length - 1], localTo = toParts[toParts.length - 1]
    const localParent: CFIPart[] = [], localStart: CFIPart[] = [], localEnd: CFIPart[] = []
    let pushToParent = true
    const len = Math.max(localFrom.length, localTo.length)
    for (let i = 0; i < len; i++) {
        const a = localFrom[i], b = localTo[i]
        pushToParent &&= a?.index === b?.index && !a?.offset && !b?.offset
        if (pushToParent) localParent.push(a)
        else {
            if (a) localStart.push(a)
            if (b) localEnd.push(b)
        }
    }
    const parent = fromParts.slice(0, -1).concat([localParent])
    return toString({ parent, start: [localStart], end: [localEnd] })
}

export const compare = (a: string | CFIParsed, b: string | CFIParsed): number => {
    let aParsed: CFIParsed = typeof a === 'string' ? parse(a) : a
    let bParsed: CFIParsed = typeof b === 'string' ? parse(b) : b
    if ((aParsed as CFIParsedRange).start || (bParsed as CFIParsedRange).start)
        return compare(collapse(aParsed) as CFIParsedParts, collapse(bParsed) as CFIParsedParts)
            || compare(collapse(aParsed, true) as CFIParsedParts, collapse(bParsed, true) as CFIParsedParts)

    const aArr = aParsed as CFIParsedParts
    const bArr = bParsed as CFIParsedParts
    for (let i = 0; i < Math.max(aArr.length, bArr.length); i++) {
        const p = aArr[i] ?? [], q = bArr[i] ?? []
        const maxIndex = Math.max(p.length, q.length) - 1
        for (let j = 0; j <= maxIndex; j++) {
            const x = p[j], y = q[j]
            if (!x) return -1
            if (!y) return 1
            if (x.index > y.index) return 1
            if (x.index < y.index) return -1
            if (j === maxIndex) {
                // TODO: compare temporal & spatial offsets
                if ((x.offset ?? 0) > (y.offset ?? 0)) return 1
                if ((x.offset ?? 0) < (y.offset ?? 0)) return -1
            }
        }
    }
    return 0
}

const isTextNode = ({ nodeType }: Node): boolean => nodeType === 3 || nodeType === 4
const isElementNode = ({ nodeType }: Node): boolean => nodeType === 1

const getChildNodes = (node: Node, filter?: NodeFilterFn): Node[] => {
    const nodes = Array.from(node.childNodes)
        .filter(node => isTextNode(node) || isElementNode(node))
    return filter ? nodes.map(node => {
        const accept = filter(node)
        if (accept === NodeFilter.FILTER_REJECT) return null
        else if (accept === NodeFilter.FILTER_SKIP) return getChildNodes(node, filter)
        else return node
    }).flat().filter((x): x is Node => x != null) : nodes
}

const indexChildNodes = (node: Node, filter?: NodeFilterFn): IndexedChild[] => {
    const nodes: IndexedChild[] = getChildNodes(node, filter)
        .reduce((arr: IndexedChild[], node: Node) => {
            let last = arr[arr.length - 1]
            if (!last) arr.push(node)
            else if (isTextNode(node)) {
                if (Array.isArray(last)) (last as Node[]).push(node)
                else if (isTextNode(last as Node)) arr[arr.length - 1] = [last as Node, node]
                else arr.push(node)
            } else {
                if (isElementNode(last as Node)) arr.push(null, node)
                else arr.push(node)
            }
            return arr
        }, [])
    if (isElementNode(nodes[0] as Node)) nodes.unshift('first')
    if (isElementNode(nodes[nodes.length - 1] as Node)) nodes.push('last')
    nodes.unshift('before')
    nodes.push('after')
    return nodes
}

const partsToNode = (node: Node, parts: CFIPart[], filter?: NodeFilterFn): NodeResult => {
    const { id } = parts[parts.length - 1]
    if (id) {
        const el = (node as Element).ownerDocument.getElementById(id)
        if (el) return { node: el, offset: 0 }
    }
    let current: IndexedChild = node
    for (const { index } of parts) {
        const newNode: IndexedChild = current ? indexChildNodes(current as Node, filter)[index] : null
        if (newNode === 'first') return { node: (current as Node).firstChild ?? (current as Node) }
        if (newNode === 'last') return { node: (current as Node).lastChild ?? (current as Node) }
        if (newNode === 'before') return { node: current as Node, before: true }
        if (newNode === 'after') return { node: current as Node, after: true }
        current = newNode
    }
    const { offset } = parts[parts.length - 1]
    if (!Array.isArray(current)) return { node: current as Node, offset }
    let sum = 0
    for (const n of current as Node[]) {
        const { length } = (n as CharacterData).nodeValue!
        if (sum + length >= (offset ?? 0)) return { node: n, offset: (offset ?? 0) - sum }
        sum += length
    }
    return { node: (current as Node[])[0], offset: 0 }
}

const nodeToParts = (node: Node, offset?: number | null, filter?: NodeFilterFn): CFIPart[] => {
    const { parentNode } = node
    const id = (node as Element).id
    const indexed = indexChildNodes(parentNode!, filter)
    const index = indexed.findIndex(x =>
        Array.isArray(x) ? x.some(x => x === node) : x === node)
    const chunk = indexed[index]
    let adjustedOffset = offset
    if (Array.isArray(chunk)) {
        let sum = 0
        for (const x of chunk as Node[]) {
            if (x === node) {
                sum += offset ?? 0
                break
            } else sum += (x as CharacterData).nodeValue!.length
        }
        adjustedOffset = sum
    }
    const part: CFIPart = { id, index, offset: adjustedOffset ?? undefined }
    return (parentNode !== node.ownerDocument!.documentElement
        ? nodeToParts(parentNode!, null, filter).concat(part) : [part])
        .filter(x => x.index !== -1)
}

export const fromRange = (range: Range, filter?: NodeFilterFn): string => {
    const { startContainer, startOffset, endContainer, endOffset } = range
    const start = nodeToParts(startContainer, startOffset, filter)
    if (range.collapsed) return toString([start])
    const end = nodeToParts(endContainer, endOffset, filter)
    return buildRange([start], [end])
}

export const toRange = (doc: Document, parts: string | CFIParsed, filter?: NodeFilterFn): Range => {
    const startParts = collapse(parts) as CFIParsedParts
    const endParts = collapse(parts, true) as CFIParsedParts

    const root = doc.documentElement
    const start = partsToNode(root, startParts[0], filter)
    const end = partsToNode(root, endParts[0], filter)

    const range = doc.createRange()

    if (start.before) range.setStartBefore(start.node)
    else if (start.after) range.setStartAfter(start.node)
    else range.setStart(start.node, start.offset ?? 0)

    if (end.before) range.setEndBefore(end.node)
    else if (end.after) range.setEndAfter(end.node)
    else range.setEnd(end.node, end.offset ?? 0)
    return range
}

export const fromElements = (elements: Element[]): string[] => {
    const results: string[] = []
    const { parentNode } = elements[0]
    const parts = nodeToParts(parentNode!)
    for (const [index, node] of indexChildNodes(parentNode!).entries()) {
        const el = elements[results.length]
        if (node === el)
            results.push(toString([parts.concat({ id: (el as Element).id, index })]))
    }
    return results
}

export const toElement = (doc: Document, parts: string | CFIParsed): Node =>
    partsToNode(doc.documentElement, collapse(parts) as unknown as CFIPart[]).node

export const fake = {
    fromIndex: (index: number): string => wrap(`/6/${(index + 1) * 2}`),
    toIndex: (parts: CFIPart[] | undefined): number => parts!.at(-1)!.index / 2 - 1,
}

export const fromCalibrePos = (pos: string): string => {
    const [parts] = parse(pos) as CFIParsedParts
    const item = parts.shift()!
    parts.shift()
    return toString([[{ index: 6 }, item], parts])
}
export const fromCalibreHighlight = ({ spine_index, start_cfi, end_cfi }: { spine_index: number; start_cfi: string; end_cfi: string }): string => {
    const pre = fake.fromIndex(spine_index) + '!'
    return buildRange(pre + start_cfi.slice(2), pre + end_cfi.slice(2))
}
