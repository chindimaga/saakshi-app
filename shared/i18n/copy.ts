export const LOCALE_KEY = 'sakshi.locale';
export const LOCALE_EVENT = 'sakshi:locale';
export type Locale = 'en' | 'kn' | 'ta';

export const LOCALES = [
  { id: 'en' as const, native: 'English', latin: 'English', htmlLang: 'en', transcribe: 'English' },
  { id: 'kn' as const, native: 'ಕನ್ನಡ', latin: 'Kannada', htmlLang: 'kn', transcribe: 'ಕನ್ನಡ · Kannada' },
  { id: 'ta' as const, native: 'தமிழ்', latin: 'Tamil', htmlLang: 'ta', transcribe: 'தமிழ் · Tamil' },
];

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'en' || value === 'kn' || value === 'ta';
}

export function readStoredLocale(): Locale {
  try {
    const stored = sessionStorage.getItem(LOCALE_KEY);
    return isLocale(stored) ? stored : 'en';
  } catch {
    return 'en';
  }
}

export function setAppLocale(locale: Locale) {
  const meta = LOCALES.find(({ id }) => id === locale) ?? LOCALES[0];
  document.documentElement.lang = meta.htmlLang;
  try {
    sessionStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: locale }));
}

export function transcribeLanguage(locale: Locale) {
  return LOCALES.find(({ id }) => id === locale)?.transcribe ?? 'English';
}

const KANNADA_RANGE = /[\u0C80-\u0CFF]/;
const TAMIL_RANGE = /[\u0B80-\u0BFF]/;

export function scriptLang(text: string, fallback: Locale): 'kn' | 'ta' | 'en' {
  if (KANNADA_RANGE.test(text)) return 'kn';
  if (TAMIL_RANGE.test(text)) return 'ta';
  return fallback;
}

const CITY_KN: Record<string, string> = {
  'Bengaluru Urban': 'ಬೆಂಗಳೂರು ನಗರ',
  'Bengaluru Rural': 'ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ',
  Mysuru: 'ಮೈಸೂರು',
  Mangaluru: 'ಮಂಗಳೂರು',
};
const CITY_TA: Record<string, string> = {
  'Bengaluru Urban': 'பெங்களூரு நகர்',
  'Bengaluru Rural': 'பெங்களூரு கிராமம்',
  Mysuru: 'மைசூரு',
};

export function cityLabel(englishName: string, locale: Locale) {
  if (locale === 'kn' && CITY_KN[englishName]) return `${CITY_KN[englishName]} · ${englishName}`;
  if (locale === 'ta' && CITY_TA[englishName]) return `${CITY_TA[englishName]} · ${englishName}`;
  return englishName;
}

