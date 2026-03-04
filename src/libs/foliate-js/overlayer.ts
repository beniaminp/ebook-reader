// ---- Types ----

export interface OverlayRect {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}

export interface UnderlineOptions {
    color?: string;
    width?: number;
    padding?: number;
    writingMode?: string;
}

export interface StrikethroughOptions {
    color?: string;
    width?: number;
    writingMode?: string;
}

export interface SquigglyOptions {
    color?: string;
    width?: number;
    padding?: number;
    writingMode?: string;
}

export interface HighlightOptions {
    color?: string;
    padding?: number;
}

export interface OutlineOptions {
    color?: string;
    width?: number;
    padding?: number;
    radius?: number;
}

export interface CopyImageOptions {
    src: string;
}

export type DrawFunction = (
    rects: OverlayRect[],
    options?: Record<string, unknown>,
) => SVGElement

interface OverlayEntry {
    range: Range | ((root: Node) => Range);
    draw: DrawFunction;
    options: Record<string, unknown> | undefined;
    element: SVGElement;
    rects: OverlayRect[];
}

// ---- Helpers ----

const createSVGElement = <K extends keyof SVGElementTagNameMap>(
    tag: K,
): SVGElementTagNameMap[K] =>
    document.createElementNS('http://www.w3.org/2000/svg', tag)

// ---- Overlayer class ----

export class Overlayer {
    #svg: SVGSVGElement = createSVGElement('svg')
    #map = new Map<string, OverlayEntry>()
    #doc: Document

