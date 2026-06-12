import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { google } from 'googleapis';
import { fetchAllLeads, writeLeadUpdate } from '@/lib/sheets';
import { applyManualOutcome, nextAvailableOutreachN } from '@/lib/recalculate';
import { nowTimestamp } from '@/lib/utils';
import { getOutcomeByCode } from '@/data/outreach_outcome_key';

export async function POST() {
  const session = await getServerSession();
  const token = (session as { accessToken?: string })?.accessToken;
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const syncResults: string[] = [];
  let emailsChecked = 0;
  let leadsUpdated = 0;

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const gmail = google.gmail({ version: 'v1', auth });

    // Search for recent email replies (last 7 days)
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:inbox newer_than:7d',
      maxResults: 50,
    });

    const messages = res.data.messages ?? [];
    emailsChecked = messages.length;

    if (emailsChecked === 0) {
      return NextResponse.json({ success: true, emailsChecked: 0, leadsUpdated: 0, details: [] });
    }

    const leads = await fetchAllLeads(token);

    for (const msg of messages) {
      if (!msg.id) continue;
      const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata', metadataHeaders: ['From', 'Subject'] });
      const headers = detail.data.payload?.headers ?? [];
      const from = headers.find((h) => h.name === 'From')?.value ?? '';
      const emailMatch = from.match(/[\w.+-]+@[\w.-]+\.\w+/);
      if (!emailMatch) continue;

      const senderEmail = emailMatch[0].toLowerCase();
      const lead = leads.find((l) => l.emailAddress.toLowerCase() === senderEmail);
      if (!lead) continue;

      // Determine likely outcome (basic classification — positive unless explicitly negative)
      const snippet = detail.data.snippet ?? '';
      let outcomeCode = 'EMAIL_REPLIED_POSITIVE';
      const lowerSnippet = snippet.toLowerCase();
      if (/unsubscribe|do not contact|stop|remove|opt.?out/.test(lowerSnippet)) outcomeCode = 'EMAIL_DO_NOT_CONTACT';
      else if (/not interested|no thank|decline/.test(lowerSnippet)) outcomeCode = 'EMAIL_REPLIED_NEGATIVE';
      else if (/call|speak|chat|meet/.test(lowerSnippet)) outcomeCode = 'EMAIL_REPLIED_CALLBACK';

      const outcome = getOutcomeByCode(outcomeCode)!;
      const outreachN = nextAvailableOutreachN(lead);

      // Respect Lead Status Locked — only update if not same-outreach locked
      const lockedN = lead.leadStatusLocked;
      if (lockedN !== null && lockedN >= outreachN) {
        syncResults.push(`BLOCKED (same-outreach lock N=${lockedN}) ${lead.facilityName}`);
        continue;
      }

      const ts = nowTimestamp();
      const updates = applyManualOutcome(lead, outreachN, outcome.displayLabel, 'Email', ts);

      await writeLeadUpdate(token, lead, {
        leadStatus: updates.leadStatus,
        leadStatusLocked: null, // automation update → clear lock
        latestOutreachDate: updates.latestOutreachDate,
        latestOutreachOutcome: updates.latestOutreachOutcome,
        nextStep: updates.nextStep,
        dateTimeNextStep: updates.dateTimeNextStep,
        outreachSlot: { ...updates.outreachSlotUpdates, n: outreachN },
      });
      leadsUpdated++;
      syncResults.push(`UPDATED ${lead.facilityName} → ${outcome.displayLabel}`);
    }

    return NextResponse.json({ success: true, emailsChecked, leadsUpdated, details: syncResults });
  } catch (err) {
    console.error('Gmail sync error:', err);
    return NextResponse.json({ error: 'Gmail sync failed', details: String(err) }, { status: 500 });
  }
}
