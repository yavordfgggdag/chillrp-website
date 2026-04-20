/**
 * Локален setup: .env от пример, напомняне за Supabase SQL.
 * Използване: npm run setup:local
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

if (!fs.existsSync(examplePath)) {
  console.error("Липсва .env.example в root на проекта.");
  process.exit(1);
}

if (!fs.existsSync(envPath)) {
  fs.copyFileSync(examplePath, envPath);
  console.log("Създаден .env от .env.example");
  console.log("→ Попълни поне VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY (Supabase → Settings → API)\n");
} else {
  console.log(".env вече съществува — не е презаписан.\n");
}

console.log("Следващи стъпки:");
console.log("  1. npm install   (ако още не си)");
console.log("  2. В .env: поне VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY;");
console.log("     за бутон Revolut/PayPal добави VITE_REVOLUT_IBAN и/или VITE_PAYPAL_ME_HANDLE (виж .env.example)");
console.log("  3. В Supabase SQL Editor при нужда:");
console.log("     - supabase/RUN_THIS_product_payment_templates.sql");
console.log("     - supabase/RUN_THIS_revolut_pending_payments.sql");
console.log("  4. npm run dev   → http://localhost:8080 (или следващ свободен порт)");
console.log("  5. /admin в dev режим — достъп без Discord staff (import.meta.env.DEV)\n");
