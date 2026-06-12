import { MAX_OUTREACH } from './constants';
import { getOutcomeByLabel } from '@/data/outreach_outcome_key';
import type { Lead, OutreachSlot, RecalcResult } from './types';
import { format, addBusinessDays } from 'date-fns';

// Returns valid outreach slots sorted by date ascending
export function validOutreachSlots(lead: Lead): OutreachSlot[] {
  return lead.outreach
    .filter((s) => s.method && s.dateTime && s.outcomeText)
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
}

// Find the next available outreach slot number (first slot with no method)
export function nextAvailableOutreachN(lead: Lead): number {
  for (let n = 1; n <= MAX_OUTREACH; n++) {
    const slot = lead.outreach.find((s) => s.n === n);
    if (!slot || !slot.method) return n;
  }
  return MAX_OUTREACH; // fallback: reuse slot 10
}

// Find the latest valid outreach slot
export function latestValidSlot(lead: Lead): OutreachSlot | null {
  const slots = validOutreachSlots(lead);
  return slots.length > 0 ? slots[slots.length - 1] : null;
}

// Core lead-status recalculation logic
export function recalculateLead(lead: Lead): RecalcResult {
  const now = new Date();

  // 1. Do Not Contact always wins
  if (lead.doNotContactReason) {
    return {
      leadStatus: 'Do Not Contact',
      leadStatusLocked: lead.leadStatusLocked,
      latestOutreachDate: lead.latestOutreachDate,
      latestOutreachOutcome: lead.latestOutreachOutcome,
      nextStep: 'Stop outreach',
      dateTimeNextStep: '',
      skippedReason: 'Do Not Contact Reason is set',
    };
  }

  const slots = validOutreachSlots(lead);
  if (slots.length === 0) {
    return {
      leadStatus: lead.leadStatus,
      leadStatusLocked: lead.leadStatusLocked,
      latestOutreachDate: lead.latestOutreachDate,
      latestOutreachOutcome: lead.latestOutreachOutcome,
      nextStep: lead.nextStep,
      dateTimeNextStep: lead.dateTimeNextStep,
      skippedReason: 'No valid outreach slots',
    };
  }

  const latest = slots[slots.length - 1];
  const latestN = latest.n;
  const lockedN = lead.leadStatusLocked;

  // 2. Same-outreach lock: automation cannot overwrite
  if (lockedN !== null && lockedN === latestN) {
    return {
      leadStatus: lead.leadStatus,
      leadStatusLocked: lockedN,
      latestOutreachDate: latest.dateTime,
      latestOutreachOutcome: latest.outcomeText,
      nextStep: lead.nextStep,
      dateTimeNextStep: lead.dateTimeNextStep,
      skippedReason: `Lead Status Locked = ${lockedN} matches latest outreach N = ${latestN}`,
    };
  }

  // 3. Lock > latestN: data quality issue — hold for review
  if (lockedN !== null && lockedN > latestN) {
    return {
      leadStatus: lead.leadStatus,
      leadStatusLocked: lockedN,
      latestOutreachDate: latest.dateTime,
      latestOutreachOutcome: latest.outcomeText,
      nextStep: lead.nextStep,
      dateTimeNextStep: lead.dateTimeNextStep,
      skippedReason: `Lead Status Locked = ${lockedN} > latestN = ${latestN}; data quality review required`,
    };
  }

  // 4. No lock or stale lock (lockedN < latestN): recalculate from latest outcome
  const outcome = getOutcomeByLabel(latest.outcomeText);
  const newLeadStatus = outcome?.defaultLeadStatus || lead.leadStatus;
  const newNextStep = outcome?.defaultNextStep || lead.nextStep;

  const nextStepDate = computeNextStepDate(outcome?.defaultCadenceType, now);

  return {
    leadStatus: newLeadStatus,
    leadStatusLocked: null, // clear stale lock when automation updates
    latestOutreachDate: latest.dateTime,
    latestOutreachOutcome: latest.outcomeText,
    nextStep: newNextStep,
    dateTimeNextStep: nextStepDate,
  };
}

function computeNextStepDate(cadenceType: string | undefined, from: Date): string {
  switch (cadenceType) {
    case 'Phone':
      return format(addBusinessDays(from, 1), 'yyyy-MM-dd HH:mm');
    case 'Email':
      return format(addBusinessDays(from, 2), 'yyyy-MM-dd HH:mm');
    case 'Relationship':
      return format(addBusinessDays(from, 7), 'yyyy-MM-dd HH:mm');
    case 'None':
    default:
      return '';
  }
}

export interface RecalcBatchResult {
  rowsScanned: number;
  rowsUpdated: number;
  sameOutreachLocksSkipped: number;
  staleLocksCleared: number;
  invalidLocks: number;
  dataQualityIssues: number;
  details: string[];
}

export function recalculateBatch(leads: Lead[]): Map<string, RecalcResult & { changed: boolean }> {
  const results = new Map<string, RecalcResult & { changed: boolean }>();

  for (const lead of leads) {
    // Validate lock value
    const lockedN = lead.leadStatusLocked;
    const isInvalidLock = lockedN !== null && (lockedN < 1 || lockedN > 10 || !Number.isInteger(lockedN));

    if (isInvalidLock) {
      results.set(lead.recordId, {
        leadStatus: lead.leadStatus,
        leadStatusLocked: lead.leadStatusLocked,
        latestOutreachDate: lead.latestOutreachDate,
        latestOutreachOutcome: lead.latestOutreachOutcome,
        nextStep: lead.nextStep,
        dateTimeNextStep: lead.dateTimeNextStep,
        skippedReason: `Invalid Lead Status Locked value: ${lockedN}`,
        changed: false,
      });
      continue;
    }

    const result = recalculateLead(lead);
    const changed =
      result.leadStatus !== lead.leadStatus ||
      result.leadStatusLocked !== lead.leadStatusLocked ||
      result.latestOutreachDate !== lead.latestOutreachDate ||
      result.latestOutreachOutcome !== lead.latestOutreachOutcome ||
      result.nextStep !== lead.nextStep ||
      result.dateTimeNextStep !== lead.dateTimeNextStep;

    results.set(lead.recordId, { ...result, changed });
  }

  return results;
}

// Build a manual outcome update for a lead — called when user clicks an outcome toggle
export function applyManualOutcome(
  lead: Lead,
  outreachN: number,
  displayLabel: string,
  method: string,
  timestamp: string,
): {
  leadStatus: string;
  leadStatusLocked: number;
  latestOutreachDate: string;
  latestOutreachOutcome: string;
  nextStep: string;
  dateTimeNextStep: string;
  outreachSlotUpdates: Partial<OutreachSlot>;
} {
  const outcome = getOutcomeByLabel(displayLabel);
  const newLeadStatus = outcome?.defaultLeadStatus || lead.leadStatus;
  const newNextStep = outcome?.defaultNextStep || '';
  const nextStepDate = computeNextStepDate(outcome?.defaultCadenceType, new Date(timestamp));

  return {
    leadStatus: newLeadStatus,
    leadStatusLocked: outreachN,
    latestOutreachDate: timestamp,
    latestOutreachOutcome: displayLabel,
    nextStep: newNextStep,
    dateTimeNextStep: nextStepDate,
    outreachSlotUpdates: {
      n: outreachN,
      method: method as OutreachSlot['method'],
      dateTime: timestamp,
      outcomeText: displayLabel,
    },
  };
}
