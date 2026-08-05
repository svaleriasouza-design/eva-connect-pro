// Normalização global de números de telefone brasileiros.
// Regras:
//  - remove tudo que não é dígito e zeros à esquerda
//  - 10 ou 11 dígitos (DDD + número) → acrescenta o DDI 55
//  - 8 ou 9 dígitos (sem DDD) → inválido (não há como adivinhar o DDD)
//  - 12 ou 13 dígitos começando com 55 → mantém
//  - 12 ou 13 dígitos sem 55 → tratado como número com outro DDI, mantém
//  - remove 55 duplicado (ex.: "5555119...")
//
// Use este helper em TODOS os pontos de entrada (import CSV, formulários,
// envio Meta Cloud API, matching de webhook).

export function normalizePhoneNumber(input: string | null | undefined): string {
  if (!input) return "";
  let digits = String(input).replace(/\D/g, "");
  if (!digits) return "";

  // Remove zeros à esquerda (ex.: "011 99999-0000")
  digits = digits.replace(/^0+/, "");

  // 55 duplicado por importações anteriores ("55 55 11 9...")
  while (digits.startsWith("5555") && digits.length > 13) {
    digits = digits.slice(2);
  }

  // Já tem DDI 55 completo
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return digits;
  }

  // DDD + número brasileiro (10 fixo, 11 celular) → adiciona 55
  if (digits.length === 10 || digits.length === 11) {
    return "55" + digits;
  }

  // Números claramente incompletos (sem DDD)
  if (digits.length < 10) return "";

  // Outro DDI (12 a 15 dígitos)
  if (digits.length <= 15) return digits;

  return "";
}

export function isValidWhatsappNumber(input: string | null | undefined): boolean {
  const n = normalizePhoneNumber(input);
  return n.length >= 12 && n.length <= 15;
}
