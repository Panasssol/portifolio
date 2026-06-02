const RESEND_ENDPOINT = "https://api.resend.com/emails";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Sends the contact submission as an email via the Resend API.
 * Throws if Resend responds with a non-OK status, so the caller can surface 5xx.
 */
export async function sendContactEmail(data, env = process.env) {
  const apiKey = env.RESEND_API_KEY;
  const recipient = env.CONTACT_RECIPIENT || "mtheuspana@gmail.com";

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Portfólio <onboarding@resend.dev>",
      to: [recipient],
      reply_to: data.email,
      subject: `Nova mensagem de ${data.nome}`,
      html: `
        <p><strong>Nome:</strong> ${escapeHtml(data.nome)}</p>
        <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
        <p><strong>Mensagem:</strong></p>
        <p>${escapeHtml(data.mensagem).replaceAll("\n", "<br>")}</p>
      `,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend respondeu ${response.status}: ${detail}`);
  }

  return response.json();
}
