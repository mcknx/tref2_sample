import * as fabric from 'fabric';
import { BrandProfile } from '@/types/brand';
import {
    getContentArea,
    computeLayoutPositions,
    TYPOGRAPHY,
    SPACING,
    pickLogoScale,
    type LayoutPositions,
    type ContactPosition,
    type ElementPosition,
} from '@/utils/cardLayoutSystem';
import {
    ensureReadableColor,
    ensureReadableAccent,
    detectDominantBgColor,
} from '@/utils/contrastAutoFix';

// ─── Constants ───────────────────────────────────────────────────────────────

const CARD_WIDTH = 1050;
const RIGHT_MARGIN = 40;
const DEFAULT_FONT_SIZE = 14;
const DEFAULT_FONT_FAMILY = 'Inter';
const DEFAULT_FILL = '#000000';

// ─── ID Prefix Helpers ───────────────────────────────────────────────────────

type TMat2D = [number, number, number, number, number, number];

const TEXT_PREFIXES = ['#name', '#title', '#phone', '#email', '#website', '#address'] as const;
const COLOR_PREFIXES = ['#color_primary', '#color_secondary', '#color_accent'] as const;

function getIdOrName(obj: fabric.Object): string | undefined {
    return (obj as any).id || (obj as any).name;
}

function startsWithAny(value: string, prefixes: readonly string[]): boolean {
    return prefixes.some((p) => value.startsWith(p));
}

// ─── Color Utilities ─────────────────────────────────────────────────────────

/**
 * Calculate the relative luminance of a color (0-1)
 * Based on WCAG formula for contrast calculation
 */
function getLuminance(color: string): number {
    // Convert hex to RGB
    let r = 0, g = 0, b = 0;
    
    if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        }
    } else if (color.startsWith('rgb')) {
        const match = color.match(/\d+/g);
        if (match) {
            r = parseInt(match[0]);
            g = parseInt(match[1]);
            b = parseInt(match[2]);
        }
    }
    
    // Normalize to 0-1
    r = r / 255;
    g = g / 255;
    b = b / 255;
    
    // Apply gamma correction
    r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    
    // Calculate luminance
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Determine if a color is dark or light
 * Returns true if the color is dark (needs light text)
 */
function isDarkColor(color: string): boolean {
    const luminance = getLuminance(color);
    return luminance < 0.5; // Threshold at 50%
}

/**
 * Get the appropriate text color based on background
 */
function normalizeHex(color: string): string {
    const parsed = parseColor(color);
    if (!parsed) return color;
    return rgbToHex(parsed.r, parsed.g, parsed.b);
}

function getPalette(profile: Partial<BrandProfile>): { primaryText: string; background: string } {
    return {
        primaryText: normalizeHex(profile.colors?.primaryText || '#1e293b'),
        background: normalizeHex(profile.colors?.background || '#ffffff'),
    };
}

function colorDistance(a: string, b: string): number {
    const aRgb = parseColor(a);
    const bRgb = parseColor(b);
    if (!aRgb || !bRgb) return Number.POSITIVE_INFINITY;

    const dr = aRgb.r - bRgb.r;
    const dg = aRgb.g - bRgb.g;
    const db = aRgb.b - bRgb.b;
    return dr * dr + dg * dg + db * db;
}

function mapToTwoColorPalette(source: string, palette: { primaryText: string; background: string }): string {
    const normalized = normalizeHex(source);
    if (normalized === palette.primaryText || normalized === palette.background) {
        return normalized;
    }

    const toPrimary = colorDistance(normalized, palette.primaryText);
    const toBackground = colorDistance(normalized, palette.background);
    return toPrimary <= toBackground ? palette.primaryText : palette.background;
}

function mapLiteralColor(value: string, palette: { primaryText: string; background: string }): string {
    if (value === 'none' || value === 'transparent') return value;
    if (value === 'currentColor') return palette.primaryText;

    const parsed = parseColor(value);
    if (!parsed) return palette.background;
    return mapToTwoColorPalette(value, palette);
}

function forceObjectToTwoColorPalette(obj: fabric.Object, profile: Partial<BrandProfile>): void {
    const palette = getPalette(profile);
    const id = getIdOrName(obj) || '';
    const textColor = normalizeHex(profile.colors?.text || profile.colors?.primaryText || '#1e293b');

    if (id && startsWithAny(id, TEXT_PREFIXES)) {
        obj.set({ fill: textColor });
        if (typeof obj.stroke === 'string' && obj.stroke !== 'none' && obj.stroke !== 'transparent') {
            obj.set({ stroke: textColor });
        }
        return;
    }

    const fill = obj.fill;
    if (fill) {
        if (typeof fill === 'string') {
            obj.set({ fill: mapLiteralColor(fill, palette) });
        } else {
            // Gradient/pattern/object fill -> keep two-tone contrast, especially for template backgrounds
            obj.set({ fill: id.startsWith('#bg') ? palette.primaryText : palette.background });
        }
    }

    const stroke = obj.stroke;
    if (stroke) {
        if (typeof stroke === 'string') {
            obj.set({ stroke: mapLiteralColor(stroke, palette) });
        } else {
            obj.set({ stroke: palette.primaryText });
        }
    }
}

