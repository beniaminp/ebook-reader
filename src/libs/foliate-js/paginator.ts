import type { Overlayer } from './overlayer'

// ---- Interfaces ----

interface LayoutConfig {
    flow?: 'scrolled' | string;
    width: number;
    height: number;
    margin: number;
    gap: number;
    columnWidth: number;
}

interface ScrolledLayoutConfig {
    flow: string;
    margin: number;
    gap: number;
    columnWidth: number;
}

interface TouchState {
    x: number;
    y: number;
    t: number;
    vx: number;
    vy: number;
    pinched?: boolean;
}

interface Section {
    linear?: string;
    load(): Promise<string>;
    unload?(): void;
    mediaOverlay?: unknown;
}

interface DisplayTarget {
    index: number;
    src?: string;
    anchor?: number | Range | Element | ((doc: Document) => number | Range | Element);
    onLoad?: (detail: { doc: Document; index: number }) => void;
    select?: boolean;
}

interface GoToTarget {
    index: number;
    anchor?: number | Range | Element | ((doc: Document) => number | Range | Element);
    select?: boolean;
}

interface RelocateDetail {
    reason: string;
    range: Range;
    index: number;
    fraction?: number;
    size?: number;
}

interface DirectionInfo {
    vertical: boolean;
    rtl: boolean;
}

interface BeforeRenderInfo extends DirectionInfo {
    background: string;
}

interface MappedRect {
    left: number;
    right: number;
}

interface Book {
    dir?: string;
    sections: Section[];
    transformTarget?: EventTarget;
}

// ---- Utility functions ----

const wait = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debounce = <T extends (...args: any[]) => void>(
    f: T,
    waitMs: number,
    immediate?: boolean,
): (...args: Parameters<T>) => void => {
    let timeout: ReturnType<typeof setTimeout> | null
    return (...args: Parameters<T>) => {
        const later = () => {
            timeout = null
            if (!immediate) f(...args)
        }
        const callNow = immediate && !timeout
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(later, waitMs)
        if (callNow) f(...args)
    }
}

const lerp = (min: number, max: number, x: number): number =>
    x * (max - min) + min

const easeOutQuad = (x: number): number => 1 - (1 - x) * (1 - x)

const animate = (
    a: number,
    b: number,
    duration: number,
    ease: (x: number) => number,
    render: (value: number) => void,
): Promise<void> =>
    new Promise(resolve => {
        let start: number | undefined
        const step = (now: number) => {
            start ??= now
            const fraction = Math.min(1, (now - start) / duration)
            render(lerp(a, b, ease(fraction)))
            if (fraction < 1) requestAnimationFrame(step)
            else resolve()
        }
        requestAnimationFrame(step)
    })

// collapsed range doesn't return client rects sometimes (or always?)
// try make get a non-collapsed range or element
const uncollapse = (
    range: Range | Element | number | null | undefined,
): Range | Element | null => {
    if (range == null || typeof range === 'number') return null
    if ('collapsed' in range && !range.collapsed) return range
    if (!('endOffset' in range)) return range as Element
    const { endOffset, endContainer } = range
    if (endContainer.nodeType === 1) {
        const node = endContainer.childNodes[endOffset]
        if (node?.nodeType === 1) return node as Element
        return endContainer as Element
    }
    if (endOffset + 1 < (endContainer as Text).length)
        range.setEnd(endContainer, endOffset + 1)
    else if (endOffset > 1) range.setStart(endContainer, endOffset - 1)
    else return endContainer.parentNode as Element
    return range
}

const makeRange = (
    doc: Document,
    node: Node,
    start: number,
    end: number = start,
): Range => {
    const range = doc.createRange()
    range.setStart(node, start)
    range.setEnd(node, end)
    return range
}

// use binary search to find an offset value in a text node
const bisectNode = (
    doc: Document,
    node: Text,
    cb: (a: Range, b: Range) => number,
    start: number = 0,
    end: number = node.nodeValue!.length,
): number => {
    if (end - start === 1) {
        const result = cb(makeRange(doc, node, start), makeRange(doc, node, end))
        return result < 0 ? start : end
    }
    const mid = Math.floor(start + (end - start) / 2)
    const result = cb(
        makeRange(doc, node, start, mid),
        makeRange(doc, node, mid, end),
    )
    return result < 0
        ? bisectNode(doc, node, cb, start, mid)
        : result > 0
          ? bisectNode(doc, node, cb, mid, end)
          : mid
}

const { SHOW_ELEMENT, SHOW_TEXT, SHOW_CDATA_SECTION, FILTER_ACCEPT, FILTER_REJECT, FILTER_SKIP } =
    NodeFilter

const filter = SHOW_ELEMENT | SHOW_TEXT | SHOW_CDATA_SECTION

// needed cause there seems to be a bug in `getBoundingClientRect()` in Firefox
// where it fails to include rects that have zero width and non-zero height
const getBoundingClientRect = (target: Range | Element): DOMRect => {
    const rects = target.getClientRects()
    let top = Infinity,
        right = -Infinity,
        left = Infinity,
        bottom = -Infinity
    for (const rect of rects) {
        left = Math.min(left, rect.left)
        top = Math.min(top, rect.top)
        right = Math.max(right, rect.right)
        bottom = Math.max(bottom, rect.bottom)
    }
    return new DOMRect(left, top, right - left, bottom - top)
}

