export type Lane = 'express' | 'main';
export type EvidenceState = 'empty' | 'captured' | 'skipped' | 'lost';
export type EvidenceId =
  | 'screenshot'
  | 'profile_url'
  | 'first_seen'
  | 'archive_url'
  | 'witness'
  | 'handle'
  | 'platform'
  | 'altered_file'
  | 'transaction_reference'
  | 'amount'
  | 'transaction_time'
  | 'recipient'
  | 'financial_document';
export type FactKey = 'profile_url' | 'first_seen' | 'witness' | 'handle' | 'platform';
export type Provenance = 'transcript' | 'typed' | 'absent';

export type EvidenceDefinition = {
  id: EvidenceId;
  label: string;
  reason: string;
  control: 'file' | 'url' | 'datetime-local' | 'text';
  express: boolean;
  lane: 'general' | 'image' | 'financial';
  placeholder?: string;
};

export type EvidenceValue = {
  value: string;
  state: EvidenceState;
  fileName?: string;
  sizeBytes?: number;
  checksum?: string;
};

export type Fact = {
  key: FactKey;
  label: string;
  value: string;
  source: string | null;
  provenance: Provenance;
};

export type CategoryId =
  | 'rgr_sexually_abusive_content'
  | 'sexually_obscene_material'
  | 'sexually_explicit_act'
  | 'cseam';

export type PrefillPlatform =
  | 'email'
  | 'facebook'
  | 'instagram'
  | 'snapchat'
  | 'twitter'
  | 'whatsapp'
  | 'website'
  | 'youtube'
  | 'linkedin'
  | 'telegram'
  | 'other';

export type PrefillMediaType = 'chat_image' | 'image' | 'video' | 'document';

export type FormPrefill = {
  platform: PrefillPlatform | null;
  account_identifier: string | null;
  media_type: PrefillMediaType | null;
  first_seen: string | null;
};

export type CategoryResult = {
  id: CategoryId | 'none';
  label: string;
  citizenLabel: string;
  description: string;
  reason: string;
  built: boolean;
  confidence: 'confident' | 'uncertain';
  source: 'local' | 'service' | 'manual';
  quotes: string[];
  prefill?: FormPrefill;
};

export type CategoryAssessment = {
  outcome: 'suggested' | 'uncertain';
  top_category: CategoryId | null;
  evidence: Array<{ quote: string; supports: CategoryId }>;
  alternatives: CategoryId[];
  prefill: FormPrefill;
};

export const CATEGORY_OPTIONS: Record<CategoryId, Omit<CategoryResult, 'reason' | 'confidence' | 'source' | 'quotes'>> = {
  rgr_sexually_abusive_content: {
    id: 'rgr_sexually_abusive_content',
    label: 'Rape/Gang Rape (RGR) – Sexually Abusive Content',
    citizenLabel: 'Sexual assault imagery',
    description: 'Content related to rape, gang rape, or sexually abusive material.',
    built: true,
  },
  sexually_obscene_material: {
    id: 'sexually_obscene_material',
    label: 'Sexually Obscene Material',
    citizenLabel: 'Non-Consensual Intimate Imagery',
    description: 'Obscene sexual material shared, posted, or sent online.',
    built: true,
  },
  sexually_explicit_act: {
    id: 'sexually_explicit_act',
    label: 'Sexually Explicit Act',
    citizenLabel: 'Non-Consensual Intimate Imagery',
    description: 'A sexually explicit act depicted, shared, or communicated online.',
    built: true,
  },
  cseam: {
    id: 'cseam',
    label: 'CSEAM – Child Sexual Exploitative and Abuse Material',
    citizenLabel: 'Child sexual abuse material',
    description: 'Child sexual exploitative and abuse material.',
    built: true,
  },
};

export const NONE_CATEGORY: CategoryResult = {
  id: 'none',
  label: 'None of these fit',
  citizenLabel: 'None of these fit',
  description: 'Continue with your account without assigning a category.',
  reason: 'You chose not to assign a category.',
  built: false,
  confidence: 'uncertain',
  source: 'manual',
  quotes: [],
};

