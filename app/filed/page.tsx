'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- Vinext production navigation needs full-page anchors. */

import { useEffect, useRef, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, MessageSquare, Pencil, UserRound } from 'lucide-react';
import { HelplineFooter, SakshiChrome } from '../../features/chrome/sakshi-chrome';
import { Badge } from '../../shared/ui/badge';
import { Button } from '../../shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../shared/ui/dialog';
import { Input, Label, Textarea } from '../../shared/ui/input';
import { useCopy } from '../../shared/i18n/use-locale';
import { cityLabel, type Copy } from '../../shared/i18n/copy';
import * as api from '../../shared/api';
import { KARNATAKA_CITIES } from '../api/police-stations';
import { CASE_PROGRESS_MILESTONES, COMPLAINT_STAGES, STAGE_TRANSPARENCY, complaintStage, policeUpdateForStage, stagesUpTo, type ComplaintStage } from '../../domain/stages';
import { CATEGORY_EDIT_IDS, EVIDENCE_ACCEPT, MEDIA_OPTIONS, PLATFORM_OPTIONS, categoryCitizenLabelFromId, categoryPortalLabelFromId, categorySelectOptionLabel, type PrefillMediaType, type PrefillPlatform } from '../../domain/catalog';
import { DEFAULT_POLICE_STATION_CITY, type PoliceStationChoice } from '../../domain/draft';
import { cn } from '../../shared/utils';

type CaseRecord = {
  id: string;
  reference: string;
  category_id: string;
  category_label: string;
  summary: string;
  platform: string;
  police_station: string;
  details_json: string;
  status: string;
  created_at: number;
  updated_at: number;
};

type SavedDetails = {
  account?: string;
  incident?: { platform?: string; accountIdentifier?: string; mediaType?: string; otherPlatform?: string };
  first_seen?: string;
  supporting_file?: string;
  police_station?: { name?: string; address?: string } | null;
  suspect_details?: Array<{ name?: string; identifierType?: string; identifier?: string }>;
  suspect_notes?: string;
  suspect_file?: string;
};

type EditCase = {
  id: string;
  reference: string;
  category_id: string;
  category_label: string;
  summary: string;
  platform: PrefillPlatform | '';
  police_station: string;
  policeStationCity: string;
  details: SavedDetails;
};

type ThreadFrom = 'you' | 'police';

type ThreadNote = {
  id: string;
  from: ThreadFrom;
  text: string;
  at: number;
  stage?: ComplaintStage;
  contact?: string;
};

const THREADS_KEY = 'sakshi.v2.threads';
const THREAD_READ_KEY = 'sakshi.v2.thread-read';
const selectClass = 'w-full min-h-[var(--tap)] rounded-md border border-[var(--input-border)] bg-[var(--surface)] px-3';
const formatDate = (value: number) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const formatUpdateDate = (daysFromNow: number) => new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(Date.now() + daysFromNow * 86_400_000));

function asThreadNote(entry: unknown): ThreadNote | null {
  if (typeof entry === 'string' && entry.trim()) {
    return { id: `you-${entry.trim()}`, from: 'you', text: entry.trim(), at: Date.now() };
  }
  if (!entry || typeof entry !== 'object') return null;
  const value = entry as { id?: unknown; from?: unknown; text?: unknown; at?: unknown; stage?: unknown; contact?: unknown };
  const text = typeof value.text === 'string' ? value.text.trim() : '';
  if (!text) return null;
  const at = Number(value.at);
  const from: ThreadFrom = value.from === 'police' ? 'police' : 'you';
  const stage = typeof value.stage === 'string' && COMPLAINT_STAGES.some((entry) => entry.id === value.stage)
    ? value.stage as ComplaintStage
    : undefined;
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `${from}-${Number.isFinite(at) ? at : Date.now()}`,
    from,
    text,
    at: Number.isFinite(at) ? at : Date.now(),
    stage,
    contact: typeof value.contact === 'string' ? value.contact : undefined,
  };
}

function policeNote(stage: ComplaintStage, at: number): ThreadNote {
  const update = policeUpdateForStage(stage);
  return {
    id: `police-${stage}`,
    from: 'police',
    text: update.text,
    at,
    stage,
    contact: update.contact,
  };
}

function mergePoliceHistory(item: CaseRecord, thread: ThreadNote[]): ThreadNote[] {
  const current = complaintStage(item.status);
  const needed = stagesUpTo(current);
  const seen = new Set(thread.filter((note) => note.from === 'police' && note.stage).map((note) => note.stage));
  const additions = needed.flatMap((stage, index) => {
    if (seen.has(stage)) return [];
    const at = seen.size > 0 ? Date.now() : item.created_at + index * 3_600_000;
    return [policeNote(stage, at)];
  });
  if (!additions.length) return thread;
  return [...thread, ...additions].sort((left, right) => left.at - right.at || left.id.localeCompare(right.id));
}

function readThreadStore(): Record<string, ThreadNote[]> {
  try {
    const raw = sessionStorage.getItem(THREADS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const next: Record<string, ThreadNote[]> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      next[id] = value.flatMap((entry) => {
        const note = asThreadNote(entry);
        return note ? [note] : [];
      });
    }
    return next;
  } catch {
    return {};
  }
}

function writeThreadStore(threads: Record<string, ThreadNote[]>) {
  try {
    sessionStorage.setItem(THREADS_KEY, JSON.stringify(threads));
  } catch {
    // Private mode may block storage; in-memory notes still work for this visit.
  }
}

