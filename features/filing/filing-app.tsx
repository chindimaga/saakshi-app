'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- Vinext production navigation needs full-page anchors. */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CATEGORY_EDIT_IDS,
  CATEGORY_OPTIONS,
  EVIDENCE_ACCEPT,
  MEDIA_OPTIONS,
  NONE_CATEGORY,
  PLATFORM_OPTIONS,
  SCRIPTED_TRANSCRIPT,
  SCRIPTED_TRANSCRIPT_KN,
  SCRIPTED_TRANSCRIPT_TA,
  SUSPECT_IDENTIFIER_OPTIONS,
  checksumFile,
  classifyAccount,
  categoryCitizenLabel,
  categoryFromAssessment,
  categorySelectOptionLabel,
  evidenceForLane,
  extractFacts,
  mergePrefill,
  platformFromFact,
  validateEvidenceFile,
  validateEvidenceFileContent,
  type CategoryAssessment,
  type CategoryId,
  type CategoryResult,
  type EvidenceDefinition,
  type EvidenceValue,
  type PrefillMediaType,
  type PrefillPlatform,
  type SuspectIdentifierType,
} from '../../domain/catalog';
import { clearDraft, emptyDraft, isCategorySuggested, readDraft, writeDraft, type ComplaintDraft, type PersonDetail, type PoliceStationChoice } from '../../domain/draft';
import { detailsCanAdvance, reduceFiling, type FilingEvent, type MachineContext } from '../../domain/filing-machine';
import { SakshiChrome, HelplineFooter } from '../chrome/sakshi-chrome';
import { CrisisOverlay } from '../crisis/crisis-overlay';
import { Button } from '../../shared/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '../../shared/ui/dialog';
import { Input, Label, Textarea } from '../../shared/ui/input';
import { StartPresence } from '../../shared/ui/start-presence';
import { useCopy } from '../../shared/i18n/use-locale';
import { transcribeLanguage, scriptLang, cityLabel } from '../../shared/i18n/copy';
import * as api from '../../shared/api';
import { KARNATAKA_CITIES } from '../../app/api/police-stations';

const selectClass = 'w-full min-h-[var(--tap)] rounded-md border border-[var(--input-border)] bg-[var(--surface)] px-3';

function machineContext(draft: ComplaintDraft): MachineContext {
  return {
    accountText: draft.accountText,
    categoryId: draft.category?.id && draft.category.id !== 'none' ? draft.category.id : '',
    hasPoliceStation: Boolean(draft.policeStation),
    categorySuggested: isCategorySuggested(draft),
  };
}

function platformLabel(id: PrefillPlatform | '') {
  return PLATFORM_OPTIONS.find((option) => option.id === id)?.label ?? '';
}

function carryEvidenceForward(draft: ComplaintDraft): Partial<ComplaintDraft> {
  const profileUrl = draft.evidence.profile_url.value.trim();
  const firstSeen = draft.evidence.first_seen.value.trim();
  const platform = platformFromFact(draft.evidence.platform.value);
  const screenshot = draft.evidence.screenshot.fileName || draft.evidence.screenshot.value;
  return {
    accountIdentifier: draft.accountIdentifier || profileUrl,
    firstSeen: draft.firstSeen || firstSeen,
    platform: draft.platform || platform,
    supportingFile: draft.supportingFile || screenshot,
  };
}

function savedEvidence(draft: ComplaintDraft) {
  return evidenceForLane('general').flatMap((item) => {
    const value = draft.evidence[item.id];
    if (value.state !== 'captured') return [];
    const savedValue = value.fileName || value.value;
    return savedValue ? [{ id: item.id, label: item.label, value: savedValue }] : [];
  });
}