export const CATEGORY_EDIT_IDS: Array<CategoryId | 'none'> = ['none', ...(Object.keys(CATEGORY_OPTIONS) as CategoryId[])];

export function categoryCitizenLabel(category: Pick<CategoryResult, 'id' | 'label' | 'citizenLabel'> | null | undefined) {
  if (!category || category.id === 'none') return category?.citizenLabel || category?.label || 'Not categorised';
  return CATEGORY_OPTIONS[category.id]?.citizenLabel ?? category.citizenLabel ?? category.label;
}

export function categoryCitizenLabelFromId(id: string, fallback = 'Not categorised') {
  if (id === 'none' || !(id in CATEGORY_OPTIONS)) return fallback;
  return CATEGORY_OPTIONS[id as CategoryId].citizenLabel;
}

export function categoryPortalLabelFromId(id: string) {
  if (id === 'none' || !(id in CATEGORY_OPTIONS)) return '';
  return CATEGORY_OPTIONS[id as CategoryId].label;
}

export function categorySelectOptionLabel(id: CategoryId | 'none') {
  if (id === 'none') return 'Not categorised';
  const option = CATEGORY_OPTIONS[id];
  return `${option.citizenLabel} — ${option.label}`;
}

export type SuspectIdentifierType =
  | 'social_profile'
  | 'mobile_number'
  | 'email'
  | 'whatsapp_call'
  | 'bank_account'
  | 'url'
  | 'driving_licence'
  | 'government_id'
  | 'pan_card'
  | 'voter_card'
  | 'landline'
  | 'international_call'
  | 'other';

export const SUSPECT_IDENTIFIER_OPTIONS: Array<{ id: SuspectIdentifierType; label: string; placeholder: string }> = [
  { id: 'social_profile', label: 'Social media profile URL', placeholder: 'Profile URL or @handle' },
  { id: 'mobile_number', label: 'Mobile number', placeholder: 'Mobile number' },
  { id: 'email', label: 'Email', placeholder: 'name@example.com' },
  { id: 'whatsapp_call', label: 'WhatsApp call', placeholder: 'Phone number or call detail' },
  { id: 'bank_account', label: 'Bank account number / UPI ID', placeholder: 'Account number or UPI ID' },
  { id: 'url', label: 'URL', placeholder: 'https://…' },
  { id: 'driving_licence', label: 'Driving licence', placeholder: 'Licence number' },
  { id: 'government_id', label: 'Government-issued card', placeholder: 'Card type and number' },
  { id: 'pan_card', label: 'PAN card', placeholder: 'PAN number' },
  { id: 'voter_card', label: 'Voter card', placeholder: 'Voter ID number' },
  { id: 'landline', label: 'Landline call', placeholder: 'Landline number or call detail' },
  { id: 'international_call', label: 'International call', placeholder: 'Number including country code' },
  { id: 'other', label: 'Other', placeholder: 'Describe the identifier' },
];

export const PLATFORM_OPTIONS: Array<{ id: PrefillPlatform; label: string; identifierLabel: string; placeholder: string }> = [
  { id: 'email', label: 'Email', identifierLabel: 'Sender email address', placeholder: 'name@example.com' },
  { id: 'facebook', label: 'Facebook', identifierLabel: 'Profile or post link', placeholder: 'Profile name, @handle, or link' },
  { id: 'instagram', label: 'Instagram', identifierLabel: 'Instagram ID or account URL', placeholder: '@account or https://instagram.com/…' },
  { id: 'snapchat', label: 'Snapchat', identifierLabel: 'Snapchat username or profile link', placeholder: 'Username or profile link' },
  { id: 'twitter', label: 'Twitter / X', identifierLabel: 'Account or post URL', placeholder: '@account or post link' },
  { id: 'whatsapp', label: 'WhatsApp', identifierLabel: 'Phone number, group, or chat link', placeholder: 'Phone number or link' },
  { id: 'website', label: 'Website URL', identifierLabel: 'Page URL', placeholder: 'https://…' },
  { id: 'youtube', label: 'YouTube', identifierLabel: 'Channel or video URL', placeholder: 'https://youtube.com/…' },
  { id: 'linkedin', label: 'LinkedIn', identifierLabel: 'Profile, page, or post URL', placeholder: 'https://linkedin.com/…' },
  { id: 'telegram', label: 'Telegram', identifierLabel: 'Username, channel, or message link', placeholder: '@username or link' },
  { id: 'other', label: 'Other', identifierLabel: 'Account, address, or link', placeholder: 'The identifier you have' },
];

