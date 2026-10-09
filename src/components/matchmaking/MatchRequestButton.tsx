'use client';

import InterestActionButton from './InterestActionButton';

export default function MatchRequestButton({ recipientUserId }: { recipientUserId: string }) {
  return (
    <InterestActionButton
      recipientUserId={recipientUserId}
      className="rounded-lg bg-maroon-600 px-4 py-2 text-xs font-semibold text-white"
    />
  );
}
