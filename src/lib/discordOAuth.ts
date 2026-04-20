import { getAuthCallbackUrl } from "@/lib/siteUrl";

/**
 * Discord OAuth scopes за Supabase Auth.
 * `guilds.join` позволява на бота (чрез Edge Function) да те добави в гилдията с твоя access token.
 * В Discord Developer Portal → OAuth2 не е нужно ръчно да пипаш scopes — заявяват се от клиента.
 */
export const DISCORD_OAUTH_SCOPES = "identify email guilds.join";

export function getDiscordOAuthSignInOptions() {
  return {
    redirectTo: getAuthCallbackUrl(),
    scopes: DISCORD_OAUTH_SCOPES,
  };
}
