'use client';

import { useEffect, useState } from 'react';
import { matchService } from '@/services/match.service';
import RequestSentConfirmation from '@/components/ui/RequestSentConfirmation';

type InterestStatus = 'pending' | 'cancelled' | 'accepted' | 'declined';

interface InterestActionButtonProps {
  recipientUserId: string;
  className?: string;
  compact?: boolean;
}

export default function InterestActionButton({ recipientUserId, className = '', compact = false }: InterestActionButtonProps) {
  const [request, setRequest] = useState<{ id: string; status: InterestStatus } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    let active = true;
    matchService.getRequestStatus(recipientUserId).then(({ data }) => {
      if (active) setRequest(data);
    });
    return () => { active = false; };
  }, [recipientUserId]);

  const send = async () => {
    if (request || busy) return;
    setBusy(true);
    try {
      const { data, error } = await matchService.sendRequest(recipientUserId);
      if (error) {
        const latest = await matchService.getRequestStatus(recipientUserId);
        if (latest.data) setRequest(latest.data);
        alert(error.message);
      } else {
        setRequest({ id: data.id, status: data.status || 'pending' });
        setShowConfirmation(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!request || request.status !== 'pending' || busy) return;
    if (!window.confirm('Cancel this pending interest request? You will not be able to send another request to this member.')) return;
    setBusy(true);
    try {
      const { data, error } = await matchService.cancelRequest(request.id);
      if (error) alert(error.message);
      else {
        setRequest({ id: request.id, status: data?.status || 'cancelled' });
        alert('Request Cancelled');
      }
    } finally {
      setBusy(false);
    }
  };

  const label = request?.status === 'pending'
    ? 'Request Sent'
    : request?.status === 'accepted'
      ? 'Interest Accepted'
      : request?.status === 'declined'
        ? 'Interest Declined'
        : request?.status === 'cancelled'
          ? 'Request Already Sent'
          : 'Send Interest';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={send}
        disabled={Boolean(request) || busy}
        className={`${className} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {busy && !request ? 'Sending…' : label}
      </button>
      {request?.status === 'pending' && (
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className={`${compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-2 text-xs'} rounded-lg border border-zinc-300 font-semibold text-zinc-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300`}
        >
          Cancel Request
        </button>
      )}
      {showConfirmation && <RequestSentConfirmation onClose={() => setShowConfirmation(false)} />}
    </div>
  );
}