export const MEDIA_OPTIONS: Array<{ id: PrefillMediaType; label: string }> = [
  { id: 'chat_image', label: 'Chat image' },
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Video' },
  { id: 'document', label: 'Document or PDF' },
];

export function platformFromFact(value: string): PrefillPlatform | '' {
  const normalized = value.toLowerCase();
  if (normalized === 'x' || normalized.includes('twitter')) return 'twitter';
  return PLATFORM_OPTIONS.find(({ label }) => normalized.includes(label.toLowerCase().split(' ')[0]))?.id ?? '';
}

export function mediaTypeFromAccount(value: string): PrefillMediaType | '' {
  const normalized = value.toLowerCase();
  if (/\b(video|clip)\b/.test(normalized)) return 'video';
  if (/\b(pdf|document)\b/.test(normalized)) return 'document';
  if (/\b(chat|message|dm)\b/.test(normalized)) return 'chat_image';
  if (/\b(image|photo|picture|screenshot|nude|obscene)\b/.test(normalized)) return 'image';
  return '';
}

export function mergePrefill(
  current: {
    platform: PrefillPlatform | '';
    accountIdentifier: string;
    mediaType: PrefillMediaType | '';
    firstSeen: string;
  },
  category: CategoryResult,
  prefill: FormPrefill | undefined,
  account: string,
) {
  const facts = extractFacts(account);
  return {
    category,
    platform: current.platform || prefill?.platform || platformFromFact(facts.platform.value),
    accountIdentifier: current.accountIdentifier || prefill?.account_identifier || facts.profile_url.value || facts.handle.value,
    mediaType: current.mediaType || prefill?.media_type || mediaTypeFromAccount(account),
    firstSeen: current.firstSeen || prefill?.first_seen || facts.first_seen.value,
  };
}

export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
export const EVIDENCE_ACCEPT =
  'image/png,image/jpeg,image/webp,image/heic,image/heif,video/mp4,video/quicktime,audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/aac,audio/ogg,application/pdf,.heic,.heif,.mp4,.mov,.mp3,.m4a,.wav,.aac,.ogg';
const ALLOWED_EVIDENCE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
  'audio/ogg',
  'application/pdf',
]);
const ALLOWED_EVIDENCE_EXTENSION = /\.(png|jpe?g|webp|heic|heif|mp4|mov|mp3|m4a|wav|aac|ogg|pdf)$/i;

export const SCRIPTED_TRANSCRIPT =
  'An Instagram account @anamika_sample posted an obscene image of me without my consent. I first saw it on 27 August 2026 at 6:30 AM. I saved a screenshot and the profile link https://instagram.com/anamika_sample.';

export const SCRIPTED_TRANSCRIPT_KN =
  'ಒಂದು Instagram ಖಾತೆ @anamika_sample ನನ್ನ ಒಪ್ಪಿಗೆಯಿಲ್ಲದೆ ಅಶ್ಲೀಲ ಚಿತ್ರ ಹಾಕಿದೆ. ನಾನು ಅದನ್ನು 27 August 2026 ರಂದು ಬಳಿಗ್ಗೆ 6:30ಕ್ಕೆ ಮೊದಲು ನೋಡಿದೆ. ನಾನು screenshot ಮತ್ತು profile link https://instagram.com/anamika_sample ಉಳಿಸಿದ್ದೇನೆ.';

