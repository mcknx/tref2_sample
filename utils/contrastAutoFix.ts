/**
 * Contrast Auto-Fix System
 *
 * Ensures all text, divider, and structural elements remain readable whenever
 * the background changes. Uses WCAG luminance/contrast calculations.
 *
 * Exports:
 *   - ensureReadableColor()  — pick the best readable color for a fg/bg pair
 *   - detectDominantBgColor() — scan canvas objects to find what color sits
 *     behind a given point or region
 *   - recolorCanvasForReadability() — live sweep: re-check every text/structural
 *     element on the canvas and fix colors that fail contrast
 */

import * as fabric from 'fabric';

// ─── WCAG Utilities ──────────────────────────────────────────────────────────

/** Parse any CSS-like color string to {r, g, b}. */
function parseColor(color: string): { r: number; g: number; b: number } | null {
    if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        if (hex.length === 3) {
            return {
                r: parseInt(hex[0] + hex[0], 16),
                g: parseInt(hex[1] + hex[1], 16),
                b: parseInt(hex[2] + hex[2], 16),
            };
        }
        if (hex.length === 6) {
            return {
                r: parseInt(hex.substring(0, 2), 16),
                g: parseInt(hex.substring(2, 4), 16),
                b: parseInt(hex.substring(4, 6), 16),
            };
        }
    }
    if (color.startsWith('rgb')) {
        const m = color.match(/\d+/g);
        if (m && m.length >= 3) return { r: +m[0], g: +m[1], b: +m[2] };
    }
    return null;
}

