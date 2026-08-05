import Papa from "papaparse";

export type ImportRow = Record<string, any>;

/** Normaliza cabeçalhos para comparação tolerante (acentos, espaços, maiúsculas). */
export function normalizeHeader(s: string) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s_\-.]+/g, "");
}

/** Lê um valor da linha aceitando vários nomes possíveis de coluna. */
export function pickField(row: ImportRow, keys: string[]): string | null {
  for (const k of keys) {
    const found = Object.keys(row).find((rk) => normalizeHeader(rk) === normalizeHeader(k));
    const v = found ? row[found] : undefined;
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

function detectDelimiter(sample: string): string {
  const firstLine = sample.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const counts: Record<string, number> = {
    ";": (firstLine.match(/;/g) ?? []).length,
    ",": (firstLine.match(/,/g) ?? []).length,
    "\t": (firstLine.match(/\t/g) ?? []).length,
    "|": (firstLine.match(/\|/g) ?? []).length,
  };
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : ",";
}

/** Decodifica o arquivo como UTF-8; se os acentos vierem quebrados, tenta Windows-1252. */
function decodeText(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (utf8.includes("\uFFFD")) {
    try {
      return new TextDecoder("windows-1252").decode(buffer);
    } catch {
      return utf8;
    }
  }
  return utf8;
}

export function isSupportedImportFile(file: File) {
  return /\.(csv|txt|xlsx|xlsm|xls)$/i.test(file.name);
}

/**
 * Lê planilhas .xlsx/.xls e arquivos .csv (com detecção automática do separador
 * e da codificação) e devolve as linhas como objetos por cabeçalho.
 */
export async function readRowsFromFile(file: File): Promise<{ rows: ImportRow[]; headers: string[] }> {
  if (/\.(xlsx|xlsm|xls)$/i.test(file.name)) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error("A planilha não possui nenhuma aba com dados.");
    const sheet = wb.Sheets[sheetName]!;
    const rows = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: "", raw: false });
    const headers = rows[0] ? Object.keys(rows[0]) : [];
    return { rows, headers };
  }

  const text = decodeText(await file.arrayBuffer());
  const delimiter = detectDelimiter(text.slice(0, 5000));
  const result = Papa.parse<ImportRow>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter,
  });
  const rows = Array.isArray(result.data) ? result.data : [];
  const headers = (result.meta?.fields ?? []).filter(Boolean) as string[];
  return { rows, headers };
}

/**
 * Valida se a planilha tem as colunas mínimas (nome e um contato).
 * A ordem das colunas não importa — só a existência.
 */
export function validateLeadHeaders(headers: string[]): string | null {
  const norm = headers.map(normalizeHeader);
  const has = (...aliases: string[]) => aliases.some((a) => norm.includes(normalizeHeader(a)));

  const hasName = has("Nome Fantasia", "Razao Social", "Razão Social", "nome", "name", "contato", "empresa", "company");
  const hasContact = has(
    "Telefone1 Completo",
    "WhatsApp",
    "whatsapp",
    "Telefone",
    "phone",
    "celular",
    "E-mail",
    "Email",
    "email",
  );

  if (!hasName && !hasContact) {
    return (
      "Não encontramos as colunas esperadas. A planilha precisa ter uma coluna de nome " +
      "(Nome Fantasia, Razão Social ou Nome) e uma de contato (WhatsApp, Telefone ou E-mail). " +
      `Colunas encontradas: ${headers.slice(0, 12).join(", ") || "nenhuma"}.`
    );
  }
  if (!hasName) {
    return "Falta a coluna de nome. Inclua uma coluna chamada Nome Fantasia, Razão Social ou Nome.";
  }
  if (!hasContact) {
    return "Falta a coluna de contato. Inclua uma coluna chamada WhatsApp, Telefone ou E-mail.";
  }
  return null;
}
