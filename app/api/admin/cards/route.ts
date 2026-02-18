import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TEMPLATES } from "@/components/business-card/data/templateList";
import { CardRecord, GenerateCardsRequest } from "@/types/card";

const FALLBACK_PROFILE_SNAPSHOT = {
  business_name: "Business Name",
  tagline: "Your Tagline Here",
  logo_url: "",
  colors: {
    primaryText: "#1e293b",
    text: "#334155",
    background: "#ffffff",
  },
  typography: {
    heading: "Inter",
    body: "Inter",
  },
  contact_info: {},
  social_links: {},
  industry: "",
};

interface BrandRow {
  business_name?: string | null;
  tagline?: string | null;
  logo_url?: string | null;
  colors?: Record<string, unknown> | null;
  typography?: Record<string, unknown> | null;
  contact_info?: Record<string, unknown> | null;
  social_links?: Record<string, unknown> | null;
  industry?: string | null;
}

function clampCount(input: number) {
  if (!Number.isFinite(input)) return 1;
  return Math.max(1, Math.min(20, Math.floor(input)));
}

function pickRandomTemplateIds(pool: { id: string }[], count: number): string[] {
  return Array.from({ length: count }, () => {
    const choice = pool[Math.floor(Math.random() * pool.length)];
    return choice.id;
  });
}

function toProfileSnapshot(brand: BrandRow | null) {
  if (!brand) {
    return FALLBACK_PROFILE_SNAPSHOT;
  }

  return {
    business_name: brand.business_name || FALLBACK_PROFILE_SNAPSHOT.business_name,
    tagline: brand.tagline || FALLBACK_PROFILE_SNAPSHOT.tagline,
    logo_url: brand.logo_url || "",
    colors: brand.colors || FALLBACK_PROFILE_SNAPSHOT.colors,
    typography: brand.typography || FALLBACK_PROFILE_SNAPSHOT.typography,
    contact_info: brand.contact_info || {},
    social_links: brand.social_links || {},
    industry: brand.industry || "",
  };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "all";
  const category = searchParams.get("category") || "All";
  const search = (searchParams.get("search") || "").toLowerCase();

  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let cards = (data || []) as CardRecord[];

  if (cards.length === 0) {
    const { data: brand } = await supabase
      .from("brands")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const profileSnapshot = toProfileSnapshot(brand as BrandRow | null);
    const seedRows = TEMPLATES.map((template) => ({
      user_id: user.id,
      template_id: template.id,
      status: "not-finalized",
      finalized_at: null,
      profile_snapshot: profileSnapshot,
      generation_meta: {
        source: "seed-catalog",
        generation_type: template.category,
        generated_at: new Date().toISOString(),
      },
    }));

    const { data: seededCards, error: seedError } = await supabase
      .from("cards")
      .insert(seedRows)
      .select("*")
      .order("created_at", { ascending: false });

    if (seedError) {
      return NextResponse.json({ error: seedError.message }, { status: 500 });
    }

    cards = (seededCards || []) as CardRecord[];
  }

  const filtered = cards.filter((card) => {
    const template = TEMPLATES.find((templateItem) => templateItem.id === card.template_id);
    if (!template) return false;

    const filterMatch = filter === "all" || card.status === filter;
    const categoryMatch = category === "All" || template.category === category;
    const searchMatch = !search || template.name.toLowerCase().includes(search);

    return filterMatch && categoryMatch && searchMatch;
  });

  return NextResponse.json({ cards: filtered });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<GenerateCardsRequest>;
  const generationType = body.generationType || "All";
  const count = clampCount(Number(body.count ?? 1));

  const generationPool = TEMPLATES.filter(
    (template) => generationType === "All" || template.category === generationType
  );

  if (generationPool.length === 0) {
    return NextResponse.json({ error: "No templates for selected type" }, { status: 400 });
  }

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (brandError || !brand) {
    return NextResponse.json(
      { error: "Brand profile not found. Complete onboarding first." },
      { status: 400 }
    );
  }

  const templateIds = pickRandomTemplateIds(generationPool, count);
  const profileSnapshot = toProfileSnapshot(brand as BrandRow);

  const rows = templateIds.map((templateId) => ({
    user_id: user.id,
    template_id: templateId,
    status: "not-finalized",
    finalized_at: null,
    profile_snapshot: profileSnapshot,
    generation_meta: {
      generation_type: generationType,
      source: "template-pool",
      count_requested: count,
      generated_at: new Date().toISOString(),
    },
  }));

  const { data, error } = await supabase
    .from("cards")
    .insert(rows)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cards: (data || []) as CardRecord[] });
}
