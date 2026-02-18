"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import CardEditorLayout from "@/components/business-card/CardEditorLayout";
import { TEMPLATES } from "@/components/business-card/data/templateList";
import { useBrandStore } from "@/store/brand-store";

interface ApiCard {
    id: string;
    template_id: string;
    svg_markup?: string | null;
    original_svg?: string | null;
    status?: "finalized" | "not-finalized";
    profile_snapshot?: {
        business_name?: string;
        tagline?: string;
        logo_url?: string;
        contact_info?: {
            phone?: string;
            email?: string;
            website?: string;
            address?: string;
        };
        colors?: {
            primaryText?: string;
            text?: string;
            background?: string;
        };
    };
}

function normalizeHex(value: string | null): string | null {
    if (!value) return null;
    const v = value.trim().toLowerCase();
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return null;
    if (v.length === 4) {
        return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
    }
    return v;
}

function colorDistSq(a: string, b: string): number {
    const toRgb = (hex: string) => [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ];
    const [r1, g1, b1] = toRgb(a);
    const [r2, g2, b2] = toRgb(b);
    return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
}

function applyUiColorOverridesToSource(
    source: string,
    snapshotColors: { primaryText?: string; text?: string; background?: string } | undefined,
    uiOverrides: { text?: string | null; shape?: string | null; background?: string | null }
): string {
    const uiText = normalizeHex(uiOverrides.text ?? null);
    const uiShape = normalizeHex(uiOverrides.shape ?? null);
    const uiBackground = normalizeHex(uiOverrides.background ?? null);

    if (!uiText && !uiShape && !uiBackground) return source;

    const origText = normalizeHex(snapshotColors?.text ?? null);
    const origShape = normalizeHex(snapshotColors?.primaryText ?? null);
    const origBg = normalizeHex(snapshotColors?.background ?? null);

    try {
        const parsed = JSON.parse(source);
        if (!parsed || !Array.isArray(parsed.objects)) return source;

        const TEXT_TYPES = ["text", "textbox", "i-text"];
        const isNear = (value: string, target: string | null) => {
            if (!target) return false;
            return value === target || colorDistSq(value, target) < 12000;
        };

        const swapShapeOrBg = (color: string): string => {
            const normalized = normalizeHex(color);
            if (!normalized) return color;
            if (uiBackground && isNear(normalized, origBg)) return uiBackground;
            if (uiShape && isNear(normalized, origShape)) return uiShape;
            return color;
        };

        const walk = (obj: Record<string, unknown>) => {
            const type = typeof obj.type === "string" ? obj.type.toLowerCase() : "";
            const isText = TEXT_TYPES.includes(type);

            if (isText) {
                if (uiText && typeof obj.fill === "string" && obj.fill !== "none" && obj.fill !== "transparent") {
                    obj.fill = uiText;
                }
                if (uiText && typeof obj.stroke === "string" && obj.stroke !== "none" && obj.stroke !== "transparent" && isNear(normalizeHex(obj.stroke) || "", origText)) {
                    obj.stroke = uiText;
                }
            } else {
                if (typeof obj.fill === "string" && obj.fill !== "none" && obj.fill !== "transparent") {
                    obj.fill = swapShapeOrBg(obj.fill);
                }
                if (typeof obj.stroke === "string" && obj.stroke !== "none" && obj.stroke !== "transparent") {
                    obj.stroke = swapShapeOrBg(obj.stroke);
                }
            }

            if (typeof obj.backgroundColor === "string") {
                obj.backgroundColor = swapShapeOrBg(obj.backgroundColor);
            }

            if (Array.isArray(obj.objects)) {
                (obj.objects as Record<string, unknown>[]).forEach(walk);
            }
        };

        if (uiBackground && typeof parsed.background === "string") {
            const bgHex = normalizeHex(parsed.background);
            if (bgHex && isNear(bgHex, origBg)) {
                parsed.background = uiBackground;
            }
        }

        parsed.objects.forEach((obj: Record<string, unknown>) => walk(obj));
        return JSON.stringify(parsed);
    } catch {
        return source;
    }
}