/** WCAG relative luminance (0–1). */
function getLuminance(color: string): number {
    const c = parseColor(color);
    if (!c) return 0;
    const [rs, gs, bs] = [c.r / 255, c.g / 255, c.b / 255].map(v =>
        v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** WCAG contrast ratio between two colors (1–21). */
export function getContrastRatio(c1: string, c2: string): number {
    const l1 = getLuminance(c1);
    const l2 = getLuminance(c2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

// ─── Minimum ratios (WCAG AA) ────────────────────────────────────────────────

/** 4.5:1 for normal text, 3:1 for large text (≥ 24 px or ≥ 18.66 px bold). */
const NORMAL_TEXT_MIN = 4.5;
const LARGE_TEXT_MIN = 3;
const STRUCTURAL_MIN = 3; // dividers, dots, icons

export function isLargeText(fontSize: number, fontWeight: string | number): boolean {
    const weight = typeof fontWeight === 'string' ? parseInt(fontWeight) || 400 : fontWeight;
    return fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
}

function requiredRatio(fontSize?: number, fontWeight?: string | number): number {
    if (fontSize != null && fontWeight != null) {
        return isLargeText(fontSize, fontWeight) ? LARGE_TEXT_MIN : NORMAL_TEXT_MIN;
    }
    return STRUCTURAL_MIN;
}

// ─── Smart Color Selection ───────────────────────────────────────────────────

/**
 * Given a desired foreground color and the background it sits on, return a
 * readable foreground color. Priority order:
 *
 *   1. Current color (if it already passes)
 *   2. White (#FFFFFF)
 *   3. Black (#000000)
 *   4. Brand primary color
 *   5. Logo dominant color
 *
 * Never returns a color with contrast < minRatio.
 */
export function ensureReadableColor(
    currentFg: string,
    bgColor: string,
    opts?: {
        fontSize?: number;
        fontWeight?: string | number;
        brandPrimary?: string;
        logoDominant?: string;
    }
): string {
    const minRatio = requiredRatio(opts?.fontSize, opts?.fontWeight);

    // 1. Current color is already readable
    if (getContrastRatio(currentFg, bgColor) >= minRatio) return currentFg;

    // 2. White
    if (getContrastRatio('#ffffff', bgColor) >= minRatio) return '#ffffff';

    // 3. Black
    if (getContrastRatio('#000000', bgColor) >= minRatio) return '#000000';

    // 4. Brand primary
    if (opts?.brandPrimary && getContrastRatio(opts.brandPrimary, bgColor) >= minRatio) {
        return opts.brandPrimary;
    }

    // 5. Logo dominant
    if (opts?.logoDominant && getContrastRatio(opts.logoDominant, bgColor) >= minRatio) {
        return opts.logoDominant;
    }

    // Final fallback: white/black whichever has more contrast
    return getLuminance(bgColor) > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Same logic but for accent / structural colors (dividers, dots).
 * Slightly lower minimum ratio (3:1).
 */
export function ensureReadableAccent(
    currentAccent: string,
    bgColor: string,
    brandColors?: { primary?: string; accent?: string }
): string {
    const min = STRUCTURAL_MIN;

    if (getContrastRatio(currentAccent, bgColor) >= min) return currentAccent;
    if (brandColors?.primary && getContrastRatio(brandColors.primary, bgColor) >= min) return brandColors.primary;
    if (brandColors?.accent && getContrastRatio(brandColors.accent, bgColor) >= min) return brandColors.accent;
    if (getContrastRatio('#ffffff', bgColor) >= min) return '#ffffff';
    if (getContrastRatio('#000000', bgColor) >= min) return '#000000';
    return getLuminance(bgColor) > 0.5 ? '#000000' : '#ffffff';
}

// ─── Background Detection ────────────────────────────────────────────────────

function getIdOrName(obj: fabric.Object): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const o = obj as any;
    return o.id || o.name || '';
}

/**
 * Scan all objects on the canvas and determine the dominant background color
 * behind a given bounding region. Walks back-to-front and picks the last
 * opaque-fill shape that covers the region.
 */
export function detectDominantBgColor(
    objects: fabric.Object[],
    regionX: number,
    regionY: number,
    regionW: number = 1,
    regionH: number = 1
): string {
    let bgColor = '#ffffff';
    const cx = regionX + regionW / 2;
    const cy = regionY + regionH / 2;

    for (const obj of objects) {
        const id = getIdOrName(obj);
        // Skip text, logos, layout structural elements — we want background shapes
        if (id.startsWith('#name') || id.startsWith('#title') || id.startsWith('#phone')
            || id.startsWith('#email') || id.startsWith('#website') || id.startsWith('#address')
            || id.startsWith('#logo') || id.startsWith('#layout_')) continue;
        if (obj.type === 'text' || obj.type === 'textbox' || obj.type === 'i-text') continue;

        const fill = obj.fill;
        if (!fill || typeof fill !== 'string' || fill === 'transparent' || fill === 'none') continue;

        const objLeft = obj.left || 0;
        const objTop = obj.top || 0;
        const objWidth = (obj.width || 0) * (obj.scaleX || 1);
        const objHeight = (obj.height || 0) * (obj.scaleY || 1);

        // Does this object cover our sample point?
        if (cx >= objLeft && cx <= objLeft + objWidth && cy >= objTop && cy <= objTop + objHeight) {
            // Filter out tiny decorative elements
            if (objWidth < 20 && objHeight < 20) continue;
            bgColor = fill;
        }
    }

    return bgColor;
}

/**
 * Given a canvas, detect the dominant background color behind the text content area.
 * First looks at the canvas backgroundColor, then scans rects/shapes.
 */
export function detectCanvasBgColorAtRegion(
    canvas: fabric.Canvas,
    x: number, y: number, w: number = 200, h: number = 200
): string {
    const canvasBg = (canvas.backgroundColor as string) || '#ffffff';
    const objects = canvas.getObjects() as fabric.Object[];
    const detected = detectDominantBgColor(objects, x, y, w, h);
    // If detectDominantBgColor returned white and the canvas has a different bg, use canvas bg
    if (detected === '#ffffff' && canvasBg !== '#ffffff') return canvasBg;
    return detected;
}

// ─── Live Recolor ────────────────────────────────────────────────────────────

/**
 * Walk every object on the canvas and fix any text / structural element
 * whose color now fails contrast against its background.
 *
 * Call this whenever the background color changes (color picker, gradient, image).
 */
export function recolorCanvasForReadability(
    canvas: fabric.Canvas,
    opts?: {
        brandPrimary?: string;
        brandBackground?: string;
        logoDominant?: string;
    }
): void {
    if (!canvas) return;

    const objects = canvas.getObjects() as fabric.Object[];

    for (const obj of objects) {
        const id = getIdOrName(obj);
        const type = obj.type;

        const isText = type === 'text' || type === 'textbox' || type === 'i-text';
        const isLayoutDivider = id === '#layout_divider';
        const isLayoutDot = id.startsWith('#layout_dot_');
        const isAccentDivider = id.includes('divider') || id.includes('title_line');

        if (!isText && !isLayoutDivider && !isLayoutDot && !isAccentDivider) continue;

        // Detect what's behind this object
        const objX = obj.left || 0;
        const objY = obj.top || 0;
        const objW = (obj.width || 0) * (obj.scaleX || 1);
        const objH = (obj.height || 0) * (obj.scaleY || 1);
        const bgColor = detectDominantBgColor(objects, objX, objY, objW || 1, objH || 1);

        if (isText) {
            const currentFill = typeof obj.fill === 'string' ? obj.fill : '#000000';
            const fontSize = (obj as unknown as Record<string, unknown>).fontSize as number || 16;
            const fontWeight = (obj as unknown as Record<string, unknown>).fontWeight as string || '400';

            const readable = ensureReadableColor(currentFill, bgColor, {
                fontSize,
                fontWeight,
                brandPrimary: opts?.brandPrimary,
                logoDominant: opts?.logoDominant,
            });

            if (readable !== currentFill) {
                obj.set({ fill: readable });
            }
        } else {
            // Structural elements (divider, dots)
            const currentFill = typeof obj.fill === 'string' ? obj.fill : '#3b82f6';
            const readable = ensureReadableAccent(currentFill, bgColor, {
                primary: opts?.brandBackground,
                accent: opts?.brandPrimary,
            });
            if (readable !== currentFill) {
                obj.set({ fill: readable });
            }
        }
    }

    canvas.requestRenderAll();
}