// ─── Color Shade Utilities (for logo bg) ─────────────────────────────────────

/**
 * Parse a color string (hex or rgb/rgba) into {r, g, b} values.
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
    if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        if (hex.length === 3) {
            return {
                r: parseInt(hex[0] + hex[0], 16),
                g: parseInt(hex[1] + hex[1], 16),
                b: parseInt(hex[2] + hex[2], 16),
            };
        } else if (hex.length === 6) {
            return {
                r: parseInt(hex.substring(0, 2), 16),
                g: parseInt(hex.substring(2, 4), 16),
                b: parseInt(hex.substring(4, 6), 16),
            };
        }
    } else if (color.startsWith('rgb')) {
        const match = color.match(/\d+/g);
        if (match && match.length >= 3) {
            return { r: parseInt(match[0]), g: parseInt(match[1]), b: parseInt(match[2]) };
        }
    }
    return null;
}

/** Convert RGB to hex string. */
function rgbToHex(r: number, g: number, b: number): string {
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    return '#' + [clamp(r), clamp(g), clamp(b)]
        .map(v => v.toString(16).padStart(2, '0'))
        .join('');
}

/** WCAG contrast ratio between two colors (1-21). */
function getContrastRatio(color1: string, color2: string): number {
    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Given brand colors and the background color behind the logo,
 * pick the best color for the logo container:
 *   - Uses only logo/brand colors (or lighter/darker shades, or white)
 *   - Has good contrast against surrounding area
 */
function pickLogoBgColor(
    brandColors: { primaryText?: string; background?: string },
    areaBgColor: string
): string {
    const palette = {
        primaryText: normalizeHex(brandColors.primaryText || '#1e293b'),
        background: normalizeHex(brandColors.background || '#3b82f6'),
    };
    const bgContrast = getContrastRatio(palette.background, areaBgColor);
    const textContrast = getContrastRatio(palette.primaryText, areaBgColor);
    return bgContrast >= textContrast ? palette.background : palette.primaryText;
}

function pickLogoContainerColor(
    brandColors: { primaryText?: string; background?: string },
    areaBgColor: string,
    logoColor: string
): string {
    const palette = {
        primaryText: normalizeHex(brandColors.primaryText || '#1e293b'),
        background: normalizeHex(brandColors.background || '#3b82f6'),
    };

    const variants = [palette.primaryText, palette.background];

    let best = palette.primaryText;
    let bestScore = -Infinity;

    for (const color of variants) {
        const againstBg = getContrastRatio(color, areaBgColor);
        const againstLogo = getContrastRatio(color, logoColor);
        const score = Math.min(againstBg, againstLogo);
        if (score > bestScore) {
            bestScore = score;
            best = color;
        }
    }

    return best;
}

function getImageLogoStats(img: fabric.Image): { averageColor: string; hasTransparency: boolean } | null {
    const source = img.getElement() as HTMLImageElement | HTMLCanvasElement | undefined;
    if (!source) return null;

    const srcWidth = (source as HTMLImageElement).naturalWidth || source.width;
    const srcHeight = (source as HTMLImageElement).naturalHeight || source.height;
    if (!srcWidth || !srcHeight) return null;

    const sampleW = Math.min(128, srcWidth);
    const sampleH = Math.min(128, srcHeight);

    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = sampleW;
    sampleCanvas.height = sampleH;
    const ctx = sampleCanvas.getContext('2d');
    if (!ctx) return null;

    try {
        ctx.drawImage(source as CanvasImageSource, 0, 0, sampleW, sampleH);
        const data = ctx.getImageData(0, 0, sampleW, sampleH).data;

        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let alphaWeightedCount = 0;
        let visiblePixels = 0;
        const totalPixels = sampleW * sampleH;

        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3] / 255;
            if (alpha <= 0.06) continue;

            visiblePixels += 1;
            rSum += data[i] * alpha;
            gSum += data[i + 1] * alpha;
            bSum += data[i + 2] * alpha;
            alphaWeightedCount += alpha;
        }

        if (alphaWeightedCount <= 0) return null;

        const avgR = rSum / alphaWeightedCount;
        const avgG = gSum / alphaWeightedCount;
        const avgB = bSum / alphaWeightedCount;

        return {
            averageColor: rgbToHex(avgR, avgG, avgB),
            hasTransparency: visiblePixels < totalPixels * 0.9,
        };
    } catch {
        return null;
    }
}

/**
 * Given all objects, detect the dominant bg color at a point (x,y).
 */
