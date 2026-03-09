import { z } from "zod";
import { supabase } from "@/lib/supabase/client";

const maxSizeMb =
  Number(import.meta.env.VITE_UPLOAD_MAX_FILE_SIZE_MB ?? "10") || 10;

const allowedMimeTypes = String(
  import.meta.env.VITE_UPLOAD_ALLOWED_MIME_TYPES ??
    "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const mediaAssetSchema = z.object({
  id: z.string().uuid(),
  bucket_name: z.string(),
  path: z.string(),
  url: z.string(),
  mime_type: z.string().nullable(),
  size_bytes: z.number().nullable(),
  is_public: z.boolean(),
  title: z.string().nullable(),
  alt: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  page: z.string().nullable(),
  section_key: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type MediaAsset = z.infer<typeof mediaAssetSchema>;

export const uploadMediaInputSchema = z.object({
  file: z.instanceof(File),
  folder: z.string().default("misc"),
  isPublic: z.boolean().default(false),
  page: z.string().optional(),
  section_key: z.string().optional(),
  title: z.string().optional(),
  alt: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type UploadMediaInput = z.infer<typeof uploadMediaInputSchema>;

function asError(message: string, cause?: unknown): Error {
  if (cause instanceof Error) return new Error(message, { cause });
  return new Error(message);
}

export async function uploadMedia(
  input: UploadMediaInput
): Promise<MediaAsset> {
  const parsed = uploadMediaInputSchema.parse(input);
  const { file, folder } = parsed;

  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(
      `Файлът е твърде голям. Максимум ${maxSizeMb}MB.`
    );
  }

  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error("Невалиден тип файл за качване.");
  }

  const ext = file.name.split(".").pop() || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("uploads")
    .upload(path, file, {
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw asError("Грешка при качване на файл", uploadError);
  }

  const { data: urlData } = supabase.storage
    .from("uploads")
    .getPublicUrl(path);

  const url = urlData.publicUrl;

  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      bucket_name: "uploads",
      path,
      url,
      mime_type: file.type,
      size_bytes: file.size,
      is_public: parsed.isPublic,
      page: parsed.page ?? null,
      section_key: parsed.section_key ?? null,
      title: parsed.title ?? file.name,
      alt: parsed.alt ?? null,
      tags: parsed.tags ?? [],
    })
    .select("*")
    .single();

  if (error || !data) {
    throw asError("Записът на медията се провали", error);
  }

  return mediaAssetSchema.parse(data);
}

export async function listMediaAssets(opts?: {
  page?: string;
  section_key?: string;
  is_public?: boolean;
  limit?: number;
  offset?: number;
}): Promise<MediaAsset[]> {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  let query = supabase
    .from("media_assets")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts?.page) {
    query = query.eq("page", opts.page);
  }
  if (opts?.section_key) {
    query = query.eq("section_key", opts.section_key);
  }
  if (typeof opts?.is_public === "boolean") {
    query = query.eq("is_public", opts.is_public);
  }

  const { data, error } = await query;

  if (error) {
    throw asError("Failed to load media assets", error);
  }

  if (!data) return [];
  return z.array(mediaAssetSchema).parse(data);
}

