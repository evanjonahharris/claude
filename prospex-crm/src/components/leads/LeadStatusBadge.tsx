'use client';

import { Badge } from '@/components/ui/Badge';
import { statusColor } from '@/lib/utils';

export function LeadStatusBadge({ status }: { status: string }) {
  return <Badge className={statusColor(status)}>{status || '—'}</Badge>;
}
