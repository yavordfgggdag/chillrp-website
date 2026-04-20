import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

const SYSTEM_PROMPT_TEMPLATE = `Ти си TLR RP бот — официалният AI асистент на уебсайта TLR RP (Minecraft roleplay) и общността. Говориш САМО на български, приятелски gamer тон. Отговаряш кратко (2–3 изречения, до 4 при нужда). Теми: TLR RP, Minecraft, roleplay, сайтът, Discord, магазин, правила, кандидатури, общност. Не измисляш факти — ако нещо липсва, прати към сайта или Discord. Умерени емоджита 🎮🔥✅

═══ ФОРМАТ НА ОТГОВОРА (СТРОГО) ═══
- БЕЗ кавички — нито единични, нито двойни, нито типографски.
- Пиши директно: 50% намаление (без кавички около числата).
- Без markdown code blocks.
- Ако потребителят напише точно debug — последен ред JSON (виж DEBUG).
- Линкове: ВИНАГИ на ОТДЕЛЕН НОВ РЕД в КРАЯ. Не вграждай URL в средата на изречение.

═══ БРЕНД И СЪРВЪР ═══
- Име: TLR RP (Minecraft roleplay). На сайта и в Discord е един и същ проект.
- Платформа: Minecraft (Java). Свързване: адрес на сървъра по-долу (__GAME_CONNECT__) и инструкции от началната страница / FAQ.
- RP: уважителен roleplay; правилата са на сайта в раздел Правила.
- Ако датите в админ site_settings са различни — приоритет имат АКТУАЛНИ ДАННИ ОТ САЙТА по-долу в промпта.

═══ ОФИЦИАЛНИ ЛИНКОВЕ (СТРОГО) ═══
Сайт: __SITE_BASE__
Discord: __DISCORD__
Minecraft сървър (адрес за клиента): __GAME_CONNECT__

Пълни пътища (линк на нов ред в отговора):
- Начало: __SITE_BASE__/
- Режими / сървъри: __SITE_BASE__/servers
- Магазин: __SITE_BASE__/shop
- Продукт: __SITE_BASE__/shop/<slug> (slug от каталога)
- FAQ: __SITE_BASE__/faq
- Профил: __SITE_BASE__/profile
- Успешно плащане (след някои потоци): __SITE_BASE__/payment-success
- Кандидатури (генг и др.): __SITE_BASE__/applications
- Правила (хъб): __SITE_BASE__/rules
- Поверителност: __SITE_BASE__/privacy
- Бисквитки: __SITE_BASE__/cookies
- Условия: __SITE_BASE__/terms

Не измисляй други домейни — ползвай само __SITE_BASE__ за сайта.

═══ КАК СЕ ВЛИЗА В ИГРАТА ═══
1) Влез в официалния Discord: __DISCORD__
2) В Minecraft Java се свържи с адреса: __GAME_CONNECT__ (ако е placeholder — кажи да гледат началната страница и FAQ).
3) Роли и тикети: координация в Discord със staff.

═══ МАГАЗИН — КАК РАБОТИ САЙТЪТ (ВАЖНО) ═══
- Цените на продуктите в магазина са в USD на екрана. Пълният каталог, снимки и описания са само на сайта.
- Основен поток за поръчка: от страница на продукт — вход с Discord → код вида TICKET-XXXXXXXX → тикет в Discord с кода → staff потвърждава и дава плащане → след плащане staff маркира като платено. Ботът може да изпрати ЛС с кода (ако е настроен).
- Количката води към Discord за продължаване на поръчката.
- След някои онлайн плащания има страница за успех — виж payment-success.
- За точна сума винаги насочвай към магазина — не запомняй цени наизуст.

Ориентири (USD, приблизително; реалните суми са на сайта):
- VIP пакети, слотове, донор предмети — виж shop.
- Генг и козметика — по описание на продукта на сайта.

═══ АКТИВИРАНЕ И ПОДДРЪЖКА ═══
- Покупки и кандидатури: тикет в Discord; staff отговаря в разумен срок.
- За спор, бъг на сайта, лични данни — тикет или staff в Discord.

═══ DISCORD ═══
- Официална покана: __DISCORD__
- Там: правила, роли, тикети, новини. Сайтът проверява дали си в сървъра след вход с Discord.

═══ СЛУЖЕБНИ РАЗДЕЛИ НА САЙТА ═══
Ако има страници само за определени Discord роли — не измисляй вътрешно съдържание; кажи че достъпът е с роля и да пишат в Discord.

═══ АКАУНТ ═══
- Вход през сайта основно с Discord OAuth (връзка с общността и магазина).
- Профил: поръчки и връзка с Discord.

═══ INTENT РУТИНГ ═══
Линк винаги на нов ред в края.
- Влизане в игра: Discord + адрес __GAME_CONNECT__.
- Discord: __DISCORD__
- Магазин: __SITE_BASE__/shop
- Плащане/тикет код: накратко Discord + TICKET- код.
- Правила: __SITE_BASE__/rules
- Кандидатури: __SITE_BASE__/applications
- Профил: __SITE_BASE__/profile
- Не знам: насочи към staff в Discord

═══ ABUSE (СТРОГО) ═══
При обиди/токсичност отговори САМО:
Ти не си chill. Спирам да си пиша с теб — пусни тикет в Discord. 🎟️

═══ FAILSAFE ═══
Не мога да отговоря на това с точност. За да получиш правилен отговор, свържи се с нашия стаф в Discord! 🎮 [REDIRECT_STAFF]

═══ DEBUG ═══
Само ако потребителят напише точно debug, последен ред:
{"intent":"SHOP","confidence":0.86,"route":"__SITE_BASE__/shop","cta":"shop"}
`;

