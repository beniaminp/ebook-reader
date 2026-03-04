type MakeRangeFn = (
    startIndex: number,
    startOffset: number,
    endIndex: number,
    endOffset: number,
) => Range

export type TextWalkerMatch = { range: Range; excerpt?: string }

export type MatcherFunction = (
    strs: string[],
    makeRange: MakeRangeFn,
) => Iterable<TextWalkerMatch>

export type TextWalkerInput = Range | Document | (Node & { body?: Node; commonAncestorContainer?: Node })

const walkRange = (range: Range, walker: TreeWalker): Node[] => {
    const nodes: Node[] = []
    for (let node: Node | null = walker.currentNode; node; node = walker.nextNode()) {
        const compare = range.comparePoint(node, 0)
        if (compare === 0) nodes.push(node)
        else if (compare > 0) break
    }
    return nodes
}

const walkDocument = (_: unknown, walker: TreeWalker): Node[] => {
    const nodes: Node[] = []
    for (let node: Node | null = walker.nextNode(); node; node = walker.nextNode())
        nodes.push(node)
    return nodes
}

const filter =
    NodeFilter.SHOW_ELEMENT |
    NodeFilter.SHOW_TEXT |
    NodeFilter.SHOW_CDATA_SECTION

const acceptNode = (node: Node): number => {
    if (node.nodeType === 1) {
        const name = (node as Element).tagName.toLowerCase()
        if (name === 'script' || name === 'style')
            return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_SKIP
    }
    return NodeFilter.FILTER_ACCEPT
}

export const textWalker = function* (
    x: TextWalkerInput,
    func: MatcherFunction,
): Generator<TextWalkerMatch> {
    const root =
        (x as Range).commonAncestorContainer ??
        (x as Document).body ??
        x
    const walker = document.createTreeWalker(root, filter, {
        acceptNode,
    })
    const walk = (x as Range).commonAncestorContainer
        ? walkRange
        : walkDocument
    const nodes = walk(x as Range, walker)
    const strs = nodes.map(node => node.nodeValue ?? '')
    const makeRange: MakeRangeFn = (
        startIndex,
        startOffset,
        endIndex,
        endOffset,
    ) => {
        const range = document.createRange()
        range.setStart(nodes[startIndex], startOffset)
        range.setEnd(nodes[endIndex], endOffset)
        return range
    }
    for (const match of func(strs, makeRange)) yield match
}