export const SCRIPTED_TRANSCRIPT_TA =
  'ஒரு Instagram கணக்கு @anamika_sample என் சம்மதமின்றி ஆபாசப் படத்தை போட்டது. நான் அதை 27 August 2026 அன்று காலை 6:30க்கு முதலில் பாத்தேன். screenshot மற்றும் profile link https://instagram.com/anamika_sample சேமித்தேன்.';

export const EVIDENCE_DEFINITIONS: EvidenceDefinition[] = [
  {
    id: 'screenshot',
    label: 'Screenshot with the URL visible',
    reason: 'Without the URL visible, it is a picture of a picture. The account is harder to identify.',
    control: 'file',
    express: true,
    lane: 'general',
  },
  {
    id: 'profile_url',
    label: 'The exact profile link',
    reason: 'The profile link identifies the account even after a post is deleted.',
    control: 'url',
    express: true,
    lane: 'general',
    placeholder: 'https://…',
  },
  {
    id: 'first_seen',
    label: 'Date and time first seen',
    reason: 'This records when you discovered it, without guessing when it was uploaded.',
    control: 'text',
    express: true,
    lane: 'general',
    placeholder: 'Approximate is fine, such as Tuesday morning',
  },
  {
    id: 'witness',
    label: 'A witness',
    reason: 'The person who alerted you may independently confirm what they saw.',
    control: 'text',
    express: true,
    lane: 'general',
    placeholder: 'Name or safe contact, if you have it',
  },
  {
    id: 'platform',
    label: 'The platform',
    reason: 'It determines which platform reporting route applies.',
    control: 'text',
    express: true,
    lane: 'general',
    placeholder: 'Instagram, Facebook, X…',
  },
  {
    id: 'archive_url',
    label: 'An archived copy',
    reason: 'An archive may remain after the original page changes or disappears.',
    control: 'url',
    express: false,
    lane: 'image',
    placeholder: 'Archive link, if you have one',
  },
  {
    id: 'handle',
    label: 'Handle or user ID',
    reason: 'It may still identify the account if its display name or link changes.',
    control: 'text',
    express: false,
    lane: 'image',
    placeholder: '@handle',
  },
  {
    id: 'altered_file',
    label: 'The altered content, unchanged',
    reason: 'The original file may be needed for a forensic comparison. It stays in this tab.',
    control: 'file',
    express: false,
    lane: 'image',
  },
  {
    id: 'transaction_reference',
    label: 'Transaction reference or UTR',
    reason: 'The reference lets the bank and police trace the exact payment.',
    control: 'text',
    express: false,
    lane: 'financial',
    placeholder: 'Transaction ID, UTR or reference',
  },
  {
    id: 'amount',
    label: 'Amount involved',
    reason: 'The amount helps match your report to the bank or payment record.',
    control: 'text',
    express: false,
    lane: 'financial',
    placeholder: 'Approximate amount is fine',
  },
  {
    id: 'transaction_time',
    label: 'Transaction date and time',
    reason: 'The time narrows the payment trail the bank needs to inspect.',
    control: 'text',
    express: false,
    lane: 'financial',
    placeholder: 'Approximate is fine',
  },
  {
    id: 'recipient',
    label: 'Recipient account or payment ID',
    reason: 'A UPI ID, account number or phone number helps identify where the money went.',
    control: 'text',
    express: false,
    lane: 'financial',
    placeholder: 'UPI ID, account or phone, if known',
  },
  {
    id: 'financial_document',
    label: 'Receipt or account statement',
    reason: 'A receipt or statement records the debit and its transaction reference.',
    control: 'file',
    express: false,
    lane: 'financial',
  },
];

export const EMPTY_EVIDENCE = Object.fromEntries(
  EVIDENCE_DEFINITIONS.map(({ id }) => [id, { value: '', state: 'empty' }]),
) as Record<EvidenceId, EvidenceValue>;

