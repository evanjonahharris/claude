import { google } from 'googleapis';
import { SHEET_ID, SHEET_TAB, MAX_OUTREACH, CRM_COLS, outreachCol } from './constants';
import type { Lead, OutreachSlot } from './types';

function getAuth(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

function sheets(accessToken: string) {
  return google.sheets({ version: 'v4', auth: getAuth(accessToken) });
}

// ── Header cache ────────────────────────────────────────────────────────────

let _headerCache: string[] | null = null;
let _headerCacheToken: string | null = null;

export async function getHeaders(accessToken: string): Promise<string[]> {
  if (_headerCache && _headerCacheToken === accessToken) return _headerCache;
  const api = sheets(accessToken);
  const res = await api.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!1:1`,
  });
  const headers = (res.data.values?.[0] ?? []) as string[];
  _headerCache = headers;
  _headerCacheToken = accessToken;
  return headers;
}

export function colIndex(headers: string[], name: string): number {
  const i = headers.indexOf(name);
  if (i === -1) throw new Error(`Column not found: "${name}"`);
  return i;
}

function cell(row: string[], idx: number): string {
  return (row[idx] ?? '').trim();
}

// ── Row → Lead ───────────────────────────────────────────────────────────────

export function rowToLead(row: string[], headers: string[], rowIndex: number): Lead {
  const c = (name: string) => cell(row, headers.indexOf(name));

  const lockedRaw = c(CRM_COLS.LEAD_STATUS_LOCKED);
  const lockedNum = lockedRaw ? parseInt(lockedRaw, 10) : null;

  const outreach: OutreachSlot[] = [];
  for (let n = 1; n <= MAX_OUTREACH; n++) {
    const method = c(outreachCol(n, 'Method'));
    const dateTime = c(outreachCol(n, 'Date and Time'));
    const transcript = c(outreachCol(n, 'Transcript or Message'));
    const outcomeText = c(outreachCol(n, 'Outcome or Response Text'));
    const callSummary = c(outreachCol(n, 'Call Summary'));
    const callFeedback = c(outreachCol(n, 'Call Feedback'));
    outreach.push({ n, method: method as OutreachSlot['method'], dateTime, transcript, outcomeText, callSummary, callFeedback });
  }

  return {
    recordId: c(CRM_COLS.RECORD_ID),
    facilityName: c(CRM_COLS.FACILITY_NAME),
    facilityType: c(CRM_COLS.FACILITY_TYPE),
    facilityCategory: c(CRM_COLS.FACILITY_CATEGORY),
    leadStatus: c(CRM_COLS.LEAD_STATUS),
    leadStatusLocked: isNaN(lockedNum as number) ? null : lockedNum,
    priority: c(CRM_COLS.PRIORITY),
    nextStep: c(CRM_COLS.NEXT_STEP),
    dateTimeNextStep: c(CRM_COLS.DATE_TIME_NEXT_STEP),
    miscNotes: c(CRM_COLS.MISC_NOTES),
    leadSource: c(CRM_COLS.LEAD_SOURCE),
    ownerAssignee: c(CRM_COLS.OWNER),
    contactPersonName: c(CRM_COLS.CONTACT_NAME),
    contactPersonRole: c(CRM_COLS.CONTACT_ROLE),
    phone1: c(CRM_COLS.PHONE1),
    phone1Type: c(CRM_COLS.PHONE1_TYPE),
    phone2: c(CRM_COLS.PHONE2),
    phone2Type: c(CRM_COLS.PHONE2_TYPE),
    faxNumber: c(CRM_COLS.FAX),
    confidentialFax: c(CRM_COLS.CONFIDENTIAL_FAX),
    emailAddress: c(CRM_COLS.EMAIL),
    website: c(CRM_COLS.WEBSITE),
    sourceUrl: c(CRM_COLS.SOURCE_URL),
    physicalAddress: c(CRM_COLS.PHYSICAL_ADDRESS),
    physicalCity: c(CRM_COLS.PHYSICAL_CITY),
    physicalState: c(CRM_COLS.PHYSICAL_STATE),
    physicalZip: c(CRM_COLS.PHYSICAL_ZIP),
    physicalCounty: c(CRM_COLS.PHYSICAL_COUNTY),
    fullPhysicalAddress: c(CRM_COLS.FULL_PHYSICAL_ADDRESS),
    mailingAddress: c(CRM_COLS.MAILING_ADDRESS),
    mailingCity: c(CRM_COLS.MAILING_CITY),
    mailingState: c(CRM_COLS.MAILING_STATE),
    mailingZip: c(CRM_COLS.MAILING_ZIP),
    referralSourceType: c(CRM_COLS.REFERRAL_SOURCE_TYPE),
    placementFitNotes: c(CRM_COLS.PLACEMENT_FIT_NOTES),
    populationSpeciality: c(CRM_COLS.POPULATION_SPECIALITY),
    memoryCareFlag: c(CRM_COLS.MEMORY_CARE_FLAG),
    licensedBedCount: c(CRM_COLS.LICENSED_BED_COUNT),
    certifiedBedCount: c(CRM_COLS.CERTIFIED_BED_COUNT),
    avgResidentsPerDay: c(CRM_COLS.AVG_RESIDENTS_PER_DAY),
    overallRating: c(CRM_COLS.OVERALL_RATING),
    healthInspectionRating: c(CRM_COLS.HEALTH_INSPECTION_RATING),
    staffingRating: c(CRM_COLS.STAFFING_RATING),
    qmRating: c(CRM_COLS.QM_RATING),
    ownershipType: c(CRM_COLS.OWNERSHIP_TYPE),
    chainName: c(CRM_COLS.CHAIN_NAME),
    legalBusinessName: c(CRM_COLS.LEGAL_BUSINESS_NAME),
    providerType: c(CRM_COLS.PROVIDER_TYPE),
    licenseNumber: c(CRM_COLS.LICENSE_NUMBER),
    cmsNumber: c(CRM_COLS.CMS_NUMBER),
    ceoAdmin: c(CRM_COLS.CEO_ADMIN),
    doNotContactReason: c(CRM_COLS.DO_NOT_CONTACT_REASON),
    latestOutreachDate: c(CRM_COLS.LATEST_OUTREACH_DATE),
    latestOutreachOutcome: c(CRM_COLS.LATEST_OUTREACH_OUTCOME),
    autoSummary: c(CRM_COLS.AUTO_SUMMARY),
    autoCallFeedback: c(CRM_COLS.AUTO_CALL_FEEDBACK),
    clientsAttained: c(CRM_COLS.CLIENTS_ATTAINED),
    revenueAttained: c(CRM_COLS.REVENUE_ATTAINED),
    outreach,
    rowIndex,
  };
}

// ── Fetch all leads ──────────────────────────────────────────────────────────

export async function fetchAllLeads(accessToken: string): Promise<Lead[]> {
  const api = sheets(accessToken);
  const headers = await getHeaders(accessToken);
  const res = await api.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A2:ZZ`,
  });
  const rows = (res.data.values ?? []) as string[][];
  return rows
    .map((row, i) => rowToLead(row, headers, i + 2)) // +2: row 1 is headers, data starts at row 2
    .filter((l) => l.recordId); // skip empty rows
}

