export interface TemplateDefinition {
  id: string;
  name: string;
  category: string;
  fabricJson: string;
}

export const TEMPLATE_CATEGORIES = [
  "All",
  "Modern",
  "Minimal",
  "Creative",
  "Corporate",
  "Elegant",
];

export const TEMPLATES: TemplateDefinition[] = [
  { id: "t-clean-pro", name: "Clean Professional", category: "Minimal", fabricJson: "/templates/clean_professional.svg" },
  { id: "t-corp-wave", name: "Corporate Wave", category: "Corporate", fabricJson: "/templates/corporate_wave.svg" },
  { id: "t-exec-split", name: "Executive Split", category: "Corporate", fabricJson: "/templates/executive_split.svg" },
  { id: "t-mod-diag", name: "Modern Diagonal", category: "Modern", fabricJson: "/templates/modern_diagonal.svg" },
  { id: "t-bold-accent", name: "Bold Accent", category: "Creative", fabricJson: "/templates/bold_accent.svg" },
  { id: "t-geo-blocks", name: "Geometric Blocks", category: "Modern", fabricJson: "/templates/geometric_blocks.svg" },
  { id: "t-skyline", name: "Skyline Pro", category: "Corporate", fabricJson: "/templates/skyline_pro.svg" },
  { id: "t-arrow-edge", name: "Arrow Edge", category: "Modern", fabricJson: "/templates/arrow_edge.svg" },
  { id: "t-crimson-corp", name: "Crimson Corp", category: "Corporate", fabricJson: "/templates/crimson_corp.svg" },
  { id: "t-angular-pro", name: "Angular Pro", category: "Modern", fabricJson: "/templates/angular_pro.svg" },
  { id: "t-marble-red", name: "Marble Red", category: "Elegant", fabricJson: "/templates/marble_red.svg" },
  { id: "t-dual-tone", name: "Dual Tone", category: "Corporate", fabricJson: "/templates/dual_tone.svg" },
  { id: "t-sharp-contrast", name: "Sharp Contrast", category: "Creative", fabricJson: "/templates/sharp_contrast.svg" },
  { id: "t-horizon-stripe", name: "Horizon Stripe", category: "Corporate", fabricJson: "/templates/horizon_stripe.svg" },
  { id: "t-midnight-orbit", name: "Midnight Orbit", category: "Creative", fabricJson: "/templates/midnight_orbit.svg" },
  { id: "t-minimal-corner", name: "Minimal Corner", category: "Minimal", fabricJson: "/templates/minimal_corner.svg" },
  { id: "t-split-curve", name: "Split Curve", category: "Modern", fabricJson: "/templates/split_curve.svg" },
  { id: "t-tech-circuit", name: "Tech Circuit", category: "Modern", fabricJson: "/templates/tech_circuit.svg" },
  { id: "t-gradient-wave", name: "Gradient Wave", category: "Creative", fabricJson: "/templates/gradient_wave.svg" },
  { id: "t-neon-dots", name: "Neon Dots", category: "Modern", fabricJson: "/templates/neon_dots.svg" },
  { id: "t-orbit-rings", name: "Orbit Rings", category: "Creative", fabricJson: "/templates/orbit_rings.svg" },
  { id: "t-layered-stripe", name: "Layered Stripe", category: "Corporate", fabricJson: "/templates/layered_stripe.svg" },
  { id: "t-diamond-lattice", name: "Diamond Lattice", category: "Elegant", fabricJson: "/templates/diamond_lattice.svg" },
  { id: "t-soft-blob", name: "Soft Blob", category: "Elegant", fabricJson: "/templates/soft_blob.svg" },
  { id: "t-halftone-bold", name: "Halftone Bold", category: "Creative", fabricJson: "/templates/halftone_bold.svg" },
];
