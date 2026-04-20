/** True for loopback (vite preview / dev on same machine). */
export function isLoopbackHostname(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost") return true;
  if (h === "127.0.0.1") return true;
  if (h === "::1" || h === "[::1]") return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (m && Number(m[1]) === 127) return true;
  return false;
}

/** RFC1918-style private LAN (optional bypass with VITE_ALLOW_LOCAL_NO_LOGIN). */
export function isPrivateLanHostname(host: string): boolean {
  const h = host.toLowerCase();
  if (h.endsWith(".local")) return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}
