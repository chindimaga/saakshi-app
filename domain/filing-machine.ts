const CRISIS_PATTERN = /i am under 18|i'?m under 18|i want to die|kill myself|ನಾನು 18|18ರ ಒಳಗೆ|ಆತ್ಮಹತ್ಯೆ|ಸಾಯಬೇಕು|18 வயது|தற்கொலை|சாக வேண்டும்|சாவ/i;

function hasCrisisSignal(text: string): boolean {
  return CRISIS_PATTERN.test(text);
}

export type Step = 'start' | 'account' | 'evidence' | 'details' | 'preview' | 'otp';
export type Lane = 'main' | 'express';

export type MachineState = {
  step: Step;
  lane: Lane;
  generalEvidenceSeen: boolean;
  crisis: boolean;
  categoryAccepted: boolean;
};

export type MachineContext = {
  accountText: string;
  categoryId: string;
  hasPoliceStation: boolean;
  categorySuggested: boolean;
};

export type FilingEvent =
  | { type: 'TELL_WHAT_HAPPENED' }
  | { type: 'SAVE_EVIDENCE_FIRST' }
  | { type: 'CONTINUE' }
  | { type: 'BACK' }
  | { type: 'START_AGAIN' }
  | { type: 'ACCEPT_CATEGORY' };

export const INITIAL_MACHINE: MachineState = {
  step: 'start',
  lane: 'main',
  generalEvidenceSeen: false,
  crisis: false,
  categoryAccepted: false,
};

export function detailsCanAdvance(state: MachineState, ctx: MachineContext): boolean {
  if (!ctx.hasPoliceStation) return false;
  if (ctx.categorySuggested && !state.categoryAccepted) return false;
  return true;
}

export function reduceFiling(state: MachineState, event: FilingEvent, ctx: MachineContext): MachineState {
  if (event.type === 'START_AGAIN') return { ...INITIAL_MACHINE };

  if (state.crisis && event.type !== 'START_AGAIN') return state;

  switch (event.type) {
    case 'TELL_WHAT_HAPPENED':
      if (state.step !== 'start') return state;
      return { ...state, step: 'account', lane: 'main' };
    case 'SAVE_EVIDENCE_FIRST':
      if (state.step !== 'start') return state;
      return { ...state, step: 'evidence', lane: 'express' };
    case 'CONTINUE': {
      if (state.step === 'account') {
        if (!ctx.accountText.trim()) return state;
        if (hasCrisisSignal(ctx.accountText)) return { ...state, crisis: true };
        return { ...state, step: 'details' };
      }
      if (state.step === 'evidence') {
        const next = { ...state, generalEvidenceSeen: true };
        if (!ctx.accountText.trim()) return { ...next, step: 'account' };
        return { ...next, step: 'details' };
      }
      if (state.step === 'details') {
        if (!detailsCanAdvance(state, ctx)) return state;
        return { ...state, step: 'preview' };
      }
      if (state.step === 'preview') return { ...state, step: 'otp' };
      return state;
    }
    case 'ACCEPT_CATEGORY':
      if (state.step !== 'details') return state;
      return { ...state, categoryAccepted: true };
    case 'BACK': {
      if (state.step === 'account') {
        return { ...state, step: state.lane === 'express' && !state.generalEvidenceSeen ? 'evidence' : 'start' };
      }
      if (state.step === 'evidence') {
        if (state.lane === 'express' && !ctx.accountText.trim()) return { ...state, step: 'start' };
        return { ...state, step: 'account' };
      }
      if (state.step === 'details') {
        if (state.lane === 'express' && !ctx.accountText.trim()) return { ...state, step: 'evidence' };
        return { ...state, step: 'account' };
      }
      if (state.step === 'preview') return { ...state, step: 'details' };
      if (state.step === 'otp') return { ...state, step: 'preview' };
      return state;
    }
    default:
      return state;
  }
}

export function filingCanContinue(state: MachineState, ctx: MachineContext): boolean {
  if (state.crisis) return false;
  if (state.step === 'account') return Boolean(ctx.accountText.trim());
  if (state.step === 'details') return detailsCanAdvance(state, ctx);
  return true;
}
