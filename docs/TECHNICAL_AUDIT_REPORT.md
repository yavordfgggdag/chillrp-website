# Full Technical Audit Report — TLR Web Project

**Audit mode:** Explain first, then act. No code was modified during this audit.  
**Scope:** Repository structure, frontend, backend (Supabase Edge Functions), database layer, auth, E2E flows, dead/duplicate code, risks.  
**Evidence:** Code inspection, build run, grep/trace of imports and table/function usage.

---

## A. Executive Summary

### Overall health
- **Build:** Project builds successfully (`npm run build` completes; one dynamic-import warning, one chunk-size warning).
- **Runtime:** Not executed; all conclusions are from static analysis and dependency tracing.
- **Database:** Single Supabase project (`zbvqakalrxaxkwbpmjhn`) is configured; client uses anon key and correct URL. Several tables used in code are **not** present in generated TypeScript types — schema/types drift.
- **Auth:** Discord OAuth + Supabase Auth; role checks via Edge Functions (check-site-role, check-*-role). On localhost/DEV, site role is forced to `citizen` (admin and job sections will deny access in dev unless bypass is removed).
- **Critical blockers:** None that prevent build or startup. Operational blockers depend on: (1) Supabase project and migrations being applied, (2) Edge Function secrets (DISCORD_BOT_TOKEN, etc.) set in Dashboard, (3) Storage bucket `uploads` and RLS/policies created.

### Main conclusions
1. **Frontend:** Routes are coherent; all declared routes have components. Two page components exist but are **never mounted** (Ambulance.tsx, Police.tsx) — dead routes.
2. **Backend:** No traditional Node server; “backend” is Supabase (Auth, DB, Storage, Edge Functions). Edge Functions are invoked from the frontend; several are never invoked (check-module-role, check-discord-member, backup-site-state) — candidate dead/orphan code.
3. **Database:** Types define 15 tables; code also uses `police_handbook`, `police_handbook_backups`, `web_logs`, and (via lib/db) `contact_leads`, `navigation_links`, `page_sections`, `media_assets`. These are **not** in `src/integrations/supabase/types.ts` — type safety and IntelliSense are incomplete; runtime depends on migrations (and optional RUN_THIS_* scripts) being applied.
4. **Unused/duplicate:** check-module-role replaced by per-module functions (check-hospital-role, etc.); ROLE_ACCESS_VERIFICATION.md still describes check-module-role. contact_leads, navigation_links, page_sections have no UI callers — infrastructure only or dead.

### General confidence level
- **High** for: build success, route-to-component mapping, which Edge Functions are invoked from the app, which tables are queried.
- **Medium** for: RLS policies, migration order, and whether all RUN_THIS_* scripts were run (e.g. web_logs, storage_uploads).
- **Cannot verify from code alone:** Actual DB connectivity, Auth redirects, Stripe/Discord webhooks, Edge Function secrets, and production behavior.

---

## B. Project Structure and Architecture

### Stack
- **Frontend:** React 18, Vite 5, TypeScript, React Router 6, Tailwind, Radix/shadcn-ui, TanStack Query, Zod, date-fns, lucide-react.
- **Backend:** Supabase (BaaS): PostgreSQL, Auth (Discord OAuth), Storage, Edge Functions (Deno).
- **Build:** Vite, SWC (plugin-react-swc). No separate API server in repo.
- **Package manager:** npm (bun.lock present — possible mixed use).
- **Env:** `import.meta.env.VITE_*` (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_UPLOAD_*, etc.). Edge Function secrets in Supabase Dashboard (not .env).

