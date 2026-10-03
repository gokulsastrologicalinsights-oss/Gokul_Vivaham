'use client';
export default function MatchCard({ name, age, rasi }: { name: string; age: number; rasi: string }) {
  return (
    <div className="p-4 bg-white border border-zinc-200 rounded-2xl flex flex-col gap-1">
      <h3 className="font-bold text-xs">{name} ({age})</h3>
      <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{rasi} Rasi</span>
    </div>
  );
}
