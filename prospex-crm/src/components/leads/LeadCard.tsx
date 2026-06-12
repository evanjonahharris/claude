'use client';

import type { Lead } from '@/lib/types';
import { LeadStatusBadge } from './LeadStatusBadge';
import { LeadStatusLockToggle } from './LeadStatusLockToggle';
import { formatDate, formatDateTime } from '@/lib/utils';

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  onUnlock?: (leadId: string) => void;
}

export function LeadCard({ lead, onClick, onUnlock }: LeadCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{lead.facilityName}</p>
          <p className="text-xs text-slate-500 truncate">{lead.facilityType}{lead.physicalCity ? ` · ${lead.physicalCity}, ${lead.physicalState}` : ''}</p>
        </div>
        <LeadStatusBadge status={lead.leadStatus} />
      </div>

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {lead.contactPersonName && (
          <span className="text-xs text-slate-600">{lead.contactPersonName}</span>
        )}
        {lead.phone1 && (
          <a
            href={`tel:${lead.phone1}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-blue-600 hover:underline"
          >
            {lead.phone1}
          </a>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {lead.nextStep && <span>Next: {lead.nextStep}</span>}
          {lead.dateTimeNextStep && <span className="text-blue-500">{formatDateTime(lead.dateTimeNextStep)}</span>}
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {lead.leadStatusLocked !== null && (
            <LeadStatusLockToggle
              lockedN={lead.leadStatusLocked}
              onUnlock={() => onUnlock?.(lead.recordId)}
              onLock={() => {}}
            />
          )}
          {lead.latestOutreachDate && (
            <span>Last: {formatDate(lead.latestOutreachDate)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
