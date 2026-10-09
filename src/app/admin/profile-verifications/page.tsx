'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Eye, FileText, MailCheck, RefreshCw, Smartphone, X } from 'lucide-react';

type RequestRow = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  mobile_status: 'requested' | 'verified' | 'rejected';
  profile_id_label: string;
  member_name: string;
  registered_mobile: string;
  registered_email: string;
  email_verified: boolean;
  mobile_verified: boolean;
  requested_at: string;
  rejection_reason?: string | null;
  internal_notes?: string | null;
};

const formatDate = (value: string) => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function ProfileVerificationsPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/profile-verifications', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load requests.');
      setRows(result.requests || []);
      setSelected(current => current ? (result.requests || []).find((row: RequestRow) => row.id === current.id) || null : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const act = async (row: RequestRow, action: 'approve_mobile' | 'mark_email_verified' | 'reject' | 'add_note') => {
    let reason: string | undefined;
    let notes: string | undefined;
    if (action === 'reject') {
      reason = window.prompt('Reason for rejecting this request (required):')?.trim();
      if (!reason) return;
    } else if (action === 'mark_email_verified') {
      reason = window.prompt('How was the email independently confirmed? (required):')?.trim();
      if (!reason) return;
    } else if (action === 'add_note') {
      notes = window.prompt('Internal note (required):')?.trim();
      if (!notes) return;
    }

    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/profile-verifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: row.id, action, reason, notes }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Action failed.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-5 md:p-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="font-serif text-2xl font-bold">Profile Verification Requests</h1><p className="text-sm text-muted">Review WhatsApp requests separately from email confirmation. Opening WhatsApp never approves a member.</p></div>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 self-start rounded-xl border border-border px-3 py-2 text-xs font-semibold sm:self-auto"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[1100px] text-left text-xs">
          <thead className="bg-surface text-muted"><tr>{['Profile ID', 'Member', 'Registered mobile', 'Registered email', 'Mobile status', 'Email status', 'Request date', 'Verification actions'].map(label => <th key={label} className="p-4 font-semibold">{label}</th>)}</tr></thead>
          <tbody>
            {rows.map(row => <tr key={row.id} className="border-t border-border align-top">
              <td className="p-4 font-mono font-bold">{row.profile_id_label}</td>
              <td className="p-4"><div className="font-semibold">{row.member_name}</div><div className="mt-1 text-muted">{row.status}</div></td>
              <td className="p-4 break-all">{row.registered_mobile}</td>
              <td className="p-4 break-all">{row.registered_email}</td>
              <td className="p-4"><span className={`rounded-full px-2 py-1 font-bold uppercase ${row.mobile_verified ? 'bg-emerald-500/15 text-emerald-700' : row.mobile_status === 'requested' ? 'bg-amber-500/15 text-amber-700' : 'bg-surface text-muted'}`}>{row.mobile_verified ? 'Mobile Verified' : row.mobile_status === 'requested' ? 'Verification Requested' : 'Mobile Not Verified'}</span></td>
              <td className="p-4"><span className={`rounded-full px-2 py-1 font-bold uppercase ${row.email_verified ? 'bg-emerald-500/15 text-emerald-700' : 'bg-surface text-muted'}`}>{row.email_verified ? 'Email Verified' : 'Email Not Verified'}</span></td>
              <td className="p-4 whitespace-nowrap">{formatDate(row.requested_at)}</td>
              <td className="p-4"><div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => setSelected(row)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1"><Eye className="h-3.5 w-3.5" /> View Request</button>
                {row.status === 'pending' && !row.mobile_verified && <button type="button" disabled={busy} onClick={() => void act(row, 'approve_mobile')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-white"><Check className="h-3.5 w-3.5" /> Approve Mobile</button>}
                {row.status !== 'rejected' && !row.email_verified && <button type="button" disabled={busy} onClick={() => void act(row, 'mark_email_verified')} className="inline-flex items-center gap-1 rounded-lg border border-primary/30 px-2 py-1 text-primary"><MailCheck className="h-3.5 w-3.5" /> Mark Email Verified</button>}
                {row.status === 'pending' && <button type="button" disabled={busy} onClick={() => void act(row, 'reject')} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2 py-1 text-red-600"><X className="h-3.5 w-3.5" /> Reject Request</button>}
                <button type="button" disabled={busy} onClick={() => void act(row, 'add_note')} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1"><FileText className="h-3.5 w-3.5" /> Add Note</button>
              </div></td>
            </tr>)}
          </tbody>
        </table>
        {loading && <p role="status" className="p-6 text-muted">Loading requests…</p>}
        {!loading && !rows.length && <p className="p-8 text-center text-sm text-muted">No profile verification requests found.</p>}
      </div>
      {selected && <div className="rounded-2xl border border-primary/25 bg-card p-5 text-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="font-serif text-lg font-bold">Request details</h2><p className="text-muted">{selected.member_name} · {selected.profile_id_label}</p></div><button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-border px-2 py-1 text-xs">Close</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><p><strong>Request date:</strong> {formatDate(selected.requested_at)}</p><p><strong>Request status:</strong> {selected.status}</p><p><strong>Mobile:</strong> {selected.registered_mobile}</p><p><strong>Email:</strong> {selected.registered_email}</p><p><strong>Rejection reason:</strong> {selected.rejection_reason || '—'}</p><p><strong>Internal notes:</strong> {selected.internal_notes || '—'}</p></div><p className="mt-4 text-xs text-muted"><Smartphone className="mr-1 inline h-3.5 w-3.5" />Confirm ownership of the registered mobile number before approving. Email must be independently confirmed; a WhatsApp message is never evidence of email ownership.</p></div>}
    </div>
  );
}
