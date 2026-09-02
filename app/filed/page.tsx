'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- Vinext production navigation needs full-page anchors. */

import { useEffect, useRef, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, MessageSquare, Pencil, UserRound } from 'lucide-react';
import { HelplineFooter, SakshiChrome } from '../../features/chrome/sakshi-chrome';
import { Badge } from '../../shared/ui/badge';
import { Button } from '../../shared/ui/button';
import { Input, Label, Textarea } from '../../shared/ui/input';
import { useCopy } from '../../shared/i18n/use-locale';
import type { Copy } from '../../shared/i18n/copy';
import * as api from '../../shared/api';
import { CASE_PROGRESS_MILESTONES, COMPLAINT_STAGES, STAGE_TRANSPARENCY, complaintStage } from '../../domain/stages';
import { CATEGORY_EDIT_IDS, EVIDENCE_ACCEPT, categoryCitizenLabelFromId, categoryPortalLabelFromId, categorySelectOptionLabel } from '../../domain/catalog';
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
  platform: string;
  police_station: string;
  details: SavedDetails;
};

const selectClass = 'w-full min-h-[var(--tap)] rounded-md border border-[var(--input-border)] bg-[var(--surface)] px-3';
const formatDate = (value: number) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const formatUpdateDate = (daysFromNow: number) => new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(Date.now() + daysFromNow * 86_400_000));

