"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import TemplatePreview from "@/components/business-card/TemplatePreview";
import { TEMPLATES } from "@/components/business-card/data/templateList";
import { useBrandStore } from "@/store/brand-store";
import ColorExtractor from "@/components/brand-kit/ColorExtractor";

// Escape special characters for use in RegExp
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface FinalizedCard {
  id: string;
  template_id: string;
  status: string;
  svg_markup: string | null;
  created_at: string;
  updated_at: string;
  profile_snapshot: Record<string, unknown>;
}

interface FinalizedCardsGridProps {
  className?: string;
}

export default function FinalizedCardsGrid({ className }: FinalizedCardsGridProps) {
  const router = useRouter();
  const { profile, updateProfile } = useBrandStore();
  const [cards, setCards] = useState<FinalizedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);

  const handleColorsExtracted = useCallback((palette: string[]) => {
    setExtractedColors(Array.from(new Set(palette)).slice(0, 8));
  }, []);

  const colors = profile.colors || { primaryText: "#1e293b", text: "#334155", background: "#3b82f6" };

  const colorChoices = Array.from(
    new Set(
      [
        ...extractedColors,
        colors.primaryText,
        colors.text,
        colors.background,
        "#1e293b",
        "#334155",
        "#3b82f6",
        "#f8fafc",
        "#111827",
      ].filter(Boolean)
    )
  );

  const updateBrandColors = (partial: { primaryText?: string; text?: string; background?: string }) => {
    updateProfile({
      colors: {
        primaryText: partial.primaryText ?? colors.primaryText,
        text: partial.text ?? colors.text,
        background: partial.background ?? colors.background,
      },
    });
  };

  const handleLogoReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      updateProfile({ logo_url: reader.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleLogoDelete = () => {
    updateProfile({ logo_url: "" });
    setExtractedColors([]);
  };

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await fetch("/api/cards", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load cards");
          return;
        }
        setCards(data.cards ?? []);
      } catch {
        setError("Failed to load cards");
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, []);

  const getTemplateName = (templateId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    return tpl?.name ?? templateId;
  };

  const getTemplateCategory = (templateId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    return tpl?.category ?? "";
  };

  const getTemplateSource = (card: FinalizedCard) => {
    if (card.svg_markup?.trim()) return card.svg_markup.trim();
    const tpl = TEMPLATES.find((t) => t.id === card.template_id);
    return tpl?.fabricJson ?? "";
  };

  // Compute squared Euclidean distance between two hex colors
  const colorDistSq = (a: string, b: string): number => {
    const parse = (hex: string) => {
      const h = hex.replace("#", "");
      return [
        parseInt(h.substring(0, 2), 16),
        parseInt(h.substring(2, 4), 16),
        parseInt(h.substring(4, 6), 16),
      ];
    };
    try {
      const [r1, g1, b1] = parse(a);
      const [r2, g2, b2] = parse(b);
      return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
    } catch {
      return Infinity;
    }
  };

  // Replace baked-in colors in the card source with the current UI-selected colors.
  // Uses Fabric.js object types to distinguish text vs shape elements.
  const getColorSwappedSource = (card: FinalizedCard): string => {
    const source = getTemplateSource(card);
    if (!source) return source;

    const snapshot = (card.profile_snapshot || {}) as Record<string, unknown>;
    const snapshotContact = (snapshot.contact_info || {}) as Record<string, string>;
    const currentContact = (profile.contact_info || {}) as Record<string, string>;

    const snapshotBusiness = typeof snapshot.business_name === "string" ? snapshot.business_name : "";
    const snapshotTagline = typeof snapshot.tagline === "string" ? snapshot.tagline : "";
    const snapshotLogo = typeof snapshot.logo_url === "string" ? snapshot.logo_url : "";

    const currentBusiness = profile.business_name || snapshotBusiness;
    const currentTagline = profile.tagline || snapshotTagline;
    const currentLogo = profile.logo_url || snapshotLogo;

    // Extract original colors from the card's profile snapshot
    const snapshotColors = (snapshot.colors as Record<string, string>) || {};
    const origPrimary = snapshotColors.primaryText?.toLowerCase();  // shapes/accents
    const origText = snapshotColors.text?.toLowerCase();             // text elements
    const origBackground = snapshotColors.background?.toLowerCase(); // background

    // Check if user has any data to inject (don't require snapshot match)
    const hasUserBusiness = !!profile.business_name;
    const hasUserTagline = !!profile.tagline;
    const hasUserLogo = !!profile.logo_url;
    const hasUserContact = !!(currentContact.phone || currentContact.email || currentContact.website || currentContact.address);

    // Color change detection (still requires snapshot comparison)
    const hasTextChange = !!(origText && colors.text && origText !== colors.text.toLowerCase());
    const hasShapeChange = !!(origPrimary && colors.primaryText && origPrimary !== colors.primaryText.toLowerCase());
    const hasBgChange = !!(origBackground && colors.background && origBackground !== colors.background.toLowerCase());

    // Any data to apply?
    const hasDataToInject = hasUserBusiness || hasUserTagline || hasUserLogo || hasUserContact;
    if (!hasTextChange && !hasShapeChange && !hasBgChange && !hasDataToInject) {
      return source;
    }

    // Try to parse as JSON (Fabric.js canvas state)
    try {
      const parsed = JSON.parse(source);
      if (parsed && Array.isArray(parsed.objects)) {
        const TEXT_TYPES = ["text", "textbox", "i-text"];

        const isCloseTo = (hex: string, target: string): boolean => {
          return colorDistSq(hex.toLowerCase(), target) < 12000; // ~63 per channel
        };

        // For non-text objects: swap fill/stroke from shape→new shape, bg→new bg
        const swapShapeColor = (c: string): string => {
          const h = c.toLowerCase();
          if (hasBgChange && origBackground && (h === origBackground || isCloseTo(h, origBackground))) return colors.background;
          if (hasShapeChange && origPrimary && (h === origPrimary || isCloseTo(h, origPrimary))) return colors.primaryText;
          return c;
        };

        // For text objects: swap fill from text→new text
        const swapTextColor = (c: string): string => {
          const h = c.toLowerCase();
          // Text color could have been contrast-adjusted, so be generous with matching
          if (hasTextChange && origText && (h === origText || isCloseTo(h, origText))) return colors.text!;
          // Text could also have been mapped to primaryText if text color was missing
          if (hasTextChange && origPrimary && (h === origPrimary || isCloseTo(h, origPrimary))) return colors.text!;
          return c;
        };

        const walkObj = (obj: Record<string, unknown>) => {
          const objType = typeof obj.type === "string" ? obj.type.toLowerCase() : "";
          const objId =
            typeof obj.id === "string"
              ? obj.id.toLowerCase()
              : typeof obj.name === "string"
                ? obj.name.toLowerCase()
                : "";
          const isText = TEXT_TYPES.includes(objType);

          if (isText) {
            if (typeof obj.text === "string") {
              const oldText = obj.text;

              // 1. Try matching by semantic object ID (most reliable)
              if (objId.startsWith("#name") && currentBusiness) obj.text = currentBusiness;
              else if (objId.startsWith("#title") && currentTagline) obj.text = currentTagline;
              else if (objId.startsWith("#phone") && (currentContact.phone || snapshotContact.phone)) obj.text = currentContact.phone || snapshotContact.phone || oldText;
              else if (objId.startsWith("#email") && (currentContact.email || snapshotContact.email)) obj.text = currentContact.email || snapshotContact.email || oldText;
              else if (objId.startsWith("#website") && (currentContact.website || snapshotContact.website)) obj.text = currentContact.website || snapshotContact.website || oldText;
              else if (objId.startsWith("#address") && (currentContact.address || snapshotContact.address)) obj.text = currentContact.address || snapshotContact.address || oldText;
              // 2. Fallback for objects WITHOUT IDs (baked JSON from canvas.toObject)
              else {
                const placeholderMap: Record<string, string | undefined> = {
                  // SVG template defaults
                  "JAMES DOE": currentBusiness,
                  "James Doe": currentBusiness,
                  "Your Name": currentBusiness,
                  "Business Name": currentBusiness,
                  "SOLUTION MANAGER": currentTagline,
                  "Solution Manager": currentTagline,
                  "Your Title": currentTagline,
                  "Your Tagline Here": currentTagline,
                  "+1 (555) 000-0000": currentContact.phone,
                  "+1 234 567 8900": currentContact.phone,
                  "hello@example.com": currentContact.email,
                  "www.example.com": currentContact.website,
                  "123 Innovation Dr, Tech City": currentContact.address,
                };
                const oldLower = oldText.toLowerCase().trim();
                // a) Try placeholder match
                const placeholderReplacement = placeholderMap[oldText];
                if (placeholderReplacement) {
                  obj.text = placeholderReplacement;
                }
                // b) Snapshot value match (case-insensitive)
                else if (snapshotBusiness && oldLower === snapshotBusiness.toLowerCase() && currentBusiness) obj.text = currentBusiness;
                else if (snapshotTagline && oldLower === snapshotTagline.toLowerCase() && currentTagline) obj.text = currentTagline;
                else if (snapshotContact.phone && oldText === snapshotContact.phone && currentContact.phone) obj.text = currentContact.phone;
                else if (snapshotContact.email && oldLower === (snapshotContact.email || "").toLowerCase() && currentContact.email) obj.text = currentContact.email;
                else if (snapshotContact.website && oldLower === (snapshotContact.website || "").toLowerCase() && currentContact.website) obj.text = currentContact.website;
                else if (snapshotContact.address && oldLower === (snapshotContact.address || "").toLowerCase() && currentContact.address) obj.text = currentContact.address;
                // c) Pattern-based detection (last resort, no ID, no snapshot match)
                else if (currentContact.email && oldLower.includes("@") && oldLower.includes(".")) obj.text = currentContact.email;
                else if (currentContact.phone && /^[\d\s+\-().]{7,}$/.test(oldText.trim())) obj.text = currentContact.phone;
                else if (currentContact.website && (oldLower.startsWith("http") || oldLower.startsWith("www"))) obj.text = currentContact.website;
              }
            }

            // Text element: swap fill to new text color
            if (typeof obj.fill === "string" && obj.fill !== "none" && obj.fill !== "transparent") {
              obj.fill = swapTextColor(obj.fill);
            }
          } else {
            // Shape/rect/path: swap fill/stroke using shape+bg colors
            if (typeof obj.fill === "string" && obj.fill !== "none" && obj.fill !== "transparent") {
              obj.fill = swapShapeColor(obj.fill);
            }
            if (typeof obj.stroke === "string" && obj.stroke !== "none" && obj.stroke !== "transparent") {
              obj.stroke = swapShapeColor(obj.stroke);
            }

            // Replace logo in Image objects.
            // Business cards typically have exactly ONE Image object: the logo.
            // Since baked JSON from canvas.toObject() loses `id` fields,
            // we treat any Image as a logo candidate when the user has a logo.
            if (hasUserLogo && objType === "image") {
              obj.src = currentLogo;
              obj.crossOrigin = "anonymous";
            }
          }

          if (typeof obj.backgroundColor === "string" && obj.backgroundColor !== "") {
            obj.backgroundColor = swapShapeColor(obj.backgroundColor);
          }
          // Handle grouped objects
          if (Array.isArray(obj.objects)) {
            (obj.objects as Record<string, unknown>[]).forEach(walkObj);
          }
        };

        // Swap canvas background
        if (typeof parsed.background === "string" && hasBgChange && origBackground) {
          const h = parsed.background.toLowerCase();
          if (h === origBackground || isCloseTo(h, origBackground)) {
            parsed.background = colors.background;
          }
        }
        parsed.objects.forEach((obj: Record<string, unknown>) => walkObj(obj));

        return JSON.stringify(parsed);
      }
    } catch {
      // Not valid JSON — fall through to regex replacement
    }

    // Fallback: direct string replacement for SVG markup
    let result = source;
    if (hasBgChange && origBackground) {
      result = result.replace(new RegExp(escapeRegExp(origBackground), "gi"), colors.background);
    }
    if (hasShapeChange && origPrimary) {
      result = result.replace(new RegExp(escapeRegExp(origPrimary), "gi"), colors.primaryText);
    }
    if (hasTextChange && origText) {
      result = result.replace(new RegExp(escapeRegExp(origText), "gi"), colors.text!);
    }
    return result;
  };

  // Build a preview profile by merging the card's DB snapshot with ALL current user data
  const getPreviewProfile = (card: FinalizedCard): Record<string, unknown> => {
    const snapshot = (card.profile_snapshot || {}) as Record<string, unknown>;
    const snapshotContact = (snapshot.contact_info || {}) as Record<string, string>;
    const currentContact = (profile.contact_info || {}) as Record<string, string>;
    return {
      ...snapshot,
      business_name: profile.business_name || snapshot.business_name,
      tagline: profile.tagline || snapshot.tagline,
      logo_url: profile.logo_url || snapshot.logo_url,
      contact_info: {
        phone: currentContact.phone || snapshotContact.phone,
        email: currentContact.email || snapshotContact.email,
        website: currentContact.website || snapshotContact.website,
        address: currentContact.address || snapshotContact.address,
      },
      colors: {
        primaryText: colors.primaryText,
        text: colors.text,
        background: colors.background,
      },
    };
  };

  const handleSelect = (card: FinalizedCard) => {
    const params = new URLSearchParams({
      cardId: card.id,
      uiText: colors.text || "",
      uiShape: colors.primaryText || "",
      uiBackground: colors.background || "",
    });
    router.push(`/card-editor?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-gray-400">Loading your cards...</span>
      </div>
    );
  }

  if (error || cards.length === 0) {
    return (
      <div className={cn("flex flex-col gap-2 py-8", className)}>
        <h2 className="text-[clamp(1.4rem,5vw,2rem)] font-black text-white">Choose a Template.</h2>
        <p className="text-gray-400">Only admin-finalized designs appear here.</p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-[#0f1724] p-6 text-sm text-gray-400">
          No finalized templates available yet. Please check back after admin approval.
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div>
        <h2 className="text-[clamp(1.4rem,5vw,2rem)] font-black text-white">Choose a Template.</h2>
        <p className="text-gray-400">Only admin-finalized designs are available to start from.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-start">
        {/* Logo & Color Selection Card */}
        <div className="rounded-2xl overflow-hidden border-2 border-white/10 bg-[#0f1724] min-h-65">
          <div className="p-3 flex flex-col gap-2 min-h-65">
            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-md bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {profile.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.logo_url} alt="Logo" className="w-9 h-9 object-contain" />
                ) : (
                  <span className="text-[10px] text-gray-500">No logo</span>
                )}
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <label className="h-8 px-2.5 rounded-md bg-primary text-white text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 hover:bg-primary/90 transition-colors">
                  <Upload className="w-3 h-3" /> Replace
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoReplace} />
                </label>
                <button
                  onClick={handleLogoDelete}
                  className="h-8 px-2.5 rounded-md border border-white/10 text-gray-300 text-[11px] font-bold inline-flex items-center gap-1 hover:bg-white/5"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>

            {profile.logo_url && (
              <ColorExtractor
                imageSrc={profile.logo_url}
                onColorsExtracted={handleColorsExtracted}
              />
            )}

            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Text</p>
                <div className="flex items-center gap-1.5">
                  {colorChoices.slice(0, 5).map((color) => (
                    <button
                      key={`text-${color}`}
                      onClick={() => updateBrandColors({ text: color })}
                      className={cn(
                        "w-5 h-5 rounded border transition-all",
                        colors.text === color ? "border-cyan-400 ring-1 ring-cyan-400/40" : "border-white/15"
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <input
                    type="color"
                    value={colors.text || "#334155"}
                    onChange={(e) => updateBrandColors({ text: e.target.value })}
                    className="ml-auto w-8 h-5 rounded border border-white/10 bg-transparent"
                  />
                </div>
              </div>

              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Shape</p>
                <div className="flex items-center gap-1.5">
                  {colorChoices.slice(0, 5).map((color) => (
                    <button
                      key={`shape-${color}`}
                      onClick={() => updateBrandColors({ primaryText: color })}
                      className={cn(
                        "w-5 h-5 rounded border transition-all",
                        colors.primaryText === color ? "border-cyan-400 ring-1 ring-cyan-400/40" : "border-white/15"
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <input
                    type="color"
                    value={colors.primaryText}
                    onChange={(e) => updateBrandColors({ primaryText: e.target.value })}
                    className="ml-auto w-8 h-5 rounded border border-white/10 bg-transparent"
                  />
                </div>
              </div>

              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Background</p>
                <div className="flex items-center gap-1.5">
                  {colorChoices.slice(0, 5).map((color) => (
                    <button
                      key={`bg-${color}`}
                      onClick={() => updateBrandColors({ background: color })}
                      className={cn(
                        "w-5 h-5 rounded border transition-all",
                        colors.background === color ? "border-cyan-400 ring-1 ring-cyan-400/40" : "border-white/15"
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <input
                    type="color"
                    value={colors.background}
                    onChange={(e) => updateBrandColors({ background: e.target.value })}
                    className="ml-auto w-8 h-5 rounded border border-white/10 bg-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {cards.map((card) => (
          <div
            key={card.id}
            onClick={() => handleSelect(card)}
            className="group relative cursor-pointer rounded-2xl overflow-hidden border-2 border-primary/30 bg-[#0f1724] min-h-65 flex flex-col transition-all duration-300 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/10 hover:scale-[1.03]"
          >
            {/* Card Preview */}
            <div className="w-full aspect-[1.75] pointer-events-none relative overflow-hidden">
              <TemplatePreview
                templatePath={getColorSwappedSource(card)}
                profile={getPreviewProfile(card)}
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-300 flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-primary text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                  Customize
                </span>
              </div>
            </div>

            {/* Card Info */}
            <div className="p-3 mt-auto">
              <h3 className="text-white font-bold text-sm leading-tight">
                {getTemplateName(card.template_id)}
              </h3>
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                {getTemplateCategory(card.template_id)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