// ── Write a map of column → value for a specific sheet row ──────────────────

export async function writeCells(
  accessToken: string,
  rowIndex: number,
  updates: Record<string, string>,
): Promise<void> {
  const api = sheets(accessToken);
  const headers = await getHeaders(accessToken);

  const valueRanges = Object.entries(updates).map(([colName, value]) => {
    const colIdx = headers.indexOf(colName);
    if (colIdx === -1) throw new Error(`Column not found for write: "${colName}"`);
    const colLetter = columnLetter(colIdx + 1);
    return {
      range: `${SHEET_TAB}!${colLetter}${rowIndex}`,
      values: [[value]],
    };
  });

  await api.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: valueRanges,
    },
  });
}

// ── Write all outreach slot fields + CRM fields for one lead ─────────────────

export async function writeLeadUpdate(
  accessToken: string,
  lead: Lead,
  updates: Partial<{
    leadStatus: string;
    leadStatusLocked: number | null;
    nextStep: string;
    dateTimeNextStep: string;
    latestOutreachDate: string;
    latestOutreachOutcome: string;
    miscNotes: string;
    doNotContactReason: string;
    priority: string;
    contactPersonName: string;
    contactPersonRole: string;
    emailAddress: string;
    phone1: string;
    phone1Type: string;
    clientsAttained: string;
    revenueAttained: string;
    outreachSlot: { n: number } & Partial<OutreachSlot>;
  }>,
): Promise<void> {
  if (!lead.rowIndex) throw new Error('Lead has no rowIndex');

  const cells: Record<string, string> = {};

  if (updates.leadStatus !== undefined) cells[CRM_COLS.LEAD_STATUS] = updates.leadStatus;
  if (updates.leadStatusLocked !== undefined)
    cells[CRM_COLS.LEAD_STATUS_LOCKED] = updates.leadStatusLocked === null ? '' : String(updates.leadStatusLocked);
  if (updates.nextStep !== undefined) cells[CRM_COLS.NEXT_STEP] = updates.nextStep;
  if (updates.dateTimeNextStep !== undefined) cells[CRM_COLS.DATE_TIME_NEXT_STEP] = updates.dateTimeNextStep;
  if (updates.latestOutreachDate !== undefined) cells[CRM_COLS.LATEST_OUTREACH_DATE] = updates.latestOutreachDate;
  if (updates.latestOutreachOutcome !== undefined) cells[CRM_COLS.LATEST_OUTREACH_OUTCOME] = updates.latestOutreachOutcome;
  if (updates.miscNotes !== undefined) cells[CRM_COLS.MISC_NOTES] = updates.miscNotes;
  if (updates.doNotContactReason !== undefined) cells[CRM_COLS.DO_NOT_CONTACT_REASON] = updates.doNotContactReason;
  if (updates.priority !== undefined) cells[CRM_COLS.PRIORITY] = updates.priority;
  if (updates.contactPersonName !== undefined) cells[CRM_COLS.CONTACT_NAME] = updates.contactPersonName;
  if (updates.contactPersonRole !== undefined) cells[CRM_COLS.CONTACT_ROLE] = updates.contactPersonRole;
  if (updates.emailAddress !== undefined) cells[CRM_COLS.EMAIL] = updates.emailAddress;
  if (updates.phone1 !== undefined) cells[CRM_COLS.PHONE1] = updates.phone1;
  if (updates.phone1Type !== undefined) cells[CRM_COLS.PHONE1_TYPE] = updates.phone1Type;
  if (updates.clientsAttained !== undefined) cells[CRM_COLS.CLIENTS_ATTAINED] = updates.clientsAttained;
  if (updates.revenueAttained !== undefined) cells[CRM_COLS.REVENUE_ATTAINED] = updates.revenueAttained;

  if (updates.outreachSlot) {
    const { n, method, dateTime, outcomeText, transcript, callSummary, callFeedback } = updates.outreachSlot;
    if (method !== undefined) cells[outreachCol(n, 'Method')] = method;
    if (dateTime !== undefined) cells[outreachCol(n, 'Date and Time')] = dateTime;
    if (outcomeText !== undefined) cells[outreachCol(n, 'Outcome or Response Text')] = outcomeText;
    if (transcript !== undefined) cells[outreachCol(n, 'Transcript or Message')] = transcript;
    if (callSummary !== undefined) cells[outreachCol(n, 'Call Summary')] = callSummary;
    if (callFeedback !== undefined) cells[outreachCol(n, 'Call Feedback')] = callFeedback;
  }

  if (Object.keys(cells).length > 0) {
    await writeCells(accessToken, lead.rowIndex, cells);
  }
}

// ── Spreadsheet column letter helper ────────────────────────────────────────

function columnLetter(n: number): string {
  let result = '';
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}