function renderChillbotSystemPrompt(siteBase: string, discordInvite: string, gameConnect: string): string {
  const b = (siteBase || "").replace(/\/+$/, "");
  const d = (discordInvite || "").trim();
  const g = (gameConnect || "").trim() || "виж началната страница и FAQ на сайта";
  if (!b) {
    console.error(
      "chillbot: задай SITE_URL в Supabase → Edge Functions → chillbot → Secrets (публичният URL на сайта).",
    );
  }
  const base = b || "https://configure-SITE_URL-in-supabase-secrets";
  const disc = d || "https://discord.gg/uqAdjz6SbQ";
  return SYSTEM_PROMPT_TEMPLATE.replace(/__SITE_BASE__/g, base)
    .replace(/__DISCORD__/g, disc)
    .replace(/__GAME_CONNECT__/g, g);
}

const CHILLBOT_SETTINGS_KEYS = [
  "launch_date",
  "trailer_date",
  "discord_invite",
  "announcement_text_before",
  "chillbot_extra",
];

const SECTION_KEYS: Record<string, string[]> = {
  service: ["service_home", "service_pravila", "service_cenorazpis"],
  hospital: ["hospital_home", "hospital_rules", "hospital_prices"],
  police: ["police_home"],
  obshtina: ["obshtina_home", "obshtina_rules", "obshtina_prices"],
};

const SECTION_NAMES: Record<string, string> = {
  service: "Сервиз",
  hospital: "Болница",
  police: "Полиция",
  obshtina: "Община",
};

async function getSectionContext(
  page: string,
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  const keys = SECTION_KEYS[page];
  if (!keys?.length) return null;

  const { data: rows, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", keys);

  if (error || !rows?.length) return null;

  const parts: string[] = [];
  const labelByKey: Record<string, string> = {
    service_home: "Начало (описание на секцията)",
    service_pravila: "Правила",
    service_cenorazpis: "Ценоразпис",
    hospital_home: "Начало (описание на секцията)",
    hospital_rules: "Правила",
    hospital_prices: "Ценоразпис",
    police_home: "Начало (описание на секцията)",
    obshtina_home: "Начало (описание на секцията)",
    obshtina_rules: "Правила",
    obshtina_prices: "Ценоразпис",
  };
  for (const r of rows) {
    const val = r.value != null ? String(r.value).trim() : "";
    if (!val) continue;
    const label = labelByKey[r.key] || r.key;
    let content = val;
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        content = parsed
          .map(
            (s: { title?: string; items?: string[]; note?: string }) =>
              (s.title ? `${s.title}\n` : "") +
              (Array.isArray(s.items) ? s.items.map((i: string) => `- ${i}`).join("\n") : "") +
              (s.note ? `\n${s.note}` : "")
          )
          .join("\n\n");
      }
    } catch {
      // value is plain text
    }
    parts.push(`--- ${label} ---\n${content.slice(0, 8000)}`);
  }
  if (parts.length === 0) return null;
  const name = SECTION_NAMES[page] || page;
  return `Ти си TLR RP бот само за секция ${name} на проекта TLR RP. Отговаряш САМО за тази секция — правила, ценоразпис, какво как се прави. Не отговаряш за магазин, генг, други секции. Говориш на български, кратко (2–4 изречения). Не използвай кавички. Съдържанието по-долу се тегли от сайта и се обновява при редакция от админ или шеф.

═══ АКТУАЛНО СЪДЪРЖАНИЕ ОТ САЙТА ═══
${parts.join("\n\n")}`;
}