const getVisibleRange = (
    doc: Document,
    start: number,
    end: number,
    mapRect: (rect: DOMRect) => MappedRect,
): Range => {
    // first get all visible nodes
    const acceptNode = (node: Node): number => {
        const name = (node as Element).localName?.toLowerCase()
        // ignore all scripts, styles, and their children
        if (name === 'script' || name === 'style') return FILTER_REJECT
        if (node.nodeType === 1) {
            const { left, right } = mapRect(
                (node as Element).getBoundingClientRect(),
            )
            if (right < start || left > end) return FILTER_REJECT
            if (left >= start && right <= end) return FILTER_ACCEPT
        } else {
            if (!node.nodeValue?.trim()) return FILTER_SKIP
            const range = doc.createRange()
            range.selectNodeContents(node)
            const { left, right } = mapRect(range.getBoundingClientRect())
            if (right >= start && left <= end) return FILTER_ACCEPT
        }
        return FILTER_SKIP
    }
    const body = doc.body
    if (!body) {
        const range = doc.createRange()
        range.selectNodeContents(doc.documentElement ?? doc)
        return range
    }
    const walker = doc.createTreeWalker(body, filter, { acceptNode })
    const nodes: Node[] = []
    for (let node = walker.nextNode(); node; node = walker.nextNode())
        nodes.push(node)

    const from = nodes[0] ?? body
    const to = nodes[nodes.length - 1] ?? from

    const startOffset =
        from.nodeType === 1
            ? 0
            : bisectNode(doc, from as Text, (a, b) => {
                  const p = mapRect(getBoundingClientRect(a))
                  const q = mapRect(getBoundingClientRect(b))
                  if (p.right < start && q.left > start) return 0
                  return q.left > start ? -1 : 1
              })
    const endOffset =
        to.nodeType === 1
            ? 0
            : bisectNode(doc, to as Text, (a, b) => {
                  const p = mapRect(getBoundingClientRect(a))
                  const q = mapRect(getBoundingClientRect(b))
                  if (p.right < end && q.left > end) return 0
                  return q.left > end ? -1 : 1
              })

    const range = doc.createRange()
    range.setStart(from, startOffset)
    range.setEnd(to, endOffset)
    return range
}

const selectionIsBackward = (sel: Selection): boolean => {
    const range = document.createRange()
    range.setStart(sel.anchorNode!, sel.anchorOffset)
    range.setEnd(sel.focusNode!, sel.focusOffset)
    return range.collapsed
}

const setSelectionTo = (
    target: Range | Element | number | null | undefined,
    collapse: -1 | 0 | 1,
): void => {
    if (target == null || typeof target === 'number') return
    let range: Range | undefined
    if ('startContainer' in target) range = (target as Range).cloneRange()
    else if ('nodeType' in target) {
        range = document.createRange()
        range.selectNode(target as Element)
    }
    if (range) {
        const sel = range.startContainer.ownerDocument!.defaultView!.getSelection()!
        sel.removeAllRanges()
        if (collapse === -1) range.collapse(true)
        else if (collapse === 1) range.collapse()
        sel.addRange(range)
    }
}

const getDirection = (doc: Document): DirectionInfo => {
    const { defaultView } = doc
    if (!defaultView || !doc.body) return { vertical: false, rtl: false }
    const { writingMode, direction } = defaultView.getComputedStyle(doc.body)
    const vertical =
        writingMode === 'vertical-rl' || writingMode === 'vertical-lr'
    const rtl =
        doc.body.dir === 'rtl' ||
        direction === 'rtl' ||
        doc.documentElement.dir === 'rtl'
    return { vertical, rtl }
}

const getBackground = (doc: Document): string => {
    if (!doc.defaultView || !doc.body) return ''
    const bodyStyle = doc.defaultView.getComputedStyle(doc.body)
    return bodyStyle.backgroundColor === 'rgba(0, 0, 0, 0)' &&
        bodyStyle.backgroundImage === 'none'
        ? doc.defaultView.getComputedStyle(doc.documentElement).background
        : bodyStyle.background
}

const makeMarginals = (
    length: number,
    part: string,
): HTMLDivElement[] =>
    Array.from({ length }, () => {
        const div = document.createElement('div')
        const child = document.createElement('div')
        div.append(child)
        child.setAttribute('part', part)
        return div
    })

const setStylesImportant = (
    el: HTMLElement,
    styles: Record<string, string>,
): void => {
    const { style } = el
    for (const [k, v] of Object.entries(styles))
        style.setProperty(k, v, 'important')
}

// ---- View class (internal, manages a single section iframe) ----

