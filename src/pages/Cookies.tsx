import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { LEGAL_LAST_UPDATED_BG, LEGAL_LAST_UPDATED_ISO } from "@/lib/legalMeta";

export default function Cookies() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-xl bg-primary/15 p-3">
            <Cookie className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold gradient-text">
              Политика за бисквитки
            </h1>
            <p className="text-sm text-muted-foreground font-body mt-1">
              ePrivacy / GDPR · Последна актуализация: {LEGAL_LAST_UPDATED_BG} ({LEGAL_LAST_UPDATED_ISO})
            </p>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/6 p-6 md:p-8 space-y-6 text-muted-foreground font-body text-sm leading-relaxed">
          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">1. Какво са бисквитките?</h2>
            <p>
              Бисквитките и подобните технологии (напр. <code className="text-foreground/90">localStorage</code>) са малки записи на вашето устройство. Използваме ги в съответствие с Регламент (ЕС) 2016/679 (GDPR) и приложимите разпоредби за поверителност в електронните комуникации (ePrivacy).
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">2. Категории</h2>
            <ul className="space-y-3">
              <li>
                <strong className="text-foreground">Строго необходими:</strong> сесия за вход (Supabase Auth след Discord OAuth), защита от CSRF/сесия на доставчика. Не изискват предварително съгласие по смисъла на ePrivacy за „строго необходими“.
              </li>
              <li>
                <strong className="text-foreground">Функционални (локално съхранение):</strong> количка, купон код, път след OAuth, игрово име за Minecraft магазин, запомнен избор за банера за бисквитки — улесняват ползването на сайта. Част от тях се записват и при „Отхвърли незадължителните“, защото са нужни за основната функция, която сте поискали (напр. количка).
              </li>
              <li>
                <strong className="text-foreground">Аналитични / маркетингови:</strong> в момента <strong className="text-foreground">не зареждаме</strong> трети страни аналитика (напр. Google Analytics) или рекламни пиксели. Ако ги въведем, ще ги активираме само след изрично съгласие и ще обновим тази страница и банера.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">3. Управление на съгласието</h2>
            <p>
              При първо посещение показваме банер: „Приемам всички“ или „Отхвърли незадължителните“. Изборът се записва в <code className="text-foreground/90">localStorage</code> под ключ <code className="text-foreground/90">chillrp_cookie_consent</code>, за да не ви питаме при всяко зареждане. Можете да изчистите данните за сайта от настройките на браузъра или да ни пишете в Discord за насоки.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">4. Локално съхранение по ключове (приложението TLR)</h2>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-xs md:text-sm border-collapse">
                <thead>
                  <tr className="bg-white/5 text-left text-foreground">
                    <th className="p-2 font-heading">Ключ</th>
                    <th className="p-2 font-heading">Цел</th>
                    <th className="p-2 font-heading">Срок</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  <tr className="border-t border-white/10">
                    <td className="p-2 font-mono text-foreground/90">chillrp_cookie_consent</td>
                    <td className="p-2">Запомняне на избор в банера за бисквитки.</td>
                    <td className="p-2">Докато не изтриете локалните данни.</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="p-2 font-mono text-foreground/90">chillrp_post_auth_path</td>
                    <td className="p-2">След Discord връща към страницата, от която сте тръгнали.</td>
                    <td className="p-2">Изтрива се след успешен вход.</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="p-2 font-mono text-foreground/90">chillrp-cart</td>
                    <td className="p-2">Съдържание на количката в магазина.</td>
                    <td className="p-2">Докато не изтриете или не изчистите количката.</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="p-2 font-mono text-foreground/90">chillrp-shop-coupon-code</td>
                    <td className="p-2">Запомнен купон код за магазина.</td>
                    <td className="p-2">Докато не премахнете купона или данните за сайта.</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="p-2 font-mono text-foreground/90">tlr_mc_shop_ign</td>
                    <td className="p-2">Игрово име (IGN) за Minecraft магазин / портфейл.</td>
                    <td className="p-2">Докато не изтриете или не смените стойността.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              Автентикацията през Supabase може да ползва и <strong className="text-foreground">HTTP бисквитки</strong> за сесията — те се управляват от Supabase/браузъра и са необходими за сигурен вход.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">5. Повече информация</h2>
            <p>
              За лични данни вижте{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Политика за поверителност
              </Link>
              . При въпроси — Discord сървърът на TLR (поддръжка / тикети).
            </p>
          </section>
        </div>

        <p className="mt-6 text-center">
          <Link to="/" className="text-primary hover:underline font-heading font-semibold">
            ← Начало
          </Link>
          {" · "}
          <Link to="/privacy" className="text-primary hover:underline font-heading font-semibold">
            Политика за поверителност
          </Link>
          {" · "}
          <Link to="/terms" className="text-primary hover:underline font-heading font-semibold">
            Общи условия
          </Link>
        </p>
      </div>
    </main>
  );
}
