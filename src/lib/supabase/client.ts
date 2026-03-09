import { supabase } from "@/integrations/supabase/client";

// Central export for the browser Supabase client (anon key).
// All client-side data-access code should import from here instead of
// reaching into "@/integrations/supabase/client" directly.

export { supabase };

