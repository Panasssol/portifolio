import { describe, it, expect, vi } from "vitest";
import { createHandler } from "./contato.js";

function makeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function makeReq(overrides = {}) {
  return {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4" },
    body: {
      nome: "Maria",
      email: "maria@exemplo.com",
      mensagem: "Olá!",
    },
    ...overrides,
  };
}

describe("contato handler", () => {
  it("sends the email and returns 200 on a valid submission", async () => {
    const sendContactEmail = vi.fn(async () => ({ ok: true }));
    const checkRateLimit = vi.fn(async () => ({ allowed: true }));
    const handler = createHandler({ checkRateLimit, sendContactEmail });

    const res = makeRes();
    await handler(makeReq(), res);

    expect(res.statusCode).toBe(200);
    expect(sendContactEmail).toHaveBeenCalledOnce();
    expect(sendContactEmail.mock.calls[0][0]).toMatchObject({
      email: "maria@exemplo.com",
      nome: "Maria",
      mensagem: "Olá!",
    });
  });

  it("returns 400 and does not send when validation fails", async () => {
    const sendContactEmail = vi.fn(async () => ({ ok: true }));
    const checkRateLimit = vi.fn(async () => ({ allowed: true }));
    const handler = createHandler({ checkRateLimit, sendContactEmail });

    const res = makeRes();
    await handler(makeReq({ body: { nome: "", email: "x", mensagem: "" } }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it("returns 429 and does not send when the rate limit is exceeded", async () => {
    const sendContactEmail = vi.fn(async () => ({ ok: true }));
    const checkRateLimit = vi.fn(async () => ({ allowed: false }));
    const handler = createHandler({ checkRateLimit, sendContactEmail });

    const res = makeRes();
    await handler(makeReq(), res);

    expect(res.statusCode).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith("1.2.3.4");
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it("returns 502 when the email provider fails", async () => {
    const sendContactEmail = vi.fn(async () => {
      throw new Error("Resend down");
    });
    const checkRateLimit = vi.fn(async () => ({ allowed: true }));
    const handler = createHandler({ checkRateLimit, sendContactEmail });

    const res = makeRes();
    await handler(makeReq(), res);

    expect(res.statusCode).toBe(502);
    expect(res.body.ok).toBe(false);
  });

  it("returns 405 for non-POST requests", async () => {
    const sendContactEmail = vi.fn(async () => ({ ok: true }));
    const checkRateLimit = vi.fn(async () => ({ allowed: true }));
    const handler = createHandler({ checkRateLimit, sendContactEmail });

    const res = makeRes();
    await handler(makeReq({ method: "GET" }), res);

    expect(res.statusCode).toBe(405);
    expect(sendContactEmail).not.toHaveBeenCalled();
  });
});