function detectBgColorAtPosition(
    allObjects: fabric.Object[],
    x: number,
    y: number,
    cardWidth: number = CARD_WIDTH,
    cardHeight: number = 600
): string {
    let bgColor = '#ffffff';
    for (const obj of allObjects) {
        const id = getIdOrName(obj);
        if (id?.startsWith('#logo') || id?.startsWith('#name') || id?.startsWith('#title')
            || id?.startsWith('#phone') || id?.startsWith('#email') || id?.startsWith('#website')
            || id?.startsWith('#address')) continue;
        if (obj.type === 'text' || obj.type === 'textbox' || obj.type === 'i-text') continue;

        const fill = obj.fill;
        if (!fill || typeof fill !== 'string' || fill === 'transparent' || fill === 'none') continue;

        const objLeft = obj.left || 0;
        const objTop = obj.top || 0;
        const objWidth = (obj.width || 0) * (obj.scaleX || 1);
        const objHeight = (obj.height || 0) * (obj.scaleY || 1);

        if (x >= objLeft && x <= objLeft + objWidth && y >= objTop && y <= objTop + objHeight) {
            if (objWidth < cardWidth * 0.05 && objHeight < cardHeight * 0.05) continue;
            bgColor = fill;
        }
    }
    return bgColor;
}

// ─── Transform Utilities ─────────────────────────────────────────────────────

/**
 * Compute the absolute world-space transform for an object,
 * given its parent's accumulated transform matrix.
 */
function computeAbsoluteTransform(
    obj: fabric.Object,
    parentTransform: TMat2D
): TMat2D {
    const localMatrix = obj.calcTransformMatrix() as TMat2D;
    return fabric.util.multiplyTransformMatrices(parentTransform, localMatrix) as TMat2D;
}

/**
 * Apply a world-space transform matrix to an object, setting its
 * left, top, scaleX, scaleY, skewX, skewY, and angle directly.
 */
function applyAbsoluteTransform(obj: fabric.Object, transform: TMat2D): void {
    const decomposed = fabric.util.qrDecompose(transform);
    obj.set({
        left: decomposed.translateX,
        top: decomposed.translateY,
        scaleX: decomposed.scaleX,
        scaleY: decomposed.scaleY,
        skewX: decomposed.skewX,
        skewY: decomposed.skewY,
        angle: decomposed.angle,
    });
}

// ─── Text Field Mapping ──────────────────────────────────────────────────────

/**
 * Estimate the width of a string in pixels based on font size.
 * Uses an average character width ratio (~0.6 of fontSize for Inter/sans-serif).
 */
function estimateTextWidth(text: string, fontSize: number): number {
    const AVG_CHAR_WIDTH_RATIO = 0.55;
    return text.length * fontSize * AVG_CHAR_WIDTH_RATIO;
}

/**
 * Truncate text with ellipsis if it exceeds the available width.
 */
function truncateWithEllipsis(text: string, fontSize: number, maxWidth: number): string {
    const textWidth = estimateTextWidth(text, fontSize);
    if (textWidth <= maxWidth) return text;

    const ellipsis = '…';
    const ellipsisWidth = estimateTextWidth(ellipsis, fontSize);
    const availableForText = maxWidth - ellipsisWidth;

    if (availableForText <= 0) return ellipsis;

    // Estimate how many characters fit
    const charWidth = fontSize * 0.55;
    const maxChars = Math.floor(availableForText / charWidth);

    return text.substring(0, maxChars) + ellipsis;
}

/**
 * Given a text-field ID, return the matching string from the brand profile.
 */
function resolveTextContent(id: string, profile: Partial<BrandProfile>): string {
    if (id.startsWith('#name')) return profile.business_name || 'Your Name';
    if (id.startsWith('#title')) return profile.tagline || 'Your Title';
    if (id.startsWith('#phone')) return profile.contact_info?.phone || '+1 234 567 8900';
    if (id.startsWith('#email')) return profile.contact_info?.email || 'hello@example.com';
    if (id.startsWith('#website')) return profile.contact_info?.website || 'www.example.com';
    if (id.startsWith('#address')) return profile.contact_info?.address || '123 Innovation Dr, Tech City';
    return 'Placeholder';
}

/**
 * Convert an SVG text element into a fabric.Textbox with injected content.
 * Bakes scale into fontSize so the Textbox itself has scaleX/Y = 1.
 */
