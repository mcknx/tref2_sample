"use client";

import { useMemo, useState, useEffect } from "react";
import { Search, Check, Loader2 } from "lucide-react";
import { TEMPLATES } from "@/components/business-card/data/templateList";
import TemplatePreview from "@/components/business-card/TemplatePreview";
import { cn } from "@/lib/utils";

interface FinalizedCard {
  id: string;
  template_id: string;
  svg_markup: string | null;
  profile_snapshot: Record<string, unknown>;
}

interface TemplatesPanelProps {
  activeTemplate: any;
  onSelectTemplate: (template: any) => void;
}

export default function TemplatesPanel({ activeTemplate, onSelectTemplate }: TemplatesPanelProps) {
  const [cards, setCards] = useState<FinalizedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const fetchFinalizedCards = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/cards", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setCards([]);
          return;
        }
        setCards((payload?.cards || []) as FinalizedCard[]);
      } catch {
        setCards([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFinalizedCards();
  }, []);

  const enrichedCards = useMemo(() => {
    return cards.map((card) => {
      const template = TEMPLATES.find((t) => t.id === card.template_id);
      const source = card.svg_markup?.trim() || template?.fabricJson || "";
      return {
        id: card.id,
        name: template?.name || "Finalized Template",
        category: template?.category || "Finalized",
        source,
        profile: card.profile_snapshot,
      };
    });
  }, [cards]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(enrichedCards.map((card) => card.category)));
    return ["All", ...unique];
  }, [enrichedCards]);

  const filtered = enrichedCards.filter((card) => {
    const matchCat = activeCategory === "All" || card.category === activeCategory;
    const matchSearch = card.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white">Finalized Templates</h3>
        </div>
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap border transition-all",
                activeCategory === cat
                  ? "bg-cyan-500 text-white border-cyan-500"
                  : "text-gray-400 border-white/10 hover:border-white/20 hover:text-white"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 pt-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading finalized templates...
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 text-sm mt-8">No finalized templates found.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((card) => {
            const isActive = activeTemplate === card.source;
            return (
              <div
                key={card.id}
                onClick={() => onSelectTemplate(card.source)}
                className={cn(
                  "group cursor-pointer relative rounded-xl overflow-hidden transition-all",
                  isActive
                    ? "ring-2 ring-cyan-400 border-2 border-cyan-400"
                    : "border border-white/10 hover:border-white/30"
                )}
              >
                {isActive && (
                  <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}
                <div className="w-full pointer-events-none bg-gray-100">
                  <TemplatePreview
                    templatePath={card.source}
                    profile={card.profile as Record<string, unknown>}
                  />
                </div>
                <div className="p-2 bg-white/5">
                  <p className="text-xs text-white font-medium">{card.name}</p>
                  <p className="text-[10px] text-gray-500 uppercase">{card.category}</p>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
}