export type Copy = {
  menu: string;
  closeMenu: string;
  themeLabel: string;
  themeLight: string;
  themeDark: string;
  languageLegend: string;
  goToDashboard: string;
  leave: string;
  leaveHint: string;
  startAgain: string;
  startOverTitle: string;
  startOverCopy: string;
  keepDraft: string;
  prototypeBanner: string;
  needHelp: string;
  womenHelpline: string;
  emergency: string;
  restore: string;
  startOver: string;
  startTitle: string;
  startLede: string;
  trustLine: string;
  trust1: string;
  trust2: string;
  trust3: string;
  trust4: string;
  doorTell: string;
  doorTellHint: string;
  doorEvidence: string;
  doorEvidenceHint: string;
  doorFiled: string;
  doorFiledHint: string;
  draftStillHere: string;
  howItWorks: string;
  helpSupport: string;
  back: string;
  continue: string;
  accountKicker: string;
  accountTitle: string;
  accountCopy: string;
  speak: string;
  type: string;
  speakDisclosure: string;
  voiceReady: string;
  startRecording: string;
  recordingNow: string;
  stopRecording: string;
  turningSpeech: string;
  writeOwnWords: string;
  editWords: string;
  prefillNote: string;
  fillSample: string;
  sampleComplaintKicker: string;
  sampleComplaintTitle: string;
  sampleComplaintCopy: string;
  whatHappened: string;
  evidenceTitle: string;
  evidenceCopy: string;
  evidenceGaps: string;
  evidenceKicker: string;
  evidenceOptional: string;
  evidenceOptionalStatus: string;
  skipForNow: string;
  continueWithoutEvidence: string;
  evidenceCarriedTitle: string;
  evidenceCarriedCopy: string;
  whatTitle: string;
  whatNarrate: string;
  useCategoryHelp: string;
  chooseWithoutSending: string;
  extraTitle: string;
  extraCopy: string;
  fileTitle: string;
  fileYours: string;
  keepOnPhone: string;
  printFile: string;
  downloadFile: string;
  personHeading: string;
  personHint: string;
  addDetail: string;
  stationTitle: string;
  useLocation: string;
  locating: string;
  locationFailed: string;
  stationCoverageNote: string;
  detailsKicker: string;
  detailsTitle: string;
  detailsCopy: string;
  previewKicker: string;
  previewTitle: string;
  otpKicker: string;
  suggestedComplaintType: string;
  suggestedComplaintCopy: string;
  confirmThisType: string;
  changeComplaintType: string;
  incidentDetailsTitle: string;
  incidentDetailsCopy: string;
  requiredItemLeft: string;
  requiredItemsLeft: string;
  categoryBusy: string;
  categoryBusyDetail: string;
  confirmCategoryFirst: string;
  stationRequired: string;
  stationCopy: string;
  suggestedStation: string;
  useThisStation: string;
  chooseAnotherStation: string;
  state: string;
  karnataka: string;
  cityOrDistrict: string;
  chooseCity: string;
  policeStation: string;
  stationSearchPlaceholder: string;
  chooseCityFirst: string;
  noStations: string;
  kmAway: string;
  typeOfComplaint: string;
  chooseClosestType: string;
  whereDidThisHappen: string;
  selectService: string;
  labelService: string;
  otherPlatformPlaceholder: string;
  typeOfMedia: string;
  selectMediaType: string;
  whenFirstSeen: string;
  firstSeenPlaceholder: string;
  prefilledCorrect: string;
  prefilledFromAccount: string;
  supportingEvidence: string;
  supportingEvidenceHelp: string;
  chooseAFile: string;
  chooseAnotherFile: string;
  selectedFile: string;
  additionalIncidentInfo: string;
  prefilledFromTold: string;
  identifierHelp: string;
  previewComplaint: string;
  chooseBeforePreview: string;
  yourAccount: string;
  complaintDetailsHeading: string;
  labelComplaintType: string;
  labelAccountOrIdentifier: string;
  labelFirstSeen: string;
  labelSupportingFile: string;
  labelMediaType: string;
  valueNotAdded: string;
  valueNotSelected: string;
  continueVerify: string;
  nameIfKnown: string;
  namePlaceholder: string;
  detailType: string;
  remove: string;
  otherPersonInfo: string;
  otherPersonPlaceholder: string;
  photoIdentifying: string;
  photoIdentifyingHelp: string;
  chooseImageOrPdf: string;
  noDetailsAdded: string;
  detailLabel: string;
  savedLabel: string;
  caseProgress: string;
  detailedStages: string;
  noFurtherStage: string;
  earlierFiles: string;
  verifyToView: string;
  savedFilePreview: string;
  updateFile: string;
  updateFileCopy: string;
  previewChanges: string;
  saveChanges: string;
  savingChanges: string;
  backToEdit: string;
  closeAction: string;
  prototypeThreadNote: string;
  noUpdatesYet: string;
  addMessage: string;
  updateThreadTitle: string;
  cancel: string;
  previewUpdatedFile: string;
  checkUpdatedDetails: string;
  otpTitle: string;
  otpCopy: string;
  otpDemoNote: string;
  otpCookieNote: string;
  otpPhoneLabel: string;
  otpCodeLabel: string;
  otpGetCode: string;
  otpVerify: string;
  otpSaving: string;
  dashboardTitle: string;
  dashboardIntro: string;
  dashboardDemo: string;
  openAnyFile: string;
  currentFile: string;
  writeUpdate: string;
  useAnotherNumber: string;
  detailsUpdated: string;
  openingDashboard: string;
  otpReadyMessage: string;
  savedCases: string;
  noSaved: string;
  editDetails: string;
  startAnother: string;
  nextStageEta: string;
  pointOfContact: string;
  openThread: string;
  previousFileStage: string;
  nextFileStage: string;
  crisisKicker: string;
  crisisTitle: string;
  crisisCopy: string;
  call181: string;
  call112: string;
  crisisFine: string;
  notesTitle: string;
  notesCopy: string;
  workflowTitle: string;
  helpTitle: string;
};

