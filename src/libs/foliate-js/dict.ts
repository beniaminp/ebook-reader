const decoder = new TextDecoder()
const decode = decoder.decode.bind(decoder)

const concatTypedArray = (a: Uint8Array<ArrayBufferLike>, b: Uint8Array<ArrayBufferLike>): Uint8Array<ArrayBufferLike> => {
    const result = new Uint8Array(a.length + b.length)
    result.set(a as Uint8Array)
    result.set(b as Uint8Array, a.length)
    return result
}

const strcmp = (a: string, b: string): number => {
    a = a.toLowerCase()
    b = b.toLowerCase()
    return a < b ? -1 : a > b ? 1 : 0
}

class DictZip {
    #chlen = 0
    #chunks: [number, number][] = []
    #compressed!: Blob
    inflate!: (data: Uint8Array<ArrayBufferLike>) => Promise<Uint8Array<ArrayBufferLike>>

    async load(file: Blob): Promise<void> {
        const header = new DataView(
            await file.slice(0, 12).arrayBuffer(),
        )
        if (
            header.getUint8(0) !== 31 ||
            header.getUint8(1) !== 139 ||
            header.getUint8(2) !== 8
        )
            throw new Error('Not a DictZip file')
        const flg = header.getUint8(3)
        if (!(flg & 0b100))
            throw new Error('Missing FEXTRA flag')

        const xlen = header.getUint16(10, true)
        const extra = new DataView(
            await file.slice(12, 12 + xlen).arrayBuffer(),
        )
        if (extra.getUint8(0) !== 82 || extra.getUint8(1) !== 65)
            throw new Error('Subfield ID should be RA')
        if (extra.getUint16(4, true) !== 1)
            throw new Error('Unsupported version')

        this.#chlen = extra.getUint16(6, true)
        const chcnt = extra.getUint16(8, true)
        this.#chunks = []
        for (let i = 0, chunkOffset = 0; i < chcnt; i++) {
            const chunkSize = extra.getUint16(10 + 2 * i, true)
            this.#chunks.push([chunkOffset, chunkSize])
            chunkOffset = chunkOffset + chunkSize
        }

        let offset = 12 + xlen
        const max = Math.min(offset + 512, file.size)
        const strArr = new Uint8Array(
            await file.slice(0, max).arrayBuffer(),
        )
        if (flg & 0b1000) {
            const i = strArr.indexOf(0, offset)
            if (i < 0) throw new Error('Header too long')
            offset = i + 1
        }
        if (flg & 0b10000) {
            const i = strArr.indexOf(0, offset)
            if (i < 0) throw new Error('Header too long')
            offset = i + 1
        }
        if (flg & 0b10) offset += 2
        this.#compressed = file.slice(offset)
    }

