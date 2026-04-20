import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { LEGAL_LAST_UPDATED_BG, LEGAL_LAST_UPDATED_ISO } from "@/lib/legalMeta";

export default function Privacy() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-xl bg-primary/15 p-3">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold gradient-text">Политика за поверителност</h1>
            <p className="text-sm text-muted-foreground font-body mt-1">
              Последна актуализация: {LEGAL_LAST_UPDATED_BG} ({LEGAL_LAST_UPDATED_ISO})
            </p>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/6 p-6 md:p-8 space-y-6 text-muted-foreground font-body text-sm leading-relaxed">
          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">1. Въведение</h2>
            <p>
              Този уебсайт („TLR“, „ние“, „нас“) уважава вашата поверителност. Обработваме лични данни в съответствие с Регламент (ЕС) 2016/679 („GDPR“), Закона за защита на личните данни (ЗЗЛД) на Република България и приложимите актове за електронни комуникации и
              защита на потребителите. Този документ описва какви данни събираме, защо, на какво правно основание, колко държим, с кого ги споделяме и какви права имате.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">2. Администратор и контакт</h2>
            <p>
              <strong className="text-foreground">Администратор на лични данни</strong> е лицето/организацията, която управлява уебсайта и услугите TLR (FiveM / Minecraft общност, магазин, кандидатури). За заявки по GDPR (достъп, изтриване, възражение и др.) използвайте
              официалния Discord сървър — канал за поддръжка или тикетна система. При поискване можем да уточним и имейл или пощенски адрес за кореспонденция.
            </p>
            <p className="mt-2">
              Имате право на <strong className="text-foreground">жалба</strong> до{" "}
              <a href="https://www.cpdp.bg/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Комисията за защита на личните данни (КЗЛД)
              </a>
              , Република България.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">3. Какви данни обработваме</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-foreground">Автентикация чрез Discord (OAuth):</strong> идентификатор на Discord акаунта (snowflake), потребителско име, имейл (ако Discord го предостави и сте съгласни в настройките на Discord), аватар — за създаване и управление на акаунта в
                нашата система (Supabase Auth). <strong className="text-foreground">Discord user ID</strong> се записва в профила ви в базата данни, за да съвпада уеб акаунтът с вашия Discord акаунт при магазин, кандидатури и поддръжка.
              </li>
              <li>
                <strong className="text-foreground">Съобщения от официалния Discord бот:</strong> екипът може да изпраща лични съобщения в Discord от името на бота на общността (напр. потвърждения, кодове, важни обявления, отговор на тикети). За да получите такива съобщения, в Discord трябва да са разрешени ЛС от членове на сървъра и/или от приложението на бота (според вашите настройки за поверителност). Ако затворите ЛС към бота, можем да маркираме профила като недостъпен за DM, докато отново не е възможно изпращане.
              </li>
              <li>
                <strong className="text-foreground">Промяна на Discord сървъра (общността):</strong> Discord user ID е глобален за вашия акаунт в Discord — той не се променя при смяна на сървъра. Това ни позволява при нужда (напр. нова гилдия/покана) да изпратим покана или инструкции на същите хора, стига да ползват същия Discord акаунт и да приемат съобщения от бота. Членството в конкретен сървър се управлява отделно от Discord.
              </li>
              <li>
                <strong className="text-foreground">Профил и магазин:</strong> данни за поръчки, баланс/транзакции, купони, история на покупки — в обхвата, необходим за изпълнение на поръчката и счетоводни/данъчни изисквания.
              </li>
              <li>
                <strong className="text-foreground">Кандидатури и формуляри:</strong> съдържание, което изпращате (напр. кандидатура за банда), плюс идентификатор на акаунта.
              </li>
              <li>
                <strong className="text-foreground">Технически и сигурност:</strong> IP адрес, тип браузър, час на заявка, логове при грешки и злоупотреби — за сигурност, предотвратяване на измами и законосъобразност.
              </li>
              <li>
                <strong className="text-foreground">Локално съхранение в браузъра:</strong> вижте{" "}
                <Link to="/cookies" className="text-primary hover:underline">
                  Политика за бисквитки и подобни технологии
                </Link>{" "}
                (вкл. количка, настройки за съгласие, опционално игрово име за Minecraft магазин).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">4. Цели и правни основания (обобщено)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong className="text-foreground">Изпълнение на договор/стъпки преди договор</strong> — предоставяне на сайта, акаунт, магазин, обработка на поръчки.
              </li>
              <li>
                <strong className="text-foreground">Законен интерес</strong> — сигурност, подобряване на услугата, ограничаване на злоупотреби, вътрешна статистика без идентифициращи маркетингови профили, докато не сте възразили и балансът не е в ущърб на правата ви.
              </li>
              <li>
                <strong className="text-foreground">Законова задължителност</strong> — счетоводство, данъци, отговор на компетентни органи при законово изискване.
              </li>
              <li>
                <strong className="text-foreground">Съгласие</strong> — когато изрично сме поискали съгласие (напр. незадължителни бисквитки/аналитика, ако бъдат въведени). Можете да го оттеглите по всяко време без да се засяга законосъобразността на обработката преди оттеглянето.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">5. Получатели и обработващи данни</h2>
            <p>
              Ползваме доставчици на инфраструктура и услуги, които обработват данни от наше име по договор за обработка, в необходимия обхват:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong className="text-foreground">Supabase</strong> (база данни, автентикация, съхранение, edge функции) — съгласно техните условия и място на обработка (може да включва ЕИП и/или трети държави при подходящи гаранции по GDPR).
              </li>
              <li>
                <strong className="text-foreground">Discord Inc.</strong> — при вход с Discord и при изпращане на съобщения от бота/екипа към вас в Discord.
              </li>
              <li>
                <strong className="text-foreground">Платежни доставчици</strong> (напр. Stripe, Revolut или други, ако са активни за вашия случай) — обработват плащания; ние не съхраняваме пълни данни за банкова карта на нашия сървър.
              </li>
              <li>
                <strong className="text-foreground">Хостинг/CDN</strong> на уеб приложението — според избрания от вас хостинг.
              </li>
            </ul>
            <p className="mt-2">Не продаваме лични данни на трети лица за техен маркетинг.</p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">6. Международни трансфери</h2>
            <p>
              При ползване на услуги със сървъри извън ЕИП (напр. САЩ) разчитаме на подходящи механизми по GDPR (напр. стандартни договорни клаузи, решения за адекватност, когато са приложими), както и на политиките на съответния доставчик.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">7. Срок на съхранение</h2>
            <p>
              Данните се пазят колкото е нужно за целите, за които са събрани: например докато акаунтът е активен, докато тече изпълнение на поръчка/спор, или колкото изисква счетоводното/данъчното законодателство. След това се изтриват или анонимизират, освен ако законът не изисква
              по-дълго съхранение.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">8. Вашите права по GDPR</h2>
            <p>Имате право на достъп, коригиране, изтриване („право да бъдете забравени“ при приложими условия), ограничаване на обработката, преносимост на данните, възражение срещу обработка на законен интерес (при баланс по чл. 21 GDPR), както и на оттегляне на съгласие,
              когато обработката е основана на съгласие.</p>
            <p className="mt-2">
              Заявки към администратора — през Discord (тикет/поддръжка). При несъгласие с отговора ни може да се обърнете към КЗЛД.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">9. Деца</h2>
            <p>
              Услугите не са насочени към лица под 16 години. Ако сте родител и смятате, че дете ни е предоставило данни, свържете се с нас — ще предприемем мерки за изтриване, когато е възможно по закон.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">10. Сигурност</h2>
            <p>
              Прилагаме подходящи технически и организационни мерки (криптиране при пренос към услуги по HTTPS, контрол на достъп, минимизация на данните). Абсолютна сигурност в интернет не съществува; молим пазите и Discord акаунта си.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">11. Автоматизирано вземане на решения и профилиране</h2>
            <p>
              Не извършваме автоматизирано вземане на решения с правни последици за вас или съществено ви въздействане по смисъла на GDPR без човешка намеса. Ако в бъдеще въведем такава функционалност, ще ви информираме и ще осигурим законовите основания и правата ви.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">12. Промени</h2>
            <p>
              Можем да актуализираме тази политика. Съществени промени ще бъдат отразени на тази страница с нова дата и, когато е уместно, съобщение в сайта или Discord. Препоръчваме периодичен преглед.
            </p>
          </section>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-primary hover:underline font-heading font-semibold">
            ← Начало
          </Link>
          {" · "}
          <Link to="/cookies" className="text-primary hover:underline font-heading font-semibold">
            Бисквитки
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