function createHydratedTextbox(
    obj: fabric.Object,
    id: string,
    transform: TMat2D,
    profile: Partial<BrandProfile>
): fabric.Textbox {
    const decomposed = fabric.util.qrDecompose(transform);
    const content = resolveTextContent(id, profile);

    // Bake vertical scale into font size so the textbox renders at 1:1 scale
    let fontSize = DEFAULT_FONT_SIZE;
    if ((obj as any).fontSize) {
        fontSize = (obj as any).fontSize * decomposed.scaleY;
    } else {
        fontSize = (obj.height || 0) * decomposed.scaleY * 0.7;
    }

    // ── Origin & Alignment ──────────────────────────────────────────────
    //
    // Fabric.js SVG loader decomposes group transforms such that translateX/Y
    // points to the CENTER of the original object's bounding box. When we
    // create a Textbox, we need to convert this center point to the correct
    // origin-based position.
    //
    // For left-aligned text (SVG default, no text-anchor):
    //   left = centerX - (originalWidth * scaleX / 2)
    //   originX = 'left'
    //
    // For center-aligned text (text-anchor="middle"):
    //   left = centerX  (the center IS the anchor point)
    //   originX = 'center', textAlign = 'center'

    const centerX = decomposed.translateX;
    const centerY = decomposed.translateY;

    // Detect if the original SVG text used text-anchor="middle"
    // Fabric.js maps this to originX='center' during SVG loading
    const isCentered = obj.originX === 'center';

    // Original object dimensions (scaled)
    const origWidth = (obj.width || 0) * decomposed.scaleX;
    const origHeight = (obj.height || 0) * decomposed.scaleY;

    let leftPos: number;
    let topPos: number;
    let textAlign: string;
    let originX: string;
    let availableWidth: number;

    if (isCentered) {
        // Center-aligned text: anchor at center point
        leftPos = centerX;
        originX = 'center';
        textAlign = 'center';
        // Width goes out both sides from center
        const halfSpace = Math.min(centerX, CARD_WIDTH - centerX) - RIGHT_MARGIN;
        availableWidth = Math.max(origWidth, Math.min(halfSpace * 2, origWidth * 2.5));
    } else {
        // Left-aligned text: convert center → left edge
        leftPos = centerX - (origWidth / 2);
        originX = 'left';
        textAlign = (obj as any).textAlign || 'left';
        // Use original width with some room, but cap at remaining card space
        const maxSpace = CARD_WIDTH - leftPos - RIGHT_MARGIN;
        availableWidth = Math.max(origWidth, Math.min(maxSpace, origWidth * 2.5));
    }

    // Convert center Y → top edge
    topPos = centerY - (origHeight / 2);

    // Truncate text with ellipsis if it would overflow the available width
    const truncatedContent = truncateWithEllipsis(content, fontSize, availableWidth);

    // Use brand primaryText color for all text elements
    const textColor = profile.colors?.primaryText || (obj.fill as string) || DEFAULT_FILL;

    return new fabric.Textbox(truncatedContent, {
        left: leftPos,
        top: topPos,
        width: availableWidth,
        fontSize,
        fontFamily: DEFAULT_FONT_FAMILY,
        fill: textColor,
        originX: originX,
        originY: 'top',
        textAlign: textAlign as any,
        splitByGrapheme: false,
        // Scale is baked into fontSize — keep 1:1
        scaleX: 1,
        scaleY: 1,
        angle: decomposed.angle,
        id: id,
        name: id,
    } as any);
}

// ─── Color Mapping ───────────────────────────────────────────────────────────

/**
 * Apply brand colors to a color-mapped element.
 * Uses only two colors: primaryText and background.
 * - #color_primary → background color (main colored panels/areas)
 * - #color_secondary → lighter shade of background color
 * - #color_accent → background color (decorative accents)
 */
function applyColorMapping(obj: fabric.Object, id: string, profile: Partial<BrandProfile>): void {
    const colorKey = id.replace('#color_', '').split('_')[0]; // Support IDs like #color_primary_banner
    const palette = getPalette(profile);
    
    let newColor: string;
    if (colorKey === 'primary') {
        newColor = palette.background;
    } else if (colorKey === 'secondary') {
        // Strict two-color mode: secondary maps to text color
        newColor = palette.primaryText;
    } else if (colorKey === 'accent') {
        // Keep contrast: accents use the opposite palette color
        newColor = palette.primaryText;
    } else {
        return;
    }

    // Apply to both fill and stroke if they exist
    if (obj.fill && obj.fill !== 'none' && obj.fill !== 'transparent') {
        obj.set({ fill: newColor });
    }
    if (obj.stroke) {
        obj.set({ stroke: newColor });
    }
}

// ─── Lock / Background ──────────────────────────────────────────────────────

/**
 * Lock an object so it cannot be moved or selected.
 */
function lockObject(obj: fabric.Object): void {
    obj.set({
        selectable: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true,
    });
}

// ─── Logo / Image Replacement ────────────────────────────────────────────────

interface LogoPlaceholder {
    obj: fabric.Object;
    id: string;
    transform: TMat2D;
}

/**
 * Replace a logo placeholder with the actual logo image, fitted and centered
 * within the placeholder's bounding box.
 *
 * When `layoutLogo` is provided (standardised layout mode) the placeholder is
 * repositioned and resized to match the global logo tokens before the image is
 * fitted inside. This guarantees:
 *   • Consistent logo size across every template
 *   • Left edge aligned to the text column
 *   • Spacing that follows the global scale
 */
