/**
 * Page Curl Effect — Canvas-based realistic 3D page curl animation.
 *
 * Draws a page curl overlay on a canvas element. The curl simulates a page
 * being peeled from one edge, with shadow, specular highlight, and a
 * gradient on the back of the curled page.
 *
 * Used by the paginator when page-curl animation mode is active.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

export const CURL_COMPLETE_THRESHOLD = 0.25
export const CURL_VELOCITY_THRESHOLD = 0.3
export const CURL_ANIMATE_DURATION = 350

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CurlConfig {
    /** Background color of the page (used for the back-of-page gradient) */
    pageColor: string
    /** Whether the book is RTL */
    rtl: boolean
}

// ─── Color helpers ───────────────────────────────────────────────────────────

function parseColor(color: string): [number, number, number] {
    let r = 245, g = 245, b = 240
    if (color.startsWith('#')) {
        const hex = color.slice(1)
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16)
            g = parseInt(hex[1] + hex[1], 16)
            b = parseInt(hex[2] + hex[2], 16)
        } else if (hex.length >= 6) {
            r = parseInt(hex.slice(0, 2), 16)
            g = parseInt(hex.slice(2, 4), 16)
            b = parseInt(hex.slice(4, 6), 16)
        }
    } else if (color.startsWith('rgb')) {
        const match = color.match(/(\d+)/g)
        if (match && match.length >= 3) {
            r = parseInt(match[0])
            g = parseInt(match[1])
            b = parseInt(match[2])
        }
    }
    return [r, g, b]
}

function rgbStr(r: number, g: number, b: number, a = 1): string {
    return a < 1
        ? `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`
        : `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`
}

