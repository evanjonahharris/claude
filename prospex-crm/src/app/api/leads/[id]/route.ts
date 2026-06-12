import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchAllLeads, writeLeadUpdate } from '@/lib/sheets';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const token = (session as { accessToken?: string })?.accessToken;
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const leads = await fetchAllLeads(token);
    const lead = leads.find((l) => l.recordId === id);
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    return NextResponse.json({ lead });
  } catch (err) {
    console.error('GET /api/leads/[id] error:', err);
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const token = (session as { accessToken?: string })?.accessToken;
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();

  try {
    const leads = await fetchAllLeads(token);
    const lead = leads.find((l) => l.recordId === id);
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    await writeLeadUpdate(token, lead, body);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/leads/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}
