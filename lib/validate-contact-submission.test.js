import { describe, it, expect } from "vitest";
import { validateContactSubmission } from "./validate-contact-submission.js";

describe("validateContactSubmission", () => {
  it("accepts a valid submission and normalizes the data", () => {
    const result = validateContactSubmission({
      nome: "  Maria  ",
      email: "  maria@exemplo.com ",
      mensagem: "  Olá, gostei do portfólio!  ",
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.data).toEqual({
      nome: "Maria",
      email: "maria@exemplo.com",
      mensagem: "Olá, gostei do portfólio!",
    });
  });

  it("rejects a submission with missing required fields", () => {
    const result = validateContactSubmission({
      nome: "   ",
      email: "",
      mensagem: "Olá",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.nome).toBeDefined();
    expect(result.errors.email).toBeDefined();
    expect(result.errors.mensagem).toBeUndefined();
  });

  it("rejects a submission with a malformed email", () => {
    const result = validateContactSubmission({
      nome: "Maria",
      email: "maria(at)exemplo",
      mensagem: "Olá",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it("rejects a submission whose honeypot field is filled (likely a bot)", () => {
    const result = validateContactSubmission({
      nome: "Maria",
      email: "maria@exemplo.com",
      mensagem: "Olá",
      website: "http://spam.example",
    });

    expect(result.valid).toBe(false);
    expect(result.spam).toBe(true);
  });

  it("rejects a submission whose message exceeds the length limit", () => {
    const result = validateContactSubmission({
      nome: "Maria",
      email: "maria@exemplo.com",
      mensagem: "a".repeat(5001),
    });

    expect(result.valid).toBe(false);
    expect(result.errors.mensagem).toBeDefined();
  });
});
