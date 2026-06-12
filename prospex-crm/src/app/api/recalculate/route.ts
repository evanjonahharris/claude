import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchAllLeads, writeLeadUpdate } from '@/lib/sheets';
import { recalculateBatch } from '@/lib/recalculate';
import { format } from 'date-fns';

export async function POST() {
  const session = await getServerSession(authOptions);
  const token = (session as { accessToken?: string })?.accessToken;
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const startTime = new Date();
  const details: string[] = [];
  let rowsScanned = 0;
  let rowsUpdated = 0;
  let sameOutreachLocksSkipped = 0;
  let staleLocksCleared = 0;
  let invalidLocks = 0;
  let errors = 0;

  try {
    const leads = await fetchAllLeads(token);
    rowsScanned = leads.length;

    const results = recalculateBatch(leads);

    for (const lead of leads) {
      const result = results.get(lead.recordId);
      if (!result) continue;

      if (result.skippedReason) {
        if (result.skippedReason.includes('Lead Status Locked =') && result.skippedReason.includes('matches latest')) {
          sameOutreachLocksSkipped++;
          details.push(`SKIP [same-outreach lock] ${lead.facilityName}: ${result.skippedReason}`);
        } else if (result.skippedReason.includes('Invalid Lead Status Locked')) {
          invalidLocks++;
          details.push(`INVALID LOCK ${lead.facilityName}: ${result.skippedReason}`);
        } else {
          details.push(`SKIP ${lead.facilityName}: ${result.skippedReason}`);
        }
        continue;
      }

      if (!result.changed) continue;

      // Track stale lock clearing
      if (lead.leadStatusLocked !== null && result.leadStatusLocked === null) {
        staleLocksCleared++;
        details.push(`STALE LOCK CLEARED ${lead.facilityName}: was locked at outreach ${lead.leadStatusLocked}`);
      }

      try {
        await writeLeadUpdate(token, lead, {
          leadStatus: result.leadStatus,
          leadStatusLocked: result.leadStatusLocked,
          latestOutreachDate: result.latestOutreachDate,
          latestOutreachOutcome: result.latestOutreachOutcome,
          nextStep: result.nextStep,
          dateTimeNextStep: result.dateTimeNextStep,
        });
        rowsUpdated++;
        details.push(`UPDATED ${lead.facilityName}: status → ${result.leadStatus}`);
      } catch (writeErr) {
        errors++;
        details.push(`ERROR writing ${lead.facilityName}: ${String(writeErr)}`);
      }
    }

    const logEntry = `${format(startTime, 'yyyy-MM-dd HH:mm')} PT | Lead Status Recalculation | Scanned ${rowsScanned} | Updated ${rowsUpdated} | Same-outreach locks skipped ${sameOutreachLocksSkipped} | Stale locks cleared ${staleLocksCleared} | Invalid locks ${invalidLocks} | Errors ${errors}`;

    return NextResponse.json({
      success: true,
      log: logEntry,
      rowsScanned,
      rowsUpdated,
      sameOutreachLocksSkipped,
      staleLocksCleared,
      invalidLocks,
      errors,
      details,
    });
  } catch (err) {
    console.error('POST /api/recalculate error:', err);
    return NextResponse.json({ error: 'Recalculation failed', details: String(err) }, { status: 500 });
  }
}