async function replaceLogoPlaceholder(
    placeholder: LogoPlaceholder,
    profile: Partial<BrandProfile>,
    allObjects: fabric.Object[],
    layoutLogo?: { x: number; y: number; maxW: number; maxH: number }
): Promise<fabric.Object[]> {
    const { obj, id, transform } = placeholder;
    const decomposed = fabric.util.qrDecompose(transform);

    // ── Determine actual placement ──────────────────────────────────────
    // If the layout system provides a position, override the SVG defaults.
    let placeholderWidth: number;
    let placeholderHeight: number;
    let placeholderLeft: number;
    let placeholderTop: number;

    if (layoutLogo) {
        placeholderWidth  = layoutLogo.maxW;
        placeholderHeight = layoutLogo.maxH;
        placeholderLeft   = layoutLogo.x;
        placeholderTop    = layoutLogo.y;
    } else {
        placeholderWidth  = (obj.width || 0) * decomposed.scaleX;
        placeholderHeight = (obj.height || 0) * decomposed.scaleY;
        placeholderLeft   = decomposed.translateX;
        placeholderTop    = decomposed.translateY;
    }

    // Detect bg color behind logo
    const areaBgColor = detectBgColorAtPosition(allObjects, placeholderLeft, placeholderTop);

    if (!profile.logo_url) {
        const fallbackLogoBg = profile.colors
            ? pickLogoBgColor(profile.colors, areaBgColor)
            : (isDarkColor(areaBgColor) ? '#ffffff' : '#f1f5f9');

        // Resize placeholder rect to standardised dimensions
        obj.set({
            fill: fallbackLogoBg,
            opacity: 1,
            left: placeholderLeft,
            top: placeholderTop,
            width: placeholderWidth,
            height: placeholderHeight,
            scaleX: 1,
            scaleY: 1,
        } as any);
        return [obj];
    }

    try {
        const img = await fabric.Image.fromURL(profile.logo_url);

        const logoStats = getImageLogoStats(img);
        const inferredLogoColor = logoStats?.averageColor || (profile.colors?.primaryText || '#111111');
        const logoVsBgContrast = getContrastRatio(inferredLogoColor, areaBgColor);
        const needsContainer = logoVsBgContrast < 2.6;
        const suggestedContainerColor = profile.colors
            ? pickLogoContainerColor(profile.colors, areaBgColor, inferredLogoColor)
            : (isDarkColor(inferredLogoColor) ? '#f8fafc' : '#0f172a');

        const palette = getPalette(profile);
        // Ensure strong contrast against the logo tone using only the two palette colors
        const finalContainerColor = getContrastRatio(suggestedContainerColor, inferredLogoColor) >= 3
            ? suggestedContainerColor
            : (getContrastRatio(palette.background, inferredLogoColor) >= getContrastRatio(palette.primaryText, inferredLogoColor)
                ? palette.background
                : palette.primaryText);

        if (needsContainer) {
            const cornerRadius = Math.max(8, Math.min(placeholderWidth, placeholderHeight) * 0.14);
            obj.set({
                fill: finalContainerColor,
                opacity: 0.96,
                rx: cornerRadius,
                ry: cornerRadius,
                left: placeholderLeft,
                top: placeholderTop,
                width: placeholderWidth,
                height: placeholderHeight,
                scaleX: 1,
                scaleY: 1,
            } as any);
        }

        const imgNaturalW = img.width || 1;
        const imgNaturalH = img.height || 1;

        // Use tighter fit when no container is needed
        const paddingRatio = needsContainer ? 0.1 : 0.03;
        const padding = Math.min(placeholderWidth, placeholderHeight) * paddingRatio;
        const availableW = placeholderWidth - padding * 2;
        const availableH = placeholderHeight - padding * 2;

        // "Contain" fit
        const scaleFactor = Math.min(availableW / imgNaturalW, availableH / imgNaturalH);
        const renderedW = imgNaturalW * scaleFactor;
        const renderedH = imgNaturalH * scaleFactor;

        // Center inside the placeholder box
        const offsetX = (placeholderWidth - renderedW) / 2;
        const offsetY = (placeholderHeight - renderedH) / 2;

        img.set({
            left: placeholderLeft + offsetX,
            top: placeholderTop + offsetY,
            scaleX: scaleFactor,
            scaleY: scaleFactor,
            id: id,
            name: id,
        } as any);

        // Return rounded container only when contrast needs help
        return needsContainer ? [obj, img] : [img];
    } catch {
        const fallbackLogoBg = profile.colors
            ? pickLogoBgColor(profile.colors, areaBgColor)
            : (isDarkColor(areaBgColor) ? '#ffffff' : '#f1f5f9');
        obj.set({
            fill: fallbackLogoBg,
            opacity: 1,
            left: placeholderLeft,
            top: placeholderTop,
            width: placeholderWidth,
            height: placeholderHeight,
            scaleX: 1,
            scaleY: 1,
        } as any);
        return [obj];
    }
}

