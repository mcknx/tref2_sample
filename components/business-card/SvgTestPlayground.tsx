"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as fabric from "fabric";
import { hydrateSVG } from "@/utils/svgHydrator";
import { BrandProfile } from "@/types/brand";

const SVG_TEMPLATES = [
    { name: "Minimal Slate", path: "/templates/minimal_slate.svg" },
    { name: "Aurora Gradient", path: "/templates/aurora_gradient.svg" },

    { name: "Ocean Breeze", path: "/templates/ocean_breeze.svg" },
    { name: "Diagonal Split", path: "/templates/obsidian_luxe.svg" },
    { name: "Circle Cutout", path: "/templates/rose_gold.svg" },
    { name: "Corner Geo", path: "/templates/tokyo_drift.svg" },
    { name: "Tech Ring", path: "/templates/marble_stone.svg" },
    { name: "Bold Stripes", path: "/templates/sunset_blvd.svg" },
    { name: "Framed Edge", path: "/templates/arctic_frost.svg" },
    { name: "Wave Curve", path: "/templates/copper_wire.svg" },
    { name: "Block Header", path: "/templates/velvet_noir.svg" },
    { name: "Side Panel", path: "/templates/emerald_city.svg" },
    { name: "Ribbon Band", path: "/templates/prism_light.svg" },
];

interface FormFields {
    business_name: string;
    tagline: string;
    phone: string;
    email: string;
    website: string;
    address: string;
}

interface ColorFields {
    primaryText: string;
    background: string;
}

const DEFAULT_FIELDS: FormFields = {
    business_name: "Acme Corp",
    tagline: "Innovation Lead",
    phone: "+1 234 567 8900",
    email: "hello@acme.com",
    website: "www.acme.com",
    address: "123 Innovation Dr, Tech City",
};

const DEFAULT_COLORS: ColorFields = {
    primaryText: "#1e293b",
    background: "#3b82f6",
};

const COLOR_PRESETS: { name: string; colors: ColorFields }[] = [
    { name: "Ocean", colors: { primaryText: "#1e293b", background: "#0284c7" } },
    { name: "Sunset", colors: { primaryText: "#1c1917", background: "#f97316" } },
    { name: "Forest", colors: { primaryText: "#14532d", background: "#16a34a" } },
    { name: "Royal", colors: { primaryText: "#1e1b4b", background: "#7c3aed" } },
    { name: "Crimson", colors: { primaryText: "#1c1917", background: "#dc2626" } },
    { name: "Mono", colors: { primaryText: "#18181b", background: "#71717a" } },
];

function TemplateCanvas({ templatePath, templateName, profile }: {
    templatePath: string;
    templateName: string;
    profile: Partial<BrandProfile>;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<fabric.Canvas | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mountedRef = useRef(true);
    const [scale, setScale] = useState(0.5);

    // Initialize canvas once
    useEffect(() => {
        if (!canvasRef.current) return;
        mountedRef.current = true;

        const canvas = new fabric.Canvas(canvasRef.current, {
            width: 1050,
            height: 600,
            backgroundColor: "#ffffff",
            selection: false,
            renderOnAddRemove: true,
        });

        // Make all objects non-interactive for preview
        canvas.hoverCursor = "default";
        canvas.defaultCursor = "default";
        fabricRef.current = canvas;

        return () => {
            mountedRef.current = false;
            canvas.dispose();
            fabricRef.current = null;
        };
    }, []);

    // Responsive scaling
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const w = entry.contentRect.width;
                setScale(w / 1050);
            }
        });

        observer.observe(containerRef.current);
        // Initial scale
        setScale(containerRef.current.clientWidth / 1050);

        return () => observer.disconnect();
    }, []);

    // Re-hydrate whenever profile changes
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        let cancelled = false;

        const hydrateTemplate = async () => {
            try {
                const { objects, options } = await fabric.loadSVGFromURL(templatePath);

                if (cancelled || !mountedRef.current) return;

                if (objects && objects.length > 0) {
                    const hydratedObjects = await hydrateSVG(
                        objects as fabric.Object[],
                        options,
                        profile
                    );

                    if (cancelled || !mountedRef.current) return;

                    canvas.clear();
                    hydratedObjects.forEach((obj) => {
                        obj.set({ selectable: false, evented: false });
                        canvas.add(obj);
                    });
                    canvas.requestRenderAll();
                }
            } catch (err) {
                console.error(`Error hydrating ${templateName}:`, err);
            }
        };

        hydrateTemplate();

        return () => {
            cancelled = true;
        };
    }, [templatePath, templateName, profile]);

    return (
        <div className="group rounded-xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200/60">
            {/* Template name header */}
            <div className="px-4 py-2.5 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-between">
                <span className="text-sm font-semibold text-white tracking-wide">{templateName}</span>
                <span className="text-[10px] text-slate-400 font-mono">{templatePath}</span>
            </div>
            {/* Canvas container — scale down to fit */}
            <div
                ref={containerRef}
                className="relative w-full overflow-hidden"
                style={{ height: 600 * scale }}
            >
                <div
                    style={{
                        width: 1050,
                        height: 600,
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                    }}
                >
                    <canvas ref={canvasRef} />
                </div>
            </div>
        </div>
    );
}

