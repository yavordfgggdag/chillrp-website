import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const contactLeadSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  message: z.string(),
  status: z.enum(["new", "in_progress", "closed"]),
  source_page: z.string().nullable(),
  meta: z.record(z.any()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ContactLead = z.infer<typeof contactLeadSchema>;

export const createLeadInputSchema = z.object({
  name: z.string().max(120).optional(),
  email: z.string().email().max(190).optional(),
  message: z.string().min(10, "Съобщението е твърде кратко").max(4000),
  source_page: z.string().optional(),
  meta: z.record(z.any()).optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadInputSchema>;

function asError(message: string, cause?: unknown): Error {
  if (cause instanceof Error) return new Error(message, { cause });
  return new Error(message);
}

export async function createLead(input: CreateLeadInput): Promise<void> {
  const payload = createLeadInputSchema.parse(input);

  const { error } = await supabase.from("contact_leads").insert({
    name: payload.name ?? null,
    email: payload.email ?? null,
    message: payload.message,
    source_page: payload.source_page ?? null,
    meta: payload.meta ?? {},
  });

  if (error) {
    throw asError("Failed to submit contact form", error);
  }
}

export async function listLeads(opts?: {
  status?: "new" | "in_progress" | "closed";
  limit?: number;
  offset?: number;
}): Promise<ContactLead[]> {
  const limit = opts?.limit ?? 100;
  const offset = opts?.offset ?? 0;

  let query = supabase
    .from("contact_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts?.status) {
    query = query.eq("status", opts.status);
  }

  const { data, error } = await query;

  if (error) {
    throw asError("Failed to load contact leads", error);
  }

  if (!data) return [];
  return z.array(contactLeadSchema).parse(data);
}

