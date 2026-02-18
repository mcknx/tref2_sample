"use client";

import { useEffect, useState } from "react";
import { useBrandStore } from "@/store/brand-store";
import { injectData } from "@/utils/cardInjector";
import CardEditor from "./CardEditor";
import templates from "./data/templates.json";
import { cn } from "@/lib/utils";
// Note: In real app, we might load this from API

interface SuggestionGridProps {
    onSelect: (templateData: any) => void;
    className?: string;
    activeTemplate?: any;
}

const exampleTemplates = [
    { id: "t1", name: "Modern Blue", fabricJson: "/templates/card_01.svg" },
    { id: "t-nexus", name: "Nexus Innovations", fabricJson: { front: "/templates/nexus_front.svg", back: "/templates/nexus_back.svg" } },
    { id: "t3", name: "Dream Studio", fabricJson: "/templates/dream_studio.svg" },
    { id: "t-midnight", name: "Midnight Elegance", fabricJson: "/templates/midnight_elegance.svg" },
    { id: "t-aurora", name: "Aurora Gradient", fabricJson: "/templates/aurora_gradient.svg" },
    { id: "t-minimal", name: "Minimal Slate", fabricJson: "/templates/minimal_slate.svg" },
    { id: "t-neon", name: "Neon Edge", fabricJson: "/templates/neon_edge.svg" },
    { id: "t-ocean", name: "Ocean Breeze", fabricJson: "/templates/ocean_breeze.svg" },
];

export default function SuggestionGrid({ onSelect, activeTemplate, className }: SuggestionGridProps & { activeTemplate?: any }) {
    const { profile } = useBrandStore();
    const [suggestions, setSuggestions] = useState<any[]>([]);

    useEffect(() => {
        setSuggestions(exampleTemplates);
    }, []);

    // Sort: Active first, then rest
    const sortedSuggestions = [...suggestions].sort((a, b) => {
        const isActiveA = activeTemplate === a.fabricJson || (JSON.stringify(activeTemplate) === JSON.stringify(a.fabricJson));
        const isActiveB = activeTemplate === b.fabricJson || (JSON.stringify(activeTemplate) === JSON.stringify(b.fabricJson));

        if (isActiveA && !isActiveB) return -1;
        if (!isActiveA && isActiveB) return 1;
        return 0;
    });

    return (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4", className)}>
            {sortedSuggestions.map((s, idx) => {
                const isActive = activeTemplate === s.fabricJson || (JSON.stringify(activeTemplate) === JSON.stringify(s.fabricJson));

                // Determine preview source (Front side)
                const previewSource = typeof s.fabricJson === 'string' ? s.fabricJson : s.fabricJson.front;

                return (
                    <div
                        key={s.id + idx}
                        className={cn(
                            "group cursor-pointer relative rounded-xl overflow-hidden shadow-sm transition-all hover:scale-[1.02]",
                            isActive ? "border-2 border-cyan-400 ring-2 ring-cyan-400/20" : "border border-white/10 hover:border-white/20"
                        )}
                        onClick={() => onSelect(s.fabricJson)}
                    >
                        {/* Preview Container */}
                        <div className="w-full aspect-[1.75] bg-gray-100 pointer-events-none relative">
                            <CardEditor
                                initialData={previewSource}
                                readOnly={true}
                            />
                            {/* Overlay to prevent interaction and add subtle tint if inactive? */}
                            <div className="absolute inset-0 bg-transparent" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

