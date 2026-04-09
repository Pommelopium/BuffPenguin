// i18n.ts — Serves translation files to the web app.

import type { FastifyInstance } from "fastify";
import { translations } from "../i18n/TranslationLoader.js";

export async function i18nRoutes(app: FastifyInstance) {

  app.get<{ Params: { locale: string } }>("/i18n/:locale", async (req, reply) => {
    const { locale } = req.params;
    const supported = translations.getSupportedLocales();
    if (!supported.includes(locale)) {
      return reply.code(404).send({ error: `Locale "${locale}" not supported. Available: ${supported.join(", ")}` });
    }
    return translations.getAll(locale);
  });
}
