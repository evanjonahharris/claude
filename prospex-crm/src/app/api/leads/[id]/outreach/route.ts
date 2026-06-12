import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchAllLeads, writeLeadUpdate } from '@/lib/sheets';
import { applyManualOutcome, nextAvailableOutreachN } from '@/lib/recalculate';
import { nowTimestamp } from '@/lib/utils';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const token = (session as { accessToken?: string })?.accessToken;
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json() as {
    displayLabel: string;
    method: string;
    outreachN?: number;
    timestamp?: string;
  };

  if (!body.displayLabel || !body.method) {
    return NextResponse.json({ error: 'displayLabel and method are required' }, { status: 400 });
  }

  try {
    const leads = await fetchAllLeads(token);
    const lead = leads.find((l) => l.recordId === id);
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const outreachN = body.outreachN ?? nextAvailableOutreachN(lead);
    const timestamp = body.timestamp ?? nowTimestamp();

    const updates = applyManualOutcome(lead, outreachN, body.displayLabel, body.method, timestamp);

    await writeLeadUpdate(token, lead, {
      leadStatus: updates.leadStatus,
      leadStatusLocked: updates.leadStatusLocked,
      latestOutreachDate: updates.latestOutreachDate,
      latestOutreachOutcome: updates.latestOutreachOutcome,
      nextStep: updates.nextStep,
      dateTimeNextStep: updates.dateTimeNextStep,
      outreachSlot: {
        ...updates.outreachSlotUpdates,
        n: outreachN,
      },
    });

    return NextResponse.json({
      success: true,
      outreachN,
      leadStatus: updates.leadStatus,
      leadStatusLocked: updates.leadStatusLocked,
    });
  } catch (err) {
    console.error('POST /api/leads/[id]/outreach error:', err);
    return NextResponse.json({ error: 'Failed to log outcome' }, { status: 500 });
  }
}