export function restoreEvidence(
  saved: Partial<Record<EvidenceId, EvidenceValue>> | undefined,
): Record<EvidenceId, EvidenceValue> {
  const restored = { ...structuredClone(EMPTY_EVIDENCE), ...saved };
  EVIDENCE_DEFINITIONS.forEach(({ id, control }) => {
    if (control === 'file' && restored[id].state === 'captured') {
      restored[id] = { ...restored[id], state: 'lost', checksum: undefined };
    }
  });
  return restored;
}

const FACT_LABELS: Record<FactKey, string> = {
  profile_url: 'Exact profile link',
  first_seen: 'When you first saw it',
  witness: 'Witness',
  handle: 'Handle or user ID',
  platform: 'Platform',
};

const firstMatch = (text: string, pattern: RegExp): string | null => text.match(pattern)?.[0] ?? null;

export function extractFacts(transcript: string): Record<FactKey, Fact> {
  const url = firstMatch(transcript, /https?:\/\/[^\s]+/i);
  const handle = firstMatch(transcript, /@[a-z0-9_.]{2,}/i);
  const platform = firstMatch(transcript, /\b(Email|Facebook|Instagram|Snapchat|Twitter|X|WhatsApp|Website|YouTube|LinkedIn|Telegram)\b/i);
  const firstSeen = firstMatch(
    transcript,
    /(?:\bfirst saw|\bfirst seen|\bnoticed|பாத்தேன்|ನೋಡಿದೆ|ಮೊದಲು ನೋಡಿದೆ)[^.]{0,80}/i,
  );
  const witness = firstMatch(transcript, /(?:\bfriend|\bwitness|நண்பர்|தோழி|ಗೆಳತಿ|ಸಾಕ್ಷಿ)[^.]{0,45}/i);
  const matches: Record<FactKey, string | null> = {
    profile_url: url,
    first_seen: firstSeen,
    witness,
    handle,
    platform,
  };

  return Object.fromEntries(
    (Object.keys(FACT_LABELS) as FactKey[]).map((key) => [
      key,
      {
        key,
        label: FACT_LABELS[key],
        value: matches[key] ?? '',
        source: matches[key],
        provenance: matches[key] ? 'transcript' : 'absent',
      },
    ]),
  ) as Record<FactKey, Fact>;
}

const CONCEPTS: Record<CategoryId, string[][]> = {
  rgr_sexually_abusive_content: [['rape', 'gang rape', 'sexually abusive']],
  sexually_obscene_material: [['obscene', 'nude', 'sexual image', 'morphed', 'ಅಶ್ಲೀಲ', 'ஆபாச']],
  sexually_explicit_act: [['explicit act', 'sexual act', 'explicit video']],
  cseam: [['child', 'minor', 'under 18', 'cseam']],
};
const UNAMBIGUOUS = new Set(['rape', 'gang rape', 'cseam', 'sexual image', 'obscene', 'explicit act', 'sexual act', 'under 18', 'ಅಶ್ಲೀಲ', 'ஆபாச']);
const normalized = (value: string) => value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();

export function classifyAccount(transcript: string): CategoryResult {
  const text = normalized(transcript);
  const matches = (Object.keys(CONCEPTS) as CategoryId[]).map((id) => {
    const concepts = CONCEPTS[id]
      .map((terms) => terms.find((term) => text.includes(term)))
      .filter((term): term is string => Boolean(term));
    return { id, concepts };
  }).filter(({ concepts }) => concepts.length);
  const confident = matches.filter(({ concepts }) =>
    concepts.length >= 2 || concepts.some((term) => UNAMBIGUOUS.has(term)),
  );

  if (confident.length === 1 && matches.length === 1) {
    const match = confident[0];
    const option = CATEGORY_OPTIONS[match.id];
    return {
      ...option,
      reason: `Your words include “${match.concepts.slice(0, 2).join('” and “')}”.`,
      confidence: 'confident',
      source: 'local',
      quotes: match.concepts.slice(0, 2),
    };
  }
  return {
    ...NONE_CATEGORY,
    label: 'No clear fit yet',
    description: 'Your words may fit more than one description. Saakshi will not guess.',
    reason: 'The on-device check did not find one clear fit.',
    source: 'local',
  };
}

