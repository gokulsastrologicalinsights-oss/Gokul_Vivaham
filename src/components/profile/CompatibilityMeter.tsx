'use client';
export default function CompatibilityMeter({ score }: { score: number }) {
  return <div className="text-sm font-bold text-maroon-700">{score}% Match Score</div>;
}
