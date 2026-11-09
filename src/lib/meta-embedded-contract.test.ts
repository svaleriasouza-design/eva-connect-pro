/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { assertAttempt, assertMetaAssets, EMBEDDED_ATTEMPT_TTL_MS, parseEmbeddedMessage } from "./meta-embedded-contract";
import { decryptMetaToken, encryptMetaToken } from "./meta-token-crypto.server";

describe("Embedded Signup safety", () => {
  const event = { type: "WA_EMBEDDED_SIGNUP", event: "FINISH", data: { waba_id: "123456", phone_number_id: "987654" } };
  test("only exact Facebook origins can supply assets", () => {
    expect(parseEmbeddedMessage("https://www.facebook.com", JSON.stringify(event))).toEqual({ event: "FINISH", wabaId: "123456", phoneNumberId: "987654" });
    expect(parseEmbeddedMessage("https://attackerfacebook.com", event)).toBeNull();
    expect(parseEmbeddedMessage("https://www.facebook.com.attacker.test", event)).toBeNull();
  });
  test("success requires a phone and account identifier", () => {
    expect(parseEmbeddedMessage("https://www.facebook.com", { ...event, data: { waba_id: "123456" } })).toBeNull();
  });
  test("cancel and provider error never become success", () => {
    expect(parseEmbeddedMessage("https://www.facebook.com", { ...event, event: "CANCEL" })?.event).toBe("CANCEL");
    expect(parseEmbeddedMessage("https://www.facebook.com", { ...event, event: "ERROR" })?.event).toBe("ERROR");
  });
  const attempt = { user_id: "alice", workspace_id: "company-a", status: "pending", expires_at: new Date(EMBEDDED_ATTEMPT_TTL_MS).toISOString() };
  test("attempts belong to the initiating admin and workspace", () => {
    expect(() => assertAttempt(attempt, "alice", "company-a", 0)).not.toThrow();
    expect(() => assertAttempt(attempt, "bob", "company-a", 0)).toThrow();
    expect(() => assertAttempt(attempt, "alice", "company-b", 0)).toThrow();
  });
  test("expired and replayed attempts are rejected", () => {
    expect(() => assertAttempt(attempt, "alice", "company-a", EMBEDDED_ATTEMPT_TTL_MS)).toThrow();
    expect(() => assertAttempt({ ...attempt, status: "processing" }, "alice", "company-a", 0)).toThrow();
    expect(() => assertAttempt({ ...attempt, status: "completed" }, "alice", "company-a", 0)).toThrow();
  });
  const debug = { is_valid: true, app_id: "111", scopes: ["whatsapp_business_management", "whatsapp_business_messaging"] };
  test("app identity and both messaging permissions are mandatory", () => {
    expect(() => assertMetaAssets(debug, "111", [{ id: "987654" }], "987654")).not.toThrow();
    expect(() => assertMetaAssets(debug, "222", [{ id: "987654" }], "987654")).toThrow();
    expect(() => assertMetaAssets({ ...debug, scopes: ["whatsapp_business_management"] }, "111", [{ id: "987654" }], "987654")).toThrow();
  });
  test("the selected phone must belong to the authorized account", () => {
    expect(() => assertMetaAssets(debug, "111", [{ id: "123456" }], "987654")).toThrow();
  });
  test("encrypted tokens cannot move between tenants or phone numbers", () => {
    const previous = process.env["META_TOKEN_ENCRYPTION_KEY"];
    process.env["META_TOKEN_ENCRYPTION_KEY"] = "unit-test-fixture-not-a-production-key";
    try {
      const encrypted = encryptMetaToken("test-token", "company-a", "987654");
      expect(encrypted).not.toContain("test-token");
      expect(decryptMetaToken(encrypted, "company-a", "987654")).toBe("test-token");
      expect(() => decryptMetaToken(encrypted, "company-b", "987654")).toThrow();
      expect(() => decryptMetaToken(encrypted, "company-a", "123456")).toThrow();
    } finally {
      if (previous === undefined) delete process.env["META_TOKEN_ENCRYPTION_KEY"];
      else process.env["META_TOKEN_ENCRYPTION_KEY"] = previous;
    }
  });
});