    constructor(doc: Document) {
        this.#doc = doc
        Object.assign(this.#svg.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
        })
    }

    get element(): SVGSVGElement {
        return this.#svg
    }

    get #zoom(): number {
        // Safari does not zoom the client rects, while Chrome, Edge and Firefox does
        if (
            /^((?!chrome|android).)*AppleWebKit/i.test(
                navigator.userAgent,
            ) &&
            !(window as unknown as Record<string, unknown>).chrome
        ) {
            const body = this.#doc.body
            if (!body) return 1.0
            return (
                parseFloat(
                    window.getComputedStyle(body).zoom || '1',
                ) || 1.0
            )
        }
        return 1.0
    }

    #splitRangeByParagraph(range: Range): Range[] {
        const ancestor = range.commonAncestorContainer
        const paragraphs = Array.from(
            (ancestor as Element).querySelectorAll?.('p') || [],
        )
        if (paragraphs.length === 0) return [range]

        const splitRanges: Range[] = []
        paragraphs.forEach(p => {
            const pRange = document.createRange()
            if (range.intersectsNode(p)) {
                pRange.selectNodeContents(p)
                if (
                    pRange.compareBoundaryPoints(
                        Range.START_TO_START,
                        range,
                    ) < 0
                ) {
                    pRange.setStart(
                        range.startContainer,
                        range.startOffset,
                    )
                }
                if (
                    pRange.compareBoundaryPoints(
                        Range.END_TO_END,
                        range,
                    ) > 0
                ) {
                    pRange.setEnd(
                        range.endContainer,
                        range.endOffset,
                    )
                }
                splitRanges.push(pRange)
            }
        })
        return splitRanges
    }

    #getScaledRects(range: Range): OverlayRect[] {
        const zoom = this.#zoom
        let rects: OverlayRect[] = []
        this.#splitRangeByParagraph(range).forEach(pRange => {
            const pRects = Array.from(pRange.getClientRects()).map(
                rect => ({
                    left: rect.left * zoom,
                    top: rect.top * zoom,
                    right: rect.right * zoom,
                    bottom: rect.bottom * zoom,
                    width: rect.width * zoom,
                    height: rect.height * zoom,
                }),
            )
            rects = rects.concat(pRects)
        })
        return rects
    }

    add(
        key: string,
        range: Range | ((root: Node) => Range),
        draw: DrawFunction,
        options?: Record<string, unknown>,
    ): void {
        if (this.#map.has(key)) this.remove(key)
        if (typeof range === 'function')
            range = range(this.#svg.getRootNode())
        const rects = this.#getScaledRects(range)
        const element = draw(rects, options)
        this.#svg.append(element)
        this.#map.set(key, { range, draw, options, element, rects })
    }

    remove(key: string): void {
        const entry = this.#map.get(key)
        if (!entry) return
        this.#svg.removeChild(entry.element)
        this.#map.delete(key)
    }

    redraw(): void {
        for (const obj of this.#map.values()) {
            const { range, draw, options, element } = obj
            this.#svg.removeChild(element)
            const rects = this.#getScaledRects(range as Range)
            const el = draw(rects, options)
            this.#svg.append(el)
            obj.element = el
            obj.rects = rects
        }
    }

    hitTest({ x, y }: { x: number; y: number }): [string, Range] | [] {
        const arr = Array.from(this.#map.entries())
        // loop in reverse to hit more recently added items first
        for (let i = arr.length - 1; i >= 0; i--) {
            const [key, obj] = arr[i]
            for (const { left, top, right, bottom } of obj.rects)
                if (
                    top <= y &&
                    left <= x &&
                    bottom > y &&
                    right > x
                )
                    return [key, obj.range as Range]
        }
        return []
    }

    static underline(
        rects: OverlayRect[],
        options: UnderlineOptions = {},
    ): SVGGElement {
        const {
            color = 'red',
            width: strokeWidth = 2,
            padding = 0,
            writingMode,
        } = options
        const g = createSVGElement('g')
        g.setAttribute('fill', color)
        if (
            writingMode === 'vertical-rl' ||
            writingMode === 'vertical-lr'
        )
            for (const { right, top, height } of rects) {
                const el = createSVGElement('rect')
                el.setAttribute(
                    'x',
                    String(right - strokeWidth / 2 + padding),
                )
                el.setAttribute('y', String(top))
                el.setAttribute('height', String(height))
                el.setAttribute('width', String(strokeWidth))
                g.append(el)
            }
        else
            for (const { left, bottom, width } of rects) {
                const el = createSVGElement('rect')
                el.setAttribute('x', String(left))
                el.setAttribute(
                    'y',
                    String(bottom - strokeWidth / 2 + padding),
                )
                el.setAttribute('height', String(strokeWidth))
                el.setAttribute('width', String(width))
                g.append(el)
            }
        return g
    }

    static strikethrough(
        rects: OverlayRect[],
        options: StrikethroughOptions = {},
    ): SVGGElement {
        const {
            color = 'red',
            width: strokeWidth = 2,
            writingMode,
        } = options
        const g = createSVGElement('g')
        g.setAttribute('fill', color)
        if (
            writingMode === 'vertical-rl' ||
            writingMode === 'vertical-lr'
        )
            for (const { right, left, top, height } of rects) {
                const el = createSVGElement('rect')
                el.setAttribute('x', String((right + left) / 2))
                el.setAttribute('y', String(top))
                el.setAttribute('height', String(height))
                el.setAttribute('width', String(strokeWidth))
                g.append(el)
            }
        else
            for (const { left, top, bottom, width } of rects) {
                const el = createSVGElement('rect')
                el.setAttribute('x', String(left))
                el.setAttribute('y', String((top + bottom) / 2))
                el.setAttribute('height', String(strokeWidth))
                el.setAttribute('width', String(width))
                g.append(el)
            }
        return g
    }

    static squiggly(
        rects: OverlayRect[],
        options: SquigglyOptions = {},
    ): SVGGElement {
        const {
            color = 'red',
            width: strokeWidth = 2,
            padding = 0,
            writingMode,
        } = options
        const g = createSVGElement('g')
        g.setAttribute('fill', 'none')
        g.setAttribute('stroke', color)
        g.setAttribute('stroke-width', String(strokeWidth))
        const block = strokeWidth * 1.5
        if (
            writingMode === 'vertical-rl' ||
            writingMode === 'vertical-lr'
        )
            for (const { right, top, height } of rects) {
                const el = createSVGElement('path')
                const n = Math.round(height / block / 1.5)
                const inline = height / n
                const ls = Array.from(
                    { length: n },
                    (_, i) =>
                        `l${i % 2 ? -block : block} ${inline}`,
                ).join('')
                el.setAttribute(
                    'd',
                    `M${right - strokeWidth / 2 + padding} ${top}${ls}`,
                )
                g.append(el)
            }
        else
            for (const { left, bottom, width } of rects) {
                const el = createSVGElement('path')
                const n = Math.round(width / block / 1.5)
                const inline = width / n
                const ls = Array.from(
                    { length: n },
                    (_, i) =>
                        `l${inline} ${i % 2 ? block : -block}`,
                ).join('')
                el.setAttribute(
                    'd',
                    `M${left} ${bottom + strokeWidth / 2 + padding}${ls}`,
                )
                g.append(el)
            }
        return g
    }

    static highlight(
        rects: OverlayRect[],
        options: HighlightOptions = {},
    ): SVGGElement {
        const { color = 'red', padding = 0 } = options
        const g = createSVGElement('g')
        g.setAttribute('fill', color)
        g.style.opacity =
            'var(--overlayer-highlight-opacity, .3)'
        g.style.mixBlendMode =
            'var(--overlayer-highlight-blend-mode, normal)'
        for (const { left, top, height, width } of rects) {
            const el = createSVGElement('rect')
            el.setAttribute('x', String(left - padding))
            el.setAttribute('y', String(top - padding))
            el.setAttribute(
                'height',
                String(height + padding * 2),
            )
            el.setAttribute(
                'width',
                String(width + padding * 2),
            )
            g.append(el)
        }
        return g
    }

    static outline(
        rects: OverlayRect[],
        options: OutlineOptions = {},
    ): SVGGElement {
        const {
            color = 'red',
            width: strokeWidth = 3,
            padding = 0,
            radius = 3,
        } = options
        const g = createSVGElement('g')
        g.setAttribute('fill', 'none')
        g.setAttribute('stroke', color)
        g.setAttribute('stroke-width', String(strokeWidth))
        for (const { left, top, height, width } of rects) {
            const el = createSVGElement('rect')
            el.setAttribute('x', String(left - padding))
            el.setAttribute('y', String(top - padding))
            el.setAttribute(
                'height',
                String(height + padding * 2),
            )
            el.setAttribute(
                'width',
                String(width + padding * 2),
            )
            el.setAttribute('rx', String(radius))
            g.append(el)
        }
        return g
    }

    // make an exact copy of an image in the overlay
    static copyImage(
        [rect]: OverlayRect[],
        options: CopyImageOptions = { src: '' },
    ): SVGImageElement {
        const { src } = options
        const image = createSVGElement('image')
        const { left, top, height, width } = rect
        image.setAttribute('href', src)
        image.setAttribute('x', String(left))
        image.setAttribute('y', String(top))
        image.setAttribute('height', String(height))
        image.setAttribute('width', String(width))
        return image
    }
}
