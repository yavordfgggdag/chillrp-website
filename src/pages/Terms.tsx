import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

export default function Terms() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-xl bg-neon-purple/15 p-3">
            <FileText className="h-8 w-8 text-neon-purple" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold gradient-text">
              Общи условия за ползване
            </h1>
            <p className="text-sm text-muted-foreground font-body mt-1">
              Условия за използване на сайта и услугите на ChillRP
            </p>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/6 p-6 md:p-8 space-y-6 text-muted-foreground font-body text-sm leading-relaxed">
          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">1. Приемане на условията</h2>
            <p>
              С достъп и използване на уебсайта ChillRP и свързаните с него услуги (включително магазин, кандидатствания, форуми/ Discord общност) вие приемате настоящите общи условия. Ако не приемате условията, моля не използвайте сайта.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">2. Услуги</h2>
            <p>
              ChillRP предоставя информационен уебсайт за ролева общност (FiveM), магазин за виртуални продукти/услуги в рамките на сървъра, кандидатствания и достъп до правила и наръчници. Услугите се предоставят „както са“ в рамките на техническите и организационни възможности.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">3. Регистрация и акаунт</h2>
            <p>
              Влизането се извършва чрез Discord (OAuth). Вие отговаряте за запазването на достъпа до акаунта си и за дейностите, извършени от него. Задължително е да спазвате правилата на сървъра и Discord, както и законите на Република България и ЕС.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">4. Магазин и плащания</h2>
            <p>
              Покупките в онлайн магазина са за виртуални продукти/услуги в рамките на ChillRP сървъра. Цените са посочени в сайта. Плащанията се обработват от трети доставчици; ние не съхраняваме пълни данни за карта. След успешна поръчка активирането се извършва в рамките на посочените срокове (напр. чрез тикет в Discord). Отказ от покупка и възстановявания се уреждат съгласно нашата политика и приложимото законодателство за потребителите.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">5. Забранено поведение</h2>
            <p>
              Забранено е: използване на сайта за незаконни цели; злоупотреба с акаунти или плащания; обход на технически ограничения; разпространение на вредоносен софтуер; нарушаване на права на интелектуална собственост; спам или тормоз. При нарушение ние си запазваме правото да прекратим достъпа и да предприемем съответни мерки.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">6. Интелектуална собственост</h2>
            <p>
              Съдържанието на сайта (текстове, дизайн, лога) е собственост на ChillRP или лицензодатели. Не е позволено копиране, разпространение или използване за търговски цели без писмено съгласие. ChillRP не е свързан с Rockstar Games или FiveM по отношение на търговски марки.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">7. Ограничение на отговорността</h2>
            <p>
              В рамките на приложимото законодателство ChillRP не носи отговорност за непряки, последващи или специални щети от използване на сайта или услугите. Ние се стремим да поддържаме услугата стабилна, но не гарантираме непрекъсната наличност.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">8. Поверителност и бисквитки</h2>
            <p>
              Обработката на лични данни се урежда от нашата <Link to="/privacy" className="text-neon-purple hover:underline">Политика за поверителност</Link>. Използването на бисквитки е описано в <Link to="/cookies" className="text-neon-purple hover:underline">Политика за бисквитки</Link>. С ползване на сайта вие приемате и тези документи в приложимия им обхват.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">9. Промени и приложимо право</h2>
            <p>
              Ние можем да актуализираме тези условия. Значими промени ще бъдат съобщени чрез сайта или Discord. Продължаваното използване след промените означава приемане на новите условия. Приложимо е правото на Република България; за потребители от ЕИП – приложими са и задължителните разпоредби за защита на потребителите.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">10. Контакт</h2>
            <p>
              За въпроси относно условията и услугите свържете се с нас чрез официалния Discord сървър на ChillRP (канал за поддръжка или тикети).
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
          <Link to="/cookies" className="text-neon-purple hover:underline font-heading font-semibold">
            Политика за бисквитки
          </Link>
        </p>
      </div>
    </main>
  );
}
