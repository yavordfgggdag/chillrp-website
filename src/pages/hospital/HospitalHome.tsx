import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { HospitalRole } from "./HospitalLayout";

const KEYS = ["hospital_home", "ambulance_home"] as const;

export default function HospitalHome() {
  const { role } = useOutletContext<{ role: HospitalRole }>();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [...KEYS])
      .then(({ data }) => {
        const row = (data || []).find((r: { key: string }) => r.key === "hospital_home")
          || (data || []).find((r: { key: string }) => r.key === "ambulance_home");
        setContent(row?.value ?? "Добре дошли в секция Болница. Съдържанието може да се редактира от Админ панел или от Шеф Медик.");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 text-neon-cyan animate-spin" />
      </div>
    );
  }

  return (
    <section>
      <h1 className="text-2xl font-heading font-bold tracking-widest uppercase text-neon-cyan mb-6">Начало</h1>
      <div className="glass rounded-xl border border-white/10 p-6 font-body text-foreground/90 whitespace-pre-line">
        {content}
      </div>
    </section>
  );
}