const en: Copy = {
  menu: 'Menu',
  closeMenu: 'Close',
  themeLabel: 'Theme',
  themeLight: 'Light',
  themeDark: 'Dark',
  languageLegend: 'Language',
  goToDashboard: 'Go to dashboard',
  leave: 'Leave',
  leaveHint: 'Leave opens a notes page and clears this draft. It does not erase browser history.',
  startAgain: 'Start again',
  startOverTitle: 'Start a blank file?',
  startOverCopy: 'This clears the saved draft from this browser.',
  keepDraft: 'Keep draft',
  prototypeBanner: 'Independent hackathon prototype · Nothing is submitted to the official portal',
  needHelp: 'Need help now?',
  womenHelpline: 'Women Helpline',
  emergency: 'Emergency',
  restore: 'Your saved draft is here. Files need to be chosen again after a refresh.',
  startOver: 'Start over',
  startTitle: 'You are not alone.',
  startLede: 'When you are ready, tell it in your words.',
  trustLine: 'Typing stays on this phone. Nothing is sent unless you choose.',
  trust1: 'Typing stays on this phone. Nothing is sent unless you choose.',
  trust2: 'If you use the microphone, audio goes through Saakshi to Google speech, after you start recording.',
  trust3: 'You choose what to do with your prepared file. Nothing is sent to the official portal.',
  trust4: 'Every suggestion can be changed. Unknown information stays unknown.',
  doorTell: 'Tell what happened',
  doorTellHint: 'Speak or type. Edit anything, whenever you want.',
  doorEvidence: 'Save evidence first',
  doorEvidenceHint: 'If a screenshot may disappear.',
  doorFiled: 'I already filed',
  doorFiledHint: 'Open a file kept on this phone.',
  draftStillHere: 'Your draft is still here.',
  howItWorks: 'How it works',
  helpSupport: 'Help and support',
  back: 'Back',
  continue: 'Continue',
  accountKicker: 'Your account',
  accountTitle: 'Tell us what happened.',
  accountCopy: 'Speak or type in any language. You can edit every word. No timer.',
  speak: 'Speak',
  type: 'Type',
  speakDisclosure: 'Speech goes to Google to become text. We do not keep the recording. You can type instead.',
  voiceReady: 'Ready when you are.',
  startRecording: 'Start recording',
  recordingNow: 'Recording now',
  stopRecording: 'Stop recording',
  turningSpeech: 'Turning speech into text…',
  writeOwnWords: 'Write it in your own words. You can leave anything unknown out.',
  editWords: 'Edit anything before you continue.',
  prefillNote: 'Next, we suggest a complaint type and prefill details you can change.',
  fillSample: 'Try a sample complaint',
  sampleComplaintKicker: 'Quick demo',
  sampleComplaintTitle: 'Want to see Saakshi work end to end?',
  sampleComplaintCopy: 'Load a fictional complaint and walk through every step. Nothing is sent, and you can change it anytime.',
  whatHappened: 'What happened?',
  evidenceTitle: 'Save what you already have.',
  evidenceCopy: 'Add anything you have. Skip anything you do not have.',
  evidenceGaps: 'Missing something? That is fine. Gaps stay visible and never block you.',
  evidenceKicker: 'Evidence',
  evidenceOptional: 'Everything on this page is optional.',
  evidenceOptionalStatus: 'Optional',
  skipForNow: 'Skip for now',
  continueWithoutEvidence: 'Continue without evidence',
  evidenceCarriedTitle: 'Evidence saved so far',
  evidenceCarriedCopy: 'This information is carried forward with your file.',
  whatTitle: 'What this is',
  whatNarrate: 'Saakshi will read your words on this phone and suggest a description. You can change it.',
  useCategoryHelp: 'Use category help',
  chooseWithoutSending: 'Choose without sending',
  extraTitle: 'A few more items for this description',
  extraCopy: 'These were not asked earlier. Skip any you do not have.',
  fileTitle: 'Your file',
  fileYours: 'This file is yours. We do not send it. A download sits in Downloads on this phone.',
  keepOnPhone: 'Keep a copy on this phone',
  printFile: 'Print',
  downloadFile: 'Download HTML',
  personHeading: 'Person or account involved',
  personHint: 'Add only information you personally know.',
  addDetail: 'Add a detail',
  stationTitle: 'Choose a police station',
  useLocation: 'Use my location',
  locating: 'Finding your location…',
  locationFailed: 'We could not get your location. Your district and station below stay set to Bengaluru Urban — change them if that is wrong.',
  stationCoverageNote: 'Right now Saakshi covers Karnataka police stations only. Other states are coming.',
  detailsKicker: 'Complaint details',
  detailsTitle: 'Complete the details you know.',
  detailsCopy: 'Saakshi fills what it can from what you said. Change anything. Unknown information can stay blank.',
  previewKicker: 'Preview',
  previewTitle: 'Check your file before saving.',
  otpKicker: 'Save on this phone',
  suggestedComplaintType: 'Suggested complaint type',
  suggestedComplaintCopy: 'This was filled from what you shared. Confirm it, or change it below.',
  confirmThisType: 'Confirm this type',
  changeComplaintType: 'Change type',
  incidentDetailsTitle: 'Incident details',
  incidentDetailsCopy: 'Add only what you know. Everything in this section is optional.',
  requiredItemLeft: '{count} required item left',
  requiredItemsLeft: '{count} required items left',
  categoryBusy: 'Reading what you wrote…',
  categoryBusyDetail: 'Preparing suggestions from your description. This usually takes a few seconds.',
  confirmCategoryFirst: 'Confirm the suggested type, or choose another, before previewing your file.',
  stationRequired: 'Required',
  stationCopy: 'A police station is required before you can preview this file.',
  suggestedStation: 'Suggested station',
  useThisStation: 'Use this station',
  chooseAnotherStation: 'Choose another',
  state: 'State',
  karnataka: 'Karnataka',
  cityOrDistrict: 'City or district',
  chooseCity: 'Choose a city',
  policeStation: 'Police station',
  stationSearchPlaceholder: 'Search by station name',
  chooseCityFirst: 'Choose a city first',
  noStations: 'No stations match that name.',
  kmAway: 'km away',
  typeOfComplaint: 'Type of complaint',
  chooseClosestType: 'Choose the closest type',
  whereDidThisHappen: 'Where did this happen?',
  selectService: 'Select a service',
  labelService: 'Service',
  otherPlatformPlaceholder: 'Name of the service',
  typeOfMedia: 'Type of media',
  selectMediaType: 'Select media type',
  whenFirstSeen: 'When did you first see it?',
  firstSeenPlaceholder: 'Approximate is fine',
  prefilledCorrect: 'Filled from what you said. Correct it if needed.',
  prefilledFromAccount: 'Filled from your account: {value}',
  supportingEvidence: 'Supporting evidence',
  supportingEvidenceHelp: 'A screenshot, image, video, audio, or PDF. This stays on this phone.',
  chooseAFile: 'Choose a file',
  chooseAnotherFile: 'Choose another file',
  selectedFile: 'Selected:',
  additionalIncidentInfo: 'Additional information about the incident',
  prefilledFromTold: 'This is what you already told Saakshi. You can edit it.',
  identifierHelp: 'A profile link, handle, email, or number you personally know.',
  previewComplaint: 'Preview my file',
  chooseBeforePreview: 'Choose a police station before previewing your file.',
  yourAccount: 'Your account',
  complaintDetailsHeading: 'Complaint details',
  labelComplaintType: 'Complaint type',
  labelAccountOrIdentifier: 'Account or identifier',
  labelFirstSeen: 'First seen',
  labelSupportingFile: 'Supporting file',
  labelMediaType: 'Type of media',
  valueNotAdded: 'Not added',
  valueNotSelected: 'Not selected',
  continueVerify: 'Save this file',
  nameIfKnown: 'Name, if known',
  namePlaceholder: 'Name or display name',
  detailType: 'Detail type',
  remove: 'Remove',
  otherPersonInfo: 'Other information about the person or account',
  otherPersonPlaceholder: 'Anything else you personally know',
  photoIdentifying: 'Photograph or identifying screenshot',
  photoIdentifyingHelp: 'Only if you have it. This stays on this phone.',
  chooseImageOrPdf: 'Choose an image or PDF',
  noDetailsAdded: 'No details added.',
  detailLabel: 'Detail',
  savedLabel: 'Saved',
  caseProgress: 'Case progress',
  detailedStages: 'View detailed stages',
  noFurtherStage: 'No further stage scheduled',
  earlierFiles: 'Earlier files',
  verifyToView: 'Verify your mobile number to view your files.',
  savedFilePreview: 'Saved file preview',
  updateFile: 'Update details',
  updateFileCopy: 'Change only what you know. Preview before saving.',
  previewChanges: 'Preview changes',
  saveChanges: 'Save changes',
  savingChanges: 'Saving changes…',
  backToEdit: 'Back to edit',
  closeAction: 'Close',
  prototypeThreadNote: 'Messages stay in this prototype. They are not sent anywhere.',
  noUpdatesYet: 'No messages yet.',
  addMessage: 'Add message',
  updateThreadTitle: 'Update thread',
  cancel: 'Cancel',
  previewUpdatedFile: 'Preview updated file',
  checkUpdatedDetails: 'Check the updated details before saving.',
  otpTitle: 'Save this file with a demo code.',
  otpCopy: 'This is an independent prototype. Use 123456. This is not portal verification.',
  otpDemoNote: 'Demo code: 123456. This is not an actual portal verification.',
  otpCookieNote: 'A session cookie stays on this phone for seven days so you can reopen your files.',
  otpPhoneLabel: 'Mobile number',
  otpCodeLabel: 'Demo code',
  otpGetCode: 'Get demo code',
  otpVerify: 'Verify and save',
  otpSaving: 'Saving your file…',
  dashboardTitle: 'Dashboard',
  dashboardIntro: 'View and manage your saved cases.',
  dashboardDemo: 'Demo only. Stage dates are not a real FIR tracker.',
  openAnyFile: 'Open a file to review what you saved.',
  currentFile: 'Current file',
  writeUpdate: 'Write an update',
  useAnotherNumber: 'Use another number',
  detailsUpdated: 'Details updated.',
  openingDashboard: 'Opening your files…',
  otpReadyMessage: 'Use 123456 to open your files.',
  savedCases: 'Saved cases',
  noSaved: 'No saved files yet',
  editDetails: 'Edit details',
  startAnother: 'Start another file',
  nextStageEta: 'Next stage ETA',
  pointOfContact: 'Point of contact',
  openThread: 'Open update thread',
  previousFileStage: 'Previous stage',
  nextFileStage: 'Next stage',
  crisisKicker: 'Pause here',
  crisisTitle: 'This needs a person.',
  crisisCopy: 'Saakshi cannot safely continue with what you said. Call a helpline. You can leave this page.',
  call181: 'Call 181',
  call112: 'Call 112',
  crisisFine: 'These numbers are real. Saakshi does not place the call for you.',
  notesTitle: 'Notes',
  notesCopy: 'Your notes are clear. The local draft has been cleared. This page does not show what you were doing.',
  workflowTitle: 'How it works',
  helpTitle: 'Help and support',
};

