import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchAllLeads } from '@/lib/sheets';
import { recalculateBatch } from '@/lib/recalculate';
import { isTodoLead, isNewContactLead } from '@/lib/utils';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const token = (session as { accessToken?: string })?.accessToken;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter'); // 'todos' | 'new-contacts' | 'all'
  const search = searchParams.get('search')?.toLowerCase() || '';
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '50');

  try {
    let leads = await fetchAllLeads(token);

    // Run recalculation on fresh data
    const recalcResults = recalculateBatch(leads);
    leads = leads.map((lead) => {
      const result = recalcResults.get(lead.recordId);
      if (!result || !result.changed) return lead;
      return {
        ...lead,
        leadStatus: result.leadStatus,
        leadStatusLocked: result.leadStatusLocked,
        latestOutreachDate: result.latestOutreachDate,
        latestOutreachOutcome: result.latestOutreachOutcome,
        nextStep: result.nextStep,
        dateTimeNextStep: result.dateTimeNextStep,
      };
    });

    // Filter
    if (filter === 'todos') leads = leads.filter(isTodoLead);
    if (filter === 'new-contacts') leads = leads.filter(isNewContactLead);

    // Search
    if (search) {
      leads = leads.filter(
        (l) =>
          l.facilityName.toLowerCase().includes(search) ||
          l.contactPersonName.toLowerCase().includes(search) ||
          l.phone1.includes(search) ||
          l.emailAddress.toLowerCase().includes(search) ||
          l.leadStatus.toLowerCase().includes(search),
      );
    }

    // Sort: by dateTimeNextStep ascending (due soonest first), nulls last
    leads.sort((a, b) => {
      if (!a.dateTimeNextStep && !b.dateTimeNextStep) return 0;
      if (!a.dateTimeNextStep) return 1;
      if (!b.dateTimeNextStep) return -1;
      return new Date(a.dateTimeNextStep).getTime() - new Date(b.dateTimeNextStep).getTime();
    });

    const total = leads.length;
    const offset = (page - 1) * limit;
    const paged = leads.slice(offset, offset + limit);

    return NextResponse.json({ leads: paged, total, page, limit });
  } catch (err) {
    console.error('GET /api/leads error:', err);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
