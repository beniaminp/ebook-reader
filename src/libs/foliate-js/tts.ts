const NS = {
    XML: 'http://www.w3.org/XML/1998/namespace',
    SSML: 'http://www.w3.org/2001/10/synthesis',
}

const blockTags = new Set([
    'article', 'aside', 'audio', 'blockquote', 'caption',
    'details', 'dialog', 'div', 'dl', 'dt', 'dd',
    'figure', 'footer', 'form', 'figcaption',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'li',
    'main', 'math', 'nav', 'ol', 'p', 'pre', 'section', 'tr',
])

const getLang = (el: Element | null): string | null => {
    if (!el) return null
    const x = (el as HTMLElement).lang || el?.getAttributeNS?.(NS.XML, 'lang')
    return x ? x : el.parentElement ? getLang(el.parentElement) : null
}

const getAlphabet = (el: Element | null): string | null => {
    if (!el) return null
    const x = el?.getAttributeNS?.(NS.XML, 'lang')
    return x ? x : el.parentElement ? getAlphabet(el.parentElement) : null
}

interface SegmentData {
    index: number
    segment: string
    isWordLike?: boolean
}

type SegmenterFunction = (strs: string[], makeRange: (...args: number[]) => Range) => Generator<[string, Range]>

type TextWalkerFunction = (
    x: Range | DocumentFragment,
    func: SegmenterFunction,
) => Iterable<[string, Range]>

type HighlightFunction = (range: Range) => void

const getSegmenter = (lang: string = 'en', granularity: 'word' | 'sentence' | 'grapheme' = 'word'): SegmenterFunction => {
    const segmenter = new Intl.Segmenter(lang, { granularity })
    const granularityIsWord = granularity === 'word'
    return function* (strs: string[], makeRange: (...args: number[]) => Range): Generator<[string, Range]> {
        const str = strs.join('').replace(/\r\n/g, '  ').replace(/\r/g, ' ').replace(/\n/g, ' ')
        let name = 0
        let strIndex = -1
        let sum = 0
        const rawSegments: SegmentData[] = Array.from(segmenter.segment(str))
        const mergedSegments: SegmentData[] = []
        for (let i = 0; i < rawSegments.length; i++) {
            const current = rawSegments[i]
            const next = rawSegments[i + 1]
            const segment = current.segment.trim()
            const nextSegment = next?.segment?.trim()
            const endsWithAbbr = /(?:^|\s)([A-Z][a-z]{1,5})\.$/.test(segment)
            const nextStartsWithCapital = /^[A-Z]/.test(nextSegment || '')
            if (endsWithAbbr && nextStartsWithCapital) {
                const mergedSegment: SegmentData = {
                    index: current.index,
                    segment: current.segment + (next?.segment || ''),
                    isWordLike: true,
                }
                mergedSegments.push(mergedSegment)
                i++
            } else {
                mergedSegments.push(current)
            }
        }
        for (const { index, segment, isWordLike } of mergedSegments) {
            if (granularityIsWord && !isWordLike) continue
            while (sum <= index) sum += strs[++strIndex].length
            const startIndex = strIndex
            const startOffset = index - (sum - strs[strIndex].length)
            const end = index + segment.length - 1
            if (end < str.length) while (sum <= end) sum += strs[++strIndex].length
            const endIndex = strIndex
            const endOffset = end - (sum - strs[strIndex].length) + 1
            yield [(name++).toString(),
                makeRange(startIndex, startOffset, endIndex, endOffset)]
        }
    }
}

interface InheritedProps {
    lang: string | null
    alphabet: string | null
}

