import type { CategoryAssessment, CategoryId, FormPrefill, PrefillMediaType, PrefillPlatform } from '../../domain/catalog';

const CATEGORY_IDS = new Set<CategoryId>([
  'rgr_sexually_abusive_content',
  'sexually_obscene_material',
  'sexually_explicit_act',
  'cseam',
]);
const PLATFORM_IDS = new Set<PrefillPlatform>(['email', 'facebook', 'instagram', 'snapchat', 'twitter', 'whatsapp', 'website', 'youtube', 'linkedin', 'telegram', 'other']);
const MEDIA_TYPES = new Set<PrefillMediaType>(['chat_image', 'image', 'video', 'document']);

const EMPTY_PREFILL: FormPrefill = {
  platform: null,
  account_identifier: null,
  media_type: null,
  first_seen: null,
};

export const CATEGORY_INSTRUCTION = `Assess only which of the official complaint categories best fits.
Allowed category IDs: rgr_sexually_abusive_content, sexually_obscene_material, sexually_explicit_act, cseam.
Return JSON only with this exact shape:
{"outcome":"suggested"|"uncertain","top_category":category ID|null,"evidence":[{"quote":"exact words from the account","supports":"category ID"}],"alternatives":["category ID"],"prefill":{"platform":{"value":"email|facebook|instagram|snapchat|twitter|whatsapp|website|youtube|linkedin|telegram|other","quote":"exact words from the account"}|null,"account_identifier":{"quote":"exact identifier from the account"}|null,"media_type":{"value":"chat_image|image|video|document","quote":"exact words from the account"}|null,"first_seen":{"quote":"exact time wording from the account"}|null}}.
Never return legal sections, portal routes, advice, labels, or facts absent from the account. Use null for each unavailable prefill field. Use outcome "uncertain" when more than one category fits or the words are insufficient.`;

const normalize = (value: string) => value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
const isCategoryId = (value: unknown): value is CategoryId =>
  typeof value === 'string' && CATEGORY_IDS.has(value as CategoryId);

function quotedValue(value: unknown, accountText: string): string | null {
  if (!value || typeof value !== 'object') return null;
  const quote = (value as Record<string, unknown>).quote;
  if (typeof quote !== 'string' || !quote.trim() || !accountText.includes(normalize(quote))) return null;
  return quote.trim();
}

function parsePrefill(value: unknown, accountText: string): FormPrefill {
  if (!value || typeof value !== 'object') return EMPTY_PREFILL;
  const fields = value as Record<string, unknown>;
  const platformQuote = quotedValue(fields.platform, accountText);
  const platformValue = fields.platform && typeof fields.platform === 'object'
    ? (fields.platform as Record<string, unknown>).value
    : null;
  const mediaQuote = quotedValue(fields.media_type, accountText);
  const mediaValue = fields.media_type && typeof fields.media_type === 'object'
    ? (fields.media_type as Record<string, unknown>).value
    : null;
  return {
    platform: platformQuote && typeof platformValue === 'string' && PLATFORM_IDS.has(platformValue as PrefillPlatform)
      ? platformValue as PrefillPlatform
      : null,
    account_identifier: quotedValue(fields.account_identifier, accountText),
    media_type: mediaQuote && typeof mediaValue === 'string' && MEDIA_TYPES.has(mediaValue as PrefillMediaType)
      ? mediaValue as PrefillMediaType
      : null,
    first_seen: quotedValue(fields.first_seen, accountText),
  };
}

export function parseCategoryAssessment(raw: string, account: string): CategoryAssessment {
  const uncertain: CategoryAssessment = {
    outcome: 'uncertain',
    top_category: null,
    evidence: [],
    alternatives: [],
    prefill: EMPTY_PREFILL,
  };
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const accountText = normalize(account);
    const prefill = parsePrefill(value.prefill, accountText);
    const topCategory = isCategoryId(value.top_category) ? value.top_category : null;
    const evidence = Array.isArray(value.evidence)
      ? value.evidence.flatMap((item) => {
          if (!item || typeof item !== 'object') return [];
          const candidate = item as Record<string, unknown>;
          if (typeof candidate.quote !== 'string' || !isCategoryId(candidate.supports)) return [];
          if (!accountText.includes(normalize(candidate.quote))) return [];
          return [{ quote: candidate.quote, supports: candidate.supports }];
        })
      : [];
    const alternatives = Array.isArray(value.alternatives)
      ? [...new Set(value.alternatives.filter(isCategoryId))].filter((id) => id !== topCategory).slice(0, 3)
      : [];
    const supportingEvidence = topCategory
      ? evidence.filter(({ supports }) => supports === topCategory)
      : [];
    if (value.outcome !== 'suggested' || !topCategory || !supportingEvidence.length) {
      return { ...uncertain, evidence, alternatives, prefill };
    }
    return {
      outcome: 'suggested',
      top_category: topCategory,
      evidence: supportingEvidence,
      alternatives,
      prefill,
    };
  } catch {
    return uncertain;
  }
}
