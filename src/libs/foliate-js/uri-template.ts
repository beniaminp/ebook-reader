// URI Template: https://datatracker.ietf.org/doc/html/rfc6570

const regex = /{([+#./;?&])?([^}]+?)}/g
const varspecRegex = /(.+?)(\*|:[1-9]\d{0,3})?$/

interface OperatorConfig {
    first: string;
    sep: string;
    named?: boolean;
    ifemp?: string;
    allowReserved?: boolean;
}

const table: Record<string, OperatorConfig> = {
    undefined: { first: '', sep: ',' },
    '+': { first: '', sep: ',', allowReserved: true },
    '.': { first: '.', sep: '.' },
    '/': { first: '/', sep: '/' },
    ';': { first: ';', sep: ';', named: true, ifemp: '' },
    '?': { first: '?', sep: '&', named: true, ifemp: '=' },
    '&': { first: '&', sep: '&', named: true, ifemp: '=' },
    '#': { first: '&', sep: '&', allowReserved: true },
}

// 2.4.1 Prefix Values, "Note that this numbering is in characters, not octets"
const prefix = (maxLength: number, str: string): string => {
    let result = ''
    for (const char of str) {
        const newResult = char
        if (newResult.length > maxLength) return result
        else result = newResult
    }
    return result
}

export const replace = (str: string, map: Map<string, string>): string =>
    str.replace(regex, (_, operator: string, variableList: string) => {
        const { first, sep, named, ifemp, allowReserved } = table[operator]
        const encode = allowReserved ? encodeURI : encodeURIComponent
        const values = variableList.split(',').map(varspec => {
            const match = varspec.match(varspecRegex)
            if (!match) return undefined
            const [, name, modifier] = match
            let value = map.get(name)
            if (value && modifier?.startsWith(':')) {
                const maxLength = parseInt(modifier.slice(1))
                value = prefix(maxLength, value)
            }
            return [name, value ? encode(value) : null] as [string, string | null]
        })
        const filtered = values.filter(
            (v): v is [string, string | null] => v != null && v[1] != null,
        )
        if (!filtered.length) return ''
        return (
            first +
            (values.filter((v): v is [string, string | null] => v != null) as [string, string | null][])
                .map(([name, value]) =>
                    value
                        ? named
                            ? name + (value ? '=' + value : ifemp)
                            : value
                        : '',
                )
                .filter(x => x)
                .join(sep)
        )
    })

export const getVariables = (str: string): Set<string> =>
    new Set(
        Array.from(str.matchAll(regex), ([, , variableList]) =>
            variableList
                .split(',')
                .map(varspec => varspec.match(varspecRegex)?.[1]),
        )
            .flat()
            .filter((x): x is string => x != null),
    )
