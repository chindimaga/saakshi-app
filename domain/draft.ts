import { EMPTY_EVIDENCE, restoreEvidence, type CategoryId, type CategoryResult, type EvidenceId, type EvidenceValue, type PrefillMediaType, type PrefillPlatform } from './catalog';
import { INITIAL_MACHINE, type Lane, type MachineState, type Step } from './filing-machine';

export const DRAFT_KEY = 'sakshi.v2.draft';

/** Must match a `name` in KARNATAKA_CITIES so the district select binds on first render. */
export const DEFAULT_POLICE_STATION_CITY = 'Bengaluru Urban';

export type PersonDetail = {
  id: string;
  name: string;
  identifierType: string;
  identifier: string;
};

export type PoliceStationChoice = {
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  distance_km?: number;
  phone: string | null;
  city?: string | null;
};

export type ComplaintDraft = {
  machine: MachineState;
  accountText: string;
  accountMode: 'type' | 'voice';
  voiceDisclosed: boolean;
  categoryHelpChosen: boolean;
  category: CategoryResult | null;
  evidence: Record<EvidenceId, EvidenceValue>;
  platform: PrefillPlatform | '';
  otherPlatform: string;
  accountIdentifier: string;
  mediaType: PrefillMediaType | '';
  firstSeen: string;
  supportingFile: string;
  policeStation: PoliceStationChoice | null;
  policeStationCity: string;
  persons: PersonDetail[];
  personNotes: string;
  personFile: string;
  restored: boolean;
};

export function emptyDraft(): ComplaintDraft {
  return {
    machine: { ...INITIAL_MACHINE },
    accountText: '',
    accountMode: 'type',
    voiceDisclosed: false,
    categoryHelpChosen: false,
    category: null,
    evidence: structuredClone(EMPTY_EVIDENCE),
    platform: '',
    otherPlatform: '',
    accountIdentifier: '',
    mediaType: '',
    firstSeen: '',
    supportingFile: '',
    policeStation: null,
    policeStationCity: DEFAULT_POLICE_STATION_CITY,
    persons: [],
    personNotes: '',
    personFile: '',
    restored: false,
  };
}

function isStep(value: unknown): value is Step {
  return value === 'start' || value === 'account' || value === 'evidence' || value === 'details' || value === 'preview' || value === 'otp';
}

function isLane(value: unknown): value is Lane {
  return value === 'main' || value === 'express';
}

export function parseDraft(raw: string | null): ComplaintDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ComplaintDraft>;
    const machine = value.machine;
    if (!machine || !isStep(machine.step) || !isLane(machine.lane)) return null;
    const base = emptyDraft();
    return {
      ...base,
      ...value,
      machine: {
        step: machine.step,
        lane: machine.lane,
        generalEvidenceSeen: Boolean(machine.generalEvidenceSeen),
        crisis: Boolean(machine.crisis),
        categoryAccepted: Boolean(machine.categoryAccepted),
      },
      evidence: restoreEvidence(value.evidence),
      restored: true,
      policeStationCity: typeof value.policeStationCity === 'string' ? value.policeStationCity : '',
      persons: Array.isArray(value.persons)
        ? value.persons.map((person, index) => ({
            id: person.id || `person-${index}`,
            name: person.name ?? '',
            identifierType: person.identifierType || 'other',
            identifier: person.identifier ?? '',
          }))
        : [],
    };
  } catch {
    return null;
  }
}

export function readDraft(): ComplaintDraft {
  if (typeof sessionStorage === 'undefined') return emptyDraft();
  return parseDraft(sessionStorage.getItem(DRAFT_KEY)) ?? emptyDraft();
}

export function writeDraft(draft: ComplaintDraft) {
  try {
    const stored = { ...draft, restored: false };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(stored));
  } catch {
    // Private mode may block storage; the in-memory draft still works.
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function categoryIdFromDraft(draft: ComplaintDraft): CategoryId | 'none' | '' {
  return draft.category?.id ?? '';
}

export function isCategorySuggested(draft: ComplaintDraft): boolean {
  return Boolean(draft.category && draft.category.id !== 'none' && draft.category.source !== 'manual');
}
