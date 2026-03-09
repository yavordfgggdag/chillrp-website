import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

export default function Privacy() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-xl bg-neon-purple/15 p-3">
            <Shield className="h-8 w-8 text-neon-purple" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold gradient-text">
              Политика за поверителност
            </h1>
            <p className="text-sm text-muted-foreground font-body mt-1">
              Последна актуализация: март 2025
            </p>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/6 p-6 md:p-8 space-y-6 text-muted-foreground font-body text-sm leading-relaxed">
          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">1. Въведение</h2>
            <p>
              ChillRP („ние“, „нас“, „нашият“) уважава вашата поверителност и се съобразява с Регламент (ЕС) 2016/679 (GDPR) и приложимото българско законодателство за защита на личните данни. Тази политика описва какви лични данни събираме, за какви цели, на какво правно основание и какви са вашите права.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">2. Администратор на данните</h2>
            <p>
              Администратор на личните данни е операторът на уебсайта ChillRP. За въпроси свързани с обработката на данни можете да се свържете чрез официалния Discord сървър (канал за поддръжка или тикети).
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">3. Какви данни събираме</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">При влизане с Discord:</strong> идентификатор на акаунта, потребителско име, имейл (ако е предоставен от Discord), снимка на профила — за идентификация и управление на акаунта.</li>
              <li><strong className="text-foreground">При поръчка в магазина:</strong> данни за поръчката, плащане (обработени от платежния доставчик), имейл/идентификатор за комуникация относно поръчката.</li>
              <li><strong className="text-foreground">При кандидатстване (напр. за банда):</strong> съдържание на формуляра и идентификатор на потребителя.</li>
              <li><strong className="text-foreground">Технически данни:</strong> IP адрес, тип браузър, логове за достъп — при необходимост за сигурност и съответствие със законови изисквания.</li>
              <li><strong className="text-foreground">Бисквитки и локално съхранение:</strong> вижте нашата <Link to="/cookies" className="text-neon-purple hover:underline">Политика за бисквитки</Link>.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">4. Цели и правни основания</h2>
            <p>
              Обработваме данни за: предоставяне на услугите на сайта и играта (изпълнение на договор), управление на акаунти и поръчки, сигурност и отстраняване на злоупотреби (законен интерес), съответствие с законови задължения и, при наличие на съгласие, маркетинг или аналитика. Правните основания са изпълнение на договор, законен интерес, законова задължителност и при необходимост съгласие.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">5. Срок на съхранение</h2>
            <p>
              Данните се съхраняват докато е необходимо за целите, за които са събрани (напр. докато акаунтът е активен, или за счетоводни/правни изисквания). След изтичане на необходимостта те се изтриват или анонимизират в рамките на разумния срок.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">6. Вашите права по GDPR</h2>
            <p>Имате право на:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-foreground">Достъп</strong> — да получите копие от вашите лични данни.</li>
              <li><strong className="text-foreground">Коригиране</strong> — да ги поправите, ако са неточни.</li>
              <li><strong className="text-foreground">Изтриване</strong> — „право на забвение“, при наличие на законови условия.</li>
              <li><strong className="text-foreground">Ограничаване на обработката</strong> — при определени случаи.</li>
              <li><strong className="text-foreground">Преносимост</strong> — да получите данните в структуриран, машиночетим формат.</li>
              <li><strong className="text-foreground">Възражение</strong> — да възразите срещу обработка на основание законен интерес.</li>
              <li><strong className="text-foreground">Оттегляне на съгласие</strong> — когато обработката е на основание съгласие.</li>
            </ul>
            <p className="mt-2">
              За упражняване на правата пишете чрез Discord (поддръжка/тикети) или на контакт, посочен в сайта. Имате право на жалба до Комисията за защита на личните данни (КЗЛД), България.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">7. Споделяне на данни</h2>
            <p>
              Данните могат да се споделят с доставчици на услуги (хостинг, платежни системи, Discord за автентикация), само в обхват, необходим за работата на услугата. Не продаваме лични данни на трети за маркетинг.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">8. Промени</h2>
            <p>
              Тази политика може да се актуализира. Значими промени ще бъдат съобщени чрез сайта или Discord. Препоръчваме периодично преглед на тази страница.
            </p>
          </section>
        </div>

        <p className="mt-6 text-center">
          <Link to="/" className="text-neon-purple hover:underline font-heading font-semibold">
            ← Начало
          </Link>
          {" · "}
          <Link to="/cookies" className="text-neon-purple hover:underline font-heading font-semibold">
            Политика за бисквитки
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
