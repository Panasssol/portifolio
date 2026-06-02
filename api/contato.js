import { validateContactSubmission } from "../lib/validate-contact-submission.js";
import { createRateLimiter } from "../lib/rate-limiter.js";
import { sendContactEmail } from "../lib/send-contact-email.js";

function clientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"] ?? "";
  return forwarded.split(",")[0].trim() || "unknown";
}

export function createHandler({ checkRateLimit, sendContactEmail }) {
  return async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Método não permitido." });
    }

    const { valid, errors, data } = validateContactSubmission(req.body);
    if (!valid) {
      return res.status(400).json({ ok: false, errors });
    }

    const ip = clientIp(req);
    const { allowed } = await checkRateLimit(ip);
    if (!allowed) {
      return res
        .status(429)
        .json({ ok: false, error: "Muitas mensagens. Tente novamente mais tarde." });
    }

    try {
      await sendContactEmail(data);
    } catch {
      return res
        .status(502)
        .json({ ok: false, error: "Não foi possível enviar agora. Tente novamente." });
    }
    return res.status(200).json({ ok: true });
  };
}

// Vercel entrypoint: wires the real dependencies. Built lazily so that
// importing this module in tests doesn't require the external services.
let defaultHandler;
export default function handler(req, res) {
  if (!defaultHandler) {
    defaultHandler = createHandler({
      checkRateLimit: createRateLimiter(),
      sendContactEmail,
    });
  }
  return defaultHandler(req, res);
}
