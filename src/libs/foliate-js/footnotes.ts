const getTypes = (el: Element | null): Set<string> =>
    new Set(
        el
            ?.getAttributeNS?.(
                'http://www.idpf.org/2007/ops',
                'type',
            )
            ?.split(' '),
    )

const getRoles = (el: Element | null): Set<string> =>
    new Set(el?.getAttribute?.('role')?.split(' '))

const isSuper = (el: Element): boolean => {
    if (el.matches('sup')) return true
    const { verticalAlign } = getComputedStyle(el)
    return (
        verticalAlign === 'super' ||
        verticalAlign === 'top' ||
        verticalAlign === 'text-top' ||
        /^\d/.test(verticalAlign)
    )
}

const refTypes = ['biblioref', 'glossref', 'noteref']
const refRoles = ['doc-biblioref', 'doc-glossref', 'doc-noteref']

const isFootnoteReference = (
    a: HTMLAnchorElement,
): { yes: boolean; maybe: () => boolean } => {
    const types = getTypes(a)
    const roles = getRoles(a)
    return {
        yes:
            refRoles.some(r => roles.has(r)) ||
            refTypes.some(t => types.has(t)),
        maybe: () =>
            !types.has('backlink') &&
            !roles.has('doc-backlink') &&
            (isSuper(a) ||
                (a.children.length === 1 &&
                    isSuper(a.children[0] as Element)) ||
                isSuper(a.parentElement!)),
    }
}

const getReferencedType = (el: Element): string | null => {
    const types = getTypes(el)
    const roles = getRoles(el)
    return roles.has('doc-biblioentry') || types.has('biblioentry')
        ? 'biblioentry'
        : roles.has('definition') || types.has('glossdef')
          ? 'definition'
          : roles.has('doc-endnote') ||
              types.has('endnote') ||
              types.has('rearnote')
            ? 'endnote'
            : roles.has('doc-footnote') || types.has('footnote')
              ? 'footnote'
              : roles.has('note') || types.has('note')
                ? 'note'
                : null
}

const isInline = 'a, span, sup, sub, em, strong, i, b, small, big'

const extractFootnote = (
    doc: Document,
    anchor: (doc: Document) => Element,
): Element => {
    let el = anchor(doc)
    const target = el
    while (el.matches(isInline)) {
        const parent = el.parentElement
        if (!parent) break
        el = parent
    }
    if (el === doc.body) {
        const sibling = target.nextElementSibling
        if (sibling && !sibling.matches(isInline)) return sibling
        throw new Error('Failed to extract footnote')
    }
    return el
}

interface Book {
    resolveHref(href: string): Promise<{ index: number; anchor: (doc: Document) => Element }> | { index: number; anchor: (doc: Document) => Element };
}

interface FootnoteRenderDetail {
    view: HTMLElement;
    href: string;
    type: string | null;
    hidden: boolean;
    target: Element;
}

export class FootnoteHandler extends EventTarget {
    detectFootnotes = true

    #showFragment(
        book: Book,
        { index, anchor }: { index: number; anchor: (doc: Document) => Element },
        href: string,
    ): Promise<void> {
        const view = document.createElement('foliate-view') as HTMLElement & {
            open(book: Book): Promise<void>;
            goTo(index: number): Promise<void>;
        }
        return new Promise((resolve, reject) => {
            view.addEventListener('load', ((e: CustomEvent<{ doc: Document }>) => {
                try {
                    const { doc } = e.detail
                    const el = anchor(doc)
                    const type = getReferencedType(el)
                    const hidden =
                        el?.matches?.('aside') && type === 'footnote'
                    if (el) {
                        let range: Range
                        if ((el as unknown as Range).startContainer) {
                            range = el as unknown as Range
                        } else if (el.matches('li, aside')) {
                            range = doc.createRange()
                            range.selectNodeContents(el)
                        } else if (el.closest('li')) {
                            range = doc.createRange()
                            range.selectNodeContents(el.closest('li')!)
                        } else {
                            range = doc.createRange()
                            range.selectNode(el)
                        }
                        const frag = range.extractContents()
                        doc.body.replaceChildren()
                        doc.body.appendChild(frag)
                    }
                    const detail: FootnoteRenderDetail = {
                        view,
                        href,
                        type,
                        hidden: !!hidden,
                        target: el,
                    }
                    this.dispatchEvent(
                        new CustomEvent('render', { detail }),
                    )
                    resolve()
                } catch (e) {
                    reject(e)
                }
            }) as EventListener)
            view.open(book)
                .then(() =>
                    this.dispatchEvent(
                        new CustomEvent('before-render', {
                            detail: { view },
                        }),
                    ),
                )
                .then(() => view.goTo(index))
                .catch(reject)
        })
    }

    handle(
        book: Book,
        e: CustomEvent<{
            a: HTMLAnchorElement
            href: string
            follow?: boolean
        }>,
    ): Promise<void> | undefined {
        const { a, href, follow } = e.detail
        const { yes, maybe } = isFootnoteReference(a)
        if (yes || follow) {
            e.preventDefault()
            return Promise.resolve(book.resolveHref(href)).then(
                target => this.#showFragment(book, target, href),
            )
        } else if (this.detectFootnotes && maybe()) {
            e.preventDefault()
            return Promise.resolve(book.resolveHref(href)).then(
                ({ index, anchor }) => {
                    const target = {
                        index,
                        anchor: (doc: Document) =>
                            extractFootnote(doc, anchor),
                    }
                    return this.#showFragment(book, target, href)
                },
            )
        }
    }
}