function applyUiDataOverridesToSource(
    source: string,
    snapshot: ApiCard["profile_snapshot"] | undefined,
    currentProfile: {
        business_name?: string;
        tagline?: string;
        logo_url?: string;
        contact_info?: {
            phone?: string;
            email?: string;
            website?: string;
            address?: string;
        };
    }
): string {
    try {
        const parsed = JSON.parse(source);
        if (!parsed || !Array.isArray(parsed.objects)) return source;

        const snapshotContact = snapshot?.contact_info || {};
        const currentContact = currentProfile.contact_info || {};

        const businessName = currentProfile.business_name || snapshot?.business_name || "";
        const tagline = currentProfile.tagline || snapshot?.tagline || "";
        const logoUrl = currentProfile.logo_url || snapshot?.logo_url || "";
        const phone = currentContact.phone || snapshotContact.phone || "";
        const email = currentContact.email || snapshotContact.email || "";
        const website = currentContact.website || snapshotContact.website || "";
        const address = currentContact.address || snapshotContact.address || "";

        if (!businessName && !tagline && !logoUrl && !phone && !email && !website && !address) {
            return source;
        }

        const TEXT_TYPES = ["text", "textbox", "i-text"];
        const placeholderMap: Record<string, string | undefined> = {
            "JAMES DOE": businessName,
            "James Doe": businessName,
            "Your Name": businessName,
            "Business Name": businessName,
            "SOLUTION MANAGER": tagline,
            "Solution Manager": tagline,
            "Your Title": tagline,
            "Your Tagline Here": tagline,
            "+1 (555) 000-0000": phone,
            "+1 234 567 8900": phone,
            "hello@example.com": email,
            "www.example.com": website,
            "123 Innovation Dr, Tech City": address,
        };

        const walk = (obj: Record<string, unknown>) => {
            const type = typeof obj.type === "string" ? obj.type.toLowerCase() : "";
            const objId =
                typeof obj.id === "string"
                    ? obj.id.toLowerCase()
                    : typeof obj.name === "string"
                      ? obj.name.toLowerCase()
                      : "";

            if (TEXT_TYPES.includes(type) && typeof obj.text === "string") {
                const oldText = obj.text;
                const oldLower = oldText.toLowerCase().trim();

                if (objId.startsWith("#name") && businessName) obj.text = businessName;
                else if (objId.startsWith("#title") && tagline) obj.text = tagline;
                else if (objId.startsWith("#phone") && phone) obj.text = phone;
                else if (objId.startsWith("#email") && email) obj.text = email;
                else if (objId.startsWith("#website") && website) obj.text = website;
                else if (objId.startsWith("#address") && address) obj.text = address;
                else {
                    const placeholderReplacement = placeholderMap[oldText];
                    if (placeholderReplacement) {
                        obj.text = placeholderReplacement;
                    } else if (snapshot?.business_name && oldLower === snapshot.business_name.toLowerCase() && businessName) {
                        obj.text = businessName;
                    } else if (snapshot?.tagline && oldLower === snapshot.tagline.toLowerCase() && tagline) {
                        obj.text = tagline;
                    } else if (snapshotContact.phone && oldText === snapshotContact.phone && phone) {
                        obj.text = phone;
                    } else if (snapshotContact.email && oldLower === snapshotContact.email.toLowerCase() && email) {
                        obj.text = email;
                    } else if (snapshotContact.website && oldLower === snapshotContact.website.toLowerCase() && website) {
                        obj.text = website;
                    } else if (snapshotContact.address && oldLower === snapshotContact.address.toLowerCase() && address) {
                        obj.text = address;
                    } else if (email && oldLower.includes("@") && oldLower.includes(".")) {
                        obj.text = email;
                    } else if (phone && /^[\d\s+\-().]{7,}$/.test(oldText.trim())) {
                        obj.text = phone;
                    } else if (website && (oldLower.startsWith("http") || oldLower.startsWith("www"))) {
                        obj.text = website;
                    }
                }
            }

            if (type === "image" && logoUrl) {
                obj.src = logoUrl;
                obj.crossOrigin = "anonymous";
            }

            if (Array.isArray(obj.objects)) {
                (obj.objects as Record<string, unknown>[]).forEach(walk);
            }
        };

        parsed.objects.forEach((obj: Record<string, unknown>) => walk(obj));
        return JSON.stringify(parsed);
    } catch {
        return source;
    }
}