// ─── Recursive Flattening ────────────────────────────────────────────────────

interface TextMetadata {
    obj: fabric.Object;
    id: string;
    transform: TMat2D;
    originalText: string;
}

interface FlattenResult {
    objects: fabric.Object[];
    logoPlaceholders: LogoPlaceholder[];
    textCollections: TextMetadata[];
}

interface HydrateOptions {
    preserveTemplateText?: boolean;
    templatePath?: string;
}

// ─── Contact Dot Detection ──────────────────────────────────────────────────

const CONTACT_DOT_PATTERN = /phone|email|web|addr|contact/i;

/** Returns true for small decorative elements tied to contact fields (icon dots, rings). */
function isContactDot(id: string): boolean {
    if (!id.startsWith('#color_accent_')) return false;
    // Exclude dividers — they have their own handling
    if (id.includes('divider') || id.includes('title_line') || id.includes('section_line')) return false;
    return CONTACT_DOT_PATTERN.test(id);
}

/**
 * Recursively flatten a tree of fabric.Object/Group into a flat array,
 * computing absolute transforms as we go.
 *
 * Text fields are converted to Textbox, colors are applied, locks are set.
 * Logo placeholders are collected separately for async processing.
 */
function flattenObjects(
    objects: fabric.Object[],
    parentTransform: TMat2D,
    profile: Partial<BrandProfile>,
    hydrateOptions: HydrateOptions = {}
): FlattenResult {
    const result: fabric.Object[] = [];
    const logoPlaceholders: LogoPlaceholder[] = [];
    const textCollections: TextMetadata[] = [];

    for (const obj of objects) {
        if (!obj) continue;

        const absTransform = computeAbsoluteTransform(obj, parentTransform);
        const id = getIdOrName(obj);

        // ── Group: recurse into children (unless locked/bg group) ──
        if (obj.type === 'group' && !id?.startsWith('#lock') && !id?.startsWith('#bg')) {
            const children = (obj as fabric.Group).getObjects();
            const childResult = flattenObjects(children, absTransform, profile, hydrateOptions);
            result.push(...childResult.objects);
            logoPlaceholders.push(...childResult.logoPlaceholders);
            textCollections.push(...childResult.textCollections);
            continue;
        }

        // ── Text fields ──
        if (id && startsWithAny(id, TEXT_PREFIXES)) {
            if (hydrateOptions.preserveTemplateText) {
                // Preview mode — keep original positions and content
                applyAbsoluteTransform(obj, absTransform);
                forceObjectToTwoColorPalette(obj, profile);
                result.push(obj);
            } else {
                // Editor mode — collect metadata for standardised layout
                const originalText = (obj as any).text || '';
                textCollections.push({ obj, id, transform: absTransform, originalText });
            }
            continue;
        }

        // ── Logo placeholder → collect for async ──
        if (id?.startsWith('#logo')) {
            logoPlaceholders.push({ obj, id, transform: absTransform });
            continue;
        }

        // ── Skip contact icon dots when using standardised layout ──
        if (!hydrateOptions.preserveTemplateText && id && isContactDot(id)) {
            // These will be regenerated at the correct positions by the layout system
            continue;
        }

        // ── Skip old dividers when using standardised layout ──
        if (!hydrateOptions.preserveTemplateText && id &&
            (id.includes('divider') || id.includes('title_line') || id.includes('section_line'))) {
            continue;
        }

        // ── Color-mapped element ──
        if (id && startsWithAny(id, COLOR_PREFIXES)) {
            applyAbsoluteTransform(obj, absTransform);
            applyColorMapping(obj, id, profile);
            forceObjectToTwoColorPalette(obj, profile);
            result.push(obj);
            continue;
        }

        // ── Locked / Background ──
        if (id?.startsWith('#lock') || id?.startsWith('#bg')) {
            applyAbsoluteTransform(obj, absTransform);
            forceObjectToTwoColorPalette(obj, profile);
            lockObject(obj);
            result.push(obj);
            continue;
        }

        // ── Default: position in world space, pass through ──
        applyAbsoluteTransform(obj, absTransform);
        forceObjectToTwoColorPalette(obj, profile);
        result.push(obj);
    }

    return { objects: result, logoPlaceholders, textCollections };
}

// ─── Text Alignment Post-Processing ─────────────────────────────────────────

/**
 * Post-process text fields to align them consistently.
 * Groups text fields by type and snaps each group to a single x-coordinate.
 */
