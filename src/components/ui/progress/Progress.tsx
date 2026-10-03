'use client';
export default function Progress({ value }: { value: number }) {
  return (
    <div className="w-full bg-zinc-150 h-2 rounded-full overflow-hidden">
      <div className="bg-maroon-600 h-full transition-all duration-300" style={{ width: `${value}%` }} />
    </div>
  );
}