### Main folders
- **src/** — All app code. **Critical:** App.tsx, main.tsx, hooks/useAuth.tsx, integrations/supabase/client.ts, pages/*, components/*.
- **src/pages/** — Page components; some under hospital/, service/, obshtina/, police/. **Critical.** Ambulance.tsx and Police.tsx are **not** imported in App — unreachable.
- **src/components/** — Shared UI and layout. **Critical:** Navbar, LoginGate, CartDrawer, etc.
- **src/hooks/** — useAuth, useCart, usePoliceHandbook, useActivityLogger, etc. **Critical.**
- **src/lib/** — db/* (contactLeads, navLinks, pageSections, mediaAssets), config, rules, shopData, logActivity. **Supporting;** db modules for contact/nav/sections have **no** imports from pages or components — unused from UI.
- **src/integrations/supabase/** — client.ts (canonical Supabase client), types.ts (generated DB types). **Critical.** types.ts is missing several tables (see E).
- **supabase/functions/** — Edge Functions. **Critical** for role checks, payments, notifications, handbook backup.
- **supabase/migrations/** — PostgreSQL migrations. **Critical** for schema. Some tables (e.g. web_logs) exist only in RUN_THIS_*.sql scripts — possible gap if not run.
- **supabase/config.toml** — Project ID, function verify_jwt. **Supporting.**

### Suspicious / legacy
- **docs/ROLE_ACCESS_VERIFICATION.md** — Documents `check-module-role` and “Сайтът проверява ролите чрез Edge Function check-module-role”. Layouts and Profile now use check-hospital-role, check-service-role, check-police-role, check-obshtina-role. Doc is **outdated**.
- **src/pages/Ambulance.tsx** — Not in router; never imported. **Orphan.**
- **src/pages/Police.tsx** — Not in router (App uses PoliceLayout + PoliceHome, etc.). **Orphan.**
- **supabase/functions/check-module-role/** — No frontend invoke; replaced by per-module functions. **Orphan** unless called externally.

---

## C. Frontend Status

### What works (by code structure)
- **Routing:** All routes in App.tsx have corresponding components; no 404-only paths. Nested routes for /hospital, /service, /obshtina, /police are correctly nested under layout components.
- **Auth gate:** LoginGate wraps the app; unauthenticated users see Discord login. useAuth provides session, user, siteRole, hasPoliceRole, discordUsername; fetchSiteRole/fetchPoliceRole call Edge Functions when not on localhost.
- **Data loading:** Index, FAQ, Rules pages, Shop, Profile, AdminPanelFull load from Supabase (site_settings, faq_items, rule_sections, products, purchases, gang_applications, etc.). Job layouts call check-*-role and show content or “no access” message.
- **Forms:** Gang application submit, profile data, admin CRUD — all wired to Supabase or Edge Functions. Payment success flow writes to purchases and calls notify-discord-purchase.

### What appears broken or risky
- **Localhost / DEV:** useAuth forces `siteRole = "citizen"` and `hasPoliceRole = false` when `import.meta.env.DEV === true` or hostname is localhost. So **admin panel and job sections will deny access in dev** even if the user has Discord roles. Not “broken” but may confuse development.
- **PaymentSuccess:** Runs once per mount (ref guard). If product name in URL doesn’t match any row, purchase is still inserted with that name and possibly null price_eur — acceptable but no user feedback if product not found.
- **Missing error boundaries:** Only root ErrorBoundary in main.tsx. Heavy pages (e.g. AdminPanelFull) could benefit from local boundaries to avoid full-app crash.

### What is incomplete or unverifiable
- **Responsive / a11y:** Not audited in depth. Some forms and tables are complex; validation and loading states exist but full UX not verified.
- **Blank page risk:** If Supabase URL or anon key is wrong, many pages will fail at runtime. Client.ts forces URL to project `zbvqakalrxaxkwbpmjhn` if present in env — reduces but doesn’t eliminate misconfiguration risk.
- **Chunk size:** Build warns about large chunks (AdminPanelFull ~498 KB, index ~921 KB). May affect initial load; not a correctness issue.

---

## D. Backend Status

There is no in-repo Node/Express server. “Backend” is Supabase.

### Edge Functions (Supabase)
- **check-site-role** — Used by useAuth and AdminPanelFull. Returns `{ role }`. **Active.**
- **check-police-role** — Used by useAuth, PoliceLayout, Profile, and (if it were mounted) Police.tsx. **Active.**
- **check-hospital-role, check-service-role, check-obshtina-role** — Used by corresponding layout and Profile. **Active.**
- **check-module-role** — Not invoked from frontend. Replaced by the four above. **Orphan.**
- **check-discord-member** — Not invoked from frontend (only mentioned in docs/.env). **Orphan** or external/cron.
- **sync-staff-from-discord** — Invoked from AdminPanelFull. **Active.**
- **save-police-handbook, restore-police-handbook-backup, ensure-handbook-daily-backup** — Invoked from AdminPanelFull. **Active.**
- **create-payment** — Invoked from CartDrawer and ProductDetail. **Active.**
- **notify-discord-purchase** — Invoked from PaymentSuccess. **Active.**
- **notify-discord-gang** — Invoked from GangApplications. **Active.**
- **notify-discord-dm** — Invoked from AdminPanelFull on gang review. **Active.**
- **notify-admin-log** — Invoked from AdminPanelFull. **Active.**
- **log-activity** — Invoked from useActivityLogger / logActivity. **Active.**
- **chillbot** — ChatWidget calls it. **Active.**
- **backup-site-state** — Not invoked from frontend (only .env comment). **Orphan** or cron-only.

### Reliability / consistency
- Role-check functions use same pattern: Bearer token, no body (except legacy check-module-role which used body). CORS and verify_jwt = false are set in config.toml for role functions.
- If Edge Function secrets (DISCORD_BOT_TOKEN, GUILD_ID, etc.) are missing, role and sync functions will return errors; frontend will show “no access” or citizen — no crash but feature failure.
- No server-side validation layer in repo; validation is in client and (where implemented) in Edge Function bodies.

---

## E. Database Connection and Data-Layer Status

### Databases identified
- **Single Supabase project:** `zbvqakalrxaxkwbpmjhn`. One PostgreSQL database. Connection via `createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)` in `src/integrations/supabase/client.ts`.

### Connection configuration
- URL: from `VITE_SUPABASE_URL` or fallback `CORRECT_SUPABASE_URL` (same project). If env URL does not contain project ref, client forces correct project URL.
- Key: `VITE_SUPABASE_PUBLISHABLE_KEY` or string `"missing-publishable-key"`. If key is missing, requests will fail at runtime (auth and data).
- **Conclusion:** Configuration points to one project; actual connectivity can only be verified by running the app and/or checking Network tab.

### Schema / types consistency
- **In types.ts (public.Tables):** faq_items, gang_applications, products, profiles, purchases, rule_sections, site_settings, hospital_invoices, hospital_shifts, service_invoices, service_shifts, obshtina_invoices, obshtina_shifts, staff_members, user_roles.
- **Used in code but NOT in types.ts:**  
  - **police_handbook** — usePoliceHandbook, AdminPanelFull.  
  - **police_handbook_backups** — AdminPanelFull.  
  - **web_logs** — AdminPanelFull (fetchWebLogs).  
  - **contact_leads** — src/lib/db/contactLeads.ts.  
  - **navigation_links** — src/lib/db/navLinks.ts.  
  - **page_sections** — src/lib/db/pageSections.ts.  
  - **media_assets** — src/lib/db/mediaAssets.ts.  
- **Migrations:** police_handbook and police_handbook_backups are in migration 20260307180000_police_handbook.sql. contact_leads, navigation_links, page_sections, media_assets are in 20260303160000_supabase_foundation.sql. web_logs is in RUN_THIS_web_logs.sql (not in migrations list). So **web_logs** might not exist if the script was never run.
- **Impact:** Queries to these tables are not type-checked; typos or schema changes can cause runtime errors. RLS policies and column existence cannot be inferred from types.

### DB-dependent flows
- **Operational (if DB and RLS are correct):** Index (site_settings), FAQ (faq_items), Rules (rule_sections), Shop (products), Profile (purchases, gang_applications), Admin panel (all tables it uses), job sections (site_settings, invoices, shifts), Police handbook (police_handbook), PaymentSuccess (products, purchases).
- **Likely broken if table or script missing:** Admin “web logs” tab if web_logs table not created; media upload (mediaAssets) if media_assets or storage policies missing; contact form if contact_leads not created and createLead is ever used from UI (currently it is not).

---

## F. Authentication and Protected Flows

### Implementation status
- **Login:** Discord OAuth only (LoginGate, AuthModal). signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.origin } }). No email/password in production UI (useAuth has signUp/signIn but they are not used by LoginGate).
- **Session:** Supabase Auth; persistSession: true, autoRefreshToken: true, storage: localStorage. onAuthStateChange updates user/session in useAuth.
- **Profile sync:** On sign-in, fetchDiscordUsername and profiles.upsert by id; fetchSiteRole (and fetchPoliceRole) call Edge Functions unless on localhost/DEV.
- **Protected routes:** /admin is not wrapped in a route guard; AdminPanelFull itself calls check-site-role and shows “no access” if role is not staff/administrator. /hospital, /service, /obshtina, /police are wrapped in layouts that call check-*-role and show “no access” or content. So protection is **component-level**, not route-level — URL is always reachable, content is gated.

### Incomplete / insecure / likely to fail
- **Localhost bypass:** Staff/admin and police role checks are skipped on localhost; admin and job sections will always show “no access” in dev. Documented behavior but can surprise developers.
- **Token propagation:** Edge Functions receive Bearer token; they use supabase.auth.getUser(token). If token is expired and refresh fails, functions return error and frontend shows citizen or no access — acceptable.
- **RLS:** user_roles and admin-only tables rely on has_role(auth.uid(), 'admin'). check-site-role upserts user_roles when Discord role is administrator. If RLS is not applied or has_role is wrong, admins might be blocked or non-admins might see data — cannot verify without DB inspection.

---

## G. End-to-End Functional Status

| Flow | Entry | Backend / DB | Status |
|------|--------|---------------|--------|
| Landing → Login | / → LoginGate | Auth OAuth | **Complete** (if Discord app configured). |
| Login → Profile | After OAuth | profiles.upsert, check-site-role, check-*-role | **Complete** (roles on non-localhost). |
| Landing → Shop → Product → Payment | /shop, /shop/:id, create-payment | products, Stripe, create-payment | **Complete** (if Stripe env set). |
| Payment success → Purchase record | /payment-success | products, purchases.insert, notify-discord-purchase | **Complete**. |
| Gang application | /gangs | gang_applications.insert, notify-discord-gang | **Complete**. |
| Admin: gang review | /admin | check-site-role, gang_applications.update, notify-discord-dm | **Complete** (if staff/admin). |
| Admin: handbook edit/backup | /admin | police_handbook, save/restore/ensure-backup | **Complete** (if table exists). |
| Admin: staff sync | /admin | sync-staff-from-discord, staff_members | **Complete**. |
| Admin: web logs | /admin | web_logs select | **Partial** — depends on RUN_THIS_web_logs.sql. |
| Job sections (hospital/service/obshtina/police) | /hospital etc. | check-*-role, site_settings, invoices, shifts | **Complete** (if Edge secrets and tables exist). |
| Contact form | — | contact_leads.insert | **Unused** — no UI calls createLead. |
| Dynamic nav / page sections | — | navigation_links, page_sections | **Unused** — no UI calls listNav/listEnabledByPage. |

---

## H. Unused / Dead / Duplicate Code

### Safe to remove (after confirmation)
- **src/pages/Ambulance.tsx** — Not in router; no imports. Safe to delete if product decision is to drop the page. **Verify:** No links to /ambulance.
- **supabase/functions/check-module-role/** — No frontend caller; role checks use check-hospital-role, check-service-role, check-police-role, check-obshtina-role. Safe to remove function and config.toml entry after confirming no external/cron caller. **Verify:** Search repo and any external cron/docs.

### Needs review before removal
- **src/pages/Police.tsx** — Large component (1200+ lines), uses check-police-role and usePoliceHandbook. Not mounted; /police uses PoliceLayout + children. Possibly legacy or alternate police UI. **Recommendation:** Confirm with product owner; then remove or mount under a different route.
- **src/lib/db/contactLeads.ts** — createLead/listLeads; no UI imports. Might be for future contact form or admin. **Recommendation:** Either wire a contact form or remove.
- **src/lib/db/navLinks.ts** — listNav/upsertNavLinks; no UI imports. **Recommendation:** Same as above.
- **src/lib/db/pageSections.ts** — listEnabledByPage/upsert; no UI imports. **Recommendation:** Same as above.
- **docs/ROLE_ACCESS_VERIFICATION.md** — Describes check-module-role and guild role IDs. Update to describe check-hospital-role, check-service-role, check-police-role, check-obshtina-role and correct deployment steps, or remove/archive.

### Do not remove yet
- **check-discord-member, backup-site-state** — Might be used by cron or external systems. Confirm before deletion.
- **RUN_THIS_*.sql / RUN_ONCE_*.sql** — May be part of one-off or migration workflow. Keep until deployment process is documented and migrations are consolidated.

---

## I. Risks and Priorities

### Critical
- **Missing env in production:** If VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_URL is wrong or missing, auth and data fail. **Mitigation:** Enforce env at build/deploy; client already normalizes URL to project ref.
- **Edge Function secrets:** DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, etc. must be set in Dashboard. If missing, role checks and sync fail. **Cannot verify from code.**

### High
- **Schema/types drift:** Tables police_handbook, police_handbook_backups, web_logs, contact_leads, navigation_links, page_sections, media_assets not in types.ts. **Impact:** No type safety; runtime errors on typo or schema change. **Remediation:** Regenerate types from current DB (e.g. supabase gen types) and commit, or add manual type declarations.
- **web_logs table:** Only in RUN_THIS_web_logs.sql. If not run, Admin “web logs” tab fails. **Remediation:** Add migration for web_logs or document required one-off run.
- **Localhost role bypass:** Admin and job sections unusable in dev. **Remediation:** Optional env (e.g. VITE_DEV_BYPASS_ROLES=false) or document clearly.

### Medium
- **Orphan Edge Functions:** check-module-role, check-discord-member, backup-site-state. **Impact:** Confusion, possible cost if invoked by mistake. **Remediation:** Remove or document as cron/external.
- **Outdated docs:** ROLE_ACCESS_VERIFICATION.md references check-module-role. **Remediation:** Update or remove.
- **Large chunks:** AdminPanelFull and main bundle size. **Remediation:** Code-split or lazy-load heavy admin sections.

### Low
- **Dynamic import warning:** logActivity dynamically imports client; Vite warns. **Impact:** Cosmetic. **Remediation:** Use static import if acceptable.
- **Duplicate client imports:** Both @/integrations/supabase/client and @/lib/supabase/client exist; lib re-exports from integrations. **Impact:** Minor; ensure no circular dependency.

---

## J. Recommended Remediation Plan

**Order by priority and dependency.**

1. **Verify production env**  
   Ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set and correct for the deployed URL. Confirm Edge Function secrets in Supabase Dashboard.

2. **Align types with database**  
   Run Supabase type generation against the project (or add manual types) so that police_handbook, police_handbook_backups, web_logs, contact_leads, navigation_links, page_sections, media_assets are in types.ts. Fix any type errors in call sites.

3. **Decide on web_logs**  
   If admin web logs are required, add a migration that creates web_logs (or document RUN_THIS_web_logs.sql as mandatory). If not required, remove or hide the web logs UI.

4. **Remove or document orphan code**  
   - Remove or deprecate **check-module-role** (and update config.toml) after confirming no external caller.  
   - Either remove **Ambulance.tsx** or add a route and link.  
   - Decide on **Police.tsx**: remove, or mount under a dedicated route and document.  
   - Update **ROLE_ACCESS_VERIFICATION.md** to match current role-check functions.

5. **Optional: contact/nav/sections**  
   If contact form or dynamic nav/sections are not planned, remove or stub the unused db modules and document. If planned, wire UI and keep.

6. **Optional: dev experience**  
   Document localhost role bypass or add VITE_DEV_BYPASS_ROLES and use it in useAuth so staff can test admin/job sections locally.

7. **Optional: performance**  
   Code-split admin and/or reduce main bundle size (e.g. lazy routes, manual chunks).

---

## K. Concrete Code Changes (Only After Analysis and Plan)

These are minimal, step-by-step suggestions. Do not apply blindly; validate in your environment first.

### 1. Add missing table types (or regenerate)
- **Option A:** Run `supabase gen types typescript --project-id zbvqakalrxaxkwbpmjhn > src/integrations/supabase/types.ts` (or equivalent) and fix any breaking changes.  
- **Option B:** Manually extend `Database['public']['Tables']` in types.ts with interfaces for police_handbook, police_handbook_backups, web_logs, contact_leads, navigation_links, page_sections, media_assets based on migration/RUN_THIS files.

### 2. Remove dead page Ambulance.tsx (if product agrees)
- Delete `src/pages/Ambulance.tsx`.
- Search for any link to “Ambulance” or “/ambulance”; remove or redirect.

### 3. Stop using check-module-role (already done in UI)
- Frontend already uses check-hospital-role, check-service-role, check-police-role, check-obshtina-role. No frontend change needed.
- Optionally remove `supabase/functions/check-module-role/` and the `[functions.check-module-role]` block from supabase/config.toml after confirming no external caller.
- Update docs (e.g. ROLE_ACCESS_VERIFICATION.md and CURSOR_VERIFICATION_PROMPT_SOURCE.md) to reference the four per-module functions and deployment steps.

### 4. Update ROLE_ACCESS_VERIFICATION.md
- Replace “check-module-role” with “check-hospital-role, check-service-role, check-police-role, check-obshtina-role”.
- Update curl/fetch examples to use the correct function names and no body (only Authorization header).
- Update “Деплой на check-module-role” to “Деплой на check-*-role функции”.

### 5. Optional: Document or gate localhost role bypass
- In useAuth.tsx, add a short comment above the localhost/DEV bypass: “On localhost, site and police roles are forced to citizen so that role checks are skipped; admin and job sections will show no access unless VITE_DEV_BYPASS_ROLES is set.”
- Optionally: if `import.meta.env.VITE_DEV_BYPASS_ROLES === 'true'`, skip the bypass and call fetchSiteRole/fetchPoliceRole as in production (allows testing with real Discord roles in dev).

### 6. Do not remove without explicit decision
- Police.tsx (decide: remove or mount).
- contactLeads, navLinks, pageSections (decide: use in UI or remove).
- check-discord-member, backup-site-state (confirm no cron/external use).

---

**End of audit.** No code was modified. Apply changes only after review and testing in your environment.
