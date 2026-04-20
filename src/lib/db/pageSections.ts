import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const pageSectionSchema = z.object({
  id: z.string().uuid(),
  page: z.string(),
  section_key: z.string(),
  title: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  sort_order: z.number(),
  is_enabled: z.boolean(),
  settings: z.record(z.any()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
});

export type PageSection = z.infer<typeof pageSectionSchema>;

export const upsertSectionInputSchema = z.object({
  id: z.string().uuid().optional(),
  page: z.string(),
  section_key: z.string(),
  title: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  is_enabled: z.boolean().optional(),
  sort_order: z.number().optional(),
  settings: z.record(z.any()).optional(),
});

export type UpsertSectionInput = z.infer<typeof upsertSectionInputSchema>;

function asError(message: string, cause?: unknown): Error {
  if (cause instanceof Error) return new Error(message, { cause });
  return new Error(message);
}

export async function listEnabledByPage(page: string): Promise<PageSection[]> {
  const { data, error } = await supabase
    .from("page_sections")
    .select("*")
    .eq("page", page)
    .eq("is_enabled", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw asError("Failed to load page sections", error);
  }

  if (!data) return [];
  return z.array(pageSectionSchema).parse(data);
}

export async function listAllByPage(page: string): Promise<PageSection[]> {
  const { data, error } = await supabase
    .from("page_sections")
    .select("*")
    .eq("page", page)
    .order("sort_order", { ascending: true });

  if (error) {
    throw asError("Failed to load all page sections", error);
  }

  if (!data) return [];
  return z.array(pageSectionSchema).parse(data);
}

export async function upsertSection(
  input: UpsertSectionInput
): Promise<PageSection> {
  const payload = upsertSectionInputSchema.parse(input);

  const { data, error } = await supabase
    .from("page_sections")
    .upsert(payload, { onConflict: "page,section_key" })
    .select("*")
    .single();

  if (error || !data) {
    throw asError("Failed to save section", error);
  }

  return pageSectionSchema.parse(data);
}

export async function reorderSections(
  page: string,
  orderedIds: string[]
): Promise<void> {
  // We keep it simple and update sort_order in a loop.
  // Caller can optimistically update UI; this ensures persistence.
  const updates = orderedIds.map((id, index) => ({
    id,
    page,
    sort_order: (index + 1) * 10,
  }));

  const { error } = await supabase.from("page_sections").upsert(updates);

  if (error) {
    throw asError("Failed to reorder sections", error);
  }
}