class View {
    #observer = new ResizeObserver(() => {
        try {
            this.expand()
        } catch {
            /* doc may be detached */
        }
    })
    #element: HTMLDivElement = document.createElement('div')
    #iframe: HTMLIFrameElement = document.createElement('iframe')
    #contentRange: Range = document.createRange()
    #overlayer: Overlayer | undefined
    #vertical = false
    #rtl = false
    #column = true
    #size = 0
    #layout: Partial<LayoutConfig> = {}
    container: Paginator
    onExpand: () => void
    docBackground = ''

    constructor({ container, onExpand }: { container: Paginator; onExpand: () => void }) {
        this.container = container
        this.onExpand = onExpand
        this.#iframe.setAttribute('part', 'filter')
        this.#element.append(this.#iframe)
        Object.assign(this.#element.style, {
            boxSizing: 'content-box',
            position: 'relative',
            overflow: 'hidden',
            flex: '0 0 auto',
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        })
        Object.assign(this.#iframe.style, {
            overflow: 'hidden',
            border: '0',
            display: 'none',
            width: '100%',
            height: '100%',
        })
        // `allow-scripts` is needed for events because of WebKit bug
        // https://bugs.webkit.org/show_bug.cgi?id=218086
        this.#iframe.setAttribute(
            'sandbox',
            'allow-same-origin allow-scripts',
        )
        this.#iframe.setAttribute('scrolling', 'no')
    }

    get element(): HTMLDivElement {
        return this.#element
    }

    get document(): Document | null {
        return this.#iframe.contentDocument
    }

    async load(
        src: string,
        afterLoad?: (doc: Document) => void,
        beforeRender?: (info: BeforeRenderInfo) => LayoutConfig | ScrolledLayoutConfig | undefined,
    ): Promise<void> {
        if (typeof src !== 'string') throw new Error(`${src} is not string`)
        return new Promise(resolve => {
            this.#iframe.addEventListener(
                'load',
                () => {
                    const doc = this.document
                    if (!doc) {
                        resolve()
                        return
                    }
                    try {
                        afterLoad?.(doc)

                        // it needs to be visible for Firefox to get computed style
                        this.#iframe.style.display = 'block'
                        const { vertical, rtl } = getDirection(doc)
                        this.docBackground = getBackground(doc)
                        if (doc.body) doc.body.style.background = 'none'
                        const background = this.docBackground
                        this.#iframe.style.display = 'none'

                        this.#vertical = vertical
                        this.#rtl = rtl

                        if (doc.body) {
                            this.#contentRange.selectNodeContents(doc.body)
                        }
                        const layout = beforeRender?.({ vertical, rtl, background })
                        this.#iframe.style.display = 'block'
                        this.render(layout as LayoutConfig | undefined)
                        if (doc.body) {
                            this.#observer.observe(doc.body)
                        }

                        // the resize observer above doesn't work in Firefox
                        // until the bug is fixed we can at least account for font load
                        doc.fonts.ready.then(() => this.expand())
                    } catch (e) {
                        console.error('Error in iframe load handler:', e)
                    } finally {
                        resolve()
                    }
                },
                { once: true },
            )
            this.#iframe.src = src
        })
    }

    render(layout: LayoutConfig | undefined): void {
        if (!layout || !this.document?.documentElement || !this.document?.body)
            return
        this.#column = layout.flow !== 'scrolled'
        this.#layout = layout
        if (this.#column) this.columnize(layout)
        else this.scrolled(layout)
    }

    scrolled({ margin, gap, columnWidth }: LayoutConfig): void {
        const vertical = this.#vertical
        const doc = this.document
        if (!doc?.documentElement || !doc.body) return
        setStylesImportant(doc.documentElement, {
            'box-sizing': 'border-box',
            padding: vertical ? `${margin * 1.5}px ${gap}px` : `0 ${gap}px`,
            'column-width': 'auto',
            height: 'auto',
            width: 'auto',
        })
        setStylesImportant(doc.body, {
            [vertical ? 'max-height' : 'max-width']: `${columnWidth}px`,
            margin: 'auto',
        })
        this.setImageSize()
        this.expand()
    }

    columnize({ width, height, margin, gap, columnWidth }: LayoutConfig): void {
        const vertical = this.#vertical
        this.#size = vertical ? height : width

        const doc = this.document
        if (!doc?.documentElement || !doc.body) return
        setStylesImportant(doc.documentElement, {
            'box-sizing': 'border-box',
            'column-width': `${Math.trunc(columnWidth)}px`,
            'column-gap': vertical ? `${margin}px` : `${gap}px`,
            'column-fill': 'auto',
            ...(vertical
                ? { width: `${width}px` }
                : { height: `${height}px` }),
            padding: vertical
                ? `${margin / 2}px ${gap}px`
                : `0 ${gap / 2}px`,
            overflow: 'hidden',
            'overflow-wrap': 'break-word',
            position: 'static',
            border: '0',
            margin: '0',
            'max-height': 'none',
            'max-width': 'none',
            'min-height': 'none',
            'min-width': 'none',
            '-webkit-line-box-contain': 'block glyphs replaced',
        })
        setStylesImportant(doc.body, {
            'max-height': 'none',
            'max-width': 'none',
            margin: '0',
        })
        this.setImageSize()
        this.expand()
    }

    setImageSize(): void {
        const { width, height, margin } = this.#layout as LayoutConfig
        if (!width || !height || margin == null) return
        const vertical = this.#vertical
        const doc = this.document
        if (!doc?.body) return
        for (const el of doc.body.querySelectorAll(
            'img, svg, video',
        ) as NodeListOf<HTMLElement>) {
            const { maxHeight, maxWidth } = doc.defaultView!.getComputedStyle(el)
            setStylesImportant(el, {
                'max-height': vertical
                    ? maxHeight !== 'none' && maxHeight !== '0px'
                        ? maxHeight
                        : '100%'
                    : `${height - margin * 2}px`,
                'max-width': vertical
                    ? `${width - margin * 2}px`
                    : maxWidth !== 'none' && maxWidth !== '0px'
                      ? maxWidth
                      : '100%',
                'object-fit': 'contain',
                'page-break-inside': 'avoid',
                'break-inside': 'avoid',
                'box-sizing': 'border-box',
            })
        }
    }

    expand(): void {
        if (!this.document?.documentElement) return
        const { documentElement } = this.document
        if (this.#column) {
            const side = this.#vertical ? 'height' : 'width'
            const otherSide = this.#vertical ? 'width' : 'height'
            const contentRect = this.#contentRange.getBoundingClientRect()
            const rootRect = documentElement.getBoundingClientRect()
            const contentStart = this.#vertical
                ? 0
                : this.#rtl
                  ? rootRect.right - contentRect.right
                  : contentRect.left - rootRect.left
            const contentSize = contentStart + contentRect[side]
            const pageCount = Math.ceil(contentSize / this.#size)
            const expandedSize = pageCount * this.#size
            this.#element.style.padding = '0'
            this.#iframe.style[side] = `${expandedSize}px`
            this.#element.style[side] = `${expandedSize + this.#size * 2}px`
            this.#iframe.style[otherSide] = '100%'
            this.#element.style[otherSide] = '100%'
            documentElement.style[side] = `${this.#size}px`
            if (this.#overlayer) {
                this.#overlayer.element.style.margin = '0'
                this.#overlayer.element.style.left = this.#vertical
                    ? '0'
                    : `${this.#size}px`
                this.#overlayer.element.style.top = this.#vertical
                    ? `${this.#size}px`
                    : '0'
                this.#overlayer.element.style[side] = `${expandedSize}px`
                this.#overlayer.redraw()
            }
        } else {
            const side = this.#vertical ? 'width' : 'height'
            const otherSide = this.#vertical ? 'height' : 'width'
            const contentSize =
                documentElement.getBoundingClientRect()[side]
            const expandedSize = contentSize
            const { margin, gap } = this.#layout as LayoutConfig
            const padding = this.#vertical
                ? `0 ${gap}px`
                : `${margin}px 0`
            this.#element.style.padding = padding
            this.#iframe.style[side] = `${expandedSize}px`
            this.#element.style[side] = `${expandedSize}px`
            this.#iframe.style[otherSide] = '100%'
            this.#element.style[otherSide] = '100%'
            if (this.#overlayer) {
                this.#overlayer.element.style.margin = padding
                this.#overlayer.element.style.left = '0'
                this.#overlayer.element.style.top = '0'
                this.#overlayer.element.style[side] = `${expandedSize}px`
                this.#overlayer.redraw()
            }
        }
        this.onExpand()
    }

    set overlayer(overlayer: Overlayer) {
        this.#overlayer = overlayer
        this.#element.append(overlayer.element)
    }

    get overlayer(): Overlayer | undefined {
        return this.#overlayer
    }

    destroy(): void {
        try {
            const body = this.document?.body
            if (body instanceof Element) this.#observer.unobserve(body)
        } catch {
            /* element may be detached */
        }
    }
}

// ---- Paginator custom element ----

// NOTE: everything here assumes the so-called "negative scroll type" for RTL
export class Paginator extends HTMLElement {
    static observedAttributes = [
        'flow',
        'gap',
        'margin',
        'max-inline-size',
        'max-block-size',
        'max-column-count',
    ]

    #root: ShadowRoot = this.attachShadow({ mode: 'closed' })
    #observer: ResizeObserver = new ResizeObserver(() => {
        try {
            this.render()
        } catch {
            /* doc may be detached */
        }
    })
    #top!: HTMLElement
    #background!: HTMLElement
    #container!: HTMLElement
    #header!: HTMLElement
    #footer!: HTMLElement
    #view: View | null = null
    #vertical = false
    #rtl = false
    #margin = 0
    #index = -1
    #anchor: number | Range | Element = 0 // anchor view to a fraction (0-1), Range, or Element
    #justAnchored = false
    #locked = false // while true, prevent any further navigation
    #styles: string | [string, string] | undefined
    #styleMap = new WeakMap<Document, [HTMLStyleElement, HTMLStyleElement]>()
    #mediaQuery: MediaQueryList = matchMedia('(prefers-color-scheme: dark)')
    #mediaQueryListener: () => void
    #scrollBounds: [number, number, number] | undefined
    #touchState: TouchState = { x: 0, y: 0, t: 0, vx: 0, vy: 0 }
    #touchScrolled = false
    #lastVisibleRange: Range | undefined

    // Public fields set by open()
    bookDir?: string
    sections!: Section[]
    heads: HTMLElement[] | null = null
    feet: HTMLElement[] | null = null
    columnCount = 1

    constructor() {
        super()
        this.#root.innerHTML = `<style>
        :host {
            display: block;
            container-type: size;
        }
        :host, #top {
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
            width: 100%;
            height: 100%;
        }
        #top {
            --_gap: 7%;
            --_margin: 48px;
            --_max-inline-size: 720px;
            --_max-block-size: 1440px;
            --_max-column-count: 2;
            --_max-column-count-portrait: 1;
            --_max-column-count-spread: var(--_max-column-count);
            --_half-gap: calc(var(--_gap) / 2);
            --_max-width: calc(var(--_max-inline-size) * var(--_max-column-count-spread));
            --_max-height: var(--_max-block-size);
            display: grid;
            grid-template-columns:
                minmax(var(--_half-gap), 1fr)
                var(--_half-gap)
                minmax(0, calc(var(--_max-width) - var(--_gap)))
                var(--_half-gap)
                minmax(var(--_half-gap), 1fr);
            grid-template-rows:
                minmax(var(--_margin), 1fr)
                minmax(0, var(--_max-height))
                minmax(var(--_margin), 1fr);
            &.vertical {
                --_max-column-count-spread: var(--_max-column-count-portrait);
                --_max-width: var(--_max-block-size);
                --_max-height: calc(var(--_max-inline-size) * var(--_max-column-count-spread));
            }
            @container (orientation: portrait) {
                & {
                    --_max-column-count-spread: var(--_max-column-count-portrait);
                }
                &.vertical {
                    --_max-column-count-spread: var(--_max-column-count);
                }
            }
        }
        #background {
            grid-column: 1 / -1;
            grid-row: 1 / -1;
        }
        #container {
            grid-column: 2 / 5;
            grid-row: 2;
            overflow: hidden;
        }
        :host([flow="scrolled"]) #container {
            grid-column: 1 / -1;
            grid-row: 1 / -1;
            overflow: auto;
        }
        #header {
            grid-column: 3 / 4;
            grid-row: 1;
        }
        #footer {
            grid-column: 3 / 4;
            grid-row: 3;
            align-self: end;
        }
        #header, #footer {
            display: grid;
            height: var(--_margin);
        }
        :is(#header, #footer) > * {
            display: flex;
            align-items: center;
            min-width: 0;
        }
        :is(#header, #footer) > * > * {
            width: 100%;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            text-align: center;
            font-size: .75em;
            opacity: .6;
        }
        </style>
        <div id="top">
            <div id="background" part="filter"></div>
            <div id="header"></div>
            <div id="container" part="container"></div>
            <div id="footer"></div>
        </div>
        `

        this.#top = this.#root.getElementById('top')!
        this.#background = this.#root.getElementById('background')!
        this.#container = this.#root.getElementById('container')!
        this.#header = this.#root.getElementById('header')!
        this.#footer = this.#root.getElementById('footer')!

        this.#observer.observe(this.#container)
        this.#container.addEventListener('scroll', () =>
            this.dispatchEvent(new Event('scroll')),
        )
        this.#container.addEventListener(
            'scroll',
            debounce(() => {
                if (this.scrolled) {
                    if (this.#justAnchored) this.#justAnchored = false
                    else this.#afterScroll('scroll')
                }
            }, 250),
        )

        const opts: AddEventListenerOptions = { passive: false }
        this.addEventListener(
            'touchstart',
            this.#onTouchStart.bind(this) as EventListener,
            opts,
        )
        this.addEventListener(
            'touchmove',
            this.#onTouchMove.bind(this) as EventListener,
            opts,
        )
        this.addEventListener(
            'touchend',
            this.#onTouchEnd.bind(this),
        )
        this.addEventListener('load', ((e: CustomEvent<{ doc: Document }>) => {
            const { doc } = e.detail
            doc.addEventListener(
                'touchstart',
                this.#onTouchStart.bind(this) as EventListener,
                opts,
            )
            doc.addEventListener(
                'touchmove',
                this.#onTouchMove.bind(this) as EventListener,
                opts,
            )
            doc.addEventListener(
                'touchend',
                this.#onTouchEnd.bind(this),
            )
        }) as EventListener)

        this.addEventListener('relocate', ((e: CustomEvent<RelocateDetail>) => {
            const detail = e.detail
            if (detail.reason === 'selection')
                setSelectionTo(this.#anchor, 0)
            else if (detail.reason === 'navigation') {
                if (this.#anchor === 1) setSelectionTo(detail.range, 1)
                else if (typeof this.#anchor === 'number')
                    setSelectionTo(detail.range, -1)
                else setSelectionTo(this.#anchor, -1)
            }
        }) as EventListener)

        const checkPointerSelection = debounce(
            (range: Range, sel: Selection) => {
                if (!sel.rangeCount) return
                const selRange = sel.getRangeAt(0)
                const backward = selectionIsBackward(sel)
                if (
                    backward &&
                    selRange.compareBoundaryPoints(
                        Range.START_TO_START,
                        range,
                    ) < 0
                )
                    this.prev()
                else if (
                    !backward &&
                    selRange.compareBoundaryPoints(Range.END_TO_END, range) > 0
                )
                    this.next()
            },
            700,
        )

        this.addEventListener('load', ((e: CustomEvent<{ doc: Document }>) => {
            const { doc } = e.detail
            let isPointerSelecting = false
            doc.addEventListener(
                'pointerdown',
                () => (isPointerSelecting = true),
            )
            doc.addEventListener(
                'pointerup',
                () => (isPointerSelecting = false),
            )
            let isKeyboardSelecting = false
            doc.addEventListener(
                'keydown',
                () => (isKeyboardSelecting = true),
            )
            doc.addEventListener(
                'keyup',
                () => (isKeyboardSelecting = false),
            )
            doc.addEventListener('selectionchange', () => {
                if (this.scrolled) return
                const range = this.#lastVisibleRange
                if (!range) return
                const sel = doc.getSelection()
                if (!sel?.rangeCount) return
                if (isPointerSelecting && sel.type === 'Range')
                    checkPointerSelection(range, sel)
                else if (isKeyboardSelecting) {
                    const selRange = sel.getRangeAt(0).cloneRange()
                    const backward = selectionIsBackward(sel)
                    if (!backward) selRange.collapse()
                    this.#scrollToAnchor(selRange)
                }
            })
            doc.addEventListener('focusin', (e: FocusEvent) =>
                this.scrolled
                    ? null
                    : requestAnimationFrame(() =>
                          this.#scrollToAnchor(e.target as Element),
                      ),
            )
        }) as EventListener)

        this.#mediaQueryListener = () => {
            if (!this.#view) return
            this.#replaceBackground(
                this.#view.docBackground,
                this.columnCount,
            )
        }
        this.#mediaQuery.addEventListener('change', this.#mediaQueryListener)
    }

    attributeChangedCallback(name: string, _: string | null, value: string | null): void {
        switch (name) {
            case 'flow':
                this.render()
                break
            case 'gap':
            case 'margin':
            case 'max-block-size':
            case 'max-column-count':
                this.#top.style.setProperty('--_' + name, value)
                this.render()
                break
            case 'max-inline-size':
                this.#top.style.setProperty('--_' + name, value)
                this.render()
                break
        }
    }

    open(book: Book): void {
        this.bookDir = book.dir
        this.sections = book.sections
        book.transformTarget?.addEventListener('data', ((e: CustomEvent<{ type: string; data: string | Promise<string> }>) => {
            const detail = e.detail
            if (detail.type !== 'text/css') return
            const w = innerWidth
            const h = innerHeight
            detail.data = Promise.resolve(detail.data).then(data =>
                data
                    .replace(/(?<=[{\s;])-epub-/gi, '')
                    .replace(
                        /(\d*\.?\d+)vw/gi,
                        (_, d: string) =>
                            (parseFloat(d) * w) / 100 + 'px',
                    )
                    .replace(
                        /(\d*\.?\d+)vh/gi,
                        (_, d: string) =>
                            (parseFloat(d) * h) / 100 + 'px',
                    )
                    .replace(
                        /page-break-(after|before|inside)\s*:/gi,
                        (_, x: string) =>
                            `-webkit-column-break-${x}:`,
                    )
                    .replace(
                        /break-(after|before|inside)\s*:\s*(avoid-)?page/gi,
                        (_, x: string, y: string | undefined) =>
                            `break-${x}: ${y ?? ''}column`,
                    ),
            )
        }) as EventListener)
    }

    #createView(): View {
        if (this.#view) {
            this.#view.destroy()
            this.#container.removeChild(this.#view.element)
        }
        this.#view = new View({
            container: this,
            onExpand: () => this.#scrollToAnchor(this.#anchor),
        })
        this.#container.append(this.#view.element)
        return this.#view
    }

    #replaceBackground(background: string, columnCount: number): void {
        const doc = this.#view?.document
        if (!doc) return
        const htmlStyle = doc.defaultView?.getComputedStyle(doc.documentElement)
        if (!htmlStyle) return
        const themeBgColor = htmlStyle.getPropertyValue('--theme-bg-color')
        if (background && themeBgColor) {
            const parsedBackground = background.split(
                /\s(?=(?:url|rgb|hsl|#[0-9a-fA-F]{3,6}))/,
            )
            parsedBackground[0] = themeBgColor
            background = parsedBackground.join(' ')
        }
        if (/cover.*fixed|fixed.*cover/.test(background)) {
            background = background
                .replace('cover', 'auto 100%')
                .replace('fixed', '')
        }
        this.#background.innerHTML = ''
        this.#background.style.display = 'grid'
        this.#background.style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`
        for (let i = 0; i < columnCount; i++) {
            const column = document.createElement('div')
            column.style.background = background
            column.style.width = '100%'
            column.style.height = '100%'
            this.#background.appendChild(column)
        }
    }

    #beforeRender({ vertical, rtl, background }: BeforeRenderInfo): LayoutConfig | ScrolledLayoutConfig {
        this.#vertical = vertical
        this.#rtl = rtl
        this.#top.classList.toggle('vertical', vertical)

        const { width, height } = this.#container.getBoundingClientRect()
        const size = vertical ? height : width

        const style = getComputedStyle(this.#top)
        const maxInlineSize = parseFloat(
            style.getPropertyValue('--_max-inline-size'),
        )
        const maxColumnCount = parseInt(
            style.getPropertyValue('--_max-column-count-spread'),
        )
        const margin = parseFloat(style.getPropertyValue('--_margin'))
        this.#margin = margin

        const g =
            parseFloat(style.getPropertyValue('--_gap')) / 100
        const gap = (-g / (g - 1)) * size

        const flow = this.getAttribute('flow')
        if (flow === 'scrolled') {
            this.setAttribute('dir', vertical ? 'rtl' : 'ltr')
            this.#top.style.padding = '0'
            const columnWidth = maxInlineSize

            this.heads = null
            this.feet = null
            this.#header.replaceChildren()
            this.#footer.replaceChildren()

            return { flow, margin, gap, columnWidth }
        }

        const divisor = Math.min(
            maxColumnCount,
            Math.ceil(size / maxInlineSize),
        )
        const columnWidth = vertical
            ? size / divisor - margin
            : size / divisor - gap
        this.setAttribute('dir', rtl ? 'rtl' : 'ltr')

        this.columnCount = divisor
        this.#replaceBackground(background, this.columnCount)

        const marginalDivisor = vertical
            ? Math.min(2, Math.ceil(width / maxInlineSize))
            : divisor
        const marginalStyle = {
            gridTemplateColumns: `repeat(${marginalDivisor}, 1fr)`,
            gap: `${gap}px`,
            direction: this.bookDir === 'rtl' ? 'rtl' : 'ltr',
        }
        Object.assign(this.#header.style, marginalStyle)
        Object.assign(this.#footer.style, marginalStyle)
        const heads = makeMarginals(marginalDivisor, 'head')
        const feet = makeMarginals(marginalDivisor, 'foot')
        this.heads = heads.map(el => el.children[0] as HTMLElement)
        this.feet = feet.map(el => el.children[0] as HTMLElement)
        this.#header.replaceChildren(...heads)
        this.#footer.replaceChildren(...feet)

        return { height, width, margin, gap, columnWidth }
    }

    render(): void {
        if (!this.#view) return
        this.#view.render(
            this.#beforeRender({
                vertical: this.#vertical,
                rtl: this.#rtl,
                background: '',
            }) as LayoutConfig,
        )
        this.#scrollToAnchor(this.#anchor)
    }

    get scrolled(): boolean {
        return this.getAttribute('flow') === 'scrolled'
    }

    get scrollProp(): 'scrollLeft' | 'scrollTop' {
        const { scrolled } = this
        return this.#vertical
            ? scrolled
                ? 'scrollLeft'
                : 'scrollTop'
            : scrolled
              ? 'scrollTop'
              : 'scrollLeft'
    }

    get sideProp(): 'width' | 'height' {
        const { scrolled } = this
        return this.#vertical
            ? scrolled
                ? 'width'
                : 'height'
            : scrolled
              ? 'height'
              : 'width'
    }

    get size(): number {
        return this.#container.getBoundingClientRect()[this.sideProp]
    }

    get viewSize(): number {
        return this.#view!.element.getBoundingClientRect()[this.sideProp]
    }

    get start(): number {
        return Math.abs(this.#container[this.scrollProp])
    }

    get end(): number {
        return this.start + this.size
    }

    get page(): number {
        return Math.floor((this.start + this.end) / 2 / this.size)
    }

    get pages(): number {
        return Math.round(this.viewSize / this.size)
    }

    get containerPosition(): number {
        return this.#container[this.scrollProp]
    }

    set containerPosition(newVal: number) {
        this.#container[this.scrollProp] = newVal
    }

    // Named differently from HTMLElement.scrollBy to avoid signature conflict
    doScrollBy(dx: number, dy: number): void {
        if (!this.#scrollBounds) return
        const delta = this.#vertical ? dy : dx
        const [offset, a, b] = this.#scrollBounds
        const rtl = this.#rtl
        const min = rtl ? offset - b : offset - a
        const max = rtl ? offset + a : offset + b
        this.containerPosition = Math.max(
            min,
            Math.min(max, this.containerPosition + delta),
        )
    }

    snap(vx: number, vy: number): void {
        if (!this.#scrollBounds) return
        if (this.#locked) return
        const velocity = this.#vertical ? vy : vx
        const [offset, a, b] = this.#scrollBounds
        const { start, end, pages, size } = this
        const min = Math.abs(offset) - a
        const max = Math.abs(offset) + b
        const d = velocity * (this.#rtl ? -size : size)
        const page = Math.floor(
            Math.max(
                min,
                Math.min(
                    max,
                    (start + end) / 2 + (isNaN(d) ? 0 : d),
                ),
            ) / size,
        )

        this.#locked = true
        this.#scrollToPage(page, 'snap').then(() => {
            const dir =
                page <= 0 ? -1 : page >= pages - 1 ? 1 : null
            if (dir)
                return this.#goTo({
                    index: this.#adjacentIndex(dir)!,
                    anchor: dir < 0 ? () => 1 : () => 0,
                })
        }).finally(() => {
            this.#locked = false
        })
    }

    #onTouchStart(e: TouchEvent): void {
        const touch = e.changedTouches[0]
        this.#touchState = {
            x: touch?.screenX,
            y: touch?.screenY,
            t: e.timeStamp,
            vx: 0,
            vy: 0,
        }
    }

    #onTouchMove(e: TouchEvent): void {
        const state = this.#touchState
        if (state.pinched) return
        state.pinched = globalThis.visualViewport!.scale > 1
        if (this.scrolled || state.pinched) return
        if (e.touches.length > 1) {
            if (this.#touchScrolled) e.preventDefault()
            return
        }
        const doc = this.#view?.document
        const selection = doc?.getSelection()
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
            return
        }
        e.preventDefault()
        const touch = e.changedTouches[0]
        const x = touch.screenX,
            y = touch.screenY
        const dx = state.x - x,
            dy = state.y - y
        const dt = e.timeStamp - state.t
        state.x = x
        state.y = y
        state.t = e.timeStamp
        state.vx = dx / dt
        state.vy = dy / dt
        this.#touchScrolled = true
        if (Math.abs(dx) >= Math.abs(dy)) {
            this.doScrollBy(dx, 0)
        } else if (Math.abs(dy) > Math.abs(dx)) {
            this.doScrollBy(0, dy)
        }
    }

    #onTouchEnd(): void {
        this.#touchScrolled = false
        if (this.scrolled) return
        requestAnimationFrame(() => {
            if (globalThis.visualViewport!.scale === 1)
                this.snap(this.#touchState.vx, this.#touchState.vy)
        })
    }

    // allows one to process rects as if they were LTR and horizontal
    #getRectMapper(): (rect: DOMRect) => MappedRect {
        if (this.scrolled) {
            const size = this.viewSize
            const margin = this.#margin
            return this.#vertical
                ? ({ left, right }: DOMRect) => ({
                      left: size - right - margin,
                      right: size - left - margin,
                  })
                : ({ top, bottom }: DOMRect) => ({
                      left: top + margin,
                      right: bottom + margin,
                  })
        }
        const pxSize = this.pages * this.size
        return this.#rtl
            ? ({ left, right }: DOMRect) => ({
                  left: pxSize - right,
                  right: pxSize - left,
              })
            : this.#vertical
              ? ({ top, bottom }: DOMRect) => ({
                    left: top,
                    right: bottom,
                })
              : (f: DOMRect) => f
    }

    async #scrollToRect(rect: DOMRect, reason: string): Promise<void> {
        if (this.scrolled) {
            const offset = this.#getRectMapper()(rect).left - this.#margin
            return this.#scrollTo(offset, reason)
        }
        const offset = this.#getRectMapper()(rect).left
        return this.#scrollToPage(
            Math.floor(offset / this.size) + (this.#rtl ? -1 : 1),
            reason,
        )
    }

    async #scrollTo(
        offset: number,
        reason: string,
        smooth?: boolean,
    ): Promise<void> {
        const { size } = this
        if (this.containerPosition === offset) {
            this.#scrollBounds = [
                offset,
                this.atStart ? 0 : size,
                this.atEnd ? 0 : size,
            ]
            this.#afterScroll(reason)
            return
        }
        // FIXME: vertical-rl only, not -lr
        if (this.scrolled && this.#vertical) offset = -offset
        if (
            (reason === 'snap' || smooth) &&
            this.hasAttribute('animated')
        )
            return animate(
                this.containerPosition,
                offset,
                300,
                easeOutQuad,
                x => (this.containerPosition = x),
            ).then(() => {
                this.#scrollBounds = [
                    offset,
                    this.atStart ? 0 : size,
                    this.atEnd ? 0 : size,
                ]
                this.#afterScroll(reason)
            })
        else {
            this.containerPosition = offset
            this.#scrollBounds = [
                offset,
                this.atStart ? 0 : size,
                this.atEnd ? 0 : size,
            ]
            this.#afterScroll(reason)
        }
    }

    async #scrollToPage(
        page: number,
        reason: string,
        smooth?: boolean,
    ): Promise<void> {
        const offset = this.size * (this.#rtl ? -page : page)
        return this.#scrollTo(offset, reason, smooth)
    }

    async scrollToAnchor(
        anchor: number | Range | Element,
        select?: boolean,
    ): Promise<void> {
        return this.#scrollToAnchor(
            anchor,
            select ? 'selection' : 'navigation',
        )
    }

    async #scrollToAnchor(
        anchor: number | Range | Element,
        reason: string = 'anchor',
    ): Promise<void> {
        this.#anchor = anchor
        const target = uncollapse(anchor)
        const rects = target?.getClientRects?.()
        if (rects) {
            const rect =
                Array.from(rects).find(
                    r => r.width > 0 && r.height > 0,
                ) || rects[0]
            if (!rect) return
            await this.#scrollToRect(rect, reason)
            return
        }
        // if anchor is a fraction
        if (this.scrolled) {
            await this.#scrollTo(
                (anchor as number) * this.viewSize,
                reason,
            )
            return
        }
        const { pages } = this
        if (!pages) return
        const textPages = pages - 2
        const newPage = Math.round((anchor as number) * (textPages - 1))
        await this.#scrollToPage(newPage + 1, reason)
    }

    #getVisibleRange(): Range {
        const doc = this.#view!.document!
        if (this.scrolled)
            return getVisibleRange(
                doc,
                this.start + this.#margin,
                this.end - this.#margin,
                this.#getRectMapper(),
            )
        const size = this.#rtl ? -this.size : this.size
        return getVisibleRange(
            doc,
            this.start - size,
            this.end - size,
            this.#getRectMapper(),
        )
    }

    #afterScroll(reason: string): void {
        const range = this.#getVisibleRange()
        this.#lastVisibleRange = range
        if (
            reason !== 'selection' &&
            reason !== 'navigation' &&
            reason !== 'anchor'
        )
            this.#anchor = range
        else this.#justAnchored = true

        const index = this.#index
        const detail: RelocateDetail = { reason, range, index }
        if (this.scrolled)
            detail.fraction = this.start / this.viewSize
        else if (this.pages > 0) {
            const { page, pages } = this
            this.#header.style.visibility =
                page > 1 ? 'visible' : 'hidden'
            detail.fraction = (page - 1) / (pages - 2)
            detail.size = 1 / (pages - 2)
        }
        this.dispatchEvent(new CustomEvent('relocate', { detail }))
    }

    async #display(promise: Promise<DisplayTarget>): Promise<void> {
        const { index, src, anchor, onLoad, select } = await promise
        if (index == null) return
        this.#index = index
        const hasFocus = this.#view?.document?.hasFocus()
        if (src) {
            const view = this.#createView()
            const afterLoad = (doc: Document) => {
                if (doc.head) {
                    const $styleBefore = doc.createElement('style')
                    doc.head.prepend($styleBefore)
                    const $style = doc.createElement('style')
                    doc.head.append($style)
                    this.#styleMap.set(doc, [$styleBefore, $style])
                }
                onLoad?.({ doc, index })
            }
            const beforeRender = this.#beforeRender.bind(this)
            await view.load(src, afterLoad, beforeRender)
            this.dispatchEvent(
                new CustomEvent('create-overlayer', {
                    detail: {
                        doc: view.document,
                        index,
                        attach: (overlayer: Overlayer) =>
                            (view.overlayer = overlayer),
                    },
                }),
            )
            this.#view = view
        }
        const resolvedAnchor =
            typeof anchor === 'function'
                ? anchor(this.#view!.document!)
                : anchor
        await this.scrollToAnchor(
            (resolvedAnchor as number | Range | Element) ?? 0,
            select,
        )
        if (hasFocus) this.focusView()
    }

    #canGoToIndex(index: number): boolean {
        return index >= 0 && index <= this.sections.length - 1
    }

    async #goTo({ index, anchor, select }: GoToTarget): Promise<void> {
        if (index === this.#index)
            await this.#display(
                Promise.resolve({ index, anchor, select }),
            )
        else {
            const oldIndex = this.#index
            const onLoad = (detail: { doc: Document; index: number }) => {
                this.sections[oldIndex]?.unload?.()
                this.setStyles(this.#styles)
                this.dispatchEvent(new CustomEvent('load', { detail }))
            }
            await this.#display(
                Promise.resolve(this.sections[index].load())
                    .then(src => ({ index, src, anchor, onLoad, select }))
                    .catch(e => {
                        console.warn(e)
                        console.warn(
                            new Error(
                                `Failed to load section ${index}`,
                            ),
                        )
                        return {} as DisplayTarget
                    }),
            )
        }
    }

    async goTo(target: GoToTarget | Promise<GoToTarget>): Promise<void> {
        // Explicit navigation (chapter jump, link click) always takes priority
        // over the page-turn lock. Force-unlock so the navigation proceeds.
        this.#locked = false
        const resolved = await target
        if (resolved && this.#canGoToIndex(resolved.index))
            return this.#goTo(resolved)
    }

    #scrollPrev(distance?: number): boolean | Promise<boolean> | undefined {
        if (!this.#view) return true
        if (this.scrolled) {
            if (this.start > 0)
                return this.#scrollTo(
                    Math.max(0, this.start - (distance ?? this.size)),
                    '',
                    true,
                ) as unknown as boolean
            return !this.atStart
        }
        if (this.atStart) return
        const page = this.page - 1
        return this.#scrollToPage(page, 'page', true).then(
            () => page <= 0,
        )
    }

    #scrollNext(distance?: number): boolean | Promise<boolean> | undefined {
        if (!this.#view) return true
        if (this.scrolled) {
            if (this.viewSize - this.end > 2)
                return this.#scrollTo(
                    Math.min(
                        this.viewSize,
                        distance ? this.start + distance : this.end,
                    ),
                    '',
                    true,
                ) as unknown as boolean
            return !this.atEnd
        }
        if (this.atEnd) return
        const page = this.page + 1
        const pages = this.pages
        return this.#scrollToPage(page, 'page', true).then(
            () => page >= pages - 1,
        )
    }

    get atStart(): boolean {
        return this.#adjacentIndex(-1) == null && this.page <= 1
    }

    get atEnd(): boolean {
        return (
            this.#adjacentIndex(1) == null &&
            this.page >= this.pages - 2
        )
    }

    #adjacentIndex(dir: number): number | undefined {
        for (
            let index = this.#index + dir;
            this.#canGoToIndex(index);
            index += dir
        )
            if (this.sections[index]?.linear !== 'no') return index
    }

    async #turnPage(dir: -1 | 1, distance?: number): Promise<void> {
        if (this.#locked) return
        this.#locked = true
        // Safety timeout: force-unlock after 5s to prevent permanent lock-up
        // if a promise hangs (e.g., iframe destroyed mid-load)
        const safetyTimer = setTimeout(() => { this.#locked = false }, 5000)
        try {
            const prev = dir === -1
            const shouldGo = await (prev
                ? this.#scrollPrev(distance)
                : this.#scrollNext(distance))
            if (shouldGo)
                await this.#goTo({
                    index: this.#adjacentIndex(dir)!,
                    anchor: prev ? () => 1 : () => 0,
                })
            if (shouldGo || !this.hasAttribute('animated'))
                await wait(100)
        } finally {
            clearTimeout(safetyTimer)
            this.#locked = false
        }
    }

    async prev(distance?: number): Promise<void> {
        return await this.#turnPage(-1, distance)
    }

    async next(distance?: number): Promise<void> {
        return await this.#turnPage(1, distance)
    }

    prevSection(): Promise<void> | undefined {
        const index = this.#adjacentIndex(-1)
        if (index != null) return this.goTo({ index })
    }

    nextSection(): Promise<void> | undefined {
        const index = this.#adjacentIndex(1)
        if (index != null) return this.goTo({ index })
    }

    firstSection(): Promise<void> | undefined {
        const index = this.sections.findIndex(
            section => section.linear !== 'no',
        )
        return this.goTo({ index })
    }

    lastSection(): Promise<void> | undefined {
        const index = this.sections.findLastIndex(
            section => section.linear !== 'no',
        )
        return this.goTo({ index })
    }

    getContents(): Array<{
        index: number
        overlayer: Overlayer | undefined
        doc: Document | null
    }> {
        if (this.#view)
            return [
                {
                    index: this.#index,
                    overlayer: this.#view.overlayer,
                    doc: this.#view.document,
                },
            ]
        return []
    }

    setStyles(styles: string | [string, string] | undefined): void {
        this.#styles = styles
        const $$styles = this.#styleMap.get(this.#view?.document!)
        if (!$$styles) return
        const [$beforeStyle, $style] = $$styles
        if (Array.isArray(styles)) {
            const [beforeStyle, style] = styles
            $beforeStyle.textContent = beforeStyle
            $style.textContent = style
        } else $style.textContent = styles ?? ''

        requestAnimationFrame(() => {
            this.#replaceBackground(
                this.#view!.docBackground,
                this.columnCount,
            )
        })

        this.#view?.document?.fonts?.ready?.then(() =>
            this.#view?.expand(),
        )
    }

    focusView(): void {
        this.#view?.document?.defaultView?.focus()
    }

    destroy(): void {
        try {
            this.#observer.unobserve(this)
        } catch {
            /* element may be detached */
        }
        try {
            this.#view?.destroy()
        } catch {
            /* view may be destroyed already */
        }
        this.#view = null
        this.sections[this.#index]?.unload?.()
        this.#mediaQuery.removeEventListener(
            'change',
            this.#mediaQueryListener,
        )
    }
}

customElements.define('foliate-paginator', Paginator)
