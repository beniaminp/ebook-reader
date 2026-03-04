import * as CFI from './epubcfi'
import { TOCProgress, SectionProgress } from './progress'
import { Overlayer } from './overlayer'
import { textWalker } from './text-walker'

const SEARCH_PREFIX = 'foliate-search:'

const isZip = async (file: Blob): Promise<boolean> => {
    const arr = new Uint8Array(await file.slice(0, 4).arrayBuffer())
    return arr[0] === 0x50 && arr[1] === 0x4b && arr[2] === 0x03 && arr[3] === 0x04
}

const isCBZ = ({ name, type }: { name: string; type: string }): boolean =>
    type === 'application/vnd.comicbook+zip' || name.endsWith('.cbz')

const isFB2 = ({ name, type }: { name: string; type: string }): boolean =>
    type === 'application/x-fictionbook+xml' || name.endsWith('.fb2')

const isFBZ = ({ name, type }: { name: string; type: string }): boolean =>
    type === 'application/x-zip-compressed-fb2'
    || name.endsWith('.fb2.zip') || name.endsWith('.fbz')

interface ZipEntry {
    filename: string
    uncompressedSize: number
    getData(writer: unknown): Promise<unknown>
}

interface ZipLoader {
    entries: ZipEntry[]
    loadText(name: string): Promise<string | null>
    loadBlob(name: string, type?: string): Promise<Blob | null>
    getSize(name: string): number
}

const makeZipLoader = async (file: Blob): Promise<ZipLoader> => {
    const { configure, ZipReader, BlobReader, TextWriter, BlobWriter }: any =
        await import('./vendor/zip.js' as any)
    configure({ useWebWorkers: false })
    const reader = new ZipReader(new BlobReader(file))
    const entries: ZipEntry[] = await reader.getEntries()
    const map = new Map(entries.map((entry: ZipEntry) => [entry.filename, entry]))
    const load = <T>(f: (entry: ZipEntry, ...args: unknown[]) => T) =>
        (name: string, ...args: unknown[]): T | null =>
            map.has(name) ? f(map.get(name)!, ...args) : null
    const loadText = load((entry: ZipEntry) => entry.getData(new TextWriter())) as (name: string) => Promise<string | null>
    const loadBlob = load((entry: ZipEntry, type?: unknown) => entry.getData(new BlobWriter(type as string))) as (name: string, type?: string) => Promise<Blob | null>
    const getSize = (name: string): number => map.get(name)?.uncompressedSize ?? 0
    return { entries, loadText, loadBlob, getSize }
}

interface FileEntry {
    isFile: boolean
    fullPath: string
    file(cb: (file: File) => void, err: (e: Error) => void): void
    createReader(): { readEntries(cb: (entries: FileEntry[]) => void, err: (e: Error) => void): void }
}

const getFileEntries = async (entry: FileEntry): Promise<FileEntry[]> => entry.isFile ? [entry]
    : (await Promise.all(Array.from(
        await new Promise<FileEntry[]>((resolve, reject) => entry.createReader()
            .readEntries(entries => resolve(entries), error => reject(error))),
        getFileEntries))).flat()

const makeDirectoryLoader = async (entry: FileEntry): Promise<Omit<ZipLoader, 'entries'>> => {
    const entries = await getFileEntries(entry)
    const files: [File, string][] = await Promise.all(
        entries.map(entry => new Promise<[File, string]>((resolve, reject) =>
            entry.file(file => resolve([file, entry.fullPath]),
                error => reject(error)))))
    const map = new Map(files.map(([file, path]) =>
        [path.replace(entry.fullPath + '/', ''), file]))
    const decoder = new TextDecoder()
    const decode = (x: ArrayBuffer | null): string | null => x ? decoder.decode(x) : null
    const getBuffer = (name: string): Promise<ArrayBuffer> | null => map.get(name)?.arrayBuffer() ?? null
    const loadText = async (name: string): Promise<string | null> => decode(await getBuffer(name))
    const loadBlob = (name: string): File | null => map.get(name) ?? null
    const getSize = (name: string): number => map.get(name)?.size ?? 0
    return { loadText, loadBlob: loadBlob as unknown as ZipLoader['loadBlob'], getSize }
}

