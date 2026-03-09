import { z } from "zod";
import { supabase } from "@/lib/supabase/client";

export const navLocationSchema = z.enum([
  "header_main",
  "footer_main",
  "social",
]);

export type NavLocation = z.infer<typeof navLocationSchema>;

export const navLinkSchema = z.object({
  id: z.string().uuid(),
  location: navLocationSchema,
  label: z.string(),
  url: z.string(),
  parent_id: z.string().uuid().nullable(),
  sort_order: z.number(),
  is_external: z.boolean(),
  is_enabled: z.boolean(),
  icon: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type NavLink = z.infer<typeof navLinkSchema>;

export const upsertNavLinkInputSchema = z.object({
  id: z.string().uuid().optional(),
  location: navLocationSchema,
  label: z.string().min(1, "Етикетът е задължителен"),
  url: z.string().min(1, "URL е задължителен"),
  parent_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().optional(),
  is_external: z.boolean().optional(),
  is_enabled: z.boolean().optional(),
  icon: z.string().nullable().optional(),
});

export type UpsertNavLinkInput = z.infer<typeof upsertNavLinkInputSchema>;

function asError(message: string, cause?: unknown): Error {
  if (cause instanceof Error) return new Error(message, { cause });
  return new Error(message);
}

export async function listNav(location: NavLocation): Promise<NavLink[]> {
  const { data, error } = await supabase
    .from("navigation_links")
    .select("*")
    .eq("location", location)
    .eq("is_enabled", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw asError("Failed to load navigation links", error);
  }

  if (!data) return [];
  return z.array(navLinkSchema).parse(data);
}

export async function listAllNav(
  location?: NavLocation
): Promise<NavLink[]> {
  let query = supabase.from("navigation_links").select("*");

  if (location) {
    query = query.eq("location", location);
  }

  const { data, error } = await query.order("sort_order", { ascending: true });

  if (error) {
    throw asError("Failed to load all navigation links", error);
  }

  if (!data) return [];
  return z.array(navLinkSchema).parse(data);
}

export async function upsertNavLink(
  input: UpsertNavLinkInput
): Promise<NavLink> {
  const payload = upsertNavLinkInputSchema.parse(input);

  const { data, error } = await supabase
    .from("navigation_links")
    .upsert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw asError("Failed to save navigation link", error);
  }

  return navLinkSchema.parse(data);
}

export async function reorderNavLinks(
  location: NavLocation,
  orderedIds: string[]
): Promise<void> {
  const updates = orderedIds.map((id, index) => ({
    id,
    location,
    sort_order: (index + 1) * 10,
  }));

  const { error } = await supabase.from("navigation_links").upsert(updates);

  if (error) {
    throw asError("Failed to reorder navigation links", error);
  }
}

