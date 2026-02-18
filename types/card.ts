export type FinalizationStatus = "not-finalized" | "finalized";

export interface CardRecord {
  id: string;
  user_id: string;
  template_id: string;
  status: FinalizationStatus;
  finalized_at: string | null;
  svg_markup: string | null;
  original_svg: string | null;
  profile_snapshot: Record<string, unknown>;
  generation_meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GenerateCardsRequest {
  generationType: string;
  count: number;
}