export function categoryFromAssessment(assessment: CategoryAssessment): CategoryResult | null {
  if (assessment.outcome !== 'suggested' || !assessment.top_category) return null;
  const option = CATEGORY_OPTIONS[assessment.top_category];
  const quotes = assessment.evidence
    .filter(({ supports }) => supports === assessment.top_category)
    .map(({ quote }) => quote);
  if (!quotes.length) return null;
  return {
    ...option,
    reason: `Your account includes “${quotes.slice(0, 2).join('” and “')}”.`,
    confidence: 'confident',
    source: 'service',
    quotes: quotes.slice(0, 2),
    prefill: assessment.prefill,
  };
}

export const MONEY_PATTERN = /\b(upi|utr|bank|payment|fraud|₹|rs\.?|rupee|amount transferred)\b/i;

export function evidenceForLane(kind: 'general' | 'image' | 'financial'): EvidenceDefinition[] {
  return EVIDENCE_DEFINITIONS.filter((item) => item.lane === kind);
}

export function extraEvidenceFor(categoryId: CategoryId | 'none' | undefined, transcript: string): EvidenceDefinition[] {
  if (!categoryId || categoryId === 'none') return [];
  const option = CATEGORY_OPTIONS[categoryId];
  if (!option?.built) return [];
  const extras = evidenceForLane('image');
  if (MONEY_PATTERN.test(transcript)) return [...extras, ...evidenceForLane('financial')];
  return extras;
}

export function hasExtraEvidence(categoryId: CategoryId | 'none' | undefined, transcript: string) {
  return extraEvidenceFor(categoryId, transcript).length > 0;
}

export function validateEvidenceFile(file: File): string | null {
  if (!file.size) return 'This file is empty. Choose the original image or PDF again.';
  if (file.size > MAX_EVIDENCE_BYTES) return 'This file is larger than 10 MB. Keep the original and choose a smaller copy here.';
  if (!ALLOWED_EVIDENCE_TYPES.has(file.type) && !ALLOWED_EVIDENCE_EXTENSION.test(file.name)) {
    return 'Choose an image, video, audio file or PDF.';
  }
  return null;
}

export async function validateEvidenceFileContent(file: File): Promise<string | null> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = String.fromCharCode(...bytes);
  const isPng = bytes[0] === 0x89 && ascii.slice(1, 4) === 'PNG';
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp = ascii.slice(0, 4) === 'RIFF' && ascii.slice(8, 12) === 'WEBP';
  const isMp4 = ascii.slice(4, 8) === 'ftyp';
  const isPdf = ascii.slice(0, 5) === '%PDF-';
  const isHeif = ascii.slice(4, 8) === 'ftyp' && /heic|heix|hevc|hevx|mif1|msf1/.test(ascii.slice(8, 16));
  const isWav = ascii.slice(0, 4) === 'RIFF' && ascii.slice(8, 12) === 'WAVE';
  const isMp3 = ascii.slice(0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  const isOgg = ascii.slice(0, 4) === 'OggS';
  if (isPng || isJpeg || isWebp || isMp4 || isPdf || isHeif || isWav || isMp3 || isOgg) return null;
  return 'This file does not contain a supported image, video, audio file or PDF. Choose the original again.';
}

export async function checksumFile(file: File): Promise<string | undefined> {
  if (!crypto.subtle) return undefined;
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

export function createPreparedHtml(documentText: string): string {
  return `<!doctype html><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Complaint summary</title><style>body{font:16px/1.6 system-ui;max-width:760px;margin:40px auto;padding:0 24px;color:#20213a}header{border:2px solid #20213a;padding:12px;margin-bottom:24px;font-weight:700;white-space:pre-line}pre{font:inherit;white-space:pre-wrap}@media print{header{position:fixed;top:0;right:0}body{margin-top:80px}}</style><header>PREPARED — NOT SUBMITTED</header><pre>${escapeHtml(documentText)}</pre>`;
}
