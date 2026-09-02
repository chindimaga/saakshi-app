export const COMPLAINT_STAGES = [
  { id: 'complaint_received', label: 'Complaint received' },
  { id: 'initial_assessment', label: 'Preliminary assessment' },
  { id: 'fir_registered', label: 'FIR registered' },
  { id: 'evidence_review', label: 'Evidence collection' },
  { id: 'technical_forensic_review', label: 'Technical / forensic review' },
  { id: 'investigation_in_progress', label: 'Investigation in progress' },
  { id: 'outcome_preparation', label: 'Outcome being prepared' },
  { id: 'closed', label: 'Closed' },
] as const;

export type ComplaintStage = (typeof COMPLAINT_STAGES)[number]['id'];

export function complaintStage(value: string): ComplaintStage {
  if (value === 'marked_filed') return 'closed';
  if (value === 'prepared') return 'complaint_received';
  return COMPLAINT_STAGES.some((stage) => stage.id === value)
    ? value as ComplaintStage
    : 'complaint_received';
}

export const STAGE_TRANSPARENCY: Record<ComplaintStage, { contact: string; role: string; nextUpdateDays: number | null; note: string }> = {
  complaint_received: { contact: 'Complaint intake desk', role: 'Case registration team', nextUpdateDays: 2, note: 'Your complaint is being registered and checked for the next step.' },
  initial_assessment: { contact: 'Review officer', role: 'Initial assessment', nextUpdateDays: 3, note: 'The case is being assessed to decide what should happen next.' },
  fir_registered: { contact: 'Case registration desk', role: 'FIR registration', nextUpdateDays: 3, note: 'An FIR has been registered and the case is moving to investigation.' },
  evidence_review: { contact: 'Evidence review officer', role: 'Evidence collection', nextUpdateDays: 5, note: 'Available details and supporting information are being collected and reviewed.' },
  technical_forensic_review: { contact: 'Technical review desk', role: 'Forensic coordination', nextUpdateDays: 7, note: 'Specialist technical or forensic review is being coordinated where needed.' },
  investigation_in_progress: { contact: 'Investigating officer', role: 'Case investigation', nextUpdateDays: 7, note: 'The investigation is in progress. You will see the next update here.' },
  outcome_preparation: { contact: 'Case review desk', role: 'Outcome preparation', nextUpdateDays: 5, note: 'Findings and the next recorded outcome are being prepared.' },
  closed: { contact: 'Case closure desk', role: 'Closure review', nextUpdateDays: null, note: 'This complaint has reached its current recorded outcome.' },
};

export const CASE_PROGRESS_MILESTONES: Array<{ label: string; stages: ComplaintStage[] }> = [
  { label: 'Complaint received', stages: ['complaint_received'] },
  { label: 'Assessment & registration', stages: ['initial_assessment', 'fir_registered'] },
  { label: 'Evidence review', stages: ['evidence_review', 'technical_forensic_review'] },
  { label: 'Investigation & outcome', stages: ['investigation_in_progress', 'outcome_preparation', 'closed'] },
];