const kn: Copy = {
  ...en,
  locating: 'ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ…',
  locationFailed: 'ನಿಮ್ಮ ಸ್ಥಳ ಸಿಗಲಿಲ್ಲ. ಕೆಳಗಿನ ಜಿಲ್ಲೆ ಮತ್ತು ಠಾಣೆ ಬೆಂಗಳೂರು ನಗರ ಎಂದೇ ಉಳಿಯುತ್ತವೆ — ಸರಿಯಿಲ್ಲದಿದ್ದರೆ ಬದಲಿಸಿ.',
  stationCoverageNote: 'ಸದ್ಯಕ್ಕೆ ಸಾಕ್ಷಿ ಕರ್ನಾಟಕದ ಪೊಲೀಸ್ ಠಾಣೆಗಳನ್ನು ಮಾತ್ರ ಒಳಗೊಂಡಿದೆ. ಇತರ ರಾಜ್ಯಗಳು ಶೀಘ್ರದಲ್ಲೇ ಬರಲಿವೆ.',
  menu: 'ಮೆನು',
  closeMenu: 'ಮುಚ್ಚಿ',
  themeLabel: 'ಥೀಮ್',
  themeLight: 'ಬೆಳಕು',
  themeDark: 'ಕತ್ತಲೆ',
  languageLegend: 'ಭಾಷೆ',
  goToDashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ',
  leave: 'ಬಿಟ್ಟು ಹೋಗಿ',
  startAgain: 'ಮತ್ತೆ ಆರಂಭಿಸಿ',
  startOverTitle: 'ಹೊಸ ಫೈಲ್ ಆರಂಭಿಸುವುದೇ?',
  startOverCopy: 'ಇದು ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿರುವ ಉಳಿಸಿದ ಡ್ರಾಫ್ಟ್ ಅನ್ನು ತೆರವುಗೊಳಿಸುತ್ತದೆ.',
  keepDraft: 'ಡ್ರಾಫ್ಟ್ ಉಳಿಸಿ',
  prototypeBanner: 'ಸ್ವತಂತ್ರ ಪ್ರೋಟೋಟೈಪ್ · ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗೆ ಏನೂ ಕಳುಹಿಸಲಾಗುವುದಿಲ್ಲ',
  needHelp: 'ಈಗ ಸಹಾಯ ಬೇಕೆ?',
  startTitle: 'ನೀವು ಒಂಟಿಯಲ್ಲ.',
  startLede: 'ಸಿದ್ಧರಾದಾಗ ನಿಮ್ಮ ಮಾತಿನಲ್ಲಿ ಹೇಳಿ.',
  trustLine: 'ಟೈಪ್ ಈ ಫೋನ್‌ನಲ್ಲೇ ಉಳಿಯುತ್ತದೆ. ನೀವು ಆರಿಸಿದರೆ ಮಾತ್ರ ಕಳುಹಿಸಲಾಗುತ್ತದೆ.',
  doorTell: 'ಏನಾಯಿತು ಎಂದು ಹೇಳಿ',
  doorTellHint: 'ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ. ಯಾವಾಗ ಬೇಕಾದರೂ ತಿದ್ದುಬಹುದು.',
  doorEvidence: 'ಮೊದಲು ಸಾಕ್ಷ್ಯ ಉಳಿಸಿ',
  doorEvidenceHint: 'ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ಮಾಯವಾಗಬಹುದಾದರೆ.',
  doorFiled: 'ನಾನು ಈಗಾಗಲೇ ದಾಖಲಿಸಿದ್ದೇನೆ',
  doorFiledHint: 'ಈ ಫೋನ್‌ನಲ್ಲಿ ಇರಿಸಿದ ಫೈಲ್ ತೆರೆಯಿರಿ.',
  draftStillHere: 'ನಿಮ್ಮ ಡ್ರಾಫ್ಟ್ ಇನ್ನೂ ಇದೆ.',
  howItWorks: 'ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
  helpSupport: 'ಸಹಾಯ',
  back: 'ಹಿಂದೆ',
  continue: 'ಮುಂದುವರಿಸಿ',
  accountTitle: 'ಏನಾಯಿತು ಎಂದು ಹೇಳಿ.',
  speak: 'ಮಾತನಾಡಿ',
  type: 'ಟೈಪ್ ಮಾಡಿ',
  voiceReady: 'ನೀವು ಸಿದ್ಧವಾದಾಗ.',
  startRecording: 'ಧ್ವನಿಮುದ್ರಣ ಆರಂಭಿಸಿ',
  recordingNow: 'ಧ್ವನಿಮುದ್ರಣ ನಡೆಯುತ್ತಿದೆ',
  stopRecording: 'ಧ್ವನಿಮುದ್ರಣ ನಿಲ್ಲಿಸಿ',
  turningSpeech: 'ಮಾತನ್ನು ಬರಹವಾಗಿ ಮಾಡಲಾಗುತ್ತಿದೆ…',
  writeOwnWords: 'ನಿಮ್ಮ ಮಾತಿನಲ್ಲಿ ಬರೆಯಿರಿ. ಗೊತ್ತಿಲ್ಲದಿದ್ದನ್ನು ಬಿಡಬಹುದು.',
  editWords: 'ಮುಂದುವರಿಸುವ ಮೊದಲು ಏನನ್ನಾದರೂ ತಿದ್ದು.',
  prefillNote: 'ಮುಂದೆ, ನಾವು ದೂರು ಪ್ರಕಾರವನ್ನು ಸೂಚಿಸಿ ಬದಲಾಯಿಸಬಹುದಾದ ವಿವರಗಳನ್ನು ತುಂಬುತ್ತೇವೆ.',
  fillSample: 'ಮಾದರಿ ದೂರನ್ನು ಪ್ರಯತ್ನಿಸಿ',
  sampleComplaintKicker: 'ತ್ವರಿತ ಡೆಮೊ',
  sampleComplaintTitle: 'ಸಾಕ್ಷಿ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ ಎಂದು ನೋಡಬೇಕೇ?',
  sampleComplaintCopy: 'ಕಲ್ಪಿತ ದೂರನ್ನು ತುಂಬಿಸಿ ಪ್ರತಿಯೊಂದು ಹಂತವನ್ನು ನೋಡಿ. ಏನನ್ನೂ ಕಳುಹಿಸಲಾಗುವುದಿಲ್ಲ; ಯಾವಾಗ ಬೇಕಾದರೂ ಬದಲಾಯಿಸಬಹುದು.',
  fileTitle: 'ನಿಮ್ಮ ಫೈಲ್',
  dashboardTitle: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
  dashboardIntro: 'ನಿಮ್ಮ ಉಳಿಸಿದ ಫೈಲ್‌ಗಳನ್ನು ನೋಡಿ.',
  openAnyFile: 'ಉಳಿಸಿದದನ್ನು ನೋಡಲು ಒಂದು ಫೈಲ್ ತೆರೆಯಿರಿ.',
  currentFile: 'ಪ್ರಸ್ತುತ ಫೈಲ್',
  writeUpdate: 'ಒಂದು ನವೀಕರಣ ಬರೆಯಿರಿ',
  crisisTitle: 'ಇದಕ್ಕೆ ಒಬ್ಬ ವ್ಯಕ್ತಿ ಬೇಕು.',
  notesTitle: 'ಟಿಪ್ಪಣಿಗಳು',
};

