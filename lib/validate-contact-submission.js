const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIMITS = { nome: 100, email: 200, mensagem: 5000 };

function isValidEmail(email) {
  return EMAIL_PATTERN.test(email);
}

export function validateContactSubmission(body) {
  const data = {
    nome: String(body?.nome ?? "").trim(),
    email: String(body?.email ?? "").trim(),
    mensagem: String(body?.mensagem ?? "").trim(),
  };

  // Honeypot: humans never see the `website` field; bots tend to fill it.
  const honeypot = String(body?.website ?? "").trim();
  if (honeypot) {
    return { valid: false, spam: true, errors: {}, data };
  }

  const errors = {};
  if (!data.nome) errors.nome = "Informe seu nome.";
  else if (data.nome.length > LIMITS.nome) errors.nome = "Nome muito longo.";
  if (!data.email) errors.email = "Informe seu email.";
  else if (!isValidEmail(data.email)) errors.email = "Email inválido.";
  else if (data.email.length > LIMITS.email) errors.email = "Email muito longo.";
  if (!data.mensagem) errors.mensagem = "Escreva sua mensagem.";
  else if (data.mensagem.length > LIMITS.mensagem)
    errors.mensagem = "Mensagem muito longa.";

  return { valid: Object.keys(errors).length === 0, errors, data };
}
