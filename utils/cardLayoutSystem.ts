/**
 * Card Layout System — Global, reusable layout tokens and positioning logic.
 *
 * Enforces:
 *   ✅ Single left-aligned vertical column for ALL text
 *   ✅ Consistent typography hierarchy (name → title → contact)
 *   ✅ Uniform vertical spacing scale
 *   ✅ Print-safe inner padding
 *   ✅ Text wrapping within card bounds (via Fabric.js Textbox width)
 *   ✅ Aligned divider matching the text column
 */

// ─── Card Dimensions ─────────────────────────────────────────────────────────

export const CARD_WIDTH = 1050;
export const CARD_HEIGHT = 600;

// ─── Typography Tokens ───────────────────────────────────────────────────────
// Applied identically across every template.

export const TYPOGRAPHY = {
  name: {
    fontSize: 44,
    fontWeight: '700' as const,
    fontFamily: 'Inter',
  },
  title: {
    fontSize: 18,
    fontWeight: '400' as const,
    fontFamily: 'Inter',
    letterSpacing: 2,   // mapped to Fabric charSpacing (× 1000 / fontSize)
  },
  contact: {
    fontSize: 16,
    fontWeight: '400' as const,
    fontFamily: 'Inter',
  },
} as const;

// ─── Logo Scale Tokens ───────────────────────────────────────────────────────
// Professional rule: logo must be a primary visual anchor alongside the name.
// Sizes are in the 1050×600 SVG coordinate system.

export const LOGO_SCALE = {
  /** Compact areas (width < 350 px) */
  small:  { width: 60,  height: 60  },
  /** Default — used for most templates */
  medium: { width: 80,  height: 80  },
  /** Wide content areas (width ≥ 500 px) */
  large:  { width: 100, height: 100 },
} as const;

/** Pick the right logo token based on available content width. */
export function pickLogoScale(contentWidth: number): { width: number; height: number } {
  if (contentWidth < 350) return LOGO_SCALE.small;
  if (contentWidth >= 500) return LOGO_SCALE.large;
  return LOGO_SCALE.medium;
}

// ─── Spacing Scale ───────────────────────────────────────────────────────────

