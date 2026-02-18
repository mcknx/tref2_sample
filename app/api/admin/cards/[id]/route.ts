import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FinalizationStatus } from "@/types/card";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ card: data });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    status?: FinalizationStatus;
    svgMarkup?: string;
    originalSvg?: string;
  };

  const hasStatus = body.status !== undefined;
  const hasSvgMarkup = body.svgMarkup !== undefined;
  const hasOriginalSvg = body.originalSvg !== undefined;

  if (!hasStatus && !hasSvgMarkup && !hasOriginalSvg) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  if (hasStatus && body.status !== "finalized" && body.status !== "not-finalized") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const payload: {
    status?: FinalizationStatus;
    finalized_at?: string | null;
    svg_markup?: string;
    original_svg?: string;
  } = {};

  if (hasStatus) {
    payload.status = body.status;
    payload.finalized_at = body.status === "finalized" ? new Date().toISOString() : null;
  }

  if (hasSvgMarkup && typeof body.svgMarkup === "string") {
    payload.svg_markup = body.svgMarkup;
  }

  if (hasOriginalSvg && typeof body.originalSvg === "string") {
    payload.original_svg = body.originalSvg;
  }

  const { data, error } = await supabase
    .from("cards")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ card: data });
}