export default function SvgTestPlayground() {
    const [fields, setFields] = useState<FormFields>(DEFAULT_FIELDS);
    const [colors, setColors] = useState<ColorFields>(DEFAULT_COLORS);
    const [logoUrl, setLogoUrl] = useState<string>("");
    const [debouncedProfile, setDebouncedProfile] = useState<Partial<BrandProfile>>({});
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const buildProfile = useCallback((): Partial<BrandProfile> => ({
        business_name: fields.business_name,
        tagline: fields.tagline,
        logo_url: logoUrl || undefined,
        contact_info: {
            phone: fields.phone,
            email: fields.email,
            website: fields.website,
            address: fields.address,
        },
        colors: {
            primaryText: colors.primaryText,
            background: colors.background,
        },
    }), [fields, colors, logoUrl]);

    // Build profile from fields + colors (debounced)
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(() => {
            setDebouncedProfile(buildProfile());
        }, 300);

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [fields, colors, logoUrl, buildProfile]);

    // Trigger initial hydration
    useEffect(() => {
        setDebouncedProfile(buildProfile());
    }, []);

    const updateField = useCallback((key: keyof FormFields, value: string) => {
        setFields((prev) => ({ ...prev, [key]: value }));
    }, []);

    const updateColor = useCallback((key: keyof ColorFields, value: string) => {
        setColors((prev) => ({ ...prev, [key]: value }));
    }, []);

    const handleLogoFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setLogoUrl(url);
        }
    }, []);

    const clearLogo = useCallback(() => {
        setLogoUrl("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    const colorFields: { key: keyof ColorFields; label: string }[] = [
        { key: "primaryText", label: "Text Color" },
        { key: "background", label: "Background" },
    ];

    const inputFields: { key: keyof FormFields; label: string; icon: string }[] = [
        { key: "business_name", label: "Business Name", icon: "🏢" },
        { key: "tagline", label: "Title / Tagline", icon: "💼" },
        { key: "phone", label: "Phone", icon: "📞" },
        { key: "email", label: "Email", icon: "✉️" },
        { key: "website", label: "Website", icon: "🌐" },
        { key: "address", label: "Address", icon: "📍" },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold shadow-lg">
                        S
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">SVG Test Playground</h1>
                        <p className="text-xs text-slate-400">Dynamic text hydration tester — edit fields to see all templates update live</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full font-mono">
                            {SVG_TEMPLATES.length} templates
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-6 p-6">
                {/* Left Panel — Input Fields */}
                <div className="lg:w-80 flex-shrink-0">
                    <div className="sticky top-24 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-5 shadow-2xl">
                        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4">
                            Profile Fields
                        </h2>
                        <div className="space-y-3">
                            {inputFields.map(({ key, label, icon }) => (
                                <div key={key}>
                                    <label className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                                        <span>{icon}</span>
                                        <span>{label}</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={fields[key]}
                                        onChange={(e) => updateField(key, e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm
                                                   placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50
                                                   focus:border-blue-500/50 transition-all duration-200"
                                        placeholder={`Enter ${label.toLowerCase()}`}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Logo Upload */}
                        <div className="mt-6 pt-5 border-t border-white/10">
                            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3">
                                🖼️ Logo
                            </h3>

                            <div className="flex items-start gap-3">
                                {/* Thumbnail */}
                                <div
                                    className="w-16 h-16 rounded-xl bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center
                                               overflow-hidden cursor-pointer hover:border-blue-500/50 transition-all duration-200 flex-shrink-0"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <span className="text-xl text-slate-500">+</span>
                                    )}
                                </div>
                                <div className="flex-grow space-y-2">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoFile}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-xs text-blue-300
                                                   hover:bg-blue-500/30 transition-all duration-200 font-medium"
                                    >
                                        Choose File
                                    </button>
                                    {logoUrl && (
                                        <button
                                            onClick={clearLogo}
                                            className="w-full py-1 rounded-md bg-red-500/10 border border-red-500/20 text-[10px] text-red-400
                                                       hover:bg-red-500/20 transition-all duration-200"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* URL Input */}
                            <div className="mt-2.5">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Or paste URL</div>
                                <input
                                    type="text"
                                    value={logoUrl.startsWith('blob:') ? '' : logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    placeholder="https://example.com/logo.png"
                                    className="w-full px-2 py-1.5 rounded-md bg-white/10 border border-white/10 text-white text-xs
                                               font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50
                                               focus:border-blue-500/50 transition-all duration-200"
                                />
                            </div>
                        </div>

                        {/* Color Palette */}
                        <div className="mt-6 pt-5 border-t border-white/10">
                            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3">
                                🎨 Brand Colors
                            </h3>

                            {/* Preset Vibes */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {COLOR_PRESETS.map((preset) => (
                                    <button
                                        key={preset.name}
                                        onClick={() => setColors(preset.colors)}
                                        className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10
                                                   hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                                        title={preset.name}
                                    >
                                        <div className="flex -space-x-1">
                                            <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: preset.colors.primaryText }} />
                                            <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: preset.colors.background }} />
                                        </div>
                                        <span className="text-[10px] text-slate-400 group-hover:text-white transition-colors">{preset.name}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Color Pickers */}
                            <div className="space-y-2.5">
                                {colorFields.map(({ key, label }) => (
                                    <div key={key} className="flex items-center gap-3">
                                        <div className="relative">
                                            <input
                                                type="color"
                                                value={colors[key]}
                                                onChange={(e) => updateColor(key, e.target.value)}
                                                className="w-9 h-9 rounded-lg cursor-pointer border-2 border-white/10
                                                           hover:border-white/30 transition-all duration-200
                                                           [&::-webkit-color-swatch-wrapper]:p-0.5
                                                           [&::-webkit-color-swatch]:rounded-md
                                                           [&::-webkit-color-swatch]:border-none"
                                            />
                                        </div>
                                        <div className="flex-grow">
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">{label}</div>
                                            <input
                                                type="text"
                                                value={colors[key]}
                                                onChange={(e) => updateColor(key, e.target.value)}
                                                className="w-full px-2 py-1 rounded-md bg-white/10 border border-white/10 text-white text-xs
                                                           font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50
                                                           focus:border-blue-500/50 transition-all duration-200"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Reset */}
                        <button
                            onClick={() => { setFields(DEFAULT_FIELDS); setColors(DEFAULT_COLORS); clearLogo(); }}
                            className="mt-5 w-full py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400
                                       hover:bg-white/10 hover:text-white transition-all duration-200"
                        >
                            Reset to Defaults
                        </button>
                    </div>
                </div>

                {/* Right Panel — Template Grid */}
                <div className="flex-grow">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {SVG_TEMPLATES.map((tpl) => (
                            <TemplateCanvas
                                key={tpl.path}
                                templatePath={tpl.path}
                                templateName={tpl.name}
                                profile={debouncedProfile}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
