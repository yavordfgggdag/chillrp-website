# Citizenid от играта → сайт профил

Играчът трябва да е **логнат поне веднъж в сайта с Discord**, за да има `profiles.discord_id`.

## Supabase

1. Secret: **`CHILLRP_GAME_CITIZEN_LINK_SECRET`** — произволен дълъг низ; същият се слага в FiveM (само сървър).
2. Deploy Edge Function: **`set-citizenid-from-game`** (`verify_jwt = false`).

## HTTP (от FiveM)

`POST https://<PROJECT>.supabase.co/functions/v1/set-citizenid-from-game`

Headers:

- `Content-Type: application/json`
- `x-chillrp-game-secret: <CHILLRP_GAME_CITIZEN_LINK_SECRET>`

Body:

```json
{ "discord_id": "DISCORD_USER_SNOWFLAKE", "citizenid": "QB_CITIZENID" }
```

`discord_id` — числовият ID на играча в Discord (от игра може да го вземеш от интеграция с Discord rich presence / от базата ако го пазите).

## Пример (Lua псевдокод)

Извикваш URL-а с `PerformHttpRequest` след като играчът изпълни команда като `/citizenid` или `/linksite` — логиката за взимане на `discordId` е специфична за твоя QB/txAdmin setup.

## Плащане в магазина

За продукти с награди в играта сайтът изисква **Discord login** + попълнен **`qb_citizenid`** в Профил (ръчно или чрез тази функция).
