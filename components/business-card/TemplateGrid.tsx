"use client";

import { useState, useCallback } from "react";
import { useBrandStore } from "@/store/brand-store";
import { cn } from "@/lib/utils";
import { Search, Upload, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ColorExtractor from "@/components/brand-kit/ColorExtractor";
import TemplatePreview from "./TemplatePreview";
import { TEMPLATES, TEMPLATE_CATEGORIES } from "./data/templateList";

interface TemplateGridProps {
    className?: string;
}

const CATEGORIES = TEMPLATE_CATEGORIES;
const exampleTemplates = TEMPLATES;

export default function TemplateGrid({ className }: TemplateGridProps) {
    const router = useRouter();
    const { profile, updateProfile } = useBrandStore();
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");
    const [extractedColors, setExtractedColors] = useState<string[]>([]);

    const handleColorsExtracted = useCallback((palette: string[]) => {
        const next = Array.from(new Set(palette)).slice(0, 8);
        setExtractedColors((prev) => {
            if (prev.length === next.length && prev.every((c, i) => c === next[i])) {
                return prev;
            }
            return next;
        });

        // Auto-set brand colors from logo palette on extraction
        // Background is always white by default after logo upload.
        if (next.length >= 1) {
            updateProfile({
                colors: {
                    primaryText: next[0],
                    text: next[1] || next[0],
                    background: '#ffffff',
                },
            });
        }
    }, [updateProfile]);

    const colors = profile.colors || { primaryText: "#1e293b", text: "#334155", background: "#ffffff" };

    const colorChoices = Array.from(
        new Set([
            ...extractedColors,
            colors.primaryText,
            colors.text || colors.primaryText,
            colors.background,
            "#1e293b",
            "#334155",
            "#ffffff",
            "#f8fafc",
            "#111827",
        ].filter(Boolean))
    );

    const backgroundChoices = Array.from(
        new Set([
            "#ffffff",
            ...colorChoices,
        ])
    );

    const updateBrandColors = (partial: { primaryText?: string; text?: string; background?: string }) => {
        updateProfile({
            colors: {
                primaryText: partial.primaryText ?? colors.primaryText,
                text: partial.text ?? colors.text ?? colors.primaryText,
                background: partial.background ?? colors.background,
            },
        });
    };

    const handleLogoReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error("Failed to read logo file"));
                reader.readAsDataURL(file);
            });

            updateProfile({ logo_url: dataUrl });
        } catch (error) {
            console.error("Failed to load logo", error);
        } finally {
            e.target.value = "";
        }
    };

    const handleLogoDelete = () => {
        updateProfile({ logo_url: "" });
        setExtractedColors([]);
    };

    const filtered = exampleTemplates.filter((t) => {
        const matchesCategory = activeCategory === "All" || t.category === activeCategory;
        const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleSelect = (template: typeof exampleTemplates[0]) => {
        router.push(`/card-editor?template=${encodeURIComponent(template.fabricJson)}`);
    };

    return (
        <div className={cn("flex flex-col gap-6", className)}>
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search templates..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl bg-[#1a2438] border-2 border-white/10 pl-14 pr-6 py-4 text-white placeholder-gray-500 text-lg font-medium focus:border-primary focus:outline-none transition-colors"
                />
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                            "px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all",
                            activeCategory === cat
                                ? "bg-primary text-white shadow-lg shadow-primary/30"
                                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
                        )}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-stretch auto-rows-fr">
                <div className="h-full rounded-2xl overflow-hidden border-2 border-white/10 bg-[#0f1724]">
                    <div className="h-full p-3 flex flex-col gap-2">
                        <div className="rounded-md border border-white/10 bg-white/5 p-1.5 flex items-center gap-1.5">
                            <div className="w-9 h-9 rounded-md bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                {profile.logo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={profile.logo_url} alt="Logo" className="w-7 h-7 object-contain" />
                                ) : (
                                    <span className="text-[10px] text-gray-500">No logo</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 flex justify-between items-center gap-1.5">
                                <label className="h-7 px-2 rounded-md bg-primary text-white text-[10px] font-bold cursor-pointer inline-flex items-center gap-1 hover:bg-primary/90 transition-colors">
                                    <Upload className="w-2.5 h-2.5" /> Replace
                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoReplace} />
                                </label>
                                <button
                                    onClick={handleLogoDelete}
                                    className="h-7 px-2 rounded-md text-gray-300 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                >
                                    <Trash2 className="w-2.5 h-2.5" />
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
                                <p className="mb-1 text-[10px] text-gray-400 uppercase tracking-wider">Primary</p>
                                <div className="flex items-center gap-1.5">
                                    {colorChoices.slice(0, 5).map((color) => (
                                        <button
                                            key={`text-${color}`}
                                            onClick={() => updateBrandColors({ primaryText: color })}
                                            className={cn(
                                                "h-5 min-h-5 max-h-5 w-5 min-w-5 rounded-md border transition-all shrink-0",
                                                colors.primaryText === color
                                                    ? "border-cyan-400 ring-2 ring-cyan-400/45 ring-offset-1 ring-offset-[#0f1724]"
                                                    : "border-white/20"
                                            )}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={colors.primaryText}
                                        onChange={(e) => updateBrandColors({ primaryText: e.target.value })}
                                        className="ml-auto h-5 min-h-5 max-h-5 w-8 min-w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-white/15 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-md"
                                    />
                                </div>
                            </div>

                            <div>
                                <p className="mb-1 text-[10px] text-gray-400 uppercase tracking-wider">Text Color</p>
                                <div className="flex items-center gap-1.5">
                                    {colorChoices.slice(0, 5).map((color) => (
                                        <button
                                            key={`text-secondary-${color}`}
                                            onClick={() => updateBrandColors({ text: color })}
                                            className={cn(
                                                "h-5 min-h-5 max-h-5 w-5 min-w-5 rounded-md border transition-all shrink-0",
                                                (colors.text || colors.primaryText) === color
                                                    ? "border-cyan-400 ring-2 ring-cyan-400/45 ring-offset-1 ring-offset-[#0f1724]"
                                                    : "border-white/20"
                                            )}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={colors.text || colors.primaryText}
                                        onChange={(e) => updateBrandColors({ text: e.target.value })}
                                        className="ml-auto h-5 min-h-5 max-h-5 w-8 min-w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-white/15 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-md"
                                    />
                                </div>
                            </div>

                            <div>
                                <p className="mb-1 text-[10px] text-gray-400 uppercase tracking-wider">Background</p>
                                <div className="flex items-center gap-1.5">
                                    {backgroundChoices.slice(0, 5).map((color) => (
                                        <button
                                            key={`bg-${color}`}
                                            onClick={() => updateBrandColors({ background: color })}
                                            className={cn(
                                                "h-5 min-h-5 max-h-5 w-5 min-w-5 rounded-md border transition-all shrink-0",
                                                colors.background === color
                                                    ? "border-cyan-400 ring-2 ring-cyan-400/45 ring-offset-1 ring-offset-[#0f1724]"
                                                    : "border-white/20"
                                            )}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={colors.background}
                                        onChange={(e) => updateBrandColors({ background: e.target.value })}
                                        className="ml-auto h-5 min-h-5 max-h-5 w-8 min-w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-white/15 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-md"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {filtered.map((t) => {
                    return (
                        <div
                            key={t.id}
                            className="group h-full cursor-pointer relative rounded-2xl overflow-hidden border-2 border-white/10 bg-[#0f1724] flex flex-col transition-all duration-300 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/10 hover:scale-[1.03]"
                            onClick={() => handleSelect(t)}
                        >
                            {/* Card Preview */}
                            <div className="w-full aspect-[1.75] pointer-events-none relative overflow-hidden">
                                <TemplatePreview
                                    templatePath={t.fabricJson}
                                    profile={profile}
                                />
                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-300 flex items-center justify-center">
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-primary text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                                        Use Template
                                    </span>
                                </div>
                            </div>

                            {/* Card Info */}
                            <div className="p-3 mt-auto">
                                <h3 className="text-white font-bold text-sm leading-tight">{t.name}</h3>
                                <span className="text-xs text-gray-500 uppercase tracking-wider">{t.category}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {filtered.length === 0 && (
                <div className="text-center py-16">
                    <p className="text-gray-500 text-lg">No templates match your search.</p>
                </div>
            )}
        </div>
    );
}