function CardEditorContent() {
    const { profile } = useBrandStore();
    const profileContact = profile.contact_info;
    const searchParams = useSearchParams();
    const templateParam = searchParams.get("template");
    const cardId = searchParams.get("cardId");
    const mode = searchParams.get("mode");
    const uiText = searchParams.get("uiText");
    const uiShape = searchParams.get("uiShape");
    const uiBackground = searchParams.get("uiBackground");
    const isAdminEditor = mode === "admin";

    const [initialTemplate, setInitialTemplate] = useState<unknown>(undefined);
    const [resetKey, setResetKey] = useState(0);
    const [originalSvg, setOriginalSvg] = useState<string | null>(null);
    const [cardStatus, setCardStatus] = useState<"finalized" | "not-finalized">("not-finalized");

    const parsedTemplateFromQuery = useMemo(() => {
        if (!templateParam) return undefined;
        try {
            return JSON.parse(templateParam);
        } catch {
            return templateParam;
        }
    }, [templateParam]);

    useEffect(() => {
        setInitialTemplate(parsedTemplateFromQuery);
    }, [parsedTemplateFromQuery]);

    useEffect(() => {
        if (!cardId) return;

        const loadCard = async () => {
            const response = await fetch(`/api/admin/cards/${cardId}`, { cache: "no-store" });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok || !payload?.card) {
                return;
            }

            const card = payload.card as ApiCard;
            if (card.status === "finalized" || card.status === "not-finalized") {
                setCardStatus(card.status);
            }

            // Store the original SVG for reset functionality
            if (card.original_svg?.trim()) {
                setOriginalSvg(card.original_svg.trim());
            } else {
                // Cards created before original_svg tracking — fall back to template SVG path
                const tpl = TEMPLATES.find((item) => item.id === card.template_id);
                if (tpl?.fabricJson) {
                    setOriginalSvg(tpl.fabricJson);
                }
            }

            const savedMarkup = card.svg_markup?.trim() || "";
            if (savedMarkup) {
                const dataInjected = applyUiDataOverridesToSource(savedMarkup, card.profile_snapshot, {
                    business_name: profile.business_name,
                    tagline: profile.tagline,
                    logo_url: profile.logo_url,
                    contact_info: profileContact,
                });
                setInitialTemplate(
                    applyUiColorOverridesToSource(
                        dataInjected,
                        card.profile_snapshot?.colors,
                        { text: uiText, shape: uiShape, background: uiBackground }
                    )
                );
                return;
            }

            const template = TEMPLATES.find((item) => item.id === card.template_id);
            if (template?.fabricJson) {
                const dataInjected = applyUiDataOverridesToSource(template.fabricJson, card.profile_snapshot, {
                    business_name: profile.business_name,
                    tagline: profile.tagline,
                    logo_url: profile.logo_url,
                    contact_info: profileContact,
                });
                setInitialTemplate(
                    applyUiColorOverridesToSource(
                        dataInjected,
                        card.profile_snapshot?.colors,
                        { text: uiText, shape: uiShape, background: uiBackground }
                    )
                );
            }
        };

        loadCard();
    }, [
        cardId,
        uiBackground,
        uiShape,
        uiText,
        profile.business_name,
        profile.tagline,
        profile.logo_url,
        profileContact,
    ]);

    const handleSave = async (canvas: {
        viewportTransform?: number[];
        setViewportTransform: (transform: number[]) => void;
        forEachObject: (callback: (obj: { includeDefaultValues?: boolean }) => void) => void;
        toObject: (propertiesToInclude?: string[]) => object;
    } | null) => {
        if (!isAdminEditor) {
            throw new Error("Saving is only available in admin mode");
        }
        if (!canvas) {
            throw new Error("Canvas is not ready yet");
        }
        if (!cardId) {
            throw new Error("This card has no cardId in URL, so it cannot be saved to DB");
        }

        // Reset viewport to identity so saved state uses standard coordinates
        const prevViewportTransform = Array.isArray(canvas.viewportTransform)
            ? [...canvas.viewportTransform]
            : null;
        if (canvas.viewportTransform && Array.isArray(canvas.viewportTransform)) {
            canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        }

        // Strip default property values for a compact payload
        canvas.forEachObject((obj: { includeDefaultValues?: boolean }) => { obj.includeDefaultValues = false; });
        // Include 'id' and 'name' so semantic IDs (#name, #logo, etc.) survive serialization
        const svgMarkup = JSON.stringify(canvas.toObject(['id', 'name']));
        canvas.forEachObject((obj: { includeDefaultValues?: boolean }) => { obj.includeDefaultValues = true; });

        if (prevViewportTransform) {
            canvas.setViewportTransform(prevViewportTransform);
        }

        const response = await fetch(`/api/admin/cards/${cardId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                svgMarkup,
                // Capture the original canvas state on the very first save
                ...(originalSvg ? {} : { originalSvg: svgMarkup }),
            }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload?.error || "Failed to save card");
        }

        // Track that we now have an original saved
        if (!originalSvg) {
            setOriginalSvg(svgMarkup);
        }
    };

    const handleFinalize = async () => {
        if (!cardId) {
            throw new Error("This card has no cardId in URL, so it cannot be finalized");
        }

        const response = await fetch(`/api/admin/cards/${cardId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "finalized" }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload?.error || "Failed to finalize card");
        }

        setCardStatus("finalized");
    };

    const handleReset = () => {
        if (!originalSvg) return;
        // Bump key to force CardEditor re-render even if value is the same
        setResetKey((k) => k + 1);
        setInitialTemplate(originalSvg);
    };

    return (
        <div className="h-dvh w-full overflow-hidden bg-[#e5e7eb]">
            <CardEditorLayout
                key={resetKey}
                initialTemplate={initialTemplate}
                onSave={isAdminEditor ? handleSave : undefined}
                onReset={originalSvg ? handleReset : undefined}
                showSidebar={true}
                hideTemplateSuggestions={isAdminEditor}
                showFinalize={isAdminEditor}
                isFinalized={cardStatus === "finalized"}
                onFinalize={handleFinalize}
            />
        </div>
    );
}

export default function CardEditorPage() {
    return (
        <Suspense fallback={<div className="h-dvh w-full flex items-center justify-center bg-[#e5e7eb] text-gray-500">Loading editor...</div>}>
            <CardEditorContent />
        </Suspense>
    );
}