    async read(offset: number, size: number): Promise<Uint8Array> {
        const chunks = this.#chunks
        const startIndex = Math.trunc(offset / this.#chlen)
        const endIndex = Math.trunc((offset + size) / this.#chlen)
        const buf = await this.#compressed
            .slice(
                chunks[startIndex][0],
                chunks[endIndex][0] + chunks[endIndex][1],
            )
            .arrayBuffer()
        let arr: Uint8Array<ArrayBufferLike> = new Uint8Array()
        for (let pos = 0, i = startIndex; i <= endIndex; i++) {
            const data = new Uint8Array(buf, pos, chunks[i][1])
            arr = concatTypedArray(arr, await this.inflate(data))
            pos += chunks[i][1]
        }
        const startOffset = offset - startIndex * this.#chlen
        return arr.subarray(startOffset, startOffset + size)
    }
}

class Index {
    strcmp = strcmp
    words!: unknown[]
    offsets!: number[]
    sizes!: number[]

    getWord(_i: number): string | undefined {
        return undefined
    }

    bisect(
        query: string,
        start: number = 0,
        end: number = this.words.length - 1,
    ): number | null {
        if (end - start === 1) {
            if (!this.strcmp(query, this.getWord(start)!))
                return start
            if (!this.strcmp(query, this.getWord(end)!))
                return end
            return null
        }
        const mid = Math.floor(start + (end - start) / 2)
        const cmp = this.strcmp(query, this.getWord(mid)!)
        if (cmp < 0) return this.bisect(query, start, mid)
        if (cmp > 0) return this.bisect(query, mid, end)
        return mid
    }

    checkAdjacent(query: string, i: number | null): number[] {
        if (i == null) return []
        let j = i
        const equals = (i: number): boolean => {
            const word = this.getWord(i)
            return word ? this.strcmp(query, word) === 0 : false
        }
        while (equals(j - 1)) j--
        let k = i
        while (equals(k + 1)) k++
        return j === k
            ? [i]
            : Array.from({ length: k + 1 - j }, (_, i) => j + i)
    }

    lookup(query: string): number[] {
        return this.checkAdjacent(query, this.bisect(query))
    }
}

const decodeBase64Number = (str: string): number => {
    const { length } = str
    let n = 0
    for (let i = 0; i < length; i++) {
        const c = str.charCodeAt(i)
        n +=
            (c === 43
                ? 62
                : c === 47
                  ? 63
                  : c < 58
                    ? c + 4
                    : c < 91
                      ? c - 65
                      : c - 71) *
            64 ** (length - 1 - i)
    }
    return n
}

class DictdIndex extends Index {
    override words: string[] = []

    getWord(i: number): string | undefined {
        return this.words[i]
    }

    async load(file: Blob): Promise<void> {
        const words: string[] = []
        const offsets: number[] = []
        const sizes: number[] = []
        for (const line of decode(await file.arrayBuffer()).split(
            '\n',
        )) {
            const a = line.split('\t')
            words.push(a[0])
            offsets.push(decodeBase64Number(a[1]))
            sizes.push(decodeBase64Number(a[2]))
        }
        this.words = words
        this.offsets = offsets
        this.sizes = sizes
    }
}

interface DictEntry {
    word: string;
    data: [string, Promise<Uint8Array> | Uint8Array][] | [string, Promise<Uint8Array>];
}

export class DictdDict {
    #dict = new DictZip()
    #idx = new DictdIndex()

    loadDict(
        file: Blob,
        inflate: (data: Uint8Array) => Promise<Uint8Array>,
    ): Promise<void> {
        this.#dict.inflate = inflate
        return this.#dict.load(file)
    }

    async #readWord(i: number): Promise<DictEntry> {
        const word = this.#idx.getWord(i)!
        const offset = this.#idx.offsets[i]
        const size = this.#idx.sizes[i]
        return {
            word,
            data: ['m', this.#dict.read(offset, size)],
        }
    }

    #readWords(arr: number[]): Promise<DictEntry[]> {
        return Promise.all(arr.map(this.#readWord.bind(this)))
    }

    lookup(query: string): Promise<DictEntry[]> {
        return this.#readWords(this.#idx.lookup(query))
    }
}

class StarDictIndex extends Index {
    isSyn = false
    #arr!: Uint8Array
    override words: [number, number][] = []

    getWord(i: number): string | undefined {
        const word = this.words[i]
        if (!word) return
        return decode(this.#arr.subarray(word[0], word[1]))
    }

    async load(file: Blob): Promise<void> {
        const { isSyn } = this
        const buf = await file.arrayBuffer()
        const arr = new Uint8Array(buf)
        this.#arr = arr
        const view = new DataView(buf)
        const words: [number, number][] = []
        const offsets: number[] = []
        const sizes: number[] = []
        for (let i = 0; i < arr.length; ) {
            const newI = arr.subarray(0, i + 256).indexOf(0, i)
            if (newI < 0) throw new Error('Word too big')
            words.push([i, newI])
            offsets.push(view.getUint32(newI + 1))
            if (isSyn) i = newI + 5
            else {
                sizes.push(view.getUint32(newI + 5))
                i = newI + 9
            }
        }
        this.words = words
        this.offsets = offsets
        this.sizes = sizes
    }
}

export class StarDict {
    #dict = new DictZip()
    #idx = new StarDictIndex()
    #syn = Object.assign(new StarDictIndex(), { isSyn: true })
    ifo: Record<string, string> = {}

    async loadIfo(file: Blob): Promise<void> {
        const str = decode(await file.arrayBuffer())
        this.ifo = Object.fromEntries(
            str
                .split('\n')
                .map(line => {
                    const sep = line.indexOf('=')
                    if (sep < 0) return undefined
                    return [
                        line.slice(0, sep),
                        line.slice(sep + 1),
                    ]
                })
                .filter(
                    (x): x is [string, string] => x != null,
                ),
        )
    }

    loadDict(
        file: Blob,
        inflate: (data: Uint8Array) => Promise<Uint8Array>,
    ): Promise<void> {
        this.#dict.inflate = inflate
        return this.#dict.load(file)
    }

    loadIdx(file: Blob): Promise<void> {
        return this.#idx.load(file)
    }

    loadSyn(file: Blob | undefined): Promise<void> | undefined {
        if (file) return this.#syn.load(file)
    }

    async #readWord(i: number): Promise<DictEntry> {
        const word = this.#idx.getWord(i)!
        const offset = this.#idx.offsets[i]
        const size = this.#idx.sizes[i]
        const data = await this.#dict.read(offset, size)
        const seq = this.ifo.sametypesequence
        if (!seq) throw new Error('TODO')
        if (seq.length === 1)
            return { word, data: [[seq[0], data]] }
        throw new Error('TODO')
    }

    #readWords(arr: number[]): Promise<DictEntry[]> {
        return Promise.all(arr.map(this.#readWord.bind(this)))
    }

    lookup(query: string): Promise<DictEntry[]> {
        return this.#readWords(this.#idx.lookup(query))
    }

    synonyms(query: string): Promise<DictEntry[]> {
        return this.#readWords(
            this.#syn.lookup(query).map(i => this.#syn.offsets[i]),
        )
    }
}
