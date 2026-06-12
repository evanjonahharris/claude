export const SHEET_ID = '1egboHkb3fhnqIyjGjvUbQgsZ9nJ2O38ebitbbsNtFiU';
export const SHEET_TAB = 'Sheet1';
export const MAX_OUTREACH = 10;

// Column names exactly as they appear in the live CRM sheet header row
export const CRM_COLS = {
  RECORD_ID: 'Record ID',
  FACILITY_NAME: 'Facility Name',
  FACILITY_TYPE: 'Facility Type',
  FACILITY_CATEGORY: 'Facility Category',
  LEAD_STATUS: 'Lead Status',
  LEAD_STATUS_LOCKED: 'Lead Status Locked',
  PRIORITY: 'Priority',
  NEXT_STEP: 'Next Step',
  DATE_TIME_NEXT_STEP: 'Date and Time of Next Step',
  MISC_NOTES: 'Miscellaneous Notes',
  LEAD_SOURCE: 'Lead Source / Outlet',
  OWNER: 'Owner / Assignee',
  CONTACT_NAME: 'Contact Person Name',
  CONTACT_ROLE: 'Contact Person Role',
  PHONE1: 'Phone Number 1',
  PHONE1_TYPE: 'Phone Number 1 Type',
  PHONE2: 'Phone Number 2',
  PHONE2_TYPE: 'Phone Number 2 Type',
  FAX: 'Fax Number',
  CONFIDENTIAL_FAX: 'Confidential Fax Number',
  EMAIL: 'Email Address',
  WEBSITE: 'Website',
  SOURCE_URL: 'Source URL',
  PHYSICAL_ADDRESS: 'Physical Address',
  PHYSICAL_CITY: 'Physical City',
  PHYSICAL_STATE: 'Physical State',
  PHYSICAL_ZIP: 'Physical ZIP',
  PHYSICAL_COUNTY: 'Physical County',
  FULL_PHYSICAL_ADDRESS: 'Full Physical Address',
  MAILING_ADDRESS: 'Mailing Address',
  MAILING_CITY: 'Mailing City',
  MAILING_STATE: 'Mailing State',
  MAILING_ZIP: 'Mailing ZIP',
  REFERRAL_SOURCE_TYPE: 'Referral Source Type',
  PLACEMENT_FIT_NOTES: 'Placement Fit Notes',
  POPULATION_SPECIALITY: 'Population / Speciality',
  MEMORY_CARE_FLAG: 'Memory Care Flag',
  LICENSED_BED_COUNT: 'Licensed Bed Count',
  CERTIFIED_BED_COUNT: 'Certified Bed Count',
  AVG_RESIDENTS_PER_DAY: 'Average Residents Per Day',
  OVERALL_RATING: 'Overall Rating',
  HEALTH_INSPECTION_RATING: 'Health Inspection Rating',
  STAFFING_RATING: 'Staffing Rating',
  QM_RATING: 'QM Rating',
  OWNERSHIP_TYPE: 'Ownership Type',
  CHAIN_NAME: 'Chain Name',
  LEGAL_BUSINESS_NAME: 'Legal Business Name',
  PROVIDER_TYPE: 'Provider Type',
  LICENSE_NUMBER: 'License Number',
  CMS_NUMBER: 'CMS Certification Number (CCN)',
  CEO_ADMIN: 'CEO/Admin',
  LATEST_OUTREACH_DATE: 'Latest Outreach Date',
  LATEST_OUTREACH_OUTCOME: 'Latest Outreach Outcome',
  AUTO_SUMMARY: 'Auto Summary',
  AUTO_CALL_FEEDBACK: 'Auto Call Feedback',
  DO_NOT_CONTACT_REASON: 'Do Not Contact Reason',
  CLIENTS_ATTAINED: 'Clients Attained',
  REVENUE_ATTAINED: 'Revenue Attained',
};

export function outreachCol(n: number, field: 'Method' | 'Date and Time' | 'Transcript or Message' | 'Outcome or Response Text' | 'Call Summary' | 'Call Feedback'): string {
  return `Outreach ${n} ${field}`;
}

// Lead statuses that exclude a lead from normal queues
export const INACTIVE_STATUSES = new Set([
  'Do Not Contact',
  'Dead / Closed',
  'Connected - Not Interested',
  'Responded - Negative',
]);

// Lead statuses that indicate positive pipeline
export const POSITIVE_STATUSES = new Set([
  'Connected - Interested',
  'Connected - Call Back',
  'Email Sent',
  'Responded - Positive',
  'Qualified Referral Source',
  'Partnered',
]);

// Statuses that appear in the To-Dos queue (need action)
export const TODO_STATUSES = new Set([
  'New',
  'Ready to Call',
  'Called - No Answer',
  'Called - Left VM',
  'Called - Gatekeeper',
  'Connected - Interested',
  'Connected - Call Back',
  'Email Sent',
  'Responded - Positive',
  'Needs Research',
  'Bad Number',
]);

// Statuses that appear in the New Contacts queue (fresh imports)
export const NEW_CONTACT_STATUSES = new Set(['New', 'Needs Research', 'Ready to Call']);