function shade([r, g, b]: [number, number, number], factor: number): string {
    return rgbStr(r * factor, g * factor, b * factor)
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

/**
 * Draw the page curl effect.
 *
 * @param ctx    - Canvas 2D context
 * @param W      - Canvas width
 * @param H      - Canvas height
 * @param progress - 0 (flat) to 1 (fully turned)
 * @param direction - 1 = forward (curl from right), -1 = backward (curl from left)
 * @param config - Page color and direction config
 */
export function drawPageCurl(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    progress: number,
    direction: 1 | -1,
    config: CurlConfig = { pageColor: '#f5f5f0', rtl: false },
): void {
    ctx.clearRect(0, 0, W, H)
    // Guard against non-finite dimensions (canvas not yet sized)
    if (!W || !H || !isFinite(W) || !isFinite(H)) return
    const p = Math.min(1, Math.max(0, progress))
    if (p <= 0.002) return

    // Flip canvas for backward direction
    const flipX = direction === -1
    if (flipX) {
        ctx.save()
        ctx.translate(W, 0)
        ctx.scale(-1, 1)
    }

    drawCurlFromRight(ctx, W, H, p, config)

    if (flipX) ctx.restore()
}

function drawCurlFromRight(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    p: number,
    config: CurlConfig,
): void {
    const rgb = parseColor(config.pageColor)

    // Fold line position (moves from right edge to left)
    const foldX = W * (1 - p)

    // Curl bulge — the paper curves outward from the fold line
    const maxBulge = Math.min(W * 0.06, 35)
    const bulge = maxBulge * Math.sin(p * Math.PI) // peaks at p=0.5

    // Width of the curled-back portion visible
    const curlBackWidth = Math.min(W * p * 0.4, W * 0.2)

    // ── 1. Shadow cast on the page underneath ──────────────────────────────
    const shadowWidth = Math.min(50, W * p * 0.2) + 4
    if (shadowWidth > 2) {
        const shadowGrad = ctx.createLinearGradient(
            foldX - shadowWidth, 0, foldX + 4, 0,
        )
        shadowGrad.addColorStop(0, 'rgba(0,0,0,0)')
        shadowGrad.addColorStop(0.5, 'rgba(0,0,0,0.04)')
        shadowGrad.addColorStop(0.85, 'rgba(0,0,0,0.12)')
        shadowGrad.addColorStop(1, 'rgba(0,0,0,0.22)')
        ctx.fillStyle = shadowGrad

        ctx.beginPath()
        ctx.moveTo(foldX - shadowWidth, 0)
        ctx.lineTo(foldX + 4, 0)
        ctx.quadraticCurveTo(foldX + 4 + bulge * 0.2, H / 2, foldX + 4, H)
        ctx.lineTo(foldX - shadowWidth, H)
        ctx.closePath()
        ctx.fill()
    }

    // ── 2. Back of the curled page ─────────────────────────────────────────
    // This region is between foldX and foldX + curlBackWidth, shaped with a
    // slight curve (the bulge) to simulate 3D curvature.
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(foldX, 0)

    // Right edge of the visible curl-back (with bulge curve)
    const cbRight = foldX + curlBackWidth
    const cpBulge = foldX + curlBackWidth + bulge

    ctx.bezierCurveTo(
        cpBulge, H * 0.12,
        cpBulge, H * 0.38,
        cbRight, H * 0.5,
    )
    ctx.bezierCurveTo(
        cpBulge, H * 0.62,
        cpBulge, H * 0.88,
        foldX, H,
    )
    ctx.lineTo(foldX, H)
    ctx.closePath()

    // Back-of-page gradient: darker at fold edge (shadow in the crease),
    // lighter in the middle, slightly darker again at the far edge
    const backGrad = ctx.createLinearGradient(foldX, 0, cbRight, 0)
    backGrad.addColorStop(0, shade(rgb, 0.72))
    backGrad.addColorStop(0.04, shade(rgb, 0.85))
    backGrad.addColorStop(0.12, shade(rgb, 0.95))
    backGrad.addColorStop(0.5, shade(rgb, 0.98))
    backGrad.addColorStop(0.85, shade(rgb, 0.93))
    backGrad.addColorStop(1, shade(rgb, 0.85))
    ctx.fillStyle = backGrad
    ctx.fill()
    ctx.restore()

    // ── 3. Specular highlight along fold edge ──────────────────────────────
    // Simulates light catching the curved paper edge
    const hlWidth = Math.min(12, curlBackWidth * 0.3)
    if (hlWidth > 1) {
        const hlGrad = ctx.createLinearGradient(
            foldX - hlWidth * 0.5, 0, foldX + hlWidth, 0,
        )
        hlGrad.addColorStop(0, 'rgba(255,255,255,0)')
        hlGrad.addColorStop(0.3, 'rgba(255,255,255,0.08)')
        hlGrad.addColorStop(0.5, 'rgba(255,255,255,0.22)')
        hlGrad.addColorStop(0.7, 'rgba(255,255,255,0.08)')
        hlGrad.addColorStop(1, 'rgba(255,255,255,0)')

        ctx.fillStyle = hlGrad
        ctx.beginPath()
        ctx.moveTo(foldX - hlWidth * 0.5, 0)
        ctx.lineTo(foldX + hlWidth, 0)
        ctx.quadraticCurveTo(
            foldX + hlWidth + bulge * 0.15, H / 2,
            foldX + hlWidth, H,
        )
        ctx.lineTo(foldX - hlWidth * 0.5, H)
        ctx.closePath()
        ctx.fill()
    }

    // ── 4. Cover the right portion (the page being turned away) ────────────
    // Fill the area from the curl-back right edge to the canvas right edge
    // with the page color to obscure the underlying content that is "leaving".
    ctx.save()
    ctx.beginPath()
    // Start from the curved right edge of the curl-back
    ctx.moveTo(foldX, 0)
    ctx.bezierCurveTo(
        cpBulge, H * 0.12,
        cpBulge, H * 0.38,
        cbRight, H * 0.5,
    )
    ctx.bezierCurveTo(
        cpBulge, H * 0.62,
        cpBulge, H * 0.88,
        foldX, H,
    )
    // Extend to canvas right edge
    ctx.lineTo(W, H)
    ctx.lineTo(W, 0)
    ctx.closePath()

    // Use a gradient that transitions from the back-of-page look to a
    // neutral "next page" appearance
    const coverGrad = ctx.createLinearGradient(cbRight, 0, W, 0)
    coverGrad.addColorStop(0, shade(rgb, 0.88))
    coverGrad.addColorStop(0.05, shade(rgb, 0.94))
    coverGrad.addColorStop(0.15, shade(rgb, 0.98))
    coverGrad.addColorStop(1, shade(rgb, 1.0))
    ctx.fillStyle = coverGrad
    ctx.fill()

    // Subtle inner shadow at the left edge of this cover area
    const innerShadow = ctx.createLinearGradient(cbRight, 0, cbRight + 20, 0)
    innerShadow.addColorStop(0, 'rgba(0,0,0,0.06)')
    innerShadow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = innerShadow
    ctx.fill()
    ctx.restore()
}

// ─── Animation ───────────────────────────────────────────────────────────────

/**
 * Animate a value from `from` to `to` over `duration` ms with ease-out cubic.
 * Calls `onFrame` on each animation frame with the interpolated value.
 * Returns a promise that resolves when the animation completes.
 * The returned object also has a `cancel()` method.
 */
export function animateCurl(
    from: number,
    to: number,
    duration: number,
    onFrame: (value: number) => void,
): { promise: Promise<void>; cancel: () => void } {
    let cancelled = false
    let rafId = 0

    const promise = new Promise<void>(resolve => {
        let start: number | undefined
        const step = (now: number) => {
            if (cancelled) { resolve(); return }
            start ??= now
            const t = Math.min(1, (now - start) / duration)
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - t, 3)
            const value = from + (to - from) * eased
            onFrame(value)
            if (t < 1) rafId = requestAnimationFrame(step)
            else resolve()
        }
        rafId = requestAnimationFrame(step)
    })

    return {
        promise,
        cancel() {
            cancelled = true
            cancelAnimationFrame(rafId)
        },
    }
}
