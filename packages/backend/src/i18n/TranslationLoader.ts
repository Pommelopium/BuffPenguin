// TranslationLoader.ts — Loads and caches translation files.
// Falls back to English if a requested locale or key is not found.

import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

interface Translations {
  muscleGroups: Record<string, string>;
  exercises: Record<string, string>;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

// When running from dist/i18n/, the JSON files are in src/i18n/.
// Resolve the i18n directory so it works from both src/ and dist/.
const i18nDir = existsSync(join(__dirname, "en.json"))
  ? __dirname
  : join(__dirname, "../../src/i18n");

export class TranslationLoader {
  private cache = new Map<string, Translations>();
  private supportedLocales = ["en", "de"];

  private load(locale: string): Translations {
    const cached = this.cache.get(locale);
    if (cached) return cached;

    try {
      const filePath = join(i18nDir, `${locale}.json`);
      const data = JSON.parse(readFileSync(filePath, "utf-8")) as Translations;
      this.cache.set(locale, data);
      return data;
    } catch {
      // Fall back to English if locale file not found
      if (locale !== "en") return this.load("en");
      throw new Error("English translation file not found");
    }
  }

  getMuscleGroupName(slug: string, locale?: string): string | undefined {
    const lang = locale && this.supportedLocales.includes(locale) ? locale : "en";
    const translations = this.load(lang);
    return translations.muscleGroups[slug] ?? this.load("en").muscleGroups[slug];
  }

  getExerciseName(englishName: string, locale?: string): string | undefined {
    const lang = locale && this.supportedLocales.includes(locale) ? locale : "en";
    const translations = this.load(lang);
    return translations.exercises[englishName] ?? englishName;
  }

  getAll(locale?: string): Translations {
    const lang = locale && this.supportedLocales.includes(locale) ? locale : "en";
    return this.load(lang);
  }

  getSupportedLocales(): string[] {
    return [...this.supportedLocales];
  }
}

// Singleton instance shared across the backend
export const translations = new TranslationLoader();
