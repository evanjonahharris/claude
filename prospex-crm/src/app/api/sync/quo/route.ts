import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { fetchAllLeads, writeLeadUpdate } from '@/lib/sheets';
import { applyManualOutcome, nextAvailableOutreachN } from '@/lib/recalculate';
import { nowTimestamp } from '@/lib/utils';
import { getOutcomeByCode } from '@/data/outreach_outcome_key';

// Quo / OpenPhone integration — reads missed calls and voicemails from Quo API
// Requires QUO_API_KEY environment variable and Quo inbox to be configured
export async function POST() {
  const session = await getServerSession();
  const token = (session as { accessToken?: string })?.accessToken;
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const quoApiKey = process.env.QUO_API_KEY;
  if (!quoApiKey) {
    return NextResponse.json({
      success: false,
      error: 'QUO_API_KEY not configured. Add it to your .env.local file.',
    }, { status: 503 });
  }

  const syncResults: string[] = [];
  let callsChecked = 0;
  let leadsUpdated = 0;

  try {
    // Fetch missed calls from Quo API
    const missedRes = await fetch('https://api.quo.ai/v1/calls/missed', {
      headers: { Authorization: `Bearer ${quoApiKey}` },
    });

    if (!missedRes.ok) {
      throw new Error(`Quo API error: ${missedRes.status} ${missedRes.statusText}`);
    }

    const missedData = await missedRes.json() as { calls?: Array<{ phone: string; timestamp: string; hasVoicemail: boolean }> };
    const calls = missedData.calls ?? [];
    callsChecked = calls.length;

    const leads = await fetchAllLeads(token);

    for (const call of calls) {
      const normalizedPhone = call.phone.replace(/\D/g, '');
      const lead = leads.find((l) => {
        const p1 = l.phone1.replace(/\D/g, '');
        const p2 = l.phone2.replace(/\D/g, '');
        return p1 === normalizedPhone || p2 === normalizedPhone;
      });

      if (!lead) continue;

      const outcomeCode = call.hasVoicemail ? 'CALL_LEFT_VM' : 'CALL_NO_ANSWER';
      const outcome = getOutcomeByCode(outcomeCode)!;
      const outreachN = nextAvailableOutreachN(lead);

      // Respect Lead Status Locked
      const lockedN = lead.leadStatusLocked;
      if (lockedN !== null && lockedN >= outreachN) {
        syncResults.push(`BLOCKED (same-outreach lock N=${lockedN}) ${lead.facilityName}`);
        continue;
      }

      const ts = call.timestamp ? call.timestamp.slice(0, 16).replace('T', ' ') : nowTimestamp();
      const updates = applyManualOutcome(lead, outreachN, outcome.displayLabel, 'Call', ts);

      await writeLeadUpdate(token, lead, {
        leadStatus: updates.leadStatus,
        leadStatusLocked: null,
        latestOutreachDate: updates.latestOutreachDate,
        latestOutreachOutcome: updates.latestOutreachOutcome,
        nextStep: updates.nextStep,
        dateTimeNextStep: updates.dateTimeNextStep,
        outreachSlot: { ...updates.outreachSlotUpdates, n: outreachN },
      });
      leadsUpdated++;
      syncResults.push(`UPDATED ${lead.facilityName} → ${outcome.displayLabel}`);
    }

    return NextResponse.json({ success: true, callsChecked, leadsUpdated, details: syncResults });
  } catch (err) {
    console.error('Quo sync error:', err);
    return NextResponse.json({ error: 'Quo sync failed', details: String(err) }, { status: 500 });
  }
}
