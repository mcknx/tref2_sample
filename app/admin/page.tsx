"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  LogOut,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TemplatePreview from "@/components/business-card/TemplatePreview";
import { TEMPLATES, TEMPLATE_CATEGORIES } from "@/components/business-card/data/templateList";
import { cn } from "@/lib/utils";
import { FinalizationStatus } from "@/types/card";

type AdminFilter = "not-finalized" | "finalized" | "all";

interface CardEntry {
  id: string;
  templateId: string;
  status: FinalizationStatus;
  finalizedAt: string | null;
  svgMarkup?: string | null;
  profileSnapshot?: Record<string, unknown>;
}

interface ApiCard {
  id: string;
  template_id: string;
  status: FinalizationStatus;
  finalized_at: string | null;
  svg_markup?: string | null;
  profile_snapshot?: Record<string, unknown>;
}

// Default brand profile for previews
const ADMIN_PREVIEW_PROFILE = {
  colors: {
    primaryText: "#1e293b",
    text: "#334155",
    background: "#ffffff",
  },
};

function toCardEntry(row: ApiCard): CardEntry {
  return {
    id: row.id,
    templateId: row.template_id,
    status: row.status,
    finalizedAt: row.finalized_at,
    svgMarkup: row.svg_markup,
    profileSnapshot: row.profile_snapshot,
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [cards, setCards] = useState<CardEntry[]>([]);
  const [filter, setFilter] = useState<AdminFilter>("not-finalized");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [generationType, setGenerationType] = useState("All");
  const [generationCount, setGenerationCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    const loadCards = async () => {
      setIsLoading(true);
      setRequestError("");

      const response = await fetch("/api/admin/cards", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setRequestError(payload?.error || "Failed to load cards");
        setCards([]);
        setIsLoading(false);
        return;
      }

      const nextCards = Array.isArray(payload.cards)
        ? payload.cards.map((item: ApiCard) => toCardEntry(item))
        : [];
      setCards(nextCards);
      setIsLoading(false);
    };

    loadCards();
  }, []);

  const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);

  const counts = {
    all: cards.length,
    notFinalized: cards.filter((c) => c.status === "not-finalized").length,
    finalized: cards.filter((c) => c.status === "finalized").length,
  };

  const filteredCards = cards.filter((card) => {
    const template = getTemplate(card.templateId);
    if (!template) return false;

    const matchesFilter = filter === "all" || card.status === filter;
    const matchesCategory =
      activeCategory === "All" || template.category === activeCategory;
    const matchesSearch = template.name
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchesFilter && matchesCategory && matchesSearch;
  });

  const toggleFinalization = (cardId: string) => {
    const target = cards.find((item) => item.id === cardId);
    if (!target) return;

    const nextStatus: FinalizationStatus =
      target.status === "finalized" ? "not-finalized" : "finalized";

    setCards((prev) =>
      prev.map((item) =>
        item.id === cardId
          ? {
              ...item,
              status: nextStatus,
              finalizedAt: nextStatus === "finalized" ? new Date().toISOString() : null,
            }
          : item
      )
    );

    fetch(`/api/admin/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to update card");
        }

        if (payload.card) {
          const updated = toCardEntry(payload.card as ApiCard);
          setCards((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        }
      })
      .catch((error: Error) => {
        setRequestError(error.message);
        setCards((prev) =>
          prev.map((item) =>
            item.id === cardId
              ? {
                  ...item,
                  status: target.status,
                  finalizedAt: target.finalizedAt,
                }
              : item
          )
        );
      });
  };

  const handleGenerateMoreCards = async () => {
    setIsGenerating(true);
    setRequestError("");

    const response = await fetch("/api/admin/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationType,
        count: generationCount,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setRequestError(payload?.error || "Failed to generate cards");
      setIsGenerating(false);
      return;
    }

    const generatedCards = Array.isArray(payload.cards)
      ? payload.cards.map((item: ApiCard) => toCardEntry(item))
      : [];

    setCards((prev) => [...generatedCards, ...prev]);
    setFilter("not-finalized");
    setActiveCategory("All");
    setIsGenerating(false);
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0f172a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft size={16} className="mr-1.5" />
                Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold">Admin Panel</h1>
                <p className="text-sm text-gray-500">
                  Manage card designs &mdash; finalize or review
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-white/20 text-gray-300 hover:text-white"
            >
              <LogOut size={14} className="mr-1.5" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {requestError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {requestError}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {([
            { key: "all" as AdminFilter, label: "All Cards", value: counts.all },
            { key: "not-finalized" as AdminFilter, label: "Not Finalized", value: counts.notFinalized },
            { key: "finalized" as AdminFilter, label: "Finalized", value: counts.finalized },
          ]).map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={cn(
                "p-4 rounded-xl border transition-all text-left",
                filter === item.key
                  ? "border-cyan-500/50 bg-cyan-500/10 ring-1 ring-cyan-500/20"
                  : "border-white/10 bg-white/2 hover:bg-white/4"
              )}
            >
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="generation-type" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Generate Type
            </label>
            <select
              id="generation-type"
              value={generationType}
              onChange={(e) => setGenerationType(e.target.value)}
              className="h-9 rounded-lg bg-white/5 border border-white/10 px-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
            >
              {TEMPLATE_CATEGORIES.map((category) => (
                <option key={category} value={category} className="bg-[#0f172a] text-white">
                  {category}
                </option>
              ))}
            </select>

            <label htmlFor="generation-count" className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-2 sm:ml-3">
              Count
            </label>
            <select
              id="generation-count"
              value={generationCount}
              onChange={(e) => setGenerationCount(Number(e.target.value))}
              className="h-9 rounded-lg bg-white/5 border border-white/10 px-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
            >
              {[1, 5, 10, 20].map((count) => (
                <option key={count} value={count} className="bg-[#0f172a] text-white">
                  {count}
                </option>
              ))}
            </select>
          </div>

          <Button
            size="sm"
            onClick={handleGenerateMoreCards}
            disabled={isGenerating}
            className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <Sparkles size={14} className="mr-1.5" />
            {isGenerating ? "Generating..." : "Generate More Cards"}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-white/5 border border-white/10 pl-11 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
                activeCategory === cat
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {isLoading && (
            <div className="col-span-full rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
              Loading cards...
            </div>
          )}

          {filteredCards.map((card) => {
            const template = getTemplate(card.templateId);
            if (!template) return null;

            const isFinalized = card.status === "finalized";
            const previewProfile = (card.profileSnapshot as typeof ADMIN_PREVIEW_PROFILE | undefined) || ADMIN_PREVIEW_PROFILE;

            return (
              <div
                key={card.id}
                className={cn(
                  "group relative rounded-2xl overflow-hidden border-2 bg-[#0f1724] flex flex-col transition-all duration-300",
                  isFinalized
                    ? "border-green-500/40"
                    : "border-white/10 hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/5"
                )}
              >
                {/* Status Badge */}
                <div className="absolute top-2 left-2 z-10">
                  {isFinalized ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/90 text-white shadow-lg">
                      <CheckCircle2 size={10} />
                      Finalized
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-white shadow-lg">
                      <XCircle size={10} />
                      Not Finalized
                    </span>
                  )}
                </div>

                {/* Card Preview */}
                <div className="w-full aspect-[1.75] pointer-events-none relative overflow-hidden">
                  <TemplatePreview
                    templatePath={card.svgMarkup || template.fabricJson}
                    profile={previewProfile}
                  />
                </div>

                {/* Card Info + Actions */}
                <div className="p-3 flex flex-col gap-2">
                  <div>
                    <h3 className="text-white font-bold text-sm leading-tight">
                      {template.name}
                    </h3>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                      {template.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      className={cn(
                        "h-7 text-[11px] flex-1",
                        isFinalized
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      )}
                      onClick={() => toggleFinalization(card.id)}
                    >
                      {isFinalized ? (
                        <>
                          <XCircle size={12} className="mr-1" />
                          Unfinalize
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={12} className="mr-1" />
                          Finalize
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] text-gray-400 hover:text-white"
                      onClick={() =>
                        router.push(
                          `/card-editor?mode=admin&cardId=${card.id}&template=${encodeURIComponent(template.fabricJson)}`
                        )
                      }
                    >
                      <Eye size={12} className="mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {!isLoading && filteredCards.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No cards match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
