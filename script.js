export function initContactForm(form, { fetch }) {
  const button = form.querySelector("button[type=submit]");
  const status = form.querySelector(".form-status");
  const originalLabel = button.textContent;

  const setStatus = (text, variant) => {
    status.textContent = text;
    status.className = `form-status form-status--${variant}`;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    button.disabled = true;
    button.textContent = "Enviando...";
    status.textContent = "";
    status.className = "form-status";

    const payload = {
      nome: form.querySelector("[name=nome]").value,
      email: form.querySelector("[name=email]").value,
      mensagem: form.querySelector("[name=mensagem]").value,
      website: form.querySelector("[name=website]").value,
    };

    try {
      const response = await fetch("/api/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStatus("Mensagem enviada! ✅", "success");
        form.reset();
      } else {
        setStatus("Algo deu errado, tente novamente.", "error");
      }
    } catch {
      setStatus("Algo deu errado, tente novamente.", "error");
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#contato-form");
    if (form) initContactForm(form, { fetch: window.fetch.bind(window) });
  });
}