const fragmentToSSML = (fragment: DocumentFragment, inherited: InheritedProps): XMLDocument => {
    const ssml = document.implementation.createDocument(NS.SSML, 'speak')
    const { lang } = inherited
    if (lang) ssml.documentElement.setAttributeNS(NS.XML, 'lang', lang)

    const convert = (node: Node | null, parent: Element, inheritedAlphabet: string | null): Node | undefined => {
        if (!node) return
        if (node.nodeType === 3) return ssml.createTextNode(node.textContent ?? '')
        if (node.nodeType === 4) return ssml.createCDATASection(node.textContent ?? '')
        if (node.nodeType !== 1) return

        const element = node as Element

        let el: Element | undefined
        const nodeName = element.nodeName.toLowerCase()
        if (nodeName === 'foliate-mark') {
            el = ssml.createElementNS(NS.SSML, 'mark')
            el.setAttribute('name', (element as HTMLElement).dataset.name ?? '')
        }
        else if (nodeName === 'br')
            el = ssml.createElementNS(NS.SSML, 'break')
        else if (nodeName === 'em' || nodeName === 'strong')
            el = ssml.createElementNS(NS.SSML, 'emphasis')

        const lang = (element as HTMLElement).lang || element.getAttributeNS(NS.XML, 'lang')
        if (lang) {
            if (!el) el = ssml.createElementNS(NS.SSML, 'lang')
            el.setAttributeNS(NS.XML, 'lang', lang)
        }

        const alphabet = element.getAttributeNS(NS.SSML, 'alphabet') || inheritedAlphabet
        if (!el) {
            const ph = element.getAttributeNS(NS.SSML, 'ph')
            if (ph) {
                el = ssml.createElementNS(NS.SSML, 'phoneme')
                if (alphabet) el.setAttribute('alphabet', alphabet)
                el.setAttribute('ph', ph)
            }
        }

        const targetEl = el ?? parent

        let child = element.firstChild
        while (child) {
            const childEl = convert(child, targetEl, alphabet)
            if (childEl && targetEl !== childEl) targetEl.append(childEl)
            child = child.nextSibling
        }
        return targetEl === parent ? undefined : targetEl
    }
    convert(fragment.firstChild, ssml.documentElement, inherited.alphabet)
    return ssml
}

interface FragmentWithMarks {
    entries: [string, Range][]
    ssml: XMLDocument
}

const getFragmentWithMarks = (range: Range, textWalker: TextWalkerFunction, granularity: 'word' | 'sentence' | 'grapheme'): FragmentWithMarks => {
    const lang = getLang(range.commonAncestorContainer as Element)
    const alphabet = getAlphabet(range.commonAncestorContainer as Element)

    const segmenter = getSegmenter(lang ?? undefined, granularity)
    const fragment = range.cloneContents()

    const entries = [...textWalker(range, segmenter)]
    const fragmentEntries = [...textWalker(fragment, segmenter)]

    for (const [name, range] of fragmentEntries) {
        const mark = document.createElement('foliate-mark')
        mark.dataset.name = name
        range.insertNode(mark)
    }
    const ssml = fragmentToSSML(fragment, { lang, alphabet })
    return { entries, ssml }
}

const rangeIsEmpty = (range: Range): boolean => !range.toString().trim()

function* getBlocks(doc: Document): Generator<Range> {
    let last: Range | undefined
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const name = (node as Element).tagName.toLowerCase()
        if (blockTags.has(name)) {
            if (last) {
                last.setEndBefore(node)
                if (!rangeIsEmpty(last)) yield last
            }
            last = doc.createRange()
            last.setStart(node, 0)
        }
    }
    if (!last) {
        last = doc.createRange()
        last.setStart(doc.body.firstChild ?? doc.body, 0)
    }
    last.setEndAfter(doc.body.lastChild ?? doc.body)
    if (!rangeIsEmpty(last)) yield last
}

