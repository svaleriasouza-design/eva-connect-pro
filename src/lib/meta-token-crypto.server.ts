import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key() {
  const secret = process.env["META_TOKEN_ENCRYPTION_KEY"];
  if (!secret) throw new Error("Proteção das credenciais Meta não configurada.");
  return createHash("sha256").update(secret).digest();
}

export function encryptMetaToken(token: string, workspaceId: string, phoneId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(`${workspaceId}:${phoneId}`));
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `v1:${Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64")}`;
}

export function decryptMetaToken(stored: string, workspaceId: string, phoneId: string) {
  if (!stored.startsWith("v1:")) throw new Error("Formato de credencial Meta inválido.");
  const bytes = Buffer.from(stored.slice(3), "base64");
  const cipher = createDecipheriv("aes-256-gcm", key(), bytes.subarray(0, 12));
  cipher.setAAD(Buffer.from(`${workspaceId}:${phoneId}`));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString("utf8");
}