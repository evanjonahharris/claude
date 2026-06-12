export interface OutcomeKey {
  outcomeCode: string;
  displayLabel: string;
  appliesToMethod: 'Call' | 'Email' | 'Both';
  outcomeCategory: string;
  description: string;
  defaultLeadStatus: string;
  defaultNextStep: string;
  defaultCadenceType: 'Phone' | 'Email' | 'Relationship' | 'None' | '';
  stopFollowUp: boolean;
  countsAsContactAttempt: boolean;
  countsAsConnected: boolean;
  countsAsInterested: boolean;
  countsAsNoAnswerOrVoicemail: boolean;
  countsAsEmailSent: boolean;
  countsAsEmailOpened: boolean;
  countsAsEmailReplied: boolean;
  countsAsPositiveEmailReply: boolean;
  countsAsNegativeEmailReply: boolean;
  countsAsCallbackRequest: boolean;
  countsAsDoNotContact: boolean;
  useForDashboardMetrics: boolean;
  automationNotes: string;
}

export interface LeadStatusKey {
  status: string;
  definition: string;
  nextAction: string;
}

export type OutreachMethod = 'Call' | 'Email' | 'Text' | 'LinkedIn' | 'In Person' | 'Other';

export interface OutreachSlot {
  n: number;
  method: OutreachMethod | '';
  dateTime: string;
  transcript: string;
  outcomeText: string;
  callSummary: string;
  callFeedback: string;
}

export interface Lead {
  recordId: string;
  facilityName: string;
  facilityType: string;
  facilityCategory: string;
  leadStatus: string;
  leadStatusLocked: number | null; // 1-10 or null
  priority: string;
  nextStep: string;
  dateTimeNextStep: string;
  miscNotes: string;
  leadSource: string;
  ownerAssignee: string;
  contactPersonName: string;
  contactPersonRole: string;
  phone1: string;
  phone1Type: string;
  phone2: string;
  phone2Type: string;
  faxNumber: string;
  confidentialFax: string;
  emailAddress: string;
  website: string;
  sourceUrl: string;
  physicalAddress: string;
  physicalCity: string;
  physicalState: string;
  physicalZip: string;
  physicalCounty: string;
  fullPhysicalAddress: string;
  mailingAddress: string;
  mailingCity: string;
  mailingState: string;
  mailingZip: string;
  referralSourceType: string;
  placementFitNotes: string;
  populationSpeciality: string;
  memoryCareFlag: string;
  licensedBedCount: string;
  certifiedBedCount: string;
  avgResidentsPerDay: string;
  overallRating: string;
  healthInspectionRating: string;
  staffingRating: string;
  qmRating: string;
  ownershipType: string;
  chainName: string;
  legalBusinessName: string;
  providerType: string;
  licenseNumber: string;
  cmsNumber: string;
  ceoAdmin: string;
  doNotContactReason: string;
  latestOutreachDate: string;
  latestOutreachOutcome: string;
  autoSummary: string;
  autoCallFeedback: string;
  outreach: OutreachSlot[];
  clientsAttained: string;
  revenueAttained: string;
  // raw spreadsheet row index for writes
  rowIndex?: number;
}

export interface RecalcResult {
  leadStatus: string;
  leadStatusLocked: number | null;
  latestOutreachDate: string;
  latestOutreachOutcome: string;
  nextStep: string;
  dateTimeNextStep: string;
  skippedReason?: string;
}

export interface AutomationLogEntry {
  timestamp: string;
  operation: string;
  rowsScanned: number;
  rowsUpdated: number;
  sameOutreachLocksSkipped: number;
  staleLocksCleared: number;
  invalidLocks: number;
  errors: number;
  details: string[];
}

export interface ManualOutcomeUpdate {
  leadId: string;
  outreachN: number;
  displayLabel: string;
  method: OutreachMethod;
  timestamp: string;
}

export type HomeTab = 'todos' | 'new-contacts';
export type SyncStatus = 'idle' | 'running' | 'done' | 'error';

export interface DashboardMetrics {
  totalLeads: number;
  newLeads: number;
  callsToday: number;
  connected: number;
  interested: number;
  partnered: number;
  doNotContact: number;
  needsResearch: number;
  emailSent: number;
  respondedPositive: number;
}
