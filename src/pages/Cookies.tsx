import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";

export default function Cookies() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-xl bg-neon-purple/15 p-3">
            <Cookie className="h-8 w-8 text-neon-purple" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold gradient-text">
              Политика за бисквитки
            </h1>
            <p className="text-sm text-muted-foreground font-body mt-1">
              В съответствие с ePrivacy и GDPR
            </p>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/6 p-6 md:p-8 space-y-6 text-muted-foreground font-body text-sm leading-relaxed">
          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">1. Какво са бисквитките?</h2>
            <p>
              Бисквитките са малки текстови файлове, които сайтът записва на вашето устройство. Използват се за запазване на настройки, влизане в акаунт и анализиране на използването на сайта, в съответствие с Регламент (ЕС) 2016/679 и директивите за поверителност в електронните комуникации (ePrivacy).
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">2. Какви бисквитки използваме?</h2>
            <ul className="space-y-3">
              <li>
                <strong className="text-foreground">Строго необходими:</strong> нужни са за основното функциониране на сайта (напр. сесия за влизане, запазване на състояние на навигация/сайдбар). Те не изискват съгласие по закон.
              </li>
              <li>
                <strong className="text-foreground">Функционални:</strong> запомнят ваши избори (напр. преференции за бисквитки, език). Можем да ги използваме след вашето съгласие.
              </li>
              <li>
                <strong className="text-foreground">Аналитични/маркетингови:</strong> ако в бъдеще добавим аналитика (напр. Google Analytics) или реклами, ще ги активираме само след вашето изрично съгласие и ще ги опишем тук.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">3. Управление на съгласието</h2>
            <p>
              При първо посещение ви показваме банер за съгласие. Можете да „Приемате всички“ или да „Отхвърлите неизправни“ (незадължителни) бисквитки. Вашият избор се записва локално (localStorage), за да не ви питаме отново при всяко посещение. Можете по всяко време да промените настройките като изтриете съответните записи в браузъра си или да ни пишете за инструкции.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">4. Конкретни бисквитки / локално съхранение</h2>
            <p>
              В момента сайтът може да използва: (а) бисквитка или локално съхранение за запомняне на вашето решение за бисквитки; (б) бисквитки/сесия за автентикация (Supabase/Discord); (в) при наличие — бисквитка за състояние на сайдбар/интерфейс за по-добро потребителско изживяване. Детайли за всички бисквитки, които ползваме, ще поддържаме актуални в тази страница.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">5. Повече информация</h2>
            <p>
              За общата обработка на лични данни вижте нашата <Link to="/privacy" className="text-neon-purple hover:underline">Политика за поверителност</Link>. При въпроси — свържете се с нас чрез Discord.
            </p>
          </section>
        </div>

        <p className="mt-6 text-center">
          <Link to="/" className="text-neon-purple hover:underline font-heading font-semibold">
            ← Начало
          </Link>
          {" · "}
          <Link to="/privacy" className="text-neon-purple hover:underline font-heading font-semibold">
            Политика за поверителност
          </Link>
          {" · "}
          <Link to="/terms" className="text-neon-purple hover:underline font-heading font-semibold">
            Общи условия
          </Link>
        </p>
      </div>
    </main>
  );
}