export function FilingApp() {
  const { t, locale } = useCopy();
  const [draft, setDraft] = useState<ComplaintDraft>(emptyDraft);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState('');
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [voiceMessage, setVoiceMessage] = useState('');
  const [pendingEvidence, setPendingEvidence] = useState<File[]>([]);
  const [pendingSupportingEvidenceCount, setPendingSupportingEvidenceCount] = useState(0);
  const [createdCaseId, setCreatedCaseId] = useState('');
  const [otpPhase, setOtpPhase] = useState<'phone' | 'code' | 'saving'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [stationSearch, setStationSearch] = useState('');
  const [stationOptionsOpen, setStationOptionsOpen] = useState(false);
  const [stations, setStations] = useState<PoliceStationChoice[]>([]);
  const [stationSuggestion, setStationSuggestion] = useState<PoliceStationChoice | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [needsPoliceStation, setNeedsPoliceStation] = useState(false);
  const [needsCategoryConfirm, setNeedsCategoryConfirm] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const stationCardRef = useRef<HTMLElement | null>(null);
  const draftRef = useRef(draft);
  const loadedCityRef = useRef('');
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    const stored = readDraft();
    const hydrate = window.setTimeout(() => {
      setDraft(stored);
      setStationSearch(stored.policeStation?.name ?? '');
      setReady(true);
    }, 0);
    return () => window.clearTimeout(hydrate);
  }, []);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [draft.machine.step]);

  const persist = useCallback((next: ComplaintDraft) => {
    const cleaned = { ...next, restored: false };
    draftRef.current = cleaned;
    setDraft(cleaned);
    writeDraft(cleaned);
  }, []);

  const loadStations = useCallback(async (city: string) => {
    if (!city) {
      setStations([]);
      return;
    }
    try {
      const result = await api.fetchStations(city);
      const list = (result.available_stations as PoliceStationChoice[]) ?? [];
      setStations(list);
      // The API returns a city's stations sorted by distance from the district centre, so [0] is the nearest.
      if (list.length && !draftRef.current.policeStation) {
        persist({ ...draftRef.current, policeStation: list[0] });
        setStationSearch(list[0].name);
      }
    } catch {
      setStations([]);
    }
  }, [persist]);

  const send = (event: FilingEvent, patch: Partial<ComplaintDraft> = {}) => {
    const next = { ...draftRef.current, ...patch };
    next.machine = reduceFiling(next.machine, event, machineContext(next));
    persist(next);
    return next;
  };

  const startAgain = () => {
    recorder.current?.stop();
    recorder.current = null;
    setRecordingState('idle');
    setVoiceMessage('');
    setPendingEvidence([]);
    setPendingSupportingEvidenceCount(0);
    setCreatedCaseId('');
    clearDraft();
    persist(emptyDraft());
    setOtpPhase('phone');
    setPhone('');
    setOtp('');
    setStationSearch('');
    setStationSuggestion(null);
    setNeedsPoliceStation(false);
    setNeedsCategoryConfirm(false);
    loadedCityRef.current = '';
  };

  useEffect(() => {
    if (draft.machine.step !== 'details' || !draft.policeStationCity) return;
    if (loadedCityRef.current === draft.policeStationCity) return;
    loadedCityRef.current = draft.policeStationCity;
    void loadStations(draft.policeStationCity);
  }, [draft.machine.step, draft.policeStationCity, loadStations]);

  if (!ready) return null;
  if (draft.machine.crisis) {
    return (
      <div className="site-shell">
        <SakshiChrome showStartAgain onStartAgain={startAgain} />
        <CrisisOverlay onStartAgain={startAgain} />
        <HelplineFooter />
      </div>
    );
  }

  const facts = extractFacts(draft.accountText);
  const general = evidenceForLane('general');
  const step = draft.machine.step;
  const sample = locale === 'kn' ? SCRIPTED_TRANSCRIPT_KN : locale === 'ta' ? SCRIPTED_TRANSCRIPT_TA : SCRIPTED_TRANSCRIPT;
  const platformDetails = PLATFORM_OPTIONS.find((option) => option.id === draft.platform);
  const matchingStations = stationSearch.trim()
    ? stations.filter((station) => station.name.toLowerCase().includes(stationSearch.trim().toLowerCase()))
    : stations;
  const wide = step === 'details' || step === 'preview' || step === 'otp';
  const requiredItemsRemaining = Number(!draft.policeStation) + Number(isCategorySuggested(draft) && !draft.machine.categoryAccepted);
  const requiredItemsMessage = requiredItemsRemaining === 1
    ? t.requiredItemLeft.replace('{count}', String(requiredItemsRemaining))
    : t.requiredItemsLeft.replace('{count}', String(requiredItemsRemaining));

  async function captureEvidence(id: EvidenceDefinition['id'], file: File) {
    const formatError = validateEvidenceFile(file) || await validateEvidenceFileContent(file);
    if (formatError) {
      setBusy(formatError);
      return;
    }
    const checksum = await checksumFile(file);
    setPendingEvidence((current) => [...current, file]);
    setPendingSupportingEvidenceCount((count) => count + 1);
    persist({
      ...draftRef.current,
      evidence: {
        ...draftRef.current.evidence,
        [id]: { value: file.name, state: 'captured', fileName: file.name, sizeBytes: file.size, checksum },
      },
      supportingFile: id === 'screenshot' ? file.name : draftRef.current.supportingFile,
    });
    setBusy('');
  }

  async function capturePersonFile(file: File) {
    const formatError = validateEvidenceFile(file) || await validateEvidenceFileContent(file);
    if (formatError) {
      setBusy(formatError);
      return;
    }
    setPendingEvidence((current) => [...current, file]);
    persist({ ...draftRef.current, personFile: file.name });
    setBusy('');
  }

  async function startVoice() {
    setVoiceMessage('');
    try {
      persist({ ...draftRef.current, voiceDisclosed: true, accountMode: 'voice' });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream);
      chunks.current = [];
      media.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      media.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        recorder.current = null;
        setRecordingState('transcribing');
        try {
          const blob = new Blob(chunks.current, { type: media.mimeType || 'audio/webm' });
          const result = await api.transcribeAudio(blob, transcribeLanguage(locale));
          const current = draftRef.current;
          persist({ ...current, accountText: [current.accountText, result.transcript].filter(Boolean).join('\n').trim(), voiceDisclosed: true, accountMode: 'voice' });
        } catch (error) {
          setVoiceMessage(error instanceof Error ? error.message : 'Could not turn speech into text. You can type instead.');
        } finally {
          setRecordingState('idle');
        }
      };
      recorder.current = media;
      media.start();
      setRecordingState('recording');
    } catch (error) {
      setRecordingState('idle');
      setVoiceMessage(error instanceof Error ? error.message : 'Could not start recording. You can type instead.');
    }
  }

  async function stopVoice() {
    recorder.current?.stop();
  }

  async function categorizeAndPrefill(account: string) {
    setBusy(t.categoryBusy);
    try {
      const { assessment } = await api.categorizeAccount(account);
      const parsed = assessment as CategoryAssessment;
      const fromService = categoryFromAssessment(parsed);
      applyCategoryPrefill(fromService ?? classifyAccount(account), fromService?.prefill ?? parsed.prefill, account);
    } catch {
      applyCategoryPrefill(classifyAccount(account), undefined, account);
    } finally {
      setBusy('');
    }
  }

  function applyCategoryPrefill(category: CategoryResult, prefill: CategoryAssessment['prefill'] | undefined, account: string) {
    const current = draftRef.current;
    if (current.machine.categoryAccepted) {
      const merged = mergePrefill(current, current.category ?? category, prefill, account);
      persist({ ...current, platform: merged.platform, accountIdentifier: merged.accountIdentifier, mediaType: merged.mediaType, firstSeen: merged.firstSeen });
      return;
    }
    const merged = mergePrefill(current, category, prefill, account);
    persist({
      ...current,
      category: merged.category,
      platform: merged.platform,
      accountIdentifier: merged.accountIdentifier,
      mediaType: merged.mediaType,
      firstSeen: merged.firstSeen,
      machine: { ...current.machine, categoryAccepted: false },
    });
  }

  async function continueFromAccount() {
    const next = send({ type: 'CONTINUE' });
    if (next.machine.step === 'details') void categorizeAndPrefill(next.accountText);
  }

  function continueFromEvidence() {
    send({ type: 'CONTINUE' }, carryEvidenceForward(draftRef.current));
  }

  async function loadStationsForCity(name: string) {
    const current = draftRef.current;
    persist({ ...current, policeStationCity: name, policeStation: name === current.policeStationCity ? current.policeStation : null });
    loadedCityRef.current = name;
    await loadStations(name);
  }

  function chooseCategory(id: CategoryId | 'none') {
    const current = draftRef.current;
    const option: CategoryResult = id === 'none'
      ? { ...NONE_CATEGORY }
      : { ...CATEGORY_OPTIONS[id], reason: 'You chose this description.', confidence: 'confident', source: 'manual', quotes: [] };
    persist({
      ...current,
      category: option,
      machine: { ...current.machine, categoryAccepted: true },
    });
    setNeedsCategoryConfirm(false);
  }

  function goToPreview() {
    const current = draftRef.current;
    const ctx = machineContext(current);
    if (!detailsCanAdvance(current.machine, ctx)) {
      if (!current.policeStation) {
        setNeedsPoliceStation(true);
        setBusy(t.chooseBeforePreview);
        window.requestAnimationFrame(() => {
          stationCardRef.current?.focus({ preventScroll: true });
          stationCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      } else {
        setNeedsCategoryConfirm(true);
        setBusy(t.confirmCategoryFirst);
      }
      return;
    }
    setNeedsPoliceStation(false);
    setNeedsCategoryConfirm(false);
    setBusy('');
    send({ type: 'CONTINUE' });
  }

  async function saveToPhone() {
    setOtpPhase('saving');
    setBusy(t.otpSaving);
    try {
      let caseId = createdCaseId;
      if (!caseId) {
        const current = draftRef.current;
        const result = await api.createCase({
          summary: current.accountText.slice(0, 600),
          category_id: current.category?.id ?? 'none',
          category_label: current.category?.citizenLabel ?? 'Not categorised',
          platform: current.otherPlatform || platformLabel(current.platform) || current.platform,
          police_station: current.policeStation?.name ?? '',
          details: {
            account: current.accountText,
            incident: { platform: current.platform, accountIdentifier: current.accountIdentifier, mediaType: current.mediaType, otherPlatform: current.otherPlatform },
            first_seen: current.firstSeen,
            supporting_file: current.supportingFile || current.evidence.screenshot.fileName || current.evidence.screenshot.value,
            evidence: savedEvidence(current),
            police_station: current.policeStation,
            suspect_details: current.persons,
            suspect_notes: current.personNotes,
            suspect_file: current.personFile,
          },
        });
        caseId = (result.case as { id: string }).id;
        setCreatedCaseId(caseId);
      }
      for (const file of pendingEvidence) {
        await api.addEvidenceFile(caseId, file);
        setPendingEvidence((current) => current.filter((item) => item !== file));
      }
      clearDraft();
      location.assign('/filed');
    } catch (error) {
      setOtpPhase('code');
      setBusy(error instanceof Error ? error.message : 'Could not save.');
    }
  }

  return (
    <div className="site-shell">
      <SakshiChrome
        showStartAgain={step !== 'start'}
        onStartAgain={startAgain}
        onBrandClick={step === 'start' ? startAgain : undefined}
      />
      {draft.restored && step !== 'start' ? (
        <div className={`page-main ${wide ? 'is-wide' : ''}`} style={{ paddingBottom: 0 }}>
          <p className="card">{t.restore}</p>
        </div>
      ) : null}

      {step === 'start' ? (
        <main className="page-main start-screen stack">
          <div className="start-hero">
            <div className="start-presence" aria-hidden="true">
              <StartPresence />
            </div>
            <div className="start-copy">
              <h1>{t.startTitle}</h1>
              <p>{t.startLede}</p>
              <p>{t.trustLine}</p>
            </div>
          </div>
          {draft.restored ? (
            <div className="start-restore">
              <p className="muted">{t.restore}</p>
              <Button variant="link" size="inline" onClick={() => send({ type: 'TELL_WHAT_HAPPENED' })}>{t.continue}</Button>
            </div>
          ) : null}
          <div className="start-doors">
            <button type="button" className="door is-primary" onClick={() => send({ type: 'TELL_WHAT_HAPPENED' })}>
              <strong>{t.doorTell}</strong>
              <span>{t.doorTellHint}</span>
            </button>
            <button type="button" className="door" onClick={() => send({ type: 'SAVE_EVIDENCE_FIRST' })}>
              <strong>{t.doorEvidence}</strong>
              <span>{t.doorEvidenceHint}</span>
            </button>
            <a className="door" href="/filed?verify=1">
              <strong>{t.doorFiled}</strong>
              <span>{t.doorFiledHint}</span>
            </a>
          </div>
          <nav className="start-links" aria-label="Before you begin">
            <a href="/workflow">{t.howItWorks}</a>
            <a href="/whats-real">{t.helpSupport}</a>
          </nav>
        </main>
      ) : null}

      {step === 'account' ? (
        <main className="page-main account-screen stack">
          <p className="kicker">{t.accountKicker}</p>
          <h1>{t.accountTitle}</h1>
          <p>{t.accountCopy}</p>
          <section className="sample-complaint-cta" aria-label={t.sampleComplaintTitle}>
            <div>
              <span className="kicker">{t.sampleComplaintKicker}</span>
              <strong>{t.sampleComplaintTitle}</strong>
              <p>{t.sampleComplaintCopy}</p>
            </div>
            <Button onClick={() => persist({ ...draft, accountText: sample, accountMode: 'type' })}>{t.fillSample}</Button>
          </section>

          <div className="account-mode-switch" role="tablist" aria-label={t.accountKicker}>
            <button
              type="button"
              role="tab"
              aria-selected={draft.accountMode === 'voice'}
              disabled={recordingState !== 'idle'}
              onClick={() => persist({ ...draft, accountMode: 'voice' })}
            >{t.speak}</button>
            <button
              type="button"
              role="tab"
              aria-selected={draft.accountMode !== 'voice'}
              disabled={recordingState !== 'idle'}
              onClick={() => persist({ ...draft, accountMode: 'type' })}
            >{t.type}</button>
          </div>

          <section className="account-composer" aria-label={t.accountKicker}>
            {draft.accountMode === 'voice' ? (
              <section className={`voice-stage is-${recordingState}`} aria-live="polite">
                <div className="voice-orb" aria-hidden="true" />
                {recordingState === 'idle' ? (
                  <>
                    <strong>{t.voiceReady}</strong>
                    <Button size="inline" onClick={() => void startVoice()}>{t.startRecording}</Button>
                  </>
                ) : null}
                {recordingState === 'recording' ? (
                  <>
                    <strong className="recording-label"><i />{t.recordingNow}</strong>
                    <p>{t.accountCopy}</p>
                    <Button variant="secondary" size="inline" className="stop-recording-button" onClick={() => void stopVoice()}>{t.stopRecording}</Button>
                  </>
                ) : null}
                {recordingState === 'transcribing' ? <strong>{t.turningSpeech}</strong> : null}
              </section>
            ) : null}

            <div className="account-text">
              <Label htmlFor="account">{t.whatHappened}</Label>
              <p className="muted">{draft.accountText.trim() ? t.editWords : t.writeOwnWords}</p>
              <Textarea
                id="account"
                lang={scriptLang(draft.accountText, locale)}
                style={{ fontSize: 19, lineHeight: 1.85 }}
                value={draft.accountText}
                placeholder={t.whatHappened}
                onChange={(event) => persist({ ...draft, accountText: event.target.value, accountMode: 'type' })}
              />
            </div>
            <Button disabled={!draft.accountText.trim() || recordingState !== 'idle'} onClick={() => void continueFromAccount()}>{t.continue}</Button>
            <p className="category-transfer-note">{t.prefillNote}</p>
          </section>
          {voiceMessage ? <p className="voice-message" role="status">{voiceMessage}</p> : null}
          <Button variant="ghost" onClick={() => send({ type: 'BACK' })}>{t.back}</Button>
        </main>
      ) : null}

      {step === 'evidence' ? (
        <EvidenceBlock
          title={t.evidenceTitle}
          copy={t.evidenceCopy}
          gaps={t.evidenceGaps}
          kicker={t.evidenceKicker}
          optional={t.evidenceOptional}
          optionalStatus={t.evidenceOptionalStatus}
          skip={t.skipForNow}
          continueWithoutEvidence={t.continueWithoutEvidence}
          chooseFile={t.chooseAFile}
          items={general}
          draft={draft}
          persist={persist}
          captureFile={captureEvidence}
          onBack={() => send({ type: 'BACK' })}
          onContinue={continueFromEvidence}
          back={t.back}
          cont={t.continue}
        />
      ) : null}

      {step === 'details' ? (
        <main className="page-main is-wide stack details-screen">
          <p className="kicker">{t.detailsKicker}</p>
          <h1>{t.detailsTitle}</h1>
          <p>{t.detailsCopy}</p>
          {busy === t.categoryBusy ? (
            <div className="category-processing" role="status" aria-live="polite">
              <span className="category-processing-spinner" aria-hidden="true" />
              <div>
                <strong>{t.categoryBusy}</strong>
                <span>{t.categoryBusyDetail}</span>
              </div>
            </div>
          ) : null}

          <section className="card stack suggested-category-card" aria-label={t.suggestedComplaintType}>
              <span className="kicker">{t.suggestedComplaintType}</span>
              {draft.category && draft.category.id !== 'none' ? (
                <div className="suggested-category-summary">
                  <strong>{categoryCitizenLabel(draft.category)}</strong>
                  <span className="muted">{draft.category.label}</span>
                  <p>{t.suggestedComplaintCopy}</p>
                </div>
              ) : null}
              <label className="form-field category-picker-desktop">
                <span>{t.typeOfComplaint}</span>
                <select className={selectClass} aria-label={t.typeOfComplaint} value={draft.category?.id ?? 'none'} onChange={(event) => chooseCategory(event.target.value as CategoryId | 'none')}>
                  <option value="none">{t.chooseClosestType}</option>
                  {CATEGORY_EDIT_IDS.filter((id) => id !== 'none').map((id) => <option key={id} value={id}>{categorySelectOptionLabel(id)}</option>)}
                </select>
              </label>
              <Dialog open={categoryPickerOpen} onOpenChange={setCategoryPickerOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="category-picker-mobile">{t.changeComplaintType}</Button>
                </DialogTrigger>
                <DialogContent className="category-picker-dialog" aria-describedby="category-picker-copy">
                  <div className="stack">
                    <DialogTitle>{t.typeOfComplaint}</DialogTitle>
                    <DialogDescription id="category-picker-copy" className="muted">{t.chooseClosestType}</DialogDescription>
                    <div className="category-option-list" role="list">
                      <Button
                        variant="secondary"
                        className={(draft.category?.id ?? 'none') === 'none' ? 'is-selected' : ''}
                        onClick={() => { chooseCategory('none'); setCategoryPickerOpen(false); }}
                      >{t.chooseClosestType}</Button>
                      {CATEGORY_EDIT_IDS.filter((id) => id !== 'none').map((id) => (
                        <Button
                          key={id}
                          variant="secondary"
                          className={draft.category?.id === id ? 'is-selected' : ''}
                          onClick={() => { chooseCategory(id); setCategoryPickerOpen(false); }}
                        >{categorySelectOptionLabel(id)}</Button>
                      ))}
                    </div>
                    <DialogClose asChild>
                      <Button variant="ghost">{t.closeAction}</Button>
                    </DialogClose>
                  </div>
                </DialogContent>
              </Dialog>
              {needsCategoryConfirm ? <p role="alert">{t.confirmCategoryFirst}</p> : null}
              {!draft.machine.categoryAccepted && isCategorySuggested(draft) ? (
                <Button onClick={() => { send({ type: 'ACCEPT_CATEGORY' }); setNeedsCategoryConfirm(false); setBusy(''); }}>{t.confirmThisType}</Button>
              ) : null}
          </section>

          <EvidenceCarriedForward draft={draft} title={t.evidenceCarriedTitle} copy={t.evidenceCarriedCopy} />

          <section
            ref={stationCardRef}
            tabIndex={-1}
            className={`card stack ${needsPoliceStation ? 'missing-required' : ''}`}
            aria-labelledby="police-station-title"
          >
            <div>
              <span className="kicker">{t.stationRequired}</span>
              <h2 id="police-station-title">{t.stationTitle}</h2>
              <p className="muted">{t.stationCopy}</p>
            </div>
            <Button
              variant="secondary"
              disabled={locating}
              className={locating ? 'disabled:opacity-70' : ''}
              onClick={() => {
                if (!navigator.geolocation) {
                  setLocationError(t.locationFailed);
                  return;
                }
                setLocationError('');
                setLocating(true);
                navigator.geolocation.getCurrentPosition(async (pos) => {
                  try {
                    const nearest = await api.fetchNearest(pos.coords.latitude, pos.coords.longitude);
                    const station = nearest as unknown as PoliceStationChoice;
                    const city = station.city ?? draftRef.current.policeStationCity;
                    persist({ ...draftRef.current, policeStation: station, policeStationCity: city });
                    loadedCityRef.current = city;
                    setStationSearch(station.name);
                    setStationSuggestion(station);
                    setNeedsPoliceStation(false);
                    if (Array.isArray(nearest.available_stations)) setStations(nearest.available_stations as PoliceStationChoice[]);
                  } catch (error) {
                    setLocationError(error instanceof Error ? error.message : t.locationFailed);
                  } finally {
                    setLocating(false);
                  }
                }, () => {
                  setLocationError(t.locationFailed);
                  setLocating(false);
                }, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 });
              }}
            >
              {locating ? <span className="category-processing-spinner" aria-hidden="true" /> : null}
              {locating ? t.locating : t.useLocation}
            </Button>
            <p className="muted">{t.stationCoverageNote}</p>
            {stationSuggestion ? (
              <div className="card stack">
                <span className="kicker">{t.suggestedStation}</span>
                <strong>{stationSuggestion.name}</strong>
                {typeof stationSuggestion.distance_km === 'number' ? (
                  <small className="muted">{stationSuggestion.distance_km.toFixed(1)} {t.kmAway}</small>
                ) : null}
                <Button onClick={() => {
                  persist({ ...draftRef.current, policeStation: stationSuggestion, policeStationCity: stationSuggestion.city ?? draftRef.current.policeStationCity });
                  setStationSearch(stationSuggestion.name);
                  setStationSuggestion(null);
                  setNeedsPoliceStation(false);
                }}>{t.useThisStation}</Button>
                <Button variant="secondary" onClick={() => { setStationSuggestion(null); setStationSearch(''); persist({ ...draftRef.current, policeStation: null }); }}>{t.chooseAnotherStation}</Button>
              </div>
            ) : null}
            {locationError ? <p className="voice-message" role="alert">{locationError}</p> : null}
            {needsPoliceStation ? <p role="alert">{t.chooseBeforePreview}</p> : null}
            <div className="station-picker-grid">
              <label>
                <span>{t.state}</span>
                <select className={selectClass} defaultValue="Karnataka" aria-label={t.state}>
                  <option value="Karnataka">{t.karnataka}</option>
                </select>
              </label>
              <label>
                <span>{t.cityOrDistrict}</span>
                <select
                  className={selectClass}
                  aria-label={t.cityOrDistrict}
                  value={draft.policeStationCity}
                  onChange={(event) => {
                    setStationSearch('');
                    setStationSuggestion(null);
                    void loadStationsForCity(event.target.value);
                  }}
                >
                  <option value="">{t.chooseCity}</option>
                  {KARNATAKA_CITIES.map((city) => (
                    <option key={city.name} value={city.name}>{cityLabel(city.name, locale)}</option>
                  ))}
                </select>
              </label>
              <label className="station-typeahead">
                <span>{t.policeStation}</span>
                <Input
                  aria-label={t.policeStation}
                  autoComplete="off"
                  disabled={!draft.policeStationCity}
                  value={stationSearch || draft.policeStation?.name || ''}
                  placeholder={draft.policeStationCity ? t.stationSearchPlaceholder : t.chooseCityFirst}
                  onChange={(event) => {
                    setStationSearch(event.target.value);
                    setStationOptionsOpen(true);
                    setStationSuggestion(null);
                    persist({ ...draftRef.current, policeStation: null });
                  }}
                  onFocus={() => setStationOptionsOpen(true)}
                />
              </label>
            </div>
            {!draft.policeStation && (stationSearch.trim() || stationOptionsOpen) && draft.policeStationCity ? (
              <div className="stack" role="listbox" aria-label={t.policeStation}>
                {matchingStations.map((station) => (
                  <Button key={`${station.name}-${station.latitude}`} variant="ghost" onClick={() => {
                    persist({ ...draftRef.current, policeStation: station });
                    setStationSearch(station.name);
                    setStationOptionsOpen(false);
                    setStationSuggestion(null);
                    setNeedsPoliceStation(false);
                  }}>{station.name}</Button>
                ))}
                {matchingStations.length === 0 ? <p className="muted">{t.noStations}</p> : null}
              </div>
            ) : null}
            {draft.policeStation ? <p>{draft.policeStation.name}</p> : null}
          </section>

          <section className="card stack incident-details-card" aria-labelledby="incident-details-title">
            <div className="section-heading">
              <span className="kicker">{t.evidenceOptionalStatus}</span>
              <h2 id="incident-details-title">{t.incidentDetailsTitle}</h2>
              <p className="muted">{t.incidentDetailsCopy}</p>
            </div>
            <div className="details-fields incident-details-grid">
              <label className="form-field">
              <span>{t.whereDidThisHappen}</span>
              <select className={selectClass} aria-label={t.whereDidThisHappen} value={draft.platform} onChange={(event) => persist({ ...draft, platform: event.target.value as PrefillPlatform | '' })}>
                <option value="">{t.selectService}</option>
                {PLATFORM_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
              {facts.platform.value && !draft.platform ? <small className="muted">{t.prefilledFromAccount.replace('{value}', facts.platform.value)}</small> : null}
            </label>
            <label className="form-field">
              <span>{t.typeOfMedia}</span>
              <select className={selectClass} aria-label={t.typeOfMedia} value={draft.mediaType} onChange={(event) => persist({ ...draft, mediaType: event.target.value as PrefillMediaType | '' })}>
                <option value="">{t.selectMediaType}</option>
                {MEDIA_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            {draft.platform === 'other' ? (
              <label className="form-field incident-field-wide">
                <span>{t.labelService}</span>
                <Input value={draft.otherPlatform} onChange={(event) => persist({ ...draft, otherPlatform: event.target.value })} placeholder={t.otherPlatformPlaceholder} />
              </label>
            ) : null}
            {platformDetails ? (
              <label className="form-field">
                <span>{platformDetails.identifierLabel}</span>
                <Input value={draft.accountIdentifier} onChange={(event) => persist({ ...draft, accountIdentifier: event.target.value })} placeholder={platformDetails.placeholder} />
                <small className="muted">{t.identifierHelp}</small>
              </label>
            ) : null}
            <label className="form-field">
              <span>{t.whenFirstSeen}</span>
              <Input value={draft.firstSeen} onChange={(event) => persist({ ...draft, firstSeen: event.target.value })} placeholder={t.firstSeenPlaceholder} />
              {facts.first_seen.value && !draft.firstSeen ? <small className="muted">{t.prefilledCorrect}</small> : null}
            </label>
            <div className="supporting-file-upload incident-field-wide">
              <div>
                <span>{t.supportingEvidence}</span>
                <span className="muted">{t.supportingEvidenceHelp}</span>
              </div>
              <label className="supporting-file-picker">
                <input type="file" multiple accept={EVIDENCE_ACCEPT} onChange={(event) => {
                  for (const file of Array.from(event.target.files ?? [])) void captureEvidence('screenshot', file);
                  event.currentTarget.value = '';
                }} />
                <span className="supporting-file-picker-icon" aria-hidden="true">+</span>
                <span className="supporting-file-picker-copy">
                  <strong>{pendingSupportingEvidenceCount ? t.chooseAnotherFile : t.chooseAFile}</strong>
                  <small>Audio, video, photo, or PDF</small>
                </span>
              </label>
              {pendingSupportingEvidenceCount ? (
                <p className="supporting-file-selected" role="status">
                  <span aria-hidden="true">✓</span>
                  <span><strong>{pendingSupportingEvidenceCount} file{pendingSupportingEvidenceCount === 1 ? '' : 's'} ready to add</strong></span>
                </p>
              ) : null}
            </div>
            <label className="form-field incident-field-wide">
              <span>{t.additionalIncidentInfo}</span>
              <Textarea rows={7} value={draft.accountText} onChange={(event) => persist({ ...draft, accountText: event.target.value })} />
              <small className="muted">{t.prefilledFromTold}</small>
            </label>
            </div>
          </section>

          <section className="card stack">
            <span className="kicker">{t.evidenceOptionalStatus}</span>
            <div className="saved-case-heading">
              <div>
                <h2>{t.personHeading}</h2>
                <p className="muted">{t.personHint}</p>
              </div>
              <Button variant="secondary" size="inline" onClick={() => persist({
                ...draft,
                persons: [...draft.persons, { id: `person-${Date.now()}`, name: '', identifierType: 'other', identifier: '' }],
              })}>{t.addDetail}</Button>
            </div>
            {draft.persons.map((person, index) => {
              const option = SUSPECT_IDENTIFIER_OPTIONS.find((item) => item.id === person.identifierType) ?? SUSPECT_IDENTIFIER_OPTIONS.at(-1)!;
              return (
                <article key={person.id} className="card stack">
                  <div className="saved-case-heading">
                    <span>{t.detailLabel} {index + 1}</span>
                    <Button variant="link" size="inline" onClick={() => persist({ ...draft, persons: draft.persons.filter((item) => item.id !== person.id) })}>{t.remove}</Button>
                  </div>
                  <Label>{t.nameIfKnown}</Label>
                  <Input value={person.name} placeholder={t.namePlaceholder} onChange={(event) => updatePerson(draft, persist, person.id, { name: event.target.value })} />
                  <Label>{t.detailType}</Label>
                  <select className={selectClass} value={person.identifierType} onChange={(event) => updatePerson(draft, persist, person.id, { identifierType: event.target.value as SuspectIdentifierType, identifier: '' })}>
                    {SUSPECT_IDENTIFIER_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                  <Label>{option.label}</Label>
                  <Input value={person.identifier} placeholder={option.placeholder} onChange={(event) => updatePerson(draft, persist, person.id, { identifier: event.target.value })} />
                </article>
              );
            })}
            <Label>{t.otherPersonInfo}</Label>
            <Textarea value={draft.personNotes} placeholder={t.otherPersonPlaceholder} onChange={(event) => persist({ ...draft, personNotes: event.target.value })} />
            <div className="person-file-upload">
              <div>
                <Label>{t.photoIdentifying}</Label>
                <span className="muted">{t.photoIdentifyingHelp}</span>
              </div>
              <label className="person-file-picker">
                <input type="file" accept={IDENTIFYING_FILE_ACCEPT} onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void capturePersonFile(file);
                  event.currentTarget.value = '';
                }} />
                <span className="person-file-picker-icon" aria-hidden="true">↑</span>
                <span className="person-file-picker-copy">
                  <strong>{draft.personFile ? t.chooseAnotherFile : t.chooseImageOrPdf}</strong>
                  <small>JPG, PNG, HEIC, WebP, or PDF</small>
                </span>
              </label>
              {draft.personFile ? (
                <p className="person-file-selected" role="status">
                  <span aria-hidden="true">✓</span>
                  <span><strong>{t.selectedFile}</strong> {draft.personFile}</span>
                </p>
              ) : null}
            </div>
          </section>

          {busy && busy !== t.categoryBusy ? <p role="alert">{busy}</p> : null}
          <div className="details-actions">
            <Button className="details-primary-action" onClick={goToPreview}>{t.previewComplaint}</Button>
            <Button variant="ghost" onClick={() => send({ type: 'BACK' })}>{t.back}</Button>
          </div>
          <div className="mobile-preview-bar">
            {requiredItemsRemaining ? <span aria-live="polite">{requiredItemsMessage}</span> : null}
            <Button onClick={goToPreview}>{t.previewComplaint}</Button>
          </div>
        </main>
      ) : null}

      {step === 'preview' ? (
        <main className="page-main is-wide stack">
          <p className="kicker">{t.previewKicker}</p>
          <h1>{t.previewTitle}</h1>
          <p>{t.fileYours}</p>
          <section className="card stack">
            <h2>{t.yourAccount}</h2>
            <p lang={scriptLang(draft.accountText, locale)}>{draft.accountText}</p>
            <Button variant="link" size="inline" onClick={() => send({ type: 'BACK' })}>{t.editDetails}</Button>
          </section>
          <section className="card stack">
            <h2>{t.complaintDetailsHeading}</h2>
            <div className="fact-list">
              <article><strong>{t.labelComplaintType}</strong><span>{categoryCitizenLabel(draft.category)}{draft.category && draft.category.id !== 'none' ? ` (${draft.category.label})` : ''}</span></article>
              <article><strong>{t.labelService}</strong><span>{draft.otherPlatform || platformLabel(draft.platform) || t.valueNotSelected}</span></article>
              <article><strong>{t.labelAccountOrIdentifier}</strong><span>{draft.accountIdentifier || t.valueNotAdded}</span></article>
              <article><strong>{t.labelFirstSeen}</strong><span>{draft.firstSeen || t.valueNotAdded}</span></article>
              <article><strong>{t.labelSupportingFile}</strong><span>{draft.supportingFile || draft.evidence.screenshot.fileName || t.valueNotAdded}</span></article>
              {draft.policeStation ? <article><strong>{t.policeStation}</strong><span>{draft.policeStation.name}</span></article> : null}
            </div>
          </section>
          <EvidenceCarriedForward draft={draft} title={t.evidenceCarriedTitle} copy={t.evidenceCarriedCopy} />
          <section className="card stack">
            <h2>{t.personHeading}</h2>
            {draft.persons.length || draft.personNotes || draft.personFile ? (
              <div className="fact-list">
                {draft.persons.map((person) => (
                  <article key={person.id}>
                    <strong>{person.name || t.personHeading}</strong>
                    <span>{SUSPECT_IDENTIFIER_OPTIONS.find((item) => item.id === person.identifierType)?.label}: {person.identifier || t.valueNotAdded}</span>
                  </article>
                ))}
                {draft.personFile ? <article><strong>{t.labelSupportingFile}</strong><span>{draft.personFile}</span></article> : null}
                {draft.personNotes ? <article className="full"><strong>{t.additionalIncidentInfo}</strong><span>{draft.personNotes}</span></article> : null}
              </div>
            ) : <p className="muted">{t.noDetailsAdded}</p>}
          </section>
          <Button onClick={() => send({ type: 'CONTINUE' })}>{t.continueVerify}</Button>
          <Button variant="ghost" onClick={() => send({ type: 'BACK' })}>{t.back}</Button>
        </main>
      ) : null}

      {step === 'otp' ? (
        <main className="page-main stack">
          <p className="kicker">{t.otpKicker}</p>
          <h1>{t.otpTitle}</h1>
          <p>{t.otpCopy}</p>
          <div className="card stack">
            <p className="chip">{t.otpDemoNote}</p>
            {otpPhase === 'phone' ? (
              <>
                <Label>{t.otpPhoneLabel}</Label>
                <Input inputMode="numeric" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
                <p className="muted">{t.otpCookieNote}</p>
                <Button onClick={async () => {
                  setBusy('');
                  try {
                    await api.requestOtp(phone);
                    setOtpPhase('code');
                  } catch (error) {
                    setBusy(error instanceof Error ? error.message : t.otpGetCode);
                  }
                }}>{t.otpGetCode}</Button>
              </>
            ) : (
              <>
                <Label>{t.otpCodeLabel}</Label>
                <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder="123456" />
                <p className="muted">{t.otpCookieNote}</p>
                <Button disabled={otpPhase === 'saving' || otp.length !== 6} onClick={async () => {
                  setBusy('');
                  setOtpPhase('saving');
                  try {
                    await api.verifyOtp(phone, otp);
                    await saveToPhone();
                  } catch (error) {
                    setOtpPhase('code');
                    setBusy(error instanceof Error ? error.message : t.otpVerify);
                  }
                }}>
                  {otpPhase === 'saving' ? t.otpSaving : t.otpVerify}
                </Button>
              </>
            )}
            {busy && busy !== t.otpSaving ? <p role="status">{busy}</p> : null}
          </div>
          <Button variant="ghost" onClick={() => send({ type: 'BACK' })}>{t.back}</Button>
        </main>
      ) : null}

      <HelplineFooter />
    </div>
  );
}

function updatePerson(draft: ComplaintDraft, persist: (draft: ComplaintDraft) => void, id: string, patch: Partial<PersonDetail>) {
  persist({
    ...draft,
    persons: draft.persons.map((person) => (person.id === id ? { ...person, ...patch } : person)),
  });
}

function EvidenceCarriedForward({ draft, title, copy }: { draft: ComplaintDraft; title: string; copy: string }) {
  const entries = savedEvidence(draft);
  if (!entries.length) return null;
  return (
    <section className="card evidence-carried-forward">
      <div>
        <h2>{title}</h2>
        <p className="muted">{copy}</p>
      </div>
      <div className="fact-list">
        {entries.map((entry) => <article key={entry.id}><strong>{entry.label}</strong><span>{entry.value}</span></article>)}
      </div>
    </section>
  );
}

function EvidenceBlock({
  title, copy, gaps, kicker, optional, optionalStatus, skip, continueWithoutEvidence, chooseFile, items, draft, persist, captureFile, onBack, onContinue, back, cont,
}: {
  title: string;
  copy: string;
  gaps: string;
  kicker: string;
  optional: string;
  optionalStatus: string;
  skip: string;
  continueWithoutEvidence: string;
  chooseFile: string;
  items: EvidenceDefinition[];
  draft: ComplaintDraft;
  persist: (draft: ComplaintDraft) => void;
  captureFile: (id: EvidenceDefinition['id'], file: File) => Promise<void>;
  onBack: () => void;
  onContinue: () => void;
  back: string;
  cont: string;
}) {
  const saved = items.filter((item) => draft.evidence[item.id].state === 'captured' || draft.evidence[item.id].state === 'skipped').length;
  const status = (value: EvidenceValue) => {
    if (value.state === 'captured') return 'Saved';
    if (value.state === 'skipped') return 'Skipped';
    return optionalStatus;
  };
  return (
    <main className="page-main is-wide evidence-screen stack">
      <header className="evidence-intro">
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
        <p>{copy}</p>
      </header>
      <section className="evidence-progress" aria-label={`${saved} of ${items.length} saved`}>
        <div>
          <strong>{saved} of {items.length} saved</strong>
          <span>{optional}</span>
        </div>
        <div className="meter" aria-hidden="true"><i style={{ transform: `scaleX(${items.length ? saved / items.length : 0})` }} /></div>
      </section>
      <p className="evidence-gaps">{gaps}</p>
      <section className="evidence-grid" aria-label={title}>
        {items.map((item) => {
          const value = draft.evidence[item.id];
          return (
            <article key={item.id} className={`card evidence-card ${value.state === 'empty' ? 'is-empty' : ''}`}>
              <div className="evidence-card-heading">
                <span className="chip">{status(value)}</span>
                <h2>{item.label}</h2>
                <p className="muted">{item.reason}</p>
              </div>
              <div className="evidence-card-actions">
                {item.control === 'file' ? (
                  <label className="evidence-file-action">
                    <span>{value.fileName || chooseFile}</span>
                    <input type="file" accept={EVIDENCE_ACCEPT} onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void captureFile(item.id, file);
                    }} />
                  </label>
                ) : (
                  <Input
                    placeholder={item.placeholder}
                    value={value.value}
                    onChange={(event) => persist({
                      ...draft,
                      evidence: { ...draft.evidence, [item.id]: { value: event.target.value, state: event.target.value ? 'captured' : 'empty' } },
                    })}
                  />
                )}
                <Button variant="ghost" size="inline" className="evidence-skip" onClick={() => persist({
                  ...draft,
                  evidence: { ...draft.evidence, [item.id]: { ...value, state: 'skipped' } },
                })}>{skip}</Button>
              </div>
            </article>
          );
        })}
      </section>
      <div className="evidence-page-actions">
        <Button onClick={onContinue}>{saved === 0 ? continueWithoutEvidence : cont}</Button>
        <Button variant="ghost" size="inline" onClick={onBack}>{back}</Button>
      </div>
    </main>
  );
}
const IDENTIFYING_FILE_ACCEPT = 'image/png,image/jpeg,image/webp,image/heic,image/heif,application/pdf,.heic,.heif,.pdf';