class ListIterator<T, U> {
    #arr: T[] = []
    #iter: Iterator<T>
    #index: number = -1
    #f: (x: T) => U
    constructor(iter: Iterator<T>, f: (x: T) => U = ((x: T) => x) as unknown as (x: T) => U) {
        this.#iter = iter
        this.#f = f
    }
    current(): U | undefined {
        if (this.#arr[this.#index]) return this.#f(this.#arr[this.#index])
    }
    first(): U | undefined {
        const newIndex = 0
        if (this.#arr[newIndex]) {
            this.#index = newIndex
            return this.#f(this.#arr[newIndex])
        }
    }
    prev(): U | undefined {
        const newIndex = this.#index - 1
        if (this.#arr[newIndex]) {
            this.#index = newIndex
            return this.#f(this.#arr[newIndex])
        }
    }
    next(): U | undefined {
        const newIndex = this.#index + 1
        if (this.#arr[newIndex]) {
            this.#index = newIndex
            return this.#f(this.#arr[newIndex])
        }
        while (true) {
            const { done, value } = this.#iter.next()
            if (done) break
            this.#arr.push(value)
            if (this.#arr[newIndex]) {
                this.#index = newIndex
                return this.#f(this.#arr[newIndex])
            }
        }
    }
    find(f: (x: T) => boolean): U | undefined {
        const index = this.#arr.findIndex(x => f(x))
        if (index > -1) {
            this.#index = index
            return this.#f(this.#arr[index])
        }
        while (true) {
            const { done, value } = this.#iter.next()
            if (done) break
            this.#arr.push(value)
            if (f(value)) {
                this.#index = this.#arr.length - 1
                return this.#f(value)
            }
        }
    }
}

export class TTS {
    #list: ListIterator<Range, [XMLDocument, Range]>
    #ranges: Map<string, Range> = new Map()
    #lastMark: string | null = null
    #serializer: XMLSerializer = new XMLSerializer()
    doc: Document
    highlight: HighlightFunction
    constructor(doc: Document, textWalker: TextWalkerFunction, highlight: HighlightFunction, granularity: 'word' | 'sentence' | 'grapheme') {
        this.doc = doc
        this.highlight = highlight
        this.#list = new ListIterator(getBlocks(doc), (range: Range) => {
            const { entries, ssml } = getFragmentWithMarks(range, textWalker, granularity)
            this.#ranges = new Map(entries)
            return [ssml, range] as [XMLDocument, Range]
        })
    }
    #getMarkElement(doc: XMLDocument, mark: string | null): Element | null {
        if (!mark) return null
        return doc.querySelector(`mark[name="${CSS.escape(mark)}"`)
    }
    #speak(doc: XMLDocument | undefined, getNode?: (ssml: XMLDocument) => Element | null): string | undefined {
        if (!doc) return
        if (!getNode) return this.#serializer.serializeToString(doc)
        const ssml = document.implementation.createDocument(NS.SSML, 'speak')
        ssml.documentElement.replaceWith(ssml.importNode(doc.documentElement, true))
        let node: Node | null = getNode(ssml)?.previousSibling ?? null
        while (node) {
            const next: Node | null = node.previousSibling ?? node.parentNode?.previousSibling ?? null
            node.parentNode?.removeChild(node)
            node = next
        }
        return this.#serializer.serializeToString(ssml)
    }
    start(): string | undefined {
        this.#lastMark = null
        const [doc] = this.#list.first() ?? []
        if (!doc) return this.next()
        return this.#speak(doc, ssml => this.#getMarkElement(ssml, this.#lastMark))
    }
    resume(): string | undefined {
        const [doc] = this.#list.current() ?? []
        if (!doc) return this.next()
        return this.#speak(doc, ssml => this.#getMarkElement(ssml, this.#lastMark))
    }
    prev(paused?: boolean): string | undefined {
        this.#lastMark = null
        const [doc, range] = this.#list.prev() ?? []
        if (paused && range) this.highlight(range.cloneRange())
        return this.#speak(doc)
    }
    next(paused?: boolean): string | undefined {
        this.#lastMark = null
        const [doc, range] = this.#list.next() ?? []
        if (paused && range) this.highlight(range.cloneRange())
        return this.#speak(doc)
    }
    from(range: Range): string | undefined {
        this.#lastMark = null
        const [doc] = this.#list.find((range_: Range) =>
            range.compareBoundaryPoints(Range.END_TO_START, range_) <= 0) ?? []
        let mark: string | undefined
        for (const [name, range_] of this.#ranges.entries())
            if (range.compareBoundaryPoints(Range.START_TO_START, range_) <= 0) {
                mark = name
                break
            }
        return this.#speak(doc, ssml => this.#getMarkElement(ssml, mark ?? null))
    }
    setMark(mark: string): void {
        const range = this.#ranges.get(mark)
        if (range) {
            this.#lastMark = mark
            this.highlight(range.cloneRange())
        }
    }
}