export class ResponseError extends Error {}
export class NotFoundError extends Error {}
export class UnsupportedTypeError extends Error {}

const fetchFile = async (url: string): Promise<File> => {
    const res = await fetch(url)
    if (!res.ok) throw new ResponseError(
        `${res.status} ${res.statusText}`, { cause: res })
    return new File([await res.blob()], new URL(res.url).pathname)
}

export interface FoliateMetadata {
    title: string | Record<string, string>
    author?:
        | string
        | Array<{ name: string | Record<string, string>; role?: string[] }>
        | { name: string | Record<string, string>; role?: string[] }
    description?: string
    publisher?: string | { name: string }
    language?: string | string[]
    identifier?: string
    published?: string
    modified?: string
    subject?: unknown
}

export interface FoliateTocItem {
    id?: number
    label: string
    href: string
    subitems?: FoliateTocItem[] | null
}

export interface FoliateSection {
    id: string
    href: string
    mediaType: string
    linear?: string
    size: number
    cfi?: string
    createDocument?(): Promise<Document>
    mediaOverlay?: unknown
    pageSpread?: string
    resolveHref?(href: string): string
    load?(): Promise<string>
    unload?(): void
}

export interface FoliateBook {
    metadata: FoliateMetadata
    toc?: FoliateTocItem[]
    sections: FoliateSection[]
    dir?: string
    rendition?: { layout?: string; spread?: string; viewport?: string }
    landmarks?: Array<{ type: string[]; href: string }>
    pageList?: Array<{ label: string; href: string }>
    media?: { activeClass: string; playbackActiveClass?: string }
    getCover?(): Promise<Blob | null>
    destroy?(): void
    resolveHref?(href: string): { index: number; anchor: (doc: Document) => Range | Element }
    splitTOCHref?(href: string): string[]
    getTOCFragment?(doc: Document, id: string): Element | null
    isExternal?(uri: string): boolean
    resolveCFI?(cfi: string): { index: number; anchor: (doc: Document) => Range | Node }
    getMediaOverlay?(): MediaOverlayController
}

interface MediaOverlayController extends EventTarget {
    start(index: number): void
}

export interface FoliateRenderer extends HTMLElement {
    goTo(target: { index: number; anchor?: unknown; select?: boolean }): Promise<void>
    next(distance?: number): Promise<void>
    prev(distance?: number): Promise<void>
    destroy(): void
    open(book: FoliateBook): void
    getContents(): Array<{ doc: Document; index: number; overlayer?: Overlayer }>
    scrollToAnchor(range: Range, select?: boolean): void
}

export interface FoliateLocation {
    fraction: number
    section: { current: number; total: number }
    location: { current: number; next: number; total: number }
    time: { section: number; total: number }
    tocItem?: FoliateTocItem | null
    pageItem?: { label: string } | null
    cfi: string
    range?: Range
}

export interface FoliateSearchYield {
    label?: string
    subitems?: Array<{ cfi: string; excerpt: string }>
    cfi?: string
    excerpt?: string
    progress?: number
}

interface InputFile extends Blob {
    name: string
    type: string
    isDirectory?: boolean
}

export const makeBook = async (file: string | InputFile): Promise<FoliateBook> => {
    if (typeof file === 'string') file = await fetchFile(file) as unknown as InputFile
    let book: any
    if ((file as InputFile).isDirectory) {
        const loader = await makeDirectoryLoader(file as unknown as FileEntry)
        const { EPUB } = await import('./epub')
        book = await new EPUB(loader as any).init()
    }
    else if (!file.size) throw new NotFoundError('File not found')
    else if (await isZip(file)) {
        const loader = await makeZipLoader(file)
        if (isCBZ(file as InputFile)) {
            const { makeComicBook } = await import('./comic-book')
            book = await makeComicBook(loader as any, file as unknown as File)
        }
        else if (isFBZ(file as InputFile)) {
            const { makeFB2 } = await import('./fb2')
            const { entries } = loader
            const entry = entries.find((entry: ZipEntry) => entry.filename.endsWith('.fb2'))
            const blob = await loader.loadBlob((entry ?? entries[0]).filename)
            book = await makeFB2(blob as any)
        }
        else {
            const { EPUB } = await import('./epub')
            book = await new EPUB(loader as any).init()
        }
    }
    else {
        const { isMOBI, MOBI } = await import('./mobi')
        if (await isMOBI(file)) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const fflate = await import('./vendor/fflate.js' as any)
            book = await new MOBI({ unzlib: fflate.unzlibSync }).open(file)
        }
        else if (isFB2(file as InputFile)) {
            const { makeFB2 } = await import('./fb2')
            book = await makeFB2(file)
        }
    }
    if (!book) throw new UnsupportedTypeError('File type not supported')
    return book as FoliateBook
}