function alignTextFields(objects: fabric.Object[]): void {
    const contactPrefixes = ['#phone', '#email', '#website', '#address'];
    const headerPrefixes = ['#name', '#title'];

    const contactFields: fabric.Object[] = [];
    const headerFields: fabric.Object[] = [];

    for (const obj of objects) {
        const id = getIdOrName(obj);
        if (!id || obj.type !== 'textbox') continue;

        if (contactPrefixes.some(p => id.startsWith(p))) {
            contactFields.push(obj);
        } else if (headerPrefixes.some(p => id.startsWith(p))) {
            headerFields.push(obj);
        }
    }

    if (contactFields.length >= 2) {
        const leftPositions = contactFields.map(f => f.left || 0).sort((a, b) => a - b);
        const targetLeft = leftPositions[0];
        contactFields.forEach(f => f.set({ left: targetLeft }));
    }

    if (headerFields.length >= 2) {
        const leftPositions = headerFields.map(f => f.left || 0).sort((a, b) => a - b);
        const targetLeft = leftPositions[0];
        headerFields.forEach(f => f.set({ left: targetLeft }));
    }
}

// ─── Standardised Layout ─────────────────────────────────────────────────────

/**
 * Create a Textbox positioned according to the global layout system.
 * Typography tokens, alignment, and width come from LayoutPositions; content
 * comes from the brand profile.
 */
function createStandardizedTextbox(
    meta: TextMetadata,
    profile: Partial<BrandProfile>,
    layout: LayoutPositions
): fabric.Textbox {
    const content = resolveTextContent(meta.id, profile);
    const textColor = profile.colors?.text || profile.colors?.primaryText || DEFAULT_FILL;

    // Pick layout slot & typography token
    let pos: ElementPosition;
    let fontSize: number;
    let fontWeight: string;
    let charSpacing = 0;

    if (meta.id.startsWith('#name')) {
        pos = layout.name;
        // Scale heading for narrow content areas
        const scale = layout.contentArea.width < 400
            ? Math.max(0.7, layout.contentArea.width / 500)
            : 1;
        fontSize = Math.round(TYPOGRAPHY.name.fontSize * scale);
        fontWeight = TYPOGRAPHY.name.fontWeight;
    } else if (meta.id.startsWith('#title')) {
        pos = layout.title;
        fontSize = TYPOGRAPHY.title.fontSize;
        fontWeight = TYPOGRAPHY.title.fontWeight;
        charSpacing = TYPOGRAPHY.title.letterSpacing * 10; // Fabric charSpacing units
    } else if (meta.id.startsWith('#phone')) {
        pos = layout.phone;
        fontSize = TYPOGRAPHY.contact.fontSize;
        fontWeight = TYPOGRAPHY.contact.fontWeight;
    } else if (meta.id.startsWith('#email')) {
        pos = layout.email;
        fontSize = TYPOGRAPHY.contact.fontSize;
        fontWeight = TYPOGRAPHY.contact.fontWeight;
    } else if (meta.id.startsWith('#website')) {
        pos = layout.website;
        fontSize = TYPOGRAPHY.contact.fontSize;
        fontWeight = TYPOGRAPHY.contact.fontWeight;
    } else if (meta.id.startsWith('#address')) {
        pos = layout.address;
        fontSize = TYPOGRAPHY.contact.fontSize;
        fontWeight = TYPOGRAPHY.contact.fontWeight;
    } else {
        pos = layout.name;
        fontSize = TYPOGRAPHY.contact.fontSize;
        fontWeight = TYPOGRAPHY.contact.fontWeight;
    }

    return new fabric.Textbox(content, {
        left: pos.x,
        top: pos.y,
        width: pos.width,
        fontSize,
        fontFamily: TYPOGRAPHY.name.fontFamily,
        fontWeight,
        fill: textColor,
        originX: 'left',
        originY: 'top',
        textAlign: 'left',
        splitByGrapheme: false,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        charSpacing,
        id: meta.id,
        name: meta.id,
    } as any);
}

/**
 * Build the structural elements added by the layout system:
 * - A divider line between title and contact info
 * - Bullet dots in front of each contact field
 */