export const SPACING = {
  /** Inner padding from card edge (print-safe margin) */
  padding: 60,
  /** Right-edge safety margin */
  rightMargin: 40,
  /** Gap: logo → name */
  logoToName: 20,
  /** Gap: name → title */
  nameToTitle: 8,
  /** Gap: title → divider */
  titleToDivider: 18,
  /** Divider stroke height */
  dividerHeight: 3,
  /** Gap: divider → first contact item */
  dividerToContact: 18,
  /** Gap between consecutive contact items */
  contactGap: 14,
  /** Bullet dot radius */
  contactDotRadius: 4,
  /** Horizontal offset of bullet dot from content left */
  contactDotOffset: 12,
  /** Horizontal offset of contact text from content left (after dot) */
  contactTextOffset: 30,
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContentArea {
  left: number;
  top: number;
  width: number;
}

export interface ElementPosition {
  x: number;
  y: number;
  width: number;
}

export interface ContactPosition extends ElementPosition {
  dotX: number;
  dotY: number;
}

export interface LayoutPositions {
  contentArea: ContentArea;
  logo: { x: number; y: number; maxW: number; maxH: number };
  name: ElementPosition;
  title: ElementPosition;
  divider: ElementPosition;
  phone: ContactPosition;
  email: ContactPosition;
  website: ContactPosition;
  address: ContactPosition;
}

// ─── Content Area Lookup ─────────────────────────────────────────────────────
// Each template defines exactly where its single content column lives.
// Values are SVG-coordinate-system positions (top-left origin, px).

const TEMPLATE_CONTENT_AREAS: Record<string, ContentArea> = {
  clean_professional: { left: 430, top: 60, width: 560 },
  corporate_wave:     { left: 60,  top: 50, width: 480 },
  executive_split:    { left: 480, top: 60, width: 510 },
  modern_diagonal:    { left: 60,  top: 50, width: 370 },
  bold_accent:        { left: 60,  top: 50, width: 500 },
  geometric_blocks:   { left: 60,  top: 40, width: 580 },
  skyline_pro:        { left: 60,  top: 40, width: 450 },
  angular_pro:        { left: 60,  top: 40, width: 500 },
  arrow_edge:         { left: 60,  top: 50, width: 320 },
  crimson_corp:       { left: 60,  top: 50, width: 550 },
  dual_tone:          { left: 60,  top: 60, width: 420 },
  marble_red:         { left: 60,  top: 60, width: 340 },
  sharp_contrast:     { left: 60,  top: 50, width: 550 },
  horizon_stripe:     { left: 60,  top: 50, width: 520 },
  midnight_orbit:     { left: 60,  top: 50, width: 500 },
  minimal_corner:     { left: 60,  top: 50, width: 540 },
  split_curve:        { left: 480, top: 60, width: 510 },
  tech_circuit:       { left: 60,  top: 50, width: 500 },
};

/** Resolve the content area for a given template path (or use a sensible default). */
export function getContentArea(templatePath?: string): ContentArea {
  if (templatePath) {
    const filename = templatePath.split('/').pop()?.replace('.svg', '') || '';
    const area = TEMPLATE_CONTENT_AREAS[filename];
    if (area) return area;
  }
  // Sensible default: left-aligned column
  return { left: SPACING.padding, top: 50, width: 500 };
}

// ─── Layout Computation ──────────────────────────────────────────────────────

/**
 * Given a content area, compute exact positions for every element in the
 * standardised vertical column.
 *
 * Vertical stack (top → bottom):
 *   Logo → gap → Name → gap → Title → gap → Divider → gap → Phone → Email → Website → Address
 */
export function computeLayoutPositions(area: ContentArea): LayoutPositions {
  const { left, top, width } = area;

  // ── Font scaling for narrow content areas ──
  // Below 400 px wide we proportionally reduce heading size, but never below a
  // minimum so the card stays readable at print size.
  const headingScale = width < 400 ? Math.max(0.7, width / 500) : 1;
  const nameFontSize = Math.round(TYPOGRAPHY.name.fontSize * headingScale);

  // ── Logo — sized via global token, aligned to text grid ──
  const logoToken = pickLogoScale(width);

  let y = top;

  // Logo
  const logo = { x: left, y, maxW: logoToken.width, maxH: logoToken.height };
  y += logoToken.height + SPACING.logoToName;

  // Name
  const name: ElementPosition = { x: left, y, width };
  y += nameFontSize * 1.15 + SPACING.nameToTitle;

  // Title
  const title: ElementPosition = { x: left, y, width };
  y += TYPOGRAPHY.title.fontSize * 1.3 + SPACING.titleToDivider;

  // Divider — width is a fraction of the text column for visual hierarchy
  const dividerWidth = Math.min(width * 0.25, 100);
  const divider: ElementPosition = { x: left, y, width: dividerWidth };
  y += SPACING.dividerHeight + SPACING.dividerToContact;

  // Contact items
  const contactTextX = left + SPACING.contactTextOffset;
  const contactDotX  = left + SPACING.contactDotOffset;
  const contactWidth = width - SPACING.contactTextOffset;

  function contactPos(): ContactPosition {
    const pos: ContactPosition = {
      x: contactTextX,
      y,
      width: contactWidth,
      dotX: contactDotX,
      dotY: y + TYPOGRAPHY.contact.fontSize * 0.45,
    };
    y += TYPOGRAPHY.contact.fontSize + SPACING.contactGap;
    return pos;
  }

  const phone   = contactPos();
  const email   = contactPos();
  const website = contactPos();
  const address = contactPos();

  return { contentArea: area, logo, name, title, divider, phone, email, website, address };
}
