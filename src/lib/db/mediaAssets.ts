import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

/** По подразбиране по-висок лимит, за да минават кратки MP4/WebM клипове в галерията; намали през .env при нужда. */
const maxSizeMb =
  Number(import.meta.env.VITE_UPLOAD_MAX_FILE_SIZE_MB ?? "150") || 150;

const DEFAULT_ALLOWED_MIMES =
  "image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,video/quicktime,video/ogg,video/x-matroska,audio/mpeg,audio/mp3,audio/mp4,audio/wav,audio/ogg";

const allowedMimeTypes = String(
  import.meta.env.VITE_UPLOAD_ALLOWED_MIME_TYPES ?? DEFAULT_ALLOWED_MIMES
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  ogv: "video/ogg",
  mkv: "video/x-matroska",
};

/** MIME за Storage Content-Type и валидация (попълва от разширение, ако браузърът не зададе type). */
export function resolveUploadMimeType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") {
    return file.type;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  return (ext && EXT_TO_MIME[ext]) || file.type || "application/octet-stream";
}

export function getMaxUploadSizeMb(): number {
  return maxSizeMb;
}

export function assertImageFileForUpload(file: File): void {
  const t = resolveUploadMimeType(file);
  if (!t.startsWith("image/")) {
    throw new Error("Нужен е файл снимка (PNG, JPG, WebP, GIF…).");
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`Файлът е твърде голям. Максимум ${maxSizeMb} MB.`);
  }
}

/** Снимки, видео клипове и MP3 (и др. по whitelist в env). */
export function assertFileAllowedForUpload(file: File): void {
  const t = resolveUploadMimeType(file);
  if (!allowedMimeTypes.includes(t)) {
    throw new Error(
      `Непозволен тип файл (${t}). Разрешени са снимки, видео (MP4/WebM/MOV) и аудио (MP3 и др.). Провери VITE_UPLOAD_ALLOWED_MIME_TYPES.`
    );
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`Файлът е твърде голям. Максимум ${maxSizeMb} MB.`);
  }
}

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

  const mime = resolveUploadMimeType(file);
  if (!allowedMimeTypes.includes(mime)) {
    throw new Error("Невалиден тип файл за качване.");
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`Файлът е твърде голям. Максимум ${maxSizeMb}MB.`);
  }

  const ext = file.name.split(".").pop() || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("uploads")
    .upload(path, file, {
      upsert: false,
      contentType: mime,
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
      mime_type: mime,
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
