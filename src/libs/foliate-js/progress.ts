interface TOCItem {
    id?: number
    href?: string
    subitems?: TOCItem[]
}

interface TOCGroupedValue {
    fragment: string | undefined
    item: TOCItem
}

interface TOCGroupedEntry {
    prev: TOCItem | undefined
    items: TOCGroupedValue[]
}

interface SectionInfo {
    linear?: string
    size: number
}

interface SectionProgressResult {
    fraction: number
    section: {
        current: number
        total: number
    }
    location: {
        current: number
        next: number
        total: number
    }
    time: {
        section: number
        total: number
    }
}

// assign a unique ID for each TOC item
const assignIDs = (toc: TOCItem[]): TOCItem[] => {
    let id = 0
    const assignID = (item: TOCItem): void => {
        item.id = id++
        if (item.subitems) for (const subitem of item.subitems) assignID(subitem)
    }
    for (const item of toc) assignID(item)
    return toc
}

const flatten = (items: TOCItem[]): TOCItem[] => items
    .map(item => item.subitems?.length
        ? [item, flatten(item.subitems)].flat()
        : item)
    .flat()

export class TOCProgress {
    ids: string[] | undefined
    map: Map<string, TOCGroupedEntry> | undefined
    getFragment: ((doc: Document, fragment: string | undefined) => Element | null) | undefined

    async init({ toc, ids, splitHref, getFragment }: {
        toc: TOCItem[]
        ids: string[]
        splitHref: (href: string | undefined) => Promise<[string, string | undefined] | undefined>
        getFragment: (doc: Document, fragment: string | undefined) => Element | null
    }): Promise<void> {
        assignIDs(toc)
        const items = flatten(toc)
        const grouped = new Map<string, TOCGroupedEntry>()
        for (const [i, item] of items.entries()) {
            const [id, fragment] = await splitHref(item?.href) ?? []
            const value: TOCGroupedValue = { fragment, item }
            if (grouped.has(id!)) grouped.get(id!)!.items.push(value)
            else grouped.set(id!, { prev: items[i - 1], items: [value] })
        }
        const map = new Map<string, TOCGroupedEntry>()
        for (const [i, id] of ids.entries()) {
            if (grouped.has(id)) map.set(id, grouped.get(id)!)
            else map.set(id, map.get(ids[i - 1])!)
        }
        this.ids = ids
        this.map = map
        this.getFragment = getFragment
    }
    getProgress(index: number, range: Range | undefined): TOCItem | null | undefined {
        if (!this.ids) return
        const id = this.ids[index]
        const obj = this.map!.get(id)
        if (!obj) return null
        const { prev, items } = obj
        if (!items) return prev
        if (!range || items.length === 1 && !items[0].fragment) return items[0].item

        const doc = range.startContainer.getRootNode() as Document
        for (const [i, { fragment }] of items.entries()) {
            const el = this.getFragment!(doc, fragment)
            if (!el) continue
            if (range.comparePoint(el, 0) > 0)
                return (items[i - 1]?.item ?? prev)
        }
        return items[items.length - 1].item
    }
}

export class SectionProgress {
    sizes: number[]
    sizePerLoc: number
    sizePerTimeUnit: number
    sizeTotal: number
    sectionFractions: number[]

    constructor(sections: SectionInfo[], sizePerLoc: number, sizePerTimeUnit: number) {
        this.sizes = sections.map(s => s.linear != 'no' && s.size > 0 ? s.size : 0)
        this.sizePerLoc = sizePerLoc
        this.sizePerTimeUnit = sizePerTimeUnit
        this.sizeTotal = this.sizes.reduce((a, b) => a + b, 0)
        this.sectionFractions = this.#getSectionFractions()
    }
    #getSectionFractions(): number[] {
        const { sizeTotal } = this
        const results: number[] = [0]
        let sum = 0
        for (const size of this.sizes) results.push((sum += size) / sizeTotal)
        return results
    }
    // get progress given index of and fractions within a section
    getProgress(index: number, fractionInSection: number, pageFraction: number = 0): SectionProgressResult {
        const { sizes, sizePerLoc, sizePerTimeUnit, sizeTotal } = this
        const sizeInSection = sizes[index] ?? 0
        const sizeBefore = sizes.slice(0, index).reduce((a, b) => a + b, 0)
        const size = sizeBefore + fractionInSection * sizeInSection
        const nextSize = size + pageFraction * sizeInSection
        const remainingTotal = sizeTotal - size
        const remainingSection = (1 - fractionInSection) * sizeInSection
        return {
            fraction: nextSize / sizeTotal,
            section: {
                current: index,
                total: sizes.length,
            },
            location: {
                current: Math.floor(size / sizePerLoc),
                next: Math.floor(nextSize / sizePerLoc),
                total: Math.ceil(sizeTotal / sizePerLoc),
            },
            time: {
                section: remainingSection / sizePerTimeUnit,
                total: remainingTotal / sizePerTimeUnit,
            },
        }
    }
    // the inverse of `getProgress`
    // get index of and fraction in section based on total fraction
    getSection(fraction: number): [number, number] {
        if (fraction <= 0) return [0, 0]
        if (fraction >= 1) return [this.sizes.length - 1, 1]
        fraction = fraction + Number.EPSILON
        const { sizeTotal } = this
        let index = this.sectionFractions.findIndex(x => x > fraction) - 1
        if (index < 0) return [0, 0]
        while (!this.sizes[index]) index++
        const fractionInSection = (fraction - this.sectionFractions[index])
            / (this.sizes[index] / sizeTotal)
        return [index, fractionInSection]
    }
}