interface CursorState {
    x?: number
    y?: number
    hidden?: boolean
}

class CursorAutohider {
    #timeout: ReturnType<typeof setTimeout> | undefined
    #el: HTMLElement | Document['documentElement']
    #check: () => boolean
    #state: CursorState
    constructor(el: HTMLElement, check: () => boolean, state: CursorState = {}) {
        this.#el = el
        this.#check = check
        this.#state = state
        if (this.#state.hidden) this.hide()
        this.#el.addEventListener('mousemove', ((e: MouseEvent) => {
            const { screenX, screenY } = e
            if (screenX === this.#state.x && screenY === this.#state.y) return
            this.#state.x = screenX
            this.#state.y = screenY
            this.show()
            if (this.#timeout) clearTimeout(this.#timeout)
            if (this.#check()) this.#timeout = setTimeout(this.hide.bind(this), 1000)
        }) as EventListener, false)
    }
    cloneFor(el: HTMLElement): CursorAutohider {
        return new CursorAutohider(el, this.#check, this.#state)
    }
    hide(): void {
        (this.#el as HTMLElement).style.cursor = 'none'
        this.#state.hidden = true
    }
    show(): void {
        (this.#el as HTMLElement).style.removeProperty('cursor')
        this.#state.hidden = false
    }
}

interface HistoryState {
    fraction?: number
    [key: string]: unknown
}

class History extends EventTarget {
    #arr: (string | number | HistoryState)[] = []
    #index = -1
    pushState(x: string | number | HistoryState): void {
        const last = this.#arr[this.#index]
        if (last === x || (last as HistoryState)?.fraction && (last as HistoryState).fraction === (x as HistoryState).fraction) return
        this.#arr[++this.#index] = x
        this.#arr.length = this.#index + 1
        this.dispatchEvent(new Event('index-change'))
    }
    replaceState(x: string | number | HistoryState): void {
        const index = this.#index
        this.#arr[index] = x
    }
    back(): void {
        const index = this.#index
        if (index <= 0) return
        const detail = { state: this.#arr[index - 1] }
        this.#index = index - 1
        this.dispatchEvent(new CustomEvent('popstate', { detail }))
        this.dispatchEvent(new Event('index-change'))
    }
    forward(): void {
        const index = this.#index
        if (index >= this.#arr.length - 1) return
        const detail = { state: this.#arr[index + 1] }
        this.#index = index + 1
        this.dispatchEvent(new CustomEvent('popstate', { detail }))
        this.dispatchEvent(new Event('index-change'))
    }
    get canGoBack(): boolean {
        return this.#index > 0
    }
    get canGoForward(): boolean {
        return this.#index < this.#arr.length - 1
    }
    clear(): void {
        this.#arr = []
        this.#index = -1
    }
}

interface LanguageInfo {
    canonical?: string
    locale?: Intl.Locale
    isCJK?: boolean
    direction?: string
}

const languageInfo = (lang: string | string[] | undefined): LanguageInfo => {
    if (!lang) return {}
    const langStr = Array.isArray(lang) ? lang[0] : lang
    try {
        const canonical = Intl.getCanonicalLocales(langStr)[0]
        const locale = new Intl.Locale(canonical)
        const isCJK = ['zh', 'ja', 'kr'].includes(locale.language)
        const direction = ((locale as any).getTextInfo?.() ?? (locale as any).textInfo)?.direction as string | undefined
        return { canonical, locale, isCJK, direction }
    } catch (e) {
        console.warn(e)
        return {}
    }
}

export class View extends HTMLElement {
    #root: ShadowRoot = this.attachShadow({ mode: 'closed' })
    #sectionProgress: SectionProgress | null = null
    #tocProgress: TOCProgress | null = null
    #pageProgress: TOCProgress | null = null
    #searchResults: Map<number | undefined, Array<{ value: string }>> = new Map()
    #cursorAutohider: CursorAutohider = new CursorAutohider(this, () =>
        this.hasAttribute('autohide-cursor'))
    isFixedLayout = false
    lastLocation: FoliateLocation | null = null
    history: History = new History()
    book!: FoliateBook
    renderer!: FoliateRenderer
    language: LanguageInfo = {}
    tts: any = null
    mediaOverlay: MediaOverlayController | null = null

    constructor() {
        super()
        this.history.addEventListener('popstate', ((e: CustomEvent<{ state: string | number | HistoryState }>) => {
            const resolved = this.resolveNavigation(e.detail.state)
            if (resolved) this.renderer.goTo(resolved)
        }) as EventListener)
    }
    async open(book: Blob | File | string | FoliateBook): Promise<void> {
        if (typeof book === 'string'
        || typeof (book as Blob).arrayBuffer === 'function'
        || (book as InputFile).isDirectory) book = await makeBook(book as string | InputFile)
        this.book = book as FoliateBook
        this.language = languageInfo(this.book.metadata?.language)

        if (this.book.splitTOCHref && this.book.getTOCFragment) {
            const ids = this.book.sections.map(s => s.id)
            this.#sectionProgress = new SectionProgress(this.book.sections, 1500, 1600)
            const splitHref = this.book.splitTOCHref.bind(this.book)
            const getFragment = this.book.getTOCFragment.bind(this.book)
            this.#tocProgress = new TOCProgress()
            await this.#tocProgress.init({
                toc: this.book.toc as any ?? [], ids, splitHref: splitHref as any, getFragment: getFragment as any })
            this.#pageProgress = new TOCProgress()
            await this.#pageProgress.init({
                toc: this.book.pageList as any ?? [], ids, splitHref: splitHref as any, getFragment: getFragment as any })
        }

        this.isFixedLayout = this.book.rendition?.layout === 'pre-paginated'
        if (this.isFixedLayout) {
            await import('./fixed-layout')
            this.renderer = document.createElement('foliate-fxl') as unknown as FoliateRenderer
        } else {
            await import('./paginator')
            this.renderer = document.createElement('foliate-paginator') as unknown as FoliateRenderer
        }
        this.renderer.setAttribute('exportparts', 'head,foot,filter,container')
        this.renderer.addEventListener('load', (e: Event) => this.#onLoad((e as CustomEvent).detail))
        this.renderer.addEventListener('relocate', (e: Event) => this.#onRelocate((e as CustomEvent).detail))
        this.renderer.addEventListener('create-overlayer', (e: Event) =>
            (e as CustomEvent).detail.attach(this.#createOverlayer((e as CustomEvent).detail)))
        this.renderer.open(this.book)
        this.#root.append(this.renderer)

        if (this.book.sections.some(section => section.mediaOverlay)) {
            const activeClass = this.book.media!.activeClass
            const playbackActiveClass = this.book.media!.playbackActiveClass
            this.mediaOverlay = this.book.getMediaOverlay!()
            let lastActive: WeakRef<Element> | undefined
            this.mediaOverlay.addEventListener('highlight', ((e: CustomEvent<{ text: string }>) => {
                const resolved = this.resolveNavigation(e.detail.text)
                if (!resolved) return
                this.renderer.goTo(resolved)
                    .then(() => {
                        const { doc } = this.renderer.getContents()
                            .find(x => x.index === resolved.index)!
                        const el = (resolved.anchor as (doc: Document) => Element)(doc)
                        el.classList.add(activeClass)
                        if (playbackActiveClass) el.ownerDocument
                            .documentElement.classList.add(playbackActiveClass)
                        lastActive = new WeakRef(el)
                    })
            }) as EventListener)
            this.mediaOverlay.addEventListener('unhighlight', () => {
                const el = lastActive?.deref()
                if (el) {
                    el.classList.remove(activeClass!)
                    if (playbackActiveClass) el.ownerDocument
                        .documentElement.classList.remove(playbackActiveClass)
                }
            })
        }
    }
    close(): void {
        this.renderer?.destroy()
        this.renderer?.remove()
        this.#sectionProgress = null
        this.#tocProgress = null
        this.#pageProgress = null
        this.#searchResults = new Map()
        this.lastLocation = null
        this.history.clear()
        this.tts = null
        this.mediaOverlay = null
    }
    goToTextStart(): Promise<void> {
        return this.goTo(this.book.landmarks
            ?.find(m => m.type.includes('bodymatter') || m.type.includes('text'))
            ?.href ?? this.book.sections.findIndex(s => s.linear !== 'no')) as Promise<any>
    }
    async init({ lastLocation, showTextStart }: { lastLocation?: string | null; showTextStart?: boolean }): Promise<void> {
        const resolved = lastLocation ? this.resolveNavigation(lastLocation) : null
        if (resolved) {
            await this.renderer.goTo(resolved)
            this.history.pushState(lastLocation!)
        }
        else if (showTextStart) await this.goToTextStart()
        else {
            this.history.pushState(0)
            await this.next()
        }
    }
    #emit(name: string, detail?: unknown, cancelable?: boolean): boolean {
        return this.dispatchEvent(new CustomEvent(name, { detail, cancelable }))
    }
    #onRelocate({ reason, range, index, fraction, size }: {
        reason: string; range: Range; index: number; fraction: number; size: number
    }): void {
        const progress = this.#sectionProgress?.getProgress(index, fraction, size) ?? {}
        const tocItem = this.#tocProgress?.getProgress(index, range)
        const pageItem = this.#pageProgress?.getProgress(index, range)
        const cfi = this.getCFI(index, range)
        this.lastLocation = { ...progress, tocItem, pageItem, cfi, range } as FoliateLocation
        if (reason === 'snap' || reason === 'page' || reason === 'scroll')
            this.history.replaceState(cfi)
        this.#emit('relocate', this.lastLocation)
    }
    #onLoad({ doc, index }: { doc: Document; index: number }): void {
        doc.documentElement.lang ||= this.language.canonical ?? ''
        if (!this.language.isCJK)
            doc.documentElement.dir ||= this.language.direction ?? ''

        this.#handleLinks(doc, index)
        this.#cursorAutohider.cloneFor(doc.documentElement)

        this.#emit('load', { doc, index })
    }
    #handleLinks(doc: Document, index: number): void {
        const { book } = this
        const section = book.sections[index]
        doc.addEventListener('click', e => {
            const a = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null
            if (!a) return
            e.preventDefault()
            const href_ = a.getAttribute('href')!
            const href = section?.resolveHref?.(href_) ?? href_
            if (book?.isExternal?.(href))
                Promise.resolve(this.#emit('external-link', { a, href }, true))
                    .then(x => x ? globalThis.open(href, '_blank') : null)
                    .catch(e => console.error(e))
            else Promise.resolve(this.#emit('link', { a, href }, true))
                .then(x => x ? this.goTo(href) : null)
                .catch(e => console.error(e))
        })
    }
    async addAnnotation(annotation: { value: string }, remove?: boolean): Promise<{ index: number; label: string } | undefined> {
        const { value } = annotation
        if (value.startsWith(SEARCH_PREFIX)) {
            const cfi = value.replace(SEARCH_PREFIX, '')
            const resolved = await this.resolveNavigation(cfi)
            if (!resolved) return
            const { index, anchor } = resolved
            const obj = this.#getOverlayer(index)
            if (obj) {
                const { overlayer, doc } = obj
                if (remove) {
                    overlayer!.remove(value)
                    return
                }
                const range = doc ? (anchor as (doc: Document) => Range)(doc) : anchor as Range
                overlayer!.add(value, range, Overlayer.outline)
            }
            return
        }
        const resolved = await this.resolveNavigation(value)
        if (!resolved) return
        const { index, anchor } = resolved
        const obj = this.#getOverlayer(index)
        if (obj) {
            const { overlayer, doc } = obj
            overlayer!.remove(value)
            if (!remove) {
                const range = doc ? (anchor as (doc: Document) => Range)(doc) : anchor as Range
                const draw = (func: any, opts: any) => overlayer!.add(value, range, func, opts)
                this.#emit('draw-annotation', { draw, annotation, doc, range })
            }
        }
        const label = (this.#tocProgress?.getProgress(index, undefined) as any)?.label ?? ''
        return { index, label }
    }
    deleteAnnotation(annotation: { value: string }): Promise<{ index: number; label: string } | undefined> {
        return this.addAnnotation(annotation, true)
    }
    #getOverlayer(index: number): { doc: Document; index: number; overlayer?: Overlayer } | undefined {
        return this.renderer.getContents()
            .find(x => x.index === index && x.overlayer)
    }
    #createOverlayer({ doc, index }: { doc: Document; index: number }): Overlayer {
        const overlayer = new Overlayer(doc)
        doc.addEventListener('click', e => {
            const [value, range] = overlayer.hitTest(e)
            if (value && !value.startsWith(SEARCH_PREFIX)) {
                this.#emit('show-annotation', { value, index, range })
            }
        }, false)

        const list = this.#searchResults.get(index)
        if (list) for (const item of list) this.addAnnotation(item)

        this.#emit('create-overlay', { index })
        return overlayer
    }
    async showAnnotation(annotation: { value: string }): Promise<void> {
        const { value } = annotation
        const resolved = await this.goTo(value)
        if (resolved) {
            const { index, anchor } = resolved
            const obj = this.#getOverlayer(index)
            if (obj) {
                const { doc } = obj
                const range = (anchor as (doc: Document) => Range)(doc)
                this.#emit('show-annotation', { value, index, range })
            }
        }
    }
    getCFI(index: number, range?: Range): string {
        const baseCFI = this.book.sections[index].cfi ?? CFI.fake.fromIndex(index)
        if (!range) return baseCFI
        return CFI.joinIndir(baseCFI, CFI.fromRange(range))
    }
    resolveCFI(cfi: string): { index: number; anchor: (doc: Document) => Range | Node } {
        if (this.book.resolveCFI)
            return this.book.resolveCFI(cfi)
        else {
            const parts = CFI.parse(cfi) as any
            const index = CFI.fake.toIndex((parts.parent ?? parts).shift()!)
            const anchor = (doc: Document) => CFI.toRange(doc, parts)
            return { index, anchor }
        }
    }
    resolveNavigation(target: string | number | HistoryState): { index: number; anchor?: unknown } | undefined {
        try {
            if (typeof target === 'number') return { index: target }
            if (typeof (target as HistoryState).fraction === 'number') {
                const [index, anchor] = this.#sectionProgress!.getSection((target as HistoryState).fraction!)
                return { index, anchor }
            }
            if (CFI.isCFI.test(target as string)) return this.resolveCFI(target as string)
            return this.book.resolveHref?.(target as string) as { index: number; anchor?: unknown } | undefined
        } catch (e) {
            console.error(e)
            console.error(`Could not resolve target ${target}`)
        }
    }
    async goTo(target: string | number | HistoryState): Promise<{ index: number; anchor?: unknown } | undefined> {
        const resolved = this.resolveNavigation(target)
        try {
            await this.renderer.goTo(resolved as { index: number; anchor?: unknown })
            this.history.pushState(target)
            return resolved
        } catch(e) {
            console.error(e)
            console.error(`Could not go to ${target}`)
        }
    }
    async goToFraction(frac: number): Promise<void> {
        const [index, anchor] = this.#sectionProgress!.getSection(frac)
        await this.renderer.goTo({ index, anchor })
        this.history.pushState({ fraction: frac })
    }
    async select(target: string | number | HistoryState): Promise<void> {
        try {
            const obj = this.resolveNavigation(target)
            await this.renderer.goTo({ ...obj as { index: number }, select: true })
            this.history.pushState(target)
        } catch(e) {
            console.error(e)
            console.error(`Could not go to ${target}`)
        }
    }
    deselect(): void {
        for (const { doc } of this.renderer.getContents())
            doc.defaultView?.getSelection()?.removeAllRanges()
    }
    getSectionFractions(): number[] {
        return (this.#sectionProgress?.sectionFractions ?? [])
            .map(x => x + Number.EPSILON)
    }
    getProgressOf(index: number, range?: Range): { tocItem?: unknown; pageItem?: unknown } {
        const tocItem = this.#tocProgress?.getProgress(index, range)
        const pageItem = this.#pageProgress?.getProgress(index, range)
        return { tocItem, pageItem }
    }
    async getTOCItemOf(target: string): Promise<unknown> {
        try {
            const resolved = await this.resolveNavigation(target)
            if (!resolved) return
            const { index, anchor } = resolved as { index: number; anchor: (doc: Document) => Range | Element }
            const doc = await this.book.sections[index].createDocument!()
            const frag = anchor(doc)
            const isRange = frag instanceof Range
            const range = isRange ? frag : doc.createRange()
            if (!isRange) range.selectNodeContents(frag)
            return this.#tocProgress?.getProgress(index, range)
        } catch(e) {
            console.error(e)
            console.error(`Could not get ${target}`)
        }
    }
    async prev(distance?: number): Promise<void> {
        await this.renderer.prev(distance)
    }
    async next(distance?: number): Promise<void> {
        await this.renderer.next(distance)
    }
    goLeft(): Promise<void> {
        return this.book.dir === 'rtl' ? this.next() : this.prev()
    }
    goRight(): Promise<void> {
        return this.book.dir === 'rtl' ? this.prev() : this.next()
    }
    async * #searchSection(matcher: any, query: string, index: number): AsyncGenerator<{ cfi: string; excerpt: string }> {
        const doc = await this.book.sections[index].createDocument!()
        for (const { range, excerpt } of matcher(doc, query))
            yield { cfi: this.getCFI(index, range), excerpt }
    }
    async * #searchBook(matcher: any, query: string): AsyncGenerator<{ progress: number } | { index: number; subitems: Array<{ cfi: string; excerpt: string }> }> {
        const { sections } = this.book
        for (const [index, { createDocument }] of sections.entries()) {
            if (!createDocument) continue
            const doc = await createDocument()
            const subitems = Array.from(matcher(doc, query), ({ range, excerpt }: { range: Range; excerpt: string }) =>
                ({ cfi: this.getCFI(index, range), excerpt }))
            const progress = (index + 1) / sections.length
            yield { progress }
            if (subitems.length) yield { index, subitems }
        }
    }
    async * search(opts: { query: string; index?: number; [key: string]: unknown }): AsyncGenerator<FoliateSearchYield | 'done'> {
        this.clearSearch()
        const { searchMatcher } = await import('./search')
        const { query, index } = opts
        const matcher = searchMatcher(textWalker as any,
            { defaultLocale: this.language as any, ...opts })
        const iter = index != null
            ? this.#searchSection(matcher, query, index)
            : this.#searchBook(matcher, query)

        const list: Array<{ value: string }> = []
        this.#searchResults.set(index, list)

        for await (const result of iter) {
            if ((result as any).subitems){
                const resultWithSubs = result as { index: number; subitems: Array<{ cfi: string; excerpt: string }> }
                const subList = resultWithSubs.subitems
                    .map(({ cfi }) => ({ value: SEARCH_PREFIX + cfi }))
                this.#searchResults.set(resultWithSubs.index, subList)
                for (const item of subList) this.addAnnotation(item)
                yield {
                    label: (this.#tocProgress?.getProgress(resultWithSubs.index, undefined) as any)?.label ?? '',
                    subitems: resultWithSubs.subitems,
                }
            }
            else {
                const r = result as { cfi?: string; progress?: number }
                if (r.cfi) {
                    const item = { value: SEARCH_PREFIX + r.cfi }
                    list.push(item)
                    this.addAnnotation(item)
                }
                yield result as FoliateSearchYield
            }
        }
        yield 'done'
    }
    clearSearch(): void {
        for (const list of this.#searchResults.values())
            for (const item of list) this.deleteAnnotation(item)
        this.#searchResults.clear()
    }
    async initTTS(granularity: 'grapheme' | 'word' | 'sentence' = 'word'): Promise<void> {
        const doc = this.renderer.getContents()[0].doc
        if (this.tts && this.tts.doc === doc) return
        const { TTS } = await import('./tts')
        this.tts = new TTS(doc, textWalker as any, (range: Range) =>
            this.renderer.scrollToAnchor(range, true), granularity)
    }
    startMediaOverlay(): void {
        const { index } = this.renderer.getContents()[0]
        return this.mediaOverlay!.start(index)
    }
}

customElements.define('foliate-view', View)
