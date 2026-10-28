// Autenticação das rotinas agendadas (pg_cron): segredo dedicado CRON_SECRET
// enviado no header `x-cron-secret`, comparado em tempo constante.
export async function isValidCronRequest(request: Request): Promise<boolean> {
  const expected = process.env.CRON_SECRET || "";
  const provided = request.headers.get("x-cron-secret") || "";
  if (!expected || !provided) return false;
  const enc = new TextEncoder();
  // Compara hashes de tamanho fixo para não vazar o tamanho do segredo.
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
    crypto.subtle.digest("SHA-256", enc.encode(provided)),
  ]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
