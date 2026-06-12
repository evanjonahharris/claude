import { format, parseISO, isValid } from 'date-fns';
import { INACTIVE_STATUSES, TODO_STATUSES, NEW_CONTACT_STATUSES } from './constants';
import type { Lead, DashboardMetrics } from './types';

export function formatDateTime(value: string): string {
  if (!value) return '';
  try {
    const d = parseISO(value);
    if (isValid(d)) return format(d, 'MMM d, yyyy h:mm a');
  } catch {
    // ignore
  }
  return value;
}

export function formatDate(value: string): string {
  if (!value) return '';
  try {
    const d = parseISO(value.slice(0, 10));
    if (isValid(d)) return format(d, 'MMM d, yyyy');
  } catch {
    // ignore
  }
  return value;
}

export function nowTimestamp(): string {
  return format(new Date(), "yyyy-MM-dd HH:mm");
}

export function isActiveStatus(status: string): boolean {
  return !INACTIVE_STATUSES.has(status);
}

export function isTodoLead(lead: Lead): boolean {
  return !lead.doNotContactReason && TODO_STATUSES.has(lead.leadStatus);
}

export function isNewContactLead(lead: Lead): boolean {
  return !lead.doNotContactReason && NEW_CONTACT_STATUSES.has(lead.leadStatus);
}

export function statusColor(status: string): string {
  switch (status) {
    case 'Connected - Interested':
    case 'Responded - Positive':
    case 'Qualified Referral Source':
    case 'Partnered':
      return 'bg-emerald-100 text-emerald-800';
    case 'Connected - Call Back':
    case 'Email Sent':
      return 'bg-blue-100 text-blue-800';
    case 'New':
    case 'Ready to Call':
      return 'bg-slate-100 text-slate-700';
    case 'Called - No Answer':
    case 'Called - Left VM':
    case 'Called - Gatekeeper':
      return 'bg-yellow-100 text-yellow-800';
    case 'Connected - Not Interested':
    case 'Responded - Negative':
    case 'Dead / Closed':
      return 'bg-gray-100 text-gray-600';
    case 'Do Not Contact':
      return 'bg-red-100 text-red-800';
    case 'Bad Number':
    case 'Needs Research':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export function priorityColor(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'high':
      return 'text-red-600';
    case 'medium':
      return 'text-yellow-600';
    case 'low':
      return 'text-slate-500';
    default:
      return 'text-slate-400';
  }
}

export function computeMetrics(leads: Lead[]): DashboardMetrics {
  const today = format(new Date(), 'yyyy-MM-dd');
  return {
    totalLeads: leads.length,
    newLeads: leads.filter((l) => l.leadStatus === 'New').length,
    callsToday: leads.filter(
      (l) => l.latestOutreachDate?.startsWith(today),
    ).length,
    connected: leads.filter(
      (l) => l.leadStatus === 'Connected - Interested' || l.leadStatus === 'Connected - Call Back',
    ).length,
    interested: leads.filter((l) =>
      ['Connected - Interested', 'Responded - Positive', 'Qualified Referral Source'].includes(l.leadStatus),
    ).length,
    partnered: leads.filter((l) => l.leadStatus === 'Partnered').length,
    doNotContact: leads.filter((l) => l.leadStatus === 'Do Not Contact').length,
    needsResearch: leads.filter((l) => l.leadStatus === 'Needs Research').length,
    emailSent: leads.filter((l) => l.leadStatus === 'Email Sent').length,
    respondedPositive: leads.filter((l) => l.leadStatus === 'Responded - Positive').length,
  };
}

export function lockLabel(lockedN: number | null): string {
  if (lockedN === null) return '';
  return `Locked from Outreach ${lockedN}`;
}