const ta: Copy = {
  ...en,
  locating: 'உங்கள் இருப்பிடத்தைக் கண்டறிகிறது…',
  locationFailed: 'உங்கள் இருப்பிடத்தைக் கண்டறிய முடியவில்லை. கீழே மாவட்டமும் நிலையமும் பெங்களூரு நகரம் எனவே இருக்கும் — தவறாக இருந்தால் மாற்றவும்.',
  stationCoverageNote: 'தற்போது சாட்சி கர்நாடக காவல் நிலையங்களை மட்டுமே உள்ளடக்குகிறது. பிற மாநிலங்கள் விரைவில்.',
  menu: 'பட்டி',
  closeMenu: 'மூடு',
  themeLabel: 'தோற்றம்',
  themeLight: 'வெளிச்சம்',
  themeDark: 'இருள்',
  languageLegend: 'மொழி',
  goToDashboard: 'டாஷ்போர்டுக்கு',
  leave: 'வெளியேறு',
  startAgain: 'மீண்டும் தொடங்கு',
  startOverTitle: 'புதிய கோப்பை தொடங்கவா?',
  startOverCopy: 'இது இந்த உலாவியில் சேமிக்கப்பட்ட வரைவினை அழிக்கும்.',
  keepDraft: 'வரைவை வைத்திருங்கள்',
  prototypeBanner: 'சுயாதீன முன்மாதிரி · அதிகாரப்பூர்வ போர்ட்டலுக்கு எதுவும் அனுப்பப்படாது',
  needHelp: 'இப்போது உதவி வேண்டுமா?',
  startTitle: 'நீங்கள் தனியாக இல்லை.',
  startLede: 'தயாராக இருக்கும்போது உங்கள் வார்த்தைகளில் சொல்லுங்கள்.',
  trustLine: 'தட்டச்சு இந்த தொலைபேசியிலேயே இருக்கும். நீங்கள் தேர்ந்தால் மட்டுமே அனுப்பப்படும்.',
  doorTell: 'என்ன நடந்தது என்று சொல்லுங்கள்',
  doorTellHint: 'பேசவும் அல்லது தட்டச்சு செய்யவும். எப்போது வேண்டுமானாலும் திருத்தலாம்.',
  doorEvidence: 'முதலில் சான்றுகளை சேமிக்கவும்',
  doorEvidenceHint: 'திரைக்காட்சி மறையக்கூடும் என்றால்.',
  doorFiled: 'நான் ஏற்கனவே பதிவு செய்தேன்',
  doorFiledHint: 'இந்த தொலைபேசியில் வைத்த கோப்பை திறக்கவும்.',
  draftStillHere: 'உங்கள் வரைவு இன்னும் இங்கே உள்ளது.',
  howItWorks: 'இது எப்படி வேலை செய்கிறது',
  helpSupport: 'உதவி',
  back: 'பின்',
  continue: 'தொடரவும்',
  accountTitle: 'என்ன நடந்தது என்று சொல்லுங்கள்.',
  speak: 'பேசுங்கள்',
  type: 'தட்டச்சு செய்க',
  voiceReady: 'நீங்கள் தயாராக இருக்கும்போது.',
  startRecording: 'பதிவைத் தொடங்குங்கள்',
  recordingNow: 'பதிவு நடைபெறுகிறது',
  stopRecording: 'பதிவை நிறுத்துங்கள்',
  turningSpeech: 'பேச்சு உரையாக மாற்றப்படுகிறது…',
  writeOwnWords: 'உங்கள் சொற்களில் எழுதுங்கள். தெரியாததை விடலாம்.',
  editWords: 'தொடர்வதற்கு முன் எதையும் திருத்தலாம்.',
  prefillNote: 'அடுத்து, புகார் வகையைப் பரிந்துரைத்து மாற்றக்கூடிய விவரங்களை நிரப்புவோம்.',
  fillSample: 'மாதிரி புகாரை முயற்சிக்கவும்',
  sampleComplaintKicker: 'விரைவு செயல்விளக்கம்',
  sampleComplaintTitle: 'சாட்சி முழுவதும் எப்படி வேலை செய்கிறது எனப் பார்க்க வேண்டுமா?',
  sampleComplaintCopy: 'கற்பனையான புகாரை நிரப்பி ஒவ்வொரு படியையும் பார்க்கலாம். எதுவும் அனுப்பப்படாது; எப்போது வேண்டுமானாலும் மாற்றலாம்.',
  fileTitle: 'உங்கள் கோப்பு',
  dashboardTitle: 'டாஷ்போர்டு',
  dashboardIntro: 'சேமித்த கோப்புகளை பார்க்கவும்.',
  openAnyFile: 'சேமித்ததை பார்க்க ஒரு கோப்பை திறக்கவும்.',
  currentFile: 'தற்போதைய கோப்பு',
  writeUpdate: 'ஒரு புதுப்பிப்பை எழுதவும்',
  crisisTitle: 'இதற்கு ஒரு நபர் தேவை.',
  notesTitle: 'குறிப்புகள்',
};

const PACK: Record<Locale, Copy> = { en, kn, ta };

export function copyFor(locale: Locale): Copy {
  return PACK[locale] ?? en;
}
