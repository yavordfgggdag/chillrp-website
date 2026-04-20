import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const banner = `/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  НЕ ПУСКАЙ ТОЗИ ФАЙЛ В SQL EDITOR — ще даде грешка при "//" (42601).
 *  Това е TypeScript за Edge Function (Deno), не PostgreSQL.
 *
 *  Къде да го ползваш:
 *  • Supabase Dashboard → Edge Functions → sync-staff-from-discord → Code → paste → Deploy
 *  • или терминал: npx supabase functions deploy sync-staff-from-discord
 *
 *  SQL скриптове за базата: папка supabase/, файлове *.sql (напр. RUN_THIS_*.sql).
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Държи се в синхрон с: supabase/functions/sync-staff-from-discord/index.ts
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

`;
const idxPath = path.join(root, "supabase/functions/sync-staff-from-discord/index.ts");
const outPath = path.join(root, "SYNC_FUNCTION_PASTE_IN_SUPABASE.ts");
const idx = fs.readFileSync(idxPath, "utf8");
const body = idx.split(/\r?\n/).slice(1).join("\n");
fs.writeFileSync(outPath, banner + body, "utf8");
console.log("Wrote", outPath);
