/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Публичен URL на сайта (https://…) — за билд без window и за консистентни линкове. Задължително в production на хоста. */
  readonly VITE_SITE_URL?: string;
  /** Покана към Discord сървъра; ако липсва, ползва се стойността по подразбиране в config.ts */
  /** Публично име (footer, hero, някои страници). По подразбиране в кода: TLR RP */
  readonly VITE_SITE_NAME?: string;
  readonly VITE_DISCORD_INVITE?: string;
  /** Магазин: линк при „купи“ (тикет канал); иначе се ползва VITE_DISCORD_INVITE */
  readonly VITE_DISCORD_SHOP_CHECKOUT_URL?: string;
  /** When "true", production build on private LAN (e.g. vite preview --host) skips Discord gate. */
  readonly VITE_ALLOW_LOCAL_NO_LOGIN?: string;
  readonly VITE_SHOP_PAYMENT?: string;
  readonly VITE_REVOLUT_IBAN?: string;
  readonly VITE_REVOLUT_BIC?: string;
  readonly VITE_REVOLUT_BENEFICIARY?: string;
}