/**
 * Language Identification Service
 *
 * Detects the language of text using Unicode script-based heuristics.
 * In React Native, we don't have MLKit by default, so this uses
 * the same script-based detection as the Ionic web fallback.
 *
 * Returns a 2-letter ISO 639-1 code, or 'auto' if detection fails.
 */

// ── Unicode-script heuristic ────────────────────────────────────────

const SCRIPT_PATTERNS: Array<{ lang: string; pattern: RegExp }> = [
  { lang: 'zh', pattern: /[\u4E00-\u9FFF\u3400-\u4DBF]/ },
  { lang: 'ja', pattern: /[\u3040-\u309F\u30A0-\u30FF]/ },
  { lang: 'ko', pattern: /[\uAC00-\uD7AF\u1100-\u11FF]/ },
  { lang: 'ar', pattern: /[\u0600-\u06FF\u0750-\u077F]/ },
  { lang: 'he', pattern: /[\u0590-\u05FF]/ },
  { lang: 'th', pattern: /[\u0E00-\u0E7F]/ },
  { lang: 'hi', pattern: /[\u0900-\u097F]/ },
  { lang: 'el', pattern: /[\u0370-\u03FF]/ },
  { lang: 'ru', pattern: /[\u0400-\u04FF]/ },
  { lang: 'uk', pattern: /[\u0400-\u04FF]/ },
];

function detectByScript(text: string): string | null {
  // Count significant characters per script
  for (const { lang, pattern } of SCRIPT_PATTERNS) {
    const matches = text.match(new RegExp(pattern.source, 'g'));
    if (matches && matches.length > text.length * 0.15) {
      return lang;
    }
  }
  return null;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Detect the language of the given text.
 * Returns a 2-letter ISO 639-1 code, or 'auto' if detection fails.
 */
export async function identifyLanguage(text: string): Promise<string> {
  if (!text || text.trim().length < 5) return 'auto';

  // Script-based heuristic
  const scriptLang = detectByScript(text);
  if (scriptLang) return scriptLang;

  return 'auto';
}