async function getChillbotContextFromSite(): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return "";

  try {
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: rows, error } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", CHILLBOT_SETTINGS_KEYS);

    if (error || !rows?.length) return "";

    const map = new Map<string, string>();
    for (const r of rows) {
      if (r.value != null && String(r.value).trim()) map.set(r.key, String(r.value).trim());
    }
    if (map.size === 0) return "";

    const lines: string[] = ["═══ АКТУАЛНИ ДАННИ ОТ САЙТА (редактират се от Админ панел) ═══"];
    const launch = map.get("launch_date");
    if (launch) {
      try {
        const d = new Date(launch);
        if (!isNaN(d.getTime())) {
          const bg = d.toLocaleString("bg-BG", { dateStyle: "short", timeStyle: "short" });
          lines.push(`- Откриване на сървъра: ${bg}`);
        }
      } catch {
        lines.push(`- Откриване (launch_date): ${launch}`);
      }
    }
    const trailer = map.get("trailer_date");
    if (trailer) lines.push(`- Трейлър: ${trailer}`);
    const discord = map.get("discord_invite");
    if (discord) lines.push(`- Discord линк: ${discord}`);
    const announcement = map.get("announcement_text_before");
    if (announcement) lines.push(`- Банер преди старт: ${announcement}`);
    const extra = map.get("chillbot_extra");
    if (extra) lines.push("", extra);

    return lines.join("\n");
  } catch {
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const body = await req.json();
    const { messages, page } = body as { messages: unknown[]; page?: string | null };

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase =
      supabaseUrl && serviceKey
        ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
        : null;

    let discordInvite = (Deno.env.get("DISCORD_INVITE") || "").trim();
    if (!discordInvite && supabase) {
      const { data: discRow } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "discord_invite")
        .maybeSingle();
      discordInvite = (discRow?.value || "").trim();
    }
    if (!discordInvite) discordInvite = "https://discord.gg/uqAdjz6SbQ";

    const siteBase = (Deno.env.get("SITE_URL") || "").trim().replace(/\/$/, "");
    let gameConnect = (Deno.env.get("MINECRAFT_SERVER_ADDRESS") || "").trim();
    if (!gameConnect && supabase) {
      const { data: mcRow } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "minecraft_server_address")
        .maybeSingle();
      gameConnect = (mcRow?.value || "").trim();
    }
    if (!gameConnect) gameConnect = "виж началната страница и FAQ на сайта";
    const baseSystemPrompt = renderChillbotSystemPrompt(siteBase, discordInvite, gameConnect);

    let systemContent: string;

    const sectionPage =
      page === "service" || page === "hospital" || page === "police" || page === "obshtina"
        ? page
        : null;

    if (sectionPage && supabase) {
      const sectionPrompt = await getSectionContext(sectionPage, supabase);
      systemContent = sectionPrompt || baseSystemPrompt;
    } else {
      const dynamicContext = await getChillbotContextFromSite();
      systemContent =
        dynamicContext ? `${baseSystemPrompt}\n\n${dynamicContext}` : baseSystemPrompt;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [{ role: "system", content: systemContent }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limit" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("OpenAI error:", response.status, t);
      return new Response(JSON.stringify({ error: "ai_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chillbot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
