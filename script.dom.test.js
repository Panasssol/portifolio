import { describe, it, expect, vi } from "vitest";
import { initContactForm } from "./script.js";

function buildForm() {
  document.body.innerHTML = `
    <form id="contato-form">
      <input name="nome" />
      <input name="email" />
      <textarea name="mensagem"></textarea>
      <input name="website" />
      <button type="submit">Enviar</button>
      <p class="form-status"></p>
    </form>
  `;
  const form = document.querySelector("#contato-form");
  // Simulate the visitor typing into the fields.
  form.querySelector("[name=nome]").value = "Maria";
  form.querySelector("[name=email]").value = "maria@exemplo.com";
  form.querySelector("[name=mensagem]").value = "Olá!";
  return form;
}

function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("initContactForm", () => {
  it("shows a loading state while sending, then a success message and clears the form", async () => {
    const form = buildForm();
    const d = deferred();
    const fetch = vi.fn(() => d.promise);
    initContactForm(form, { fetch });

    const button = form.querySelector("button[type=submit]");
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));

    // Loading state is visible while the request is in flight.
    expect(button.disabled).toBe(true);
    expect(button.textContent).toMatch(/enviando/i);

    d.resolve({ ok: true, json: async () => ({ ok: true }) });
    await flush();

    const status = form.querySelector(".form-status");
    expect(status.textContent).toMatch(/enviada/i);
    expect(form.querySelector("[name=nome]").value).toBe("");
    expect(form.querySelector("[name=mensagem]").value).toBe("");
    expect(button.disabled).toBe(false);
  });

  it("shows an error message and preserves the input when the request fails", async () => {
    const form = buildForm();
    const fetch = vi.fn(async () => ({
      ok: false,
      status: 429,
      json: async () => ({ ok: false, error: "rate limited" }),
    }));
    initContactForm(form, { fetch });

    const button = form.querySelector("button[type=submit]");
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await flush();

    const status = form.querySelector(".form-status");
    expect(status.textContent).toMatch(/errado|tente|erro/i);
    expect(form.querySelector("[name=nome]").value).toBe("Maria");
    expect(form.querySelector("[name=mensagem]").value).toBe("Olá!");
    expect(button.disabled).toBe(false);
  });
});