function parseDetails(raw: string): SavedDetails {
  try {
    return JSON.parse(raw) as SavedDetails;
  } catch {
    return {};
  }
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
      <article><strong>{t.labelService}</strong><span>{platform || t.valueNotAdded}</span></article>
      <article><strong>{t.labelAccountOrIdentifier}</strong><span>{details.incident?.accountIdentifier || t.valueNotAdded}</span></article>
      <article><strong>{t.labelMediaType}</strong><span>{details.incident?.mediaType || t.valueNotAdded}</span></article>
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
  const [threads, setThreads] = useState<Record<string, string[]>>({});
  const [editing, setEditing] = useState<EditCase | null>(null);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [evidence, setEvidence] = useState<api.EvidenceItem[]>([]);
  const [evidenceNote, setEvidenceNote] = useState('');
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const editPanelRef = useRef<HTMLElement | null>(null);

  async function loadCases() {
    const result = await api.fetchCases();
    const list = [...((result.cases as CaseRecord[]) ?? [])].sort((a, b) => b.created_at - a.created_at);
    setCases(list);
  }

  useEffect(() => {
    const forceVerify = new URLSearchParams(window.location.search).get('verify') === '1';
    const start = window.setTimeout(() => {
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
    if (!editing) return;
    editPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editing, preview]);

  const latest = cases[0];
  const earlier = cases.slice(1);

  async function changeStage(item: CaseRecord, direction: -1 | 1) {
    const index = COMPLAINT_STAGES.findIndex((stage) => stage.id === complaintStage(item.status));
    const next = COMPLAINT_STAGES[index + direction];
    if (!next) return;
    try {
      await api.patchCase({ case_id: item.id, status: next.id });
      await loadCases();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.saveChanges);
    }
  }

  async function beginEditing(item: CaseRecord) {
    const details = parseDetails(item.details_json);
    setError('');
    setOpenId(null);
    setPreview(false);
    setEvidence([]);
    setEvidenceNote('');
    setEditing({
      id: item.id,
      reference: item.reference,
      category_id: item.category_id,
      category_label: item.category_label,
      summary: details.account || item.summary,
      platform: item.platform,
      police_station: item.police_station,
      details,
    });
    try {
      const result = await api.fetchEvidence(item.id);
      setEvidence(result.evidence);
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
    setEvidenceBusy(true);
    try {
      await api.removeEvidence(editing.id, id);
      setEvidence(evidence.filter((item) => item.id !== id));
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
    try {
      await api.patchCase({
        case_id: editing.id,
        action: 'update_details',
        summary: editing.summary,
        category_id: editing.category_id,
        category_label: categoryCitizenLabelFromId(editing.category_id, editing.category_label),
        platform: editing.platform,
        police_station: editing.police_station,
        details: {
          ...editing.details,
          account: editing.summary,
          incident: { ...editing.details.incident },
          police_station: editing.police_station ? { ...editing.details.police_station, name: editing.police_station } : null,
        },
      });
      setEditing(null);
      setPreview(false);
      await loadCases();
      setError(t.detailsUpdated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.saveChanges);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="site-shell">
      <SakshiChrome />
      <main className="page-main is-dashboard stack">
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
                setThreadFor={setThreadFor}
                setThreadText={setThreadText}
                setThreads={setThreads}
              />
            ) : null}
            {earlier.length ? (
              <details className="earlier-files">
                <summary>{t.earlierFiles} ({earlier.length})</summary>
                <div className="stack" style={{ marginTop: '0.75rem' }}>
                  {earlier.map((item) => (
                    <CaseCard
                      key={item.id}
                      item={item}
                      t={t}
                      openId={openId}
                      setOpenId={setOpenId}
                      onEdit={() => void beginEditing(item)}
                      onStage={changeStage}
                      threadFor={threadFor}
                      threadText={threadText}
                      threads={threads}
                      setThreadFor={setThreadFor}
                      setThreadText={setThreadText}
                      setThreads={setThreads}
                    />
                  ))}
                </div>
              </details>
            ) : null}

            {editing ? (
              <section className="card stack saved-case-edit" ref={editPanelRef}>
                <div className="saved-case-heading">
                  <div>
                    <p className="kicker">{preview ? t.previewUpdatedFile : t.updateFile}</p>
                    <h2>{editing.reference}</h2>
                  </div>
                  <Button variant="link" size="inline" onClick={() => { setEditing(null); setPreview(false); }}>{t.closeAction}</Button>
                </div>
                {preview ? (
                  <>
                    <p>{t.checkUpdatedDetails}</p>
                    <ComplaintPreview
                      categoryId={editing.category_id}
                      categoryLabel={editing.category_label}
                      summary={editing.summary}
                      platform={editing.platform}
                      policeStation={editing.police_station}
                      details={{ ...editing.details, account: editing.summary }}
                      t={t}
                    />
                    <div className="dashboard-actions">
                      <Button variant="secondary" onClick={() => setPreview(false)}>{t.backToEdit}</Button>
                      <Button onClick={() => void saveEdits()} disabled={saving}>{saving ? t.savingChanges : t.saveChanges}</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p>{t.updateFileCopy}</p>
                    <div className="case-edit-grid">
                      <label className="full">
                        <span>{t.yourAccount}</span>
                        <Textarea value={editing.summary} onChange={(event) => setEditing({ ...editing, summary: event.target.value, details: { ...editing.details, account: event.target.value } })} />
                      </label>
                      <label>
                        <span>{t.typeOfComplaint}</span>
                        <select className={selectClass} value={editing.category_id} onChange={(event) => {
                          const id = event.target.value;
                          setEditing({ ...editing, category_id: id, category_label: categoryCitizenLabelFromId(id) });
                        }}>
                          {CATEGORY_EDIT_IDS.map((id) => <option key={id} value={id}>{categorySelectOptionLabel(id)}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>{t.whereDidThisHappen}</span>
                        <Input value={editing.platform} onChange={(event) => setEditing({ ...editing, platform: event.target.value })} />
                      </label>
                      <label>
                        <span>{t.labelAccountOrIdentifier}</span>
                        <Input
                          value={editing.details.incident?.accountIdentifier ?? ''}
                          onChange={(event) => setEditing({ ...editing, details: { ...editing.details, incident: { ...editing.details.incident, accountIdentifier: event.target.value } } })}
                        />
                      </label>
                      <label>
                        <span>{t.whenFirstSeen}</span>
                        <Input
                          value={editing.details.first_seen ?? ''}
                          onChange={(event) => setEditing({ ...editing, details: { ...editing.details, first_seen: event.target.value } })}
                        />
                      </label>
                      <label className="full">
                        <span>{t.policeStation}</span>
                        <Input
                          value={editing.police_station}
                          onChange={(event) => setEditing({
                            ...editing,
                            police_station: event.target.value,
                            details: { ...editing.details, police_station: event.target.value ? { ...editing.details.police_station, name: event.target.value } : null },
                          })}
                        />
                      </label>
                      <label className="full">
                        <span>{t.otherPersonInfo}</span>
                        <Textarea
                          value={editing.details.suspect_notes ?? ''}
                          placeholder={t.otherPersonPlaceholder}
                          onChange={(event) => setEditing({ ...editing, details: { ...editing.details, suspect_notes: event.target.value } })}
                        />
                      </label>
                      <section className="full evidence-vault stack" aria-labelledby="evidence-vault-title">
                        <div>
                          <span className="kicker">Evidence vault</span>
                          <h3 id="evidence-vault-title">Add evidence to this file</h3>
                          <p className="muted">Files are kept in this private prototype vault. They are not sent to the official portal.</p>
                        </div>
                        <label className="file-picker">
                          <span>Add image, PDF, video or audio</span>
                          <input type="file" multiple accept={EVIDENCE_ACCEPT} disabled={evidenceBusy} onChange={(event) => { void addFiles(event.target.files); event.currentTarget.value = ''; }} />
                        </label>
                        <div className="evidence-note-row">
                          <Textarea rows={2} value={evidenceNote} placeholder="Add a note about evidence or a new detail" onChange={(event) => setEvidenceNote(event.target.value)} />
                          <Button variant="secondary" size="inline" disabled={evidenceBusy || !evidenceNote.trim()} onClick={() => void addNote()}>Add note</Button>
                        </div>
                        {evidence.length ? <ul className="evidence-list">
                          {evidence.map((item) => <li key={item.id}>
                            <div><strong>{item.kind === 'note' ? 'Note' : item.file_name}</strong><small>{item.kind === 'note' ? item.note_text : item.content_type?.startsWith('audio/') ? 'Audio evidence' : 'File evidence'}</small></div>
                            <span>
                              {item.kind === 'file' ? <a href={`/api/evidence?case_id=${encodeURIComponent(editing.id)}&evidence_id=${encodeURIComponent(item.id)}`}>Download</a> : null}
                              <Button variant="link" size="inline" disabled={evidenceBusy} onClick={() => void deleteEvidenceItem(item.id)}>Remove</Button>
                            </span>
                          </li>)}
                        </ul> : <p className="muted">No evidence has been added to this file yet.</p>}
                      </section>
                    </div>
                    <div className="dashboard-actions">
                      <Button variant="ghost" onClick={() => { setEditing(null); setPreview(false); }}>{t.cancel}</Button>
                      <Button disabled={!editing.summary.trim()} onClick={() => setPreview(true)}>{t.previewChanges}</Button>
                    </div>
                  </>
                )}
              </section>
            ) : null}

            <Button asChild><a href="/">{t.startAnother}</a></Button>
            {error ? <p role="status">{error}</p> : null}
          </>
        ) : null}
      </main>
      <HelplineFooter />
    </div>
  );
}

function CaseCard({
  item, t, isLatest, openId, setOpenId, onEdit, onStage, threadFor, threadText, threads, setThreadFor, setThreadText, setThreads,
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
  threads: Record<string, string[]>;
  setThreadFor: (id: string | null) => void;
  setThreadText: (value: string) => void;
  setThreads: (value: Record<string, string[]>) => void;
}) {
  const stage = complaintStage(item.status);
  const stageIndex = COMPLAINT_STAGES.findIndex((entry) => entry.id === stage);
  const transparency = STAGE_TRANSPARENCY[stage];
  const milestoneIndex = CASE_PROGRESS_MILESTONES.findIndex((milestone) => milestone.stages.includes(stage));
  const details = parseDetails(item.details_json);
  const citizen = categoryCitizenLabelFromId(item.category_id, item.category_label);
  const previewOpen = openId === item.id;
  const progress = (stageIndex + 1) / COMPLAINT_STAGES.length;

  return (
    <article className={cn('card stack saved-case-card', isLatest && 'is-latest')}>
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
        <Button variant="secondary" size="inline" className="case-edit-button" onClick={onEdit} aria-label={`${t.editDetails}: ${item.reference}`}>
          <Pencil size={16} aria-hidden="true" />
          {t.editDetails}
        </Button>
      </div>
      {previewOpen ? (
        <section className="saved-case-inline-preview" aria-label={t.savedFilePreview}>
          <strong>{t.savedFilePreview}</strong>
          <ComplaintPreview
            categoryId={item.category_id}
            categoryLabel={item.category_label}
            summary={item.summary}
            platform={item.platform}
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
          <dd>{item.platform || t.valueNotAdded}</dd>
        </div>
        <div>
          <dt>{t.policeStation}</dt>
          <dd>{item.police_station || t.valueNotSelected}</dd>
        </div>
      </dl>
      <section className="case-progress" aria-label={t.caseProgress}>
        <div className="case-progress-head">
          <div>
            <span className="kicker">{t.caseProgress}</span>
            <strong>{COMPLAINT_STAGES[stageIndex].label}</strong>
            <p className="muted">{transparency.note}</p>
          </div>
          <Badge variant="current">{stageIndex + 1} / {COMPLAINT_STAGES.length}</Badge>
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
            <Button variant="secondary" size="inline" className="case-thread-button" onClick={() => { setThreadFor(threadFor === item.id ? null : item.id); setThreadText(''); }}>
              <MessageSquare size={15} aria-hidden="true" />
              {t.openThread}
            </Button>
          </div>
        </section>
        <div className="case-progress-controls">
          <button type="button" className="stage-step" disabled={stageIndex === 0} aria-label={t.previousFileStage} onClick={() => onStage(item, -1)}>
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button type="button" className="stage-step" disabled={stageIndex === COMPLAINT_STAGES.length - 1} aria-label={t.nextFileStage} onClick={() => onStage(item, 1)}>
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
        {threadFor === item.id ? (
          <form
            className="case-update-thread"
            onSubmit={(event) => {
              event.preventDefault();
              if (!threadText.trim()) return;
              setThreads({ ...threads, [item.id]: [...(threads[item.id] ?? []), threadText.trim()] });
              setThreadText('');
            }}
          >
            <div className="saved-case-heading">
              <strong>{t.updateThreadTitle}</strong>
              <Button variant="link" size="inline" type="button" onClick={() => setThreadFor(null)}>{t.closeAction}</Button>
            </div>
            <p className="muted">{t.prototypeThreadNote}</p>
            {(threads[item.id] ?? []).length ? (
              <ul>{(threads[item.id] ?? []).map((message, index) => <li key={`${item.id}-${index}`}>{message}</li>)}</ul>
            ) : (
              <p className="muted">{t.noUpdatesYet}</p>
            )}
            <Label htmlFor={`thread-${item.id}`} className="sr-only">{t.writeUpdate}</Label>
            <Textarea id={`thread-${item.id}`} rows={2} value={threadText} placeholder={t.writeUpdate} onChange={(event) => setThreadText(event.target.value)} />
            <Button type="submit" disabled={!threadText.trim()}>{t.addMessage}</Button>
          </form>
        ) : null}
      </section>
    </article>
  );
}
