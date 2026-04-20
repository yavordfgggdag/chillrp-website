import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { LEGAL_LAST_UPDATED_BG, LEGAL_LAST_UPDATED_ISO } from "@/lib/legalMeta";

export default function Terms() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-xl bg-primary/15 p-3">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold gradient-text">
              Общи условия за ползване
            </h1>
            <p className="text-sm text-muted-foreground font-body mt-1">
              TLR · FiveM / Minecraft · Последна актуализация: {LEGAL_LAST_UPDATED_BG} ({LEGAL_LAST_UPDATED_ISO})
            </p>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/6 p-6 md:p-8 space-y-6 text-muted-foreground font-body text-sm leading-relaxed">
          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">1. Приемане на условията</h2>
            <p>
              С достъп и използване на уебсайта TLR и свързаните с него услуги (включително магазин, кандидатствания, форуми/ Discord общност) вие приемате настоящите общи условия. Ако не приемате условията, моля не използвайте сайта.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">2. Услуги</h2>
            <p>
              TLR предоставя информационен уебсайт за ролева общност (FiveM и/или Minecraft), магазин за виртуални продукти или услуги в рамките на сървъра, кандидатствания и достъп до правила. Услугите са „както са“ в рамките на техническите и организационни възможности; не гарантираме непрекъсната наличност на игралния сървър или на сайта.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">2а. Възраст</h2>
            <p>
              Ползването на сайта и покупките изискват навършени <strong className="text-foreground">16 години</strong> или съгласието на законен представител там, където законът изисква по-висока възраст. Ако не отговаряте на изискването, не използвайте услугите.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">3. Регистрация и акаунт</h2>
            <p>
              Влизането се извършва чрез Discord (OAuth). Вие отговаряте за запазването на достъпа до акаунта си и за дейностите, извършени от него. Задължително е да спазвате правилата на сървъра и Discord, както и законите на Република България и ЕС.
            </p>
            <p className="mt-2">
              С акаунта се свързва вашият <strong className="text-foreground">Discord user ID</strong> (запис в профила), за да работят магазинът, кандидатурите и връзката с екипа. Оторизирани администратори могат да изпращат съобщения до вас в Discord чрез официалния бот на общността за служебни цели (обявления, поръчки, поддръжка). Не използвайте сайта, ако не приемате тази връзка между уеб акаунт и Discord.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">4. Магазин и плащания</h2>
            <p>
              Покупките са за <strong className="text-foreground">цифрово съдържание / виртуални предимства</strong> в рамките на общността. Цените са в сайта. Плащанията се обработват от лицензирани доставчици (напр. Stripe, Revolut или друг активен метод); пълни данни за банкова карта не се съхраняват на нашия сървър. След успешно плащане доставката/активирането следва описаните в продукта или в Discord канали срокове.
            </p>
            <p className="mt-2">
              За <strong className="text-foreground">потребители от ЕИП</strong>: при цифрово съдържание, доставено веднага след плащане, правото на отказ може да е ограничено, ако сте се съгласили с незабавно изпълнение и сте признали, че губите правото на отказ — това се прилага, когато законът го позволява за вашия тип покупка. За конкретен случай пишете ни в Discord (тикет/поддръжка).
            </p>
            <p className="mt-2">
              Онлайн платформа за спорове (ODR) на ЕС:{" "}
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://ec.europa.eu/consumers/odr/
              </a>
              . Участието ни в извънсъдебно разрешаване на спорове е по наша преценка и когато е приложимо.
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
              Съдържанието на сайта (текстове, дизайн, лога) е собственост на TLR или лицензодатели. Не е позволено копиране, разпространение или използване за търговски цели без писмено съгласие. TLR не е свързан с Rockstar Games, FiveM, Mojang или Microsoft по отношение на търговски марки или официални продукти.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">7. Ограничение на отговорността</h2>
            <p>
              В рамките на приложимото законодателство TLR не носи отговорност за непряки, последващи или специални щети от използване на сайта или услугите. Ние се стремим да поддържаме услугата стабилна, но не гарантираме непрекъсната наличност.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-foreground text-lg mb-2">8. Поверителност и бисквитки</h2>
            <p>
              Обработката на лични данни се урежда от нашата <Link to="/privacy" className="text-primary hover:underline">Политика за поверителност</Link>. Използването на бисквитки е описано в <Link to="/cookies" className="text-primary hover:underline">Политика за бисквитки</Link>. С ползване на сайта вие приемате и тези документи в приложимия им обхват.
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
              За въпроси относно условията и услугите свържете се с нас чрез официалния Discord сървър на TLR (канал за поддръжка или тикети).
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
          <Link to="/cookies" className="text-primary hover:underline font-heading font-semibold">
            Политика за бисквитки
          </Link>
        </p>
      </div>
    </main>
  );
}