function createLayoutStructuralElements(
    layout: LayoutPositions,
    profile: Partial<BrandProfile>
): fabric.Object[] {
    const accentColor = profile.colors?.primaryText || '#3b82f6';
    const elements: fabric.Object[] = [];

    // ── Divider ──
    elements.push(new fabric.Rect({
        left: layout.divider.x,
        top: layout.divider.y,
        width: layout.divider.width,
        height: SPACING.dividerHeight,
        fill: accentColor,
        rx: 1,
        ry: 1,
        selectable: false,
        evented: false,
        id: '#layout_divider',
        name: '#layout_divider',
    } as any));

    // ── Contact bullet dots ──
    const contactSlots: ContactPosition[] = [
        layout.phone,
        layout.email,
        layout.website,
        layout.address,
    ];
    const dotIds = ['#layout_dot_phone', '#layout_dot_email', '#layout_dot_website', '#layout_dot_address'];

    contactSlots.forEach((slot, i) => {
        elements.push(new fabric.Circle({
            left: slot.dotX,
            top: slot.dotY,
            radius: SPACING.contactDotRadius,
            fill: accentColor,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
            id: dotIds[i],
            name: dotIds[i],
        } as any));
    });

    return elements;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Hydrates a static SVG group into editable Fabric objects.
 *
 * 1. Recursively flattens all groups to a flat array with absolute transforms.
 * 2. Converts text placeholders to editable Textbox instances with profile data.
 * 3. Positions ALL text in a single left-aligned vertical column (layout system).
 * 4. Replaces logo placeholders with loaded images (async, awaited).
 * 5. Applies brand colors and locks background elements.
 *
 * @param objects - The array of fabric objects from `fabric.loadSVGFromURL`
 * @param options - The options object from `fabric.loadSVGFromURL`
 * @param profile - The user's brand profile to inject
 * @returns A flat array of fabric.Object instances ready to add to a canvas
 */
export async function hydrateSVG(
    objects: fabric.Object[],
    options: any,
    profile: Partial<BrandProfile>,
    hydrateOptions: HydrateOptions = {}
): Promise<fabric.Object[]> {
    // Filter out any nulls from the SVG loader
    const validObjects = objects.filter(Boolean);

    // Identity matrix as the root transform
    const identity: TMat2D = [1, 0, 0, 1, 0, 0];

    // Pass 1: Synchronous flatten + collect text metadata
    const { objects: flatObjects, logoPlaceholders, textCollections } = flattenObjects(
        validObjects,
        identity,
        profile,
        hydrateOptions
    );

    let processedObjects = flatObjects;
    let layoutLogo: { x: number; y: number; maxW: number; maxH: number } | undefined;

    // Pass 1.5: Apply standardised layout (editor mode)
    if (!hydrateOptions.preserveTemplateText && textCollections.length > 0) {
        const contentArea = getContentArea(hydrateOptions.templatePath);
        const layout = computeLayoutPositions(contentArea);
        layoutLogo = layout.logo;

        // Create text elements at standardised positions
        const textObjects = textCollections.map(tc =>
            createStandardizedTextbox(tc, profile, layout)
        );

        // Create structural elements (divider + contact dots)
        const structuralElements = createLayoutStructuralElements(layout, profile);

        processedObjects = [...flatObjects, ...textObjects, ...structuralElements];
    } else if (!hydrateOptions.preserveTemplateText) {
        // Fallback: old alignment logic when there are no text collections
        alignTextFields(flatObjects);
    }

    // Pass 2: Async — resolve all logo placeholders in parallel
    // Pass processedObjects so the logo resolver can detect the background color.
    // When layoutLogo is set, the logo will be repositioned+resized to match the
    // global token regardless of template-specific SVG dimensions.
    const resolvedLogoArrays = await Promise.all(
        logoPlaceholders.map((lp) => replaceLogoPlaceholder(lp, profile, processedObjects, layoutLogo))
    );

    // Flatten arrays (each logo returns [bgRect, logoImage])
    const resolvedLogos = resolvedLogoArrays.flat();

    // Merge: processed objects + resolved logos
    const allObjects = [...processedObjects, ...resolvedLogos];

    // Pass 3: Contrast auto-fix — ensure every text/structural element is readable
    // against the background color behind it. Must run after all shapes are placed.
    if (!hydrateOptions.preserveTemplateText) {
        const brandPrimary = profile.colors?.primaryText;
        const brandBg = profile.colors?.background;

        for (const obj of allObjects) {
            const objId = getIdOrName(obj) || '';
            const type = obj.type;

            const isText = type === 'text' || type === 'textbox' || type === 'i-text';
            const isLayoutDivider = objId === '#layout_divider';
            const isLayoutDot = objId.startsWith('#layout_dot_');

            if (!isText && !isLayoutDivider && !isLayoutDot) continue;

            // Detect background color behind this element
            const objX = obj.left || 0;
            const objY = obj.top || 0;
            const objW = (obj.width || 0) * (obj.scaleX || 1);
            const objH = (obj.height || 0) * (obj.scaleY || 1);
            const bgColor = detectDominantBgColor(allObjects, objX, objY, objW || 1, objH || 1);

            if (isText) {
                const currentFill = typeof obj.fill === 'string' ? obj.fill : '#000000';
                const fontSize = (obj as any).fontSize || 16;
                const fontWeight = (obj as any).fontWeight || '400';

                const readable = ensureReadableColor(currentFill, bgColor, {
                    fontSize,
                    fontWeight,
                    brandPrimary,
                });
                if (readable !== currentFill) obj.set({ fill: readable });
            } else {
                // Structural: divider / dots
                const currentFill = typeof obj.fill === 'string' ? obj.fill : '#3b82f6';
                const readable = ensureReadableAccent(currentFill, bgColor, {
                    primary: brandBg,
                    accent: brandPrimary,
                });
                if (readable !== currentFill) obj.set({ fill: readable });
            }
        }
    }

    return allObjects;
}
