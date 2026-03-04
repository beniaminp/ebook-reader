import type { TextWalkerInput, MatcherFunction, TextWalkerMatch } from './text-walker'

const CONTEXT_LENGTH = 50

interface SearchRange {
    startIndex: number
    startOffset: number
    endIndex: number
    endOffset: number
}

interface Excerpt {
    pre: string
    match: string
    post: string
}

interface SearchResult {
    range: SearchRange | Range
    excerpt: Excerpt
}

interface SearchOptions {
    locales?: string
    granularity?: 'grapheme' | 'word'
    sensitivity?: 'base' | 'accent' | 'case' | 'variant'
}

interface SearchMatcherOptions {
    defaultLocale?: string
    matchCase?: boolean
    matchDiacritics?: boolean
    matchWholeWords?: boolean
}

type TextWalkerFn = (x: TextWalkerInput, func: MatcherFunction) => Generator<TextWalkerMatch>

const normalizeWhitespace = (str: string): string => str.replace(/\s+/g, ' ')

const makeExcerpt = (strs: string[], { startIndex, startOffset, endIndex, endOffset }: SearchRange): Excerpt => {
    const start = strs[startIndex]
    const end = strs[endIndex]
    const match = start === end
        ? start.slice(startOffset, endOffset)
        : start.slice(startOffset)
            + strs.slice(startIndex + 1, endIndex).join('')
            + end.slice(0, endOffset)
    const trimmedStart = normalizeWhitespace(start.slice(0, startOffset)).trimStart()
    const trimmedEnd = normalizeWhitespace(end.slice(endOffset)).trimEnd()
    const ellipsisPre = trimmedStart.length < CONTEXT_LENGTH ? '' : '…'
    const ellipsisPost = trimmedEnd.length < CONTEXT_LENGTH ? '' : '…'
    const pre = `${ellipsisPre}${trimmedStart.slice(-CONTEXT_LENGTH)}`
    const post = `${trimmedEnd.slice(0, CONTEXT_LENGTH)}${ellipsisPost}`
    return { pre, match, post }
}

const simpleSearch = function* (strs: string[], query: string, options: SearchOptions = {}): Generator<SearchResult> {
    const { locales = 'en', sensitivity } = options
    const matchCase = sensitivity === 'variant'
    const haystack = strs.join('')
    const lowerHaystack = matchCase ? haystack : haystack.toLocaleLowerCase(locales)
    const needle = matchCase ? query : query.toLocaleLowerCase(locales)
    const needleLength = needle.length
    let index = -1
    let strIndex = -1
    let sum = 0
    do {
        index = lowerHaystack.indexOf(needle, index + 1)
        if (index > -1) {
            while (sum <= index) sum += strs[++strIndex].length
            const startIndex = strIndex
            const startOffset = index - (sum - strs[strIndex].length)
            const end = index + needleLength
            while (sum <= end) sum += strs[++strIndex].length
            const endIndex = strIndex
            const endOffset = end - (sum - strs[strIndex].length)
            const range: SearchRange = { startIndex, startOffset, endIndex, endOffset }
            yield { range, excerpt: makeExcerpt(strs, range) }
        }
    } while (index > -1)
}

interface SegmentData {
    strIndex: number
    index: number
    segment: string
}

const segmenterSearch = function* (strs: string[], query: string, options: SearchOptions = {}): Generator<SearchResult> {
    const { locales = 'en', granularity = 'word', sensitivity = 'base' } = options
    let segmenter: Intl.Segmenter, collator: Intl.Collator
    try {
        segmenter = new Intl.Segmenter(locales, { usage: 'search', granularity } as Intl.SegmenterOptions)
        collator = new Intl.Collator(locales, { sensitivity })
    } catch (e) {
        console.warn(e)
        segmenter = new Intl.Segmenter('en', { usage: 'search', granularity } as Intl.SegmenterOptions)
        collator = new Intl.Collator('en', { sensitivity })
    }
    const queryLength = Array.from(segmenter.segment(query)).length

    const substrArr: SegmentData[] = []
    let strIndex = 0
    let segments = segmenter.segment(strs[strIndex])[Symbol.iterator]()
    main: while (strIndex < strs.length) {
        while (substrArr.length < queryLength) {
            const { done, value } = segments.next()
            if (done) {
                strIndex++
                if (strIndex < strs.length) {
                    segments = segmenter.segment(strs[strIndex])[Symbol.iterator]()
                    continue
                } else break main
            }
            const { index, segment } = value
            if (!/[^\p{Format}]/u.test(segment)) continue
            if (/\s/u.test(segment)) {
                if (!/\s/u.test(substrArr[substrArr.length - 1]?.segment))
                    substrArr.push({ strIndex, index, segment: ' ' })
                continue
            }
            (value as unknown as SegmentData).strIndex = strIndex
            substrArr.push(value as unknown as SegmentData)
        }
        const substr = substrArr.map(x => x.segment).join('')
        if (collator.compare(query, substr) === 0) {
            const endIndex = strIndex
            const lastSeg = substrArr[substrArr.length - 1]
            const endOffset = lastSeg.index + lastSeg.segment.length
            const startIndex = substrArr[0].strIndex
            const startOffset = substrArr[0].index
            const range: SearchRange = { startIndex, startOffset, endIndex, endOffset }
            yield { range, excerpt: makeExcerpt(strs, range) }
        }
        substrArr.shift()
    }
}

export const search = (strs: string[], query: string, options: SearchOptions): Generator<SearchResult> => {
    const { granularity = 'grapheme', sensitivity = 'base' } = options
    if (!Intl?.Segmenter || granularity === 'grapheme'
    && (sensitivity === 'variant' || sensitivity === 'accent'))
        return simpleSearch(strs, query, options)
    return segmenterSearch(strs, query, options)
}

export const searchMatcher = (textWalker: TextWalkerFn, opts: SearchMatcherOptions) => {
    const { defaultLocale, matchCase, matchDiacritics, matchWholeWords } = opts
    return function* (doc: Document, query: string): Generator<SearchResult> {
        const iter = textWalker(doc, function* (strs: string[], makeRange) {
            for (const result of search(strs, query, {
                locales: doc.body?.lang || doc.documentElement.lang || defaultLocale || 'en',
                granularity: matchWholeWords ? 'word' : 'grapheme',
                sensitivity: matchDiacritics && matchCase ? 'variant'
                : matchDiacritics && !matchCase ? 'accent'
                : !matchDiacritics && matchCase ? 'case'
                : 'base',
            })) {
                const { startIndex, startOffset, endIndex, endOffset } = result.range as SearchRange
                result.range = makeRange(startIndex, startOffset, endIndex, endOffset)
                yield result as unknown as TextWalkerMatch
            }
        })
        for (const result of iter) yield result as unknown as SearchResult
    }
}
