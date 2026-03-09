import { useState, useEffect } from "react";
import { Shield, Crown, Star, Headphones, Briefcase } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

const iconMap: Record<string, React.ReactNode> = {
  crown: <Crown size={16} />,
  star: <Star size={16} />,
  shield: <Shield size={16} />,
  headphones: <Headphones size={16} />,
  briefcase: <Briefcase size={16} />,
};

interface StaffMemberDB {
  id: string;
  name: string;
  role: string;
  icon: string;
  color: string;
  bg: string;
  avatar_url: string | null;
  avatar_scale: string | null;
  sort_order: number;
  emoji?: string | null;
}

const STAFF_EXCLUDE_NAMES = ["ivogenga", "dark music"];

const STAFF_ROLE_ORDER: Record<string, number> = {
  "Основател": 0, "Owner": 1, "Lead Dev": 2, "Panel Engineer": 3, "Developer": 4,
  "Management": 5, "Staff Leader": 6, "Content Manager": 7, "Administrator": 8,
  "Moderator": 9, "Ticket Support": 10,
};

export default function StaffSection() {
  const [staffMembers, setStaffMembers] = useState<StaffMemberDB[]>([]);

  useEffect(() => {
    supabase
      .from("staff_members")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setStaffMembers(data as StaffMemberDB[]);
      });
  }, []);

  const displayed = staffMembers
    .filter((m) => {
      const nameLower = (m.name || "").trim().toLowerCase();
      return !STAFF_EXCLUDE_NAMES.some((ex) => nameLower === ex || nameLower.includes(ex));
    })
    .sort((a, b) => {
      const orderA = STAFF_ROLE_ORDER[a.role] ?? a.sort_order ?? 999;
      const orderB = STAFF_ROLE_ORDER[b.role] ?? b.sort_order ?? 999;
      return orderA - orderB;
    });

  return (
    <section id="staff" className="py-20 px-4 relative border-t border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,hsl(271_76%_53%/0.05)_0%,transparent_60%)]" />
      <div className="container mx-auto max-w-4xl relative">
        <div className="sep-purple mb-12" />
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-neon-purple/30 bg-[hsl(271_76%_53%/0.1)] text-neon-purple text-xs font-heading font-bold tracking-widest uppercase mb-5">
            <Shield size={12} /> Екип
          </div>
          <h2 className="text-3xl md:text-4xl font-heading font-black tracking-widest uppercase text-foreground mb-3">
            Нашият <span className="gradient-text-purple">Staff</span>
          </h2>
          <p className="text-muted-foreground font-body max-w-lg mx-auto">
            Хората, които правят ChillRP възможен.
          </p>
        </div>

        {/* Staff grid – само реални членове от Discord (синхронизация проверява ролите и взима снимки) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
          {displayed.length > 0 ? (
            displayed.map((member) => (
              <div
                key={member.id}
                className={`glass border ${member.bg} rounded-xl px-4 py-3.5 flex items-center gap-3 hover:scale-[1.02] transition-transform`}
              >
                <Avatar className="h-10 w-10 shrink-0 ring-2 ring-white/10 overflow-hidden">
                  {member.avatar_url && (
                    <AvatarImage src={member.avatar_url} alt={member.name} className={`object-cover ${member.avatar_scale || 'scale-[2.2]'}`} />
                  )}
                  <AvatarFallback className={`${member.color} text-xs font-heading font-bold`}>
                    {member.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className={`font-heading font-bold tracking-wider text-sm ${member.color} truncate`}>
                    {member.name}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{member.role}</div>
                </div>
                <div className={`${member.color} shrink-0 text-lg leading-none`}>
                  {member.emoji ? member.emoji : (iconMap[member.icon] || <Shield size={16} />)}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full glass border border-neon-purple/20 rounded-xl px-6 py-8 text-center">
              <p className="text-muted-foreground font-body text-sm">
                Стафът се зарежда от Discord: ботът проверява за ролите (Ticket Support, Moderator, Administrator и др.) и добавя членовете със снимките им.
              </p>
              <p className="text-muted-foreground/80 font-body text-xs mt-2">
                Администратор трябва да натисне <strong>«Синхронизирай от Discord»</strong> в Админ панел → таб Стаф.
              </p>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
