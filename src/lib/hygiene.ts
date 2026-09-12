// Regras de higienização de contatos (somente leitura/diagnóstico).
// Não altera nem exclui nada — apenas classifica.
import { normalizePhoneNumber } from "@/lib/phone";

export type HygieneStatus = "valido" | "fixo" | "ficticio" | "nome";

export const HYGIENE_LABELS: Record<HygieneStatus, string> = {
  valido: "✅ Válido",
  fixo: "❌ Telefone Fixo",
  ficticio: "❌ Número Fictício/Inválido",
  nome: "⚠️ Nome Inconsistente",
};

export type HygieneRow = {
  id: string;
  name: string;
  company_name: string | null;
  phone: string;
  status: HygieneStatus;
  reason: string;
};

const COMPANY_MARKERS = [
  "ltda",
  "eireli",
  "mei",
  "s/a",
  "s.a",
  " sa ",
  "sociedade",
  "comercio",
  "comércio",
  "industria",
  "indústria",
  "servicos",
  "serviços",
  "empreendimentos",
  "participacoes",
  "participações",
  "associacao",
  "associação",
  "cia",
];

/** Sequência claramente fictícia: dígitos repetidos, crescentes ou decrescentes. */
function isFakeNumber(digits: string): boolean {
  const body = digits.startsWith("55") ? digits.slice(2) : digits;
  if (!body) return true;
  if (/^(\d)\1+$/.test(body)) return true;
  // repetição do mesmo dígito por 7 vezes ou mais em qualquer parte
  if (/(\d)\1{6,}/.test(body)) return true;
  if ("0123456789012345678".includes(body)) return true;
  if ("9876543210987654321".includes(body)) return true;
  return false;
}

/** Nome com CPF/CNPJ embutido ou com razão social em vez do nome da pessoa. */
export function diagnoseName(name: string | null | undefined): string | null {
  const raw = (name ?? "").trim();
  if (!raw) return "Nome em branco.";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 || digits.length === 14) {
    return "O campo nome contém um CPF/CNPJ em vez do nome da pessoa de contato.";
  }
  const lower = ` ${raw.toLowerCase()} `;
  if (COMPANY_MARKERS.some((m) => lower.includes(m))) {
    return "O campo nome traz a razão social da empresa, não o nome da pessoa de contato.";
  }
  if (!/[a-zA-ZÀ-ÿ]{2,}/.test(raw)) return "O nome não parece ser um nome de pessoa.";
  return null;
}

export function classifyContact(c: {
  id: string;
  name: string | null;
  company_name?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
}): HygieneRow {
  const rawPhone = c.whatsapp || c.phone || "";
  const digits = normalizePhoneNumber(rawPhone);
  const nameProblem = diagnoseName(c.name);
  const base = {
    id: c.id,
    name: (c.name ?? "").trim() || "Sem nome",
    company_name: c.company_name ?? null,
    phone: rawPhone ? String(rawPhone) : "—",
  };

  if (!digits) {
    return { ...base, status: "ficticio", reason: "Telefone ausente ou incompleto (sem DDD)." };
  }
  if (isFakeNumber(digits)) {
    return { ...base, status: "ficticio", reason: "Número fictício: dígitos repetidos ou sequência suspeita." };
  }
  if (digits.startsWith("55") && digits.length === 12) {
    return { ...base, status: "fixo", reason: "8 dígitos após o DDD: telefone fixo, sem WhatsApp." };
  }
  if (digits.startsWith("55") && digits.length === 13) {
    if (digits[4] !== "9") {
      return {
        ...base,
        status: "ficticio",
        reason: "Celular brasileiro precisa do dígito 9 logo após o DDD.",
      };
    }
  } else if (!digits.startsWith("55")) {
    // Número internacional: fora do padrão brasileiro esperado.
    return { ...base, status: "ficticio", reason: "Número fora do padrão brasileiro (55 + DDD + 9 dígitos)." };
  } else {
    return { ...base, status: "ficticio", reason: "Quantidade de dígitos inválida para um celular brasileiro." };
  }

  if (nameProblem) return { ...base, status: "nome", reason: nameProblem };
  return { ...base, status: "valido", reason: "Nome e celular no padrão de WhatsApp." };
}
