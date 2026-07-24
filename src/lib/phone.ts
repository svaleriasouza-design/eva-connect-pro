// Normalização global de números de telefone brasileiros.
// Regras:
//  - remove tudo que não é dígito
//  - retira zeros à esquerda
//  - se começar com 0 (DDD com 0), remove
//  - se tiver 10 ou 11 dígitos (DDD + número), acrescenta DDI 55
//  - se já começar com 55 e tiver 12/13 dígitos, mantém
//  - retorna string vazia quando o input é inválido / muito curto
//
// Use este helper em TODOS os pontos de entrada (import CSV, formulários,
// envio Meta Cloud API, matching de webhook).

export function normalizePhoneNumber(input: string | null | undefined): string {
  if (!input) return "";
  let digits = String(input).replace(/\D/g, "");
  if (!digits) return "";

  // Remove zeros à esquerda (ex.: "011 99999-0000")
  digits = digits.replace(/^0+/, "");

  // Já tem DDI 55 (12 ou 13 dígitos)
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return digits;
  }

  // Já tem outro DDI plausível (>= 11 dígitos e não começa com 55) — mantém
  if (digits.length >= 11 && digits.length <= 15 && !digits.startsWith("55") && digits.length !== 11) {
    return digits;
  }

  // DDD + número (10 fixo, 11 celular) → adiciona 55
  if (digits.length === 10 || digits.length === 11) {
    return "55" + digits;
  }

  // Números claramente incompletos
  if (digits.length < 10) return "";

  return digits;
}

export function isValidWhatsappNumber(input: string | null | undefined): boolean {
  const n = normalizePhoneNumber(input);
  return n.length >= 12 && n.length <= 15;
}