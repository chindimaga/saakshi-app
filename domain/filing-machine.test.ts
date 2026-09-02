import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_MACHINE, filingCanContinue, reduceFiling, type MachineContext, type MachineState } from './filing-machine.ts';
import { hasCrisisSignal } from './crisis.ts';

const ctx = (
  accountText: string,
  extras: { hasPoliceStation?: boolean; categorySuggested?: boolean; categoryId?: string } = {},
): MachineContext => ({
  accountText,
  categoryId: extras.categoryId ?? '',
  hasPoliceStation: extras.hasPoliceStation ?? false,
  categorySuggested: extras.categorySuggested ?? false,
});

test('account-first path skips evidence and goes to details', () => {
  let state: MachineState = INITIAL_MACHINE;
  state = reduceFiling(state, { type: 'TELL_WHAT_HAPPENED' }, ctx(''));
  assert.equal(state.step, 'account');
  state = reduceFiling(state, { type: 'CONTINUE' }, ctx('An obscene image was posted'));
  assert.equal(state.step, 'details');
  assert.equal(state.generalEvidenceSeen, false);
});

test('evidence-first then account reaches details without a second evidence screen', () => {
  let state: MachineState = INITIAL_MACHINE;
  state = reduceFiling(state, { type: 'SAVE_EVIDENCE_FIRST' }, ctx(''));
  assert.equal(state.step, 'evidence');
  assert.equal(state.lane, 'express');
  state = reduceFiling(state, { type: 'CONTINUE' }, ctx(''));
  assert.equal(state.step, 'account');
  state = reduceFiling(state, { type: 'CONTINUE' }, ctx('An obscene image was posted'));
  assert.equal(state.step, 'details');
});

test('evidence-first with existing account text goes to details', () => {
  let state: MachineState = INITIAL_MACHINE;
  state = reduceFiling(state, { type: 'SAVE_EVIDENCE_FIRST' }, ctx('An obscene image was posted'));
  state = reduceFiling(state, { type: 'CONTINUE' }, ctx('An obscene image was posted'));
  assert.equal(state.step, 'details');
  assert.equal(state.generalEvidenceSeen, true);
});

test('empty account cannot continue', () => {
  let state: MachineState = reduceFiling(INITIAL_MACHINE, { type: 'TELL_WHAT_HAPPENED' }, ctx(''));
  state = reduceFiling(state, { type: 'CONTINUE' }, ctx('   '));
  assert.equal(state.step, 'account');
});

test('crisis interrupt blocks continue until start again', () => {
  let state: MachineState = reduceFiling(INITIAL_MACHINE, { type: 'TELL_WHAT_HAPPENED' }, ctx(''));
  state = reduceFiling(state, { type: 'CONTINUE' }, ctx('i want to die'));
  assert.equal(state.crisis, true);
  state = reduceFiling(state, { type: 'CONTINUE' }, ctx('i want to die'));
  assert.equal(state.step, 'account');
  state = reduceFiling(state, { type: 'START_AGAIN' }, ctx('i want to die'));
  assert.equal(state.step, 'start');
  assert.equal(state.crisis, false);
});

test('station is required before preview', () => {
  const text = 'An obscene image was posted';
  let state: MachineState = INITIAL_MACHINE;
  state = reduceFiling(state, { type: 'TELL_WHAT_HAPPENED' }, ctx(text));
  state = reduceFiling(state, { type: 'CONTINUE' }, ctx(text));
  state = reduceFiling(state, { type: 'CONTINUE' }, ctx(text, { categorySuggested: false }));
  assert.equal(state.step, 'details');
  assert.equal(filingCanContinue(state, ctx(text, { hasPoliceStation: false })), false);
});

test('suggested category blocks preview until confirm', () => {
  const text = 'An obscene image was posted';
  const blocked = ctx(text, { hasPoliceStation: true, categorySuggested: true, categoryId: 'sexually_obscene_material' });
  let state: MachineState = { ...INITIAL_MACHINE, step: 'details' };
  state = reduceFiling(state, { type: 'CONTINUE' }, blocked);
  assert.equal(state.step, 'details');
  state = reduceFiling(state, { type: 'ACCEPT_CATEGORY' }, blocked);
  assert.equal(state.categoryAccepted, true);
  state = reduceFiling(state, { type: 'CONTINUE' }, blocked);
  assert.equal(state.step, 'preview');
});

test('uncertain category does not require confirm', () => {
  const text = 'something happened online';
  let state: MachineState = { ...INITIAL_MACHINE, step: 'details' };
  state = reduceFiling(state, { type: 'CONTINUE' }, ctx(text, { hasPoliceStation: true, categorySuggested: false }));
  assert.equal(state.step, 'preview');
});

test('preview continues to otp and back returns along the chain', () => {
  let state: MachineState = { ...INITIAL_MACHINE, step: 'preview', categoryAccepted: true };
  state = reduceFiling(state, { type: 'CONTINUE' }, ctx('An obscene image was posted', { hasPoliceStation: true }));
  assert.equal(state.step, 'otp');
  state = reduceFiling(state, { type: 'BACK' }, ctx('An obscene image was posted', { hasPoliceStation: true }));
  assert.equal(state.step, 'preview');
  state = reduceFiling(state, { type: 'BACK' }, ctx('An obscene image was posted', { hasPoliceStation: true }));
  assert.equal(state.step, 'details');
  state = reduceFiling(state, { type: 'BACK' }, ctx('An obscene image was posted'));
  assert.equal(state.step, 'account');
});

test('crisis helper matches under-18 and self-harm', () => {
  assert.equal(hasCrisisSignal('I am under 18'), true);
  assert.equal(hasCrisisSignal('hello'), false);
});