function readThreadReadStore(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(THREAD_READ_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const next: Record<string, number> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const at = Number(value);
      if (Number.isFinite(at)) next[id] = at;
    }
    return next;
  } catch {
    return {};
  }
}

function writeThreadReadStore(value: Record<string, number>) {
  try {
    sessionStorage.setItem(THREAD_READ_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function parseDetails(raw: string): SavedDetails {
  try {
    return JSON.parse(raw) as SavedDetails;
  } catch {
    return {};
  }
}

function platformOptionId(value?: string): PrefillPlatform | '' {
  if (!value?.trim()) return '';
  const normalized = value.trim().toLowerCase();
  return PLATFORM_OPTIONS.find((option) => option.id === normalized || option.label.toLowerCase() === normalized)?.id ?? '';
}

function mediaOptionId(value?: string): PrefillMediaType | '' {
  if (!value?.trim()) return '';
  const normalized = value.trim().toLowerCase();
  return MEDIA_OPTIONS.find((option) => option.id === value || option.label.toLowerCase() === normalized)?.id ?? '';
}

function platformDisplay(platform?: string, otherPlatform?: string) {
  if (otherPlatform?.trim()) return otherPlatform.trim();
  if (!platform?.trim()) return '';
  return PLATFORM_OPTIONS.find((option) => option.id === platform || option.label === platform)?.label ?? platform;
}

function mediaDisplay(value?: string) {
  if (!value?.trim()) return '';
  return MEDIA_OPTIONS.find((option) => option.id === value || option.label === value)?.label ?? value;
}

function editingPlatform(item: CaseRecord, details: SavedDetails): PrefillPlatform | '' {
  return platformOptionId(details.incident?.platform) || platformOptionId(item.platform) || (item.platform.trim() ? 'other' : '');
}

function ComplaintPreview({
  categoryId,
  categoryLabel,
  summary,
  platform,
  policeStation,
  details,
  t,
}: {
  categoryId?: string;
  categoryLabel: string;
  summary: string;
  platform: string;
  policeStation: string;
  details: SavedDetails;
  t: Copy;
}) {
  const citizen = categoryCitizenLabelFromId(categoryId ?? '', categoryLabel);
  const portal = categoryId ? categoryPortalLabelFromId(categoryId) : '';
  return (
    <div className="fact-list">
      <article className="full"><strong>{t.yourAccount}</strong><span>{details.account || summary}</span></article>
      <article><strong>{t.labelComplaintType}</strong><span>{portal ? `${citizen} (${portal})` : citizen}</span></article>
      <article><strong>{t.labelService}</strong><span>{platformDisplay(platform, details.incident?.otherPlatform) || t.valueNotAdded}</span></article>
      <article><strong>{t.labelAccountOrIdentifier}</strong><span>{details.incident?.accountIdentifier || t.valueNotAdded}</span></article>
      <article><strong>{t.labelMediaType}</strong><span>{mediaDisplay(details.incident?.mediaType) || t.valueNotAdded}</span></article>
      <article><strong>{t.labelFirstSeen}</strong><span>{details.first_seen || t.valueNotAdded}</span></article>
      <article><strong>{t.labelSupportingFile}</strong><span>{details.supporting_file || t.valueNotAdded}</span></article>
      <article><strong>{t.policeStation}</strong><span>{details.police_station?.name || policeStation || t.valueNotSelected}</span></article>
      {details.suspect_details?.map((person, index) => (
        <article key={`${person.name}-${index}`}>
          <strong>{person.name || t.personHeading}</strong>
          <span>{person.identifier || t.valueNotAdded}</span>
        </article>
      ))}
      {details.suspect_notes ? <article className="full"><strong>{t.personHeading}</strong><span>{details.suspect_notes}</span></article> : null}
      {details.suspect_file ? <article><strong>{t.labelSupportingFile}</strong><span>{details.suspect_file}</span></article> : null}
    </div>
  );
}

export default function FiledPage() {
  const { t } = useCopy();
  const [gate, setGate] = useState<'loading' | 'phone' | 'otp' | 'list'>('loading');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [threadFor, setThreadFor] = useState<string | null>(null);
  const [threadText, setThreadText] = useState('');
  const [threads, setThreads] = useState<Record<string, ThreadNote[]>>({});
  const [threadReadAt, setThreadReadAt] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<EditCase | null>(null);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [evidence, setEvidence] = useState<api.EvidenceItem[]>([]);
  const [evidenceNote, setEvidenceNote] = useState('');
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const editSnapshot = useRef('');

  async function loadCases() {
    const result = await api.fetchCases();
    const list = [...((result.cases as CaseRecord[]) ?? [])].sort((a, b) => b.created_at - a.created_at);
    setCases(list);
    setThreads((current) => {
      const next = { ...current };
      for (const item of list) next[item.id] = mergePoliceHistory(item, next[item.id] ?? []);
      writeThreadStore(next);
      return next;
    });
    setThreadReadAt((current) => {
      const next = { ...current };
      let changed = false;
      for (const item of list) {
        if (next[item.id] == null) {
          next[item.id] = Date.now();
          changed = true;
        }
      }
      if (changed) writeThreadReadStore(next);
      return changed ? next : current;
    });
    return list;
  }

  useEffect(() => {
    const forceVerify = new URLSearchParams(window.location.search).get('verify') === '1';
    const start = window.setTimeout(() => {
      setThreads(readThreadStore());
      setThreadReadAt(readThreadReadStore());
      if (forceVerify) {
        setGate('phone');
        return;
      }
      void loadCases()
        .then(() => setGate('list'))
        .catch(() => setGate('phone'));
    }, 0);
    return () => window.clearTimeout(start);
  }, []);

  useEffect(() => {
    if (!threadFor) return;
    window.document.getElementById(`thread-${threadFor}`)?.focus();
  }, [threadFor]);

  useEffect(() => {
    if (!threadFor) return;
    markThreadRead(threadFor);
  }, [threadFor, threads]);

  const latest = cases[0];
  const earlier = cases.slice(1);

  function markThreadRead(id: string) {
    setThreadReadAt((current) => {
      const next = { ...current, [id]: Date.now() };
      writeThreadReadStore(next);
      return next;
    });
  }

  function toggleThread(id: string) {
    setThreadFor((current) => {
      if (current === id) return null;
      if (current) setThreadText('');
      markThreadRead(id);
      return id;
    });
  }

  function addThreadNote(id: string) {
    const text = threadText.trim();
    if (!text) return;
    setThreads((current) => {
      const next = {
        ...current,
        [id]: [...(current[id] ?? []), { id: `you-${Date.now()}`, from: 'you' as const, text, at: Date.now() }],
      };
      writeThreadStore(next);
      return next;
    });
    setThreadText('');
    markThreadRead(id);
  }

  async function changeStage(item: CaseRecord, direction: -1 | 1) {
    const index = COMPLAINT_STAGES.findIndex((stage) => stage.id === complaintStage(item.status));
    const next = COMPLAINT_STAGES[index + direction];
    if (!next) return;
    try {
      await api.patchCase({ case_id: item.id, status: next.id });
      await loadCases();
      if (direction === 1) setThreadFor(item.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.saveChanges);
    }
  }

  function editPayload(next: EditCase, items: api.EvidenceItem[], note = '') {
    return JSON.stringify({
      editing: next,
      evidence: items.map((item) => item.id),
      evidenceNote: note,
    });
  }

  function isEditDirty() {
    if (!editing) return false;
    return editPayload(editing, evidence, evidenceNote) !== editSnapshot.current;
  }

  function closeEdit() {
    setDiscardOpen(false);
    setEditing(null);
    setPreview(false);
    setEvidenceNote('');
    setEvidence([]);
  }

  function requestCloseEdit() {
    if (isEditDirty()) {
      setDiscardOpen(true);
      return;
    }
    closeEdit();
  }

  async function beginEditing(item: CaseRecord) {
    const details = parseDetails(item.details_json);
    const platform = editingPlatform(item, details);
    const next: EditCase = {
      id: item.id,
      reference: item.reference,
      category_id: item.category_id,
      category_label: item.category_label,
      summary: details.account || item.summary,
      platform,
      police_station: item.police_station,
      policeStationCity: DEFAULT_POLICE_STATION_CITY,
      details: {
        ...details,
        incident: {
          ...details.incident,
          platform,
          mediaType: mediaOptionId(details.incident?.mediaType),
          otherPlatform: details.incident?.otherPlatform || (platform === 'other' && !platformOptionId(item.platform) ? item.platform : ''),
        },
      },
    };
    setError('');
    setOpenId(null);
    setThreadFor(null);
    setPreview(false);
    setDiscardOpen(false);
    setEvidence([]);
    setEvidenceNote('');
    setEditing(next);
    editSnapshot.current = editPayload(next, [], '');
    try {
      const result = await api.fetchEvidence(item.id);
      setEvidence(result.evidence);
      editSnapshot.current = editPayload(next, result.evidence, '');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open evidence.');
    }
  }

  async function addFiles(files: FileList | null) {
    if (!editing || !files?.length) return;
    setEvidenceBusy(true);
    setError('');
    try {
      for (const file of Array.from(files)) await api.addEvidenceFile(editing.id, file);
      setEvidence((await api.fetchEvidence(editing.id)).evidence);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add evidence.');
    } finally {
      setEvidenceBusy(false);
    }
  }

  async function addNote() {
    if (!editing || !evidenceNote.trim()) return;
    setEvidenceBusy(true);
    setError('');
    try {
      await api.addEvidenceNote(editing.id, evidenceNote);
      setEvidenceNote('');
      setEvidence((await api.fetchEvidence(editing.id)).evidence);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add the note.');
    } finally {
      setEvidenceBusy(false);
    }
  }

  async function deleteEvidenceItem(id: string) {
    if (!editing) return;
    if (!window.confirm(t.removeEvidenceConfirm)) return;
    setEvidenceBusy(true);
    try {
      await api.removeEvidence(editing.id, id);
      setEvidence((current) => current.filter((item) => item.id !== id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove evidence.');
    } finally {
      setEvidenceBusy(false);
    }
  }

  async function saveEdits() {
    if (!editing) return;
    setSaving(true);
    setError('');
    const platform = platformDisplay(editing.platform, editing.details.incident?.otherPlatform);
    try {
      await api.patchCase({
        case_id: editing.id,
        action: 'update_details',
        summary: editing.summary,
        category_id: editing.category_id,
        category_label: categoryCitizenLabelFromId(editing.category_id, editing.category_label),
        platform,
        police_station: editing.police_station,
        details: {
          ...editing.details,
          account: editing.summary,
          incident: {
            ...editing.details.incident,
            platform: editing.platform,
            mediaType: editing.details.incident?.mediaType,
            otherPlatform: editing.details.incident?.otherPlatform,
          },
          police_station: editing.police_station ? { ...editing.details.police_station, name: editing.police_station } : null,
        },
      });
      closeEdit();
      await loadCases();
      setError(t.detailsUpdated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.saveChanges);
    } finally {
      setSaving(false);
    }
  }

  const editPanel = editing ? (
    <CaseEditPanel
      key={editing.id}
      editing={editing}
      preview={preview}
      saving={saving}
      evidence={evidence}
      evidenceNote={evidenceNote}
      evidenceBusy={evidenceBusy}
      error={error}
      t={t}
      onEditingChange={setEditing}
      onPreview={() => setPreview(true)}
      onBack={() => setPreview(false)}
      onSave={() => void saveEdits()}
      onClose={requestCloseEdit}
      onEvidenceNote={setEvidenceNote}
      onAddFiles={(files) => void addFiles(files)}
      onAddNote={() => void addNote()}
      onRemove={(id) => void deleteEvidenceItem(id)}
    />
  ) : null;

  return (
    <div className="site-shell">
      <SakshiChrome />
      <main className={`page-main stack ${gate === 'list' ? 'is-dashboard' : 'is-focus'}`}>
        <header className="dashboard-hero">
          <h1>{t.dashboardTitle}</h1>
          <p>{t.dashboardIntro}</p>
          <p className="dashboard-demo-line">
            <Badge variant="demo">Demo</Badge>
            <span>{t.dashboardDemo}</span>
          </p>
        </header>

        {gate === 'loading' ? <p className="muted" role="status">{t.openingDashboard}</p> : null}

        {gate === 'phone' || gate === 'otp' ? (
          <div className="card stack demo-otp-card">
            <Badge variant="demo">{t.otpDemoNote}</Badge>
            {gate === 'phone' ? (
              <>
                <h2>{t.dashboardTitle}</h2>
                <p>{t.verifyToView}</p>
                <div>
                  <Label htmlFor="dashboard-phone">{t.otpPhoneLabel}</Label>
                  <Input id="dashboard-phone" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
                </div>
                <p className="muted">{t.otpCookieNote}</p>
                <Button onClick={async () => {
                  setError('');
                  try {
                    await api.requestOtp(phone);
                    setGate('otp');
                    setError(t.otpReadyMessage);
                  } catch (caught) {
                    setError(caught instanceof Error ? caught.message : t.otpGetCode);
                  }
                }}>{t.otpGetCode}</Button>
              </>
            ) : (
              <>
                <h2>{t.otpCodeLabel}</h2>
                <div>
                  <Label htmlFor="dashboard-otp">{t.otpCodeLabel}</Label>
                  <Input
                    id="dashboard-otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                  />
                </div>
                <p className="muted">{t.otpCookieNote}</p>
                <Button disabled={otp.length !== 6} onClick={async () => {
                  setError('');
                  try {
                    await api.verifyOtp(phone, otp);
                    await loadCases();
                    setGate('list');
                  } catch (caught) {
                    setError(caught instanceof Error ? caught.message : t.otpVerify);
                  }
                }}>{t.otpVerify}</Button>
                <Button variant="link" size="inline" onClick={() => { setGate('phone'); setOtp(''); }}>{t.useAnotherNumber}</Button>
              </>
            )}
            {error ? <p role="status">{error}</p> : null}
          </div>
        ) : null}

        {gate === 'list' ? (
          <>
            <section className="dashboard-intro">
              <strong>{cases.length ? `${cases.length} · ${t.savedCases}` : t.noSaved}</strong>
              <p>{t.openAnyFile}</p>
            </section>
            {latest ? (
              <div className="saved-case-with-edit">
                <CaseCard
                  item={latest}
                  t={t}
                  isLatest
                  openId={openId}
                  setOpenId={setOpenId}
                  onEdit={() => void beginEditing(latest)}
                  onStage={changeStage}
                  threadFor={threadFor}
                  threadText={threadText}
                  threads={threads}
                  threadReadAt={threadReadAt}
                  onToggleThread={toggleThread}
                  onThreadText={setThreadText}
                  onAddNote={addThreadNote}
                />
                {editing?.id === latest.id ? editPanel : null}
              </div>
            ) : null}
            {earlier.length ? (
              <details className="earlier-files">
                <summary>{t.earlierFiles} ({earlier.length})</summary>
                <div className="stack" style={{ marginTop: '0.75rem' }}>
                  {earlier.map((item) => (
                    <div key={item.id} className="saved-case-with-edit">
                      <CaseCard
                        item={item}
                        t={t}
                        openId={openId}
                        setOpenId={setOpenId}
                        onEdit={() => void beginEditing(item)}
                        onStage={changeStage}
                        threadFor={threadFor}
                        threadText={threadText}
                        threads={threads}
                        threadReadAt={threadReadAt}
                        onToggleThread={toggleThread}
                        onThreadText={setThreadText}
                        onAddNote={addThreadNote}
                      />
                      {editing?.id === item.id ? editPanel : null}
                    </div>
                  ))}
                </div>
              </details>
            ) : null}

            <Button asChild><a href="/">{t.startAnother}</a></Button>
            {!editing && error ? <p role={error === t.detailsUpdated ? 'status' : 'alert'}>{error}</p> : null}
            <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
              <DialogContent aria-describedby="discard-edits-copy">
                <div className="start-over-dialog stack">
                  <div className="stack" style={{ gap: '0.4rem' }}>
                    <DialogTitle>{t.discardEdits}</DialogTitle>
                    <DialogDescription id="discard-edits-copy" className="muted">{t.updateFileCopy}</DialogDescription>
                  </div>
                  <div className="start-over-dialog-actions">
                    <Button variant="secondary" size="inline" onClick={() => setDiscardOpen(false)}>{t.keepEditing}</Button>
                    <Button size="inline" onClick={closeEdit}>{t.closeAction}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
      </main>
      <HelplineFooter />
    </div>
  );
}

function CaseEditPanel({
  editing,
  preview,
  saving,
  evidence,
  evidenceNote,
  evidenceBusy,
  error,
  t,
  onEditingChange,
  onPreview,
  onBack,
  onSave,
  onClose,
  onEvidenceNote,
  onAddFiles,
  onAddNote,
  onRemove,
}: {
  editing: EditCase;
  preview: boolean;
  saving: boolean;
  evidence: api.EvidenceItem[];
  evidenceNote: string;
  evidenceBusy: boolean;
  error: string;
  t: Copy;
  onEditingChange: (next: EditCase) => void;
  onPreview: () => void;
  onBack: () => void;
  onSave: () => void;
  onClose: () => void;
  onEvidenceNote: (value: string) => void;
  onAddFiles: (files: FileList | null) => void;
  onAddNote: () => void;
  onRemove: (id: string) => void;
}) {
  const { locale } = useCopy();
  const panelRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const searchTimer = useRef(0);
  const requestId = useRef(0);
  const [stations, setStations] = useState<PoliceStationChoice[]>([]);
  const [stationSearch, setStationSearch] = useState(editing.police_station);
  const [stationOpen, setStationOpen] = useState(false);

  async function loadStations(city: string, search = '') {
    if (!city) return;
    const id = ++requestId.current;
    try {
      const result = await api.fetchStations(city, search);
      if (id !== requestId.current) return;
      setStations((result.available_stations as PoliceStationChoice[]) ?? []);
    } catch {
      if (id !== requestId.current) return;
      setStations([]);
    }
  }

  useEffect(() => {
    const city = editing.policeStationCity;
    if (!city) return;
    const id = ++requestId.current;
    void api.fetchStations(city, '').then((result) => {
      if (id !== requestId.current) return;
      setStations((result.available_stations as PoliceStationChoice[]) ?? []);
    }).catch(() => {
      if (id !== requestId.current) return;
      setStations([]);
    });
    return () => window.clearTimeout(searchTimer.current);
  }, [editing.id, editing.policeStationCity]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    const panel = panelRef.current;
    if (!panel) return;
    const chrome = window.document.querySelector('header');
    const margin = (chrome?.getBoundingClientRect().bottom ?? 108) + 8;
    const top = panel.getBoundingClientRect().top + window.scrollY - margin;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [editing.id, preview]);

  function patch(next: Partial<EditCase>) {
    onEditingChange({ ...editing, ...next });
  }

  function patchIncident(next: Partial<NonNullable<SavedDetails['incident']>>) {
    onEditingChange({
      ...editing,
      details: { ...editing.details, incident: { ...editing.details.incident, ...next } },
    });
  }

  function chooseStation(station: PoliceStationChoice) {
    setStationSearch(station.name);
    setStationOpen(false);
    onEditingChange({
      ...editing,
      police_station: station.name,
      policeStationCity: station.city ?? editing.policeStationCity,
      details: { ...editing.details, police_station: { name: station.name, address: station.address ?? undefined } },
    });
  }

  const matchingStations = editing.police_station && !stations.some((station) => station.name === editing.police_station)
    ? [{
        name: editing.police_station,
        address: editing.details.police_station?.address ?? null,
        latitude: 0,
        longitude: 0,
        phone: null,
      }, ...stations]
    : stations;
  const identifierLabel = PLATFORM_OPTIONS.find((option) => option.id === editing.platform)?.identifierLabel ?? t.labelAccountOrIdentifier;
  const editError = error && error !== t.detailsUpdated ? error : '';

  return (
    <section className="card stack saved-case-edit" ref={panelRef} tabIndex={-1} aria-labelledby="edit-panel-title">
      <div className="saved-case-heading">
        <div>
          <p className="kicker">{preview ? t.previewUpdatedFile : t.updateFile}</p>
          <h2 id="edit-panel-title" ref={headingRef} tabIndex={-1}>{editing.reference}</h2>
        </div>
      </div>
      {preview ? (
        <>
          <p>{t.checkUpdatedDetails}</p>
          <ComplaintPreview
            categoryId={editing.category_id}
            categoryLabel={editing.category_label}
            summary={editing.summary}
            platform={platformDisplay(editing.platform, editing.details.incident?.otherPlatform)}
            policeStation={editing.police_station}
            details={{ ...editing.details, account: editing.summary }}
            t={t}
          />
          <div className="dashboard-actions is-edit-bar">
            <Button variant="secondary" onClick={onBack}>{t.backToEdit}</Button>
            <Button onClick={onSave} disabled={saving}>{saving ? t.savingChanges : t.saveChanges}</Button>
          </div>
        </>
      ) : (
        <>
          <p>{t.updateFileCopy}</p>
          <div className="dashboard-actions is-edit-bar">
            <Button variant="ghost" onClick={onClose}>{t.cancel}</Button>
            <Button disabled={!editing.summary.trim()} onClick={onPreview}>{t.previewChanges}</Button>
          </div>
          <div className="case-edit-grid">
            <label className="full">
              <span>{t.yourAccount}</span>
              <Textarea value={editing.summary} onChange={(event) => patch({ summary: event.target.value, details: { ...editing.details, account: event.target.value } })} />
            </label>
            <label>
              <span>{t.typeOfComplaint}</span>
              <select className={selectClass} value={editing.category_id} onChange={(event) => {
                const id = event.target.value;
                patch({ category_id: id, category_label: categoryCitizenLabelFromId(id) });
              }}>
                {CATEGORY_EDIT_IDS.map((id) => <option key={id} value={id}>{categorySelectOptionLabel(id)}</option>)}
              </select>
            </label>
            <label>
              <span>{t.whereDidThisHappen}</span>
              <select
                className={selectClass}
                aria-label={t.whereDidThisHappen}
                value={editing.platform}
                onChange={(event) => {
                  const platform = event.target.value as PrefillPlatform | '';
                  onEditingChange({
                    ...editing,
                    platform,
                    details: {
                      ...editing.details,
                      incident: {
                        ...editing.details.incident,
                        platform,
                        otherPlatform: platform === 'other' ? editing.details.incident?.otherPlatform : '',
                      },
                    },
                  });
                }}
              >
                <option value="">{t.selectService}</option>
                {PLATFORM_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span>{t.typeOfMedia}</span>
              <select
                className={selectClass}
                aria-label={t.typeOfMedia}
                value={editing.details.incident?.mediaType ?? ''}
                onChange={(event) => patchIncident({ mediaType: event.target.value as PrefillMediaType | '' })}
              >
                <option value="">{t.selectMediaType}</option>
                {MEDIA_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            {editing.platform === 'other' ? (
              <label className="full">
                <span>{t.labelService}</span>
                <Input
                  value={editing.details.incident?.otherPlatform ?? ''}
                  placeholder={t.otherPlatformPlaceholder}
                  onChange={(event) => patchIncident({ otherPlatform: event.target.value })}
                />
              </label>
            ) : null}
            <label>
              <span>{identifierLabel}</span>
              <Input
                value={editing.details.incident?.accountIdentifier ?? ''}
                placeholder={PLATFORM_OPTIONS.find((option) => option.id === editing.platform)?.placeholder}
                onChange={(event) => patchIncident({ accountIdentifier: event.target.value })}
              />
            </label>
            <label>
              <span>{t.whenFirstSeen}</span>
              <Input
                value={editing.details.first_seen ?? ''}
                onChange={(event) => patch({ details: { ...editing.details, first_seen: event.target.value } })}
              />
            </label>
            <div className="full stack" style={{ gap: '0.75rem' }}>
              <div className="station-picker-grid">
                <label>
                  <span>{t.cityOrDistrict}</span>
                  <select
                    className={selectClass}
                    aria-label={t.cityOrDistrict}
                    value={editing.policeStationCity}
                    onChange={(event) => {
                      const city = event.target.value;
                      setStationSearch('');
                      setStationOpen(Boolean(city));
                      onEditingChange({
                        ...editing,
                        policeStationCity: city,
                        police_station: '',
                        details: { ...editing.details, police_station: null },
                      });
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
                    aria-expanded={stationOpen}
                    aria-controls="edit-station-options"
                    autoComplete="off"
                    disabled={!editing.policeStationCity}
                    value={stationSearch}
                    placeholder={editing.policeStationCity ? t.stationSearchPlaceholder : t.chooseCityFirst}
                    onChange={(event) => {
                      const value = event.target.value;
                      setStationSearch(value);
                      setStationOpen(true);
                      if (editing.police_station && value.trim().toLowerCase() !== editing.police_station.toLowerCase()) {
                        onEditingChange({
                          ...editing,
                          police_station: '',
                          details: { ...editing.details, police_station: null },
                        });
                      }
                      window.clearTimeout(searchTimer.current);
                      searchTimer.current = window.setTimeout(() => {
                        void loadStations(editing.policeStationCity, value);
                      }, 250);
                    }}
                    onFocus={() => {
                      setStationOpen(true);
                      if (!editing.policeStationCity) return;
                      void loadStations(editing.policeStationCity, editing.police_station ? '' : stationSearch);
                    }}
                    onClick={() => setStationOpen(true)}
                    onBlur={(event) => {
                      const field = event.currentTarget;
                      window.setTimeout(() => {
                        if (window.document.activeElement === field) return;
                        if (window.document.getElementById('edit-station-options')?.contains(window.document.activeElement)) return;
                        setStationOpen(false);
                      }, 180);
                    }}
                  />
                </label>
              </div>
              {editing.policeStationCity && (stationOpen || !editing.police_station) ? (
                <div id="edit-station-options" className="station-options" role="listbox" aria-label={t.policeStation}>
                  {matchingStations.length ? matchingStations.map((station) => (
                    <Button
                      key={`${station.name}-${station.latitude}`}
                      type="button"
                      variant="ghost"
                      role="option"
                      aria-selected={editing.police_station === station.name}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseStation(station)}
                    >
                      {station.name}
                    </Button>
                  )) : <p className="muted">{t.noStations}</p>}
                </div>
              ) : null}
            </div>
            <label className="full">
              <span>{t.otherPersonInfo}</span>
              <Textarea
                value={editing.details.suspect_notes ?? ''}
                placeholder={t.otherPersonPlaceholder}
                onChange={(event) => patch({ details: { ...editing.details, suspect_notes: event.target.value } })}
              />
            </label>
            <section className="full evidence-vault stack" aria-labelledby="evidence-vault-title">
              <div>
                <span className="kicker">{t.evidenceVault}</span>
                <h3 id="evidence-vault-title">{t.evidenceVaultTitle}</h3>
                <p className="muted">{t.evidenceVaultCopy}</p>
              </div>
              <label className={cn('supporting-file-picker', evidenceBusy && 'is-busy')}>
                <input
                  type="file"
                  multiple
                  accept={EVIDENCE_ACCEPT}
                  disabled={evidenceBusy}
                  onChange={(event) => {
                    onAddFiles(event.target.files);
                    event.currentTarget.value = '';
                  }}
                />
                <span className="supporting-file-picker-icon" aria-hidden="true">+</span>
                <span className="supporting-file-picker-copy">
                  <strong>{t.addEvidenceFile}</strong>
                  <small>{t.evidenceFileHelp}</small>
                </span>
              </label>
              <div className="evidence-note-row">
                <Textarea rows={2} value={evidenceNote} placeholder={t.evidenceNotePlaceholder} onChange={(event) => onEvidenceNote(event.target.value)} />
                <Button variant="secondary" size="inline" disabled={evidenceBusy || !evidenceNote.trim()} onClick={onAddNote}>{t.addEvidenceNote}</Button>
              </div>
              {evidence.length ? (
                <ul className="evidence-list">
                  {evidence.map((item) => (
                    <li key={item.id}>
                      <div>
                        <strong>{item.kind === 'note' ? t.noteEvidence : item.file_name}</strong>
                        <small>{item.kind === 'note' ? item.note_text : item.content_type?.startsWith('audio/') ? t.audioEvidence : t.fileEvidence}</small>
                      </div>
                      <span>
                        {item.kind === 'file' ? <a href={`/api/evidence?case_id=${encodeURIComponent(editing.id)}&evidence_id=${encodeURIComponent(item.id)}`}>{t.downloadEvidence}</a> : null}
                        <Button variant="link" size="inline" disabled={evidenceBusy} onClick={() => onRemove(item.id)}>{t.remove}</Button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">{t.noEvidenceYet}</p>}
            </section>
          </div>
        </>
      )}
      {editError ? <p role="alert">{editError}</p> : null}
    </section>
  );
}

function CaseCard({
  item, t, isLatest, openId, setOpenId, onEdit, onStage, threadFor, threadText, threads, threadReadAt, onToggleThread, onThreadText, onAddNote,
}: {
  item: CaseRecord;
  t: Copy;
  isLatest?: boolean;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  onEdit: () => void;
  onStage: (item: CaseRecord, direction: -1 | 1) => void;
  threadFor: string | null;
  threadText: string;
  threads: Record<string, ThreadNote[]>;
  threadReadAt: Record<string, number>;
  onToggleThread: (id: string) => void;
  onThreadText: (value: string) => void;
  onAddNote: (id: string) => void;
}) {
  const logRef = useRef<HTMLDivElement | null>(null);
  const stage = complaintStage(item.status);
  const stageIndex = COMPLAINT_STAGES.findIndex((entry) => entry.id === stage);
  const transparency = STAGE_TRANSPARENCY[stage];
  const milestoneIndex = Math.max(0, CASE_PROGRESS_MILESTONES.findIndex((milestone) => milestone.stages.includes(stage)));
  const details = parseDetails(item.details_json);
  const citizen = categoryCitizenLabelFromId(item.category_id, item.category_label);
  const previewOpen = openId === item.id;
  const milestone = CASE_PROGRESS_MILESTONES[milestoneIndex];
  const progress = (milestoneIndex + 1) / CASE_PROGRESS_MILESTONES.length;
  const milestoneCount = t.milestoneCount
    .replace('{n}', String(milestoneIndex + 1))
    .replace('{total}', String(CASE_PROGRESS_MILESTONES.length))
    .replace('{label}', milestone.label);
  const notes = threads[item.id] ?? [];
  const lastNote = notes.at(-1);
  const unread = notes.filter((note) => note.from === 'police' && note.at > (threadReadAt[item.id] ?? 0)).length;
  const threadOpen = threadFor === item.id;

  useEffect(() => {
    if (!threadOpen) return;
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [threadOpen, notes.length]);

  return (
    <article className={cn('card stack saved-case-card', isLatest && 'is-latest')}>
      <div className="saved-case-body">
      <div className="saved-case-heading">
        <button
          type="button"
          className="case-preview-trigger"
          aria-expanded={previewOpen}
          aria-label={`${t.savedFilePreview}: ${item.reference}`}
          onClick={() => setOpenId(previewOpen ? null : item.id)}
        >
          <span className="case-reference-row">
            <span className="case-reference">{item.reference}</span>
            {isLatest ? <Badge variant="current">{t.currentFile}</Badge> : null}
          </span>
          <span className="case-title">{citizen}</span>
        </button>
        <div className="saved-case-tools">
          <Button variant="secondary" size="inline" className="case-edit-button" onClick={onEdit} aria-label={`${t.editDetails}: ${item.reference}`}>
            <Pencil size={16} aria-hidden="true" />
            {t.editDetails}
          </Button>
          <Button
            variant="secondary"
            size="inline"
            className="case-thread-button"
            aria-expanded={threadOpen}
            aria-controls={`thread-panel-${item.id}`}
            onClick={() => onToggleThread(item.id)}
          >
            <MessageSquare size={15} aria-hidden="true" />
            {threadOpen ? t.closeAction : t.openThread}
            {unread && !threadOpen ? <span className="thread-unread">{t.unreadThreadCount.replace('{count}', String(unread))}</span> : null}
          </Button>
        </div>
      </div>
      {previewOpen ? (
        <section className="saved-case-inline-preview" aria-label={t.savedFilePreview}>
          <strong>{t.savedFilePreview}</strong>
          <ComplaintPreview
            categoryId={item.category_id}
            categoryLabel={item.category_label}
            summary={item.summary}
            platform={platformDisplay(item.platform, details.incident?.otherPlatform)}
            policeStation={item.police_station}
            details={details}
            t={t}
          />
        </section>
      ) : null}
      <p className="case-summary">{item.summary}</p>
      <dl className="case-meta">
        <div>
          <dt>{t.savedLabel}</dt>
          <dd>{formatDate(item.created_at)}</dd>
        </div>
        <div>
          <dt>{t.labelService}</dt>
          <dd>{platformDisplay(item.platform, details.incident?.otherPlatform) || t.valueNotAdded}</dd>
        </div>
        <div>
          <dt>{t.policeStation}</dt>
          <dd>{item.police_station || t.valueNotSelected}</dd>
        </div>
      </dl>
      </div>
      <section className="case-progress" aria-label={t.caseProgress}>
        <div className="case-progress-head">
          <div>
            <span className="kicker">{t.caseProgress}</span>
            <strong>{milestoneCount}</strong>
            <p className="muted">{transparency.contact} · {transparency.role}</p>
            <p className="muted">{transparency.note}</p>
          </div>
        </div>
        <div className="meter" aria-hidden="true"><i style={{ transform: `scaleX(${progress})` }} /></div>
        <ol className="case-progress-rail">
          {CASE_PROGRESS_MILESTONES.map((milestone, index) => (
            <li key={milestone.label} className={index < milestoneIndex ? 'is-complete' : index === milestoneIndex ? 'is-current' : 'is-upcoming'}>
              <span aria-hidden="true">{index < milestoneIndex ? '✓' : index + 1}</span>
              <strong>{milestone.label}</strong>
            </li>
          ))}
        </ol>
        <details className="case-stage-details">
          <summary>{t.detailedStages}</summary>
          <ol>
            {COMPLAINT_STAGES.map((option, index) => (
              <li key={option.id} className={index === stageIndex ? 'is-current' : index < stageIndex ? 'is-complete' : ''}>
                {option.label}
              </li>
            ))}
          </ol>
        </details>
        <section className="status-transparency" aria-label={`${t.nextStageEta} · ${t.pointOfContact}`}>
          <div className="status-next-update">
            <span className="kicker"><CalendarClock size={14} aria-hidden="true" /> {t.nextStageEta}</span>
            <strong>{transparency.nextUpdateDays === null ? t.noFurtherStage : formatUpdateDate(transparency.nextUpdateDays)}</strong>
          </div>
          <div className="status-contact">
            <span className="kicker"><UserRound size={14} aria-hidden="true" /> {t.pointOfContact}</span>
            <strong>{transparency.contact}</strong>
            <small>{transparency.role}</small>
          </div>
          {lastNote ? (
            <button type="button" className="thread-latest" onClick={() => onToggleThread(item.id)}>
              <span className="kicker">{t.latestThreadUpdate}</span>
              <strong>{lastNote.from === 'you' ? t.threadYou : lastNote.contact || t.threadPoliceUpdate}</strong>
              <span>{lastNote.text}</span>
            </button>
          ) : null}
        </section>
        <div className="case-progress-controls">
          <button type="button" className="stage-step" disabled={stageIndex === 0} aria-label={t.previousFileStage} onClick={() => onStage(item, -1)}>
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <span className="case-progress-pager-label">{milestone.label}</span>
          <button type="button" className="stage-step" disabled={stageIndex === COMPLAINT_STAGES.length - 1} aria-label={t.nextFileStage} onClick={() => onStage(item, 1)}>
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </section>
      {threadOpen ? (
        <form
          id={`thread-panel-${item.id}`}
          className="case-update-thread"
          onSubmit={(event) => {
            event.preventDefault();
            onAddNote(item.id);
          }}
        >
          <div className="saved-case-heading">
            <strong>{t.updateThreadTitle}</strong>
            <Button variant="link" size="inline" type="button" onClick={() => onToggleThread(item.id)}>{t.closeAction}</Button>
          </div>
          <p className="muted">{t.prototypeThreadNote}</p>
          {notes.length ? (
            <div className="thread-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions">
              {notes.map((note) => (
                <article key={note.id} className={note.from === 'you' ? 'is-you' : 'is-police'}>
                  <span className="thread-from">
                    {note.from === 'you' ? t.threadYou : `${t.threadPoliceUpdate} · ${note.contact || item.police_station || t.pointOfContact}`}
                  </span>
                  {note.stage ? <span className="kicker">{policeUpdateForStage(note.stage).label}</span> : null}
                  <p>{note.text}</p>
                  <time dateTime={new Date(note.at).toISOString()}>{formatDate(note.at)}</time>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">{t.noUpdatesYet}</p>
          )}
          <Label htmlFor={`thread-${item.id}`} className="sr-only">{t.writeUpdate}</Label>
          <Textarea id={`thread-${item.id}`} rows={3} value={threadText} placeholder={t.writeUpdate} onChange={(event) => onThreadText(event.target.value)} />
          <Button type="submit" disabled={!threadText.trim()}>{t.addMessage}</Button>
        </form>
      ) : null}
    </article>
  );
}